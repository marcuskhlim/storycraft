"use server";

import { getScenarioPrompt, scenarioSchema } from "@/app/prompts";
import {
    createPartFromUri,
    createPartFromText,
    ContentListUnion,
} from "@google/genai";
import { generateContent, generateImage } from "@/lib/api/gemini";
import yaml from "js-yaml";

import { Scenario, Language } from "@/app/types";
import logger from "@/app/logger";
import { generateScenarioSchema } from "@/app/schemas";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import pLimit from "p-limit";

export async function generateScenario(
    name: string,
    pitch: string,
    numScenes: number,
    style: string,
    aspectRatio: string,
    durationSeconds: number,
    language: Language,
    modelName: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    styleImageUri?: string,
): Promise<Scenario> {
    try {
        const parseResult = generateScenarioSchema.safeParse({
            name,
            pitch,
            numScenes,
            style,
            aspectRatio,
            durationSeconds,
            language,
            modelName,
            thinkingBudget,
            styleImageUri,
        });
        if (!parseResult.success) {
            logger.error(
                "Validation error in generateScenario:",
                parseResult.error,
            );
            throw new Error(`Invalid input: ${parseResult.error.message}`);
        }

        const prompt = getScenarioPrompt(pitch, numScenes, style, language);
        logger.debug("Create a scenario");
        const text = await generateContent(
            prompt,
            {
                thinkingConfig: {
                    includeThoughts: false,
                    thinkingBudget: thinkingBudget,
                },
                responseMimeType: "application/json",
                responseSchema: scenarioSchema,
            },
            modelName,
        );
        logger.debug(text);

        if (!text) {
            throw new Error("No text generated from the AI model");
        }

        let scenario: Scenario;
        try {
            // remove markdown
            const textWithoutMarkdown = text
                .replace(/```json/g, "")
                .replace(/```/g, "");
            const parsedScenario = JSON.parse(textWithoutMarkdown);
            logger.debug(parsedScenario);

            // Ensure the language is set correctly and add name, pitch, style, and aspect ratio
            scenario = {
                ...parsedScenario,
                name: name,
                pitch: pitch,
                style: style,
                props: parsedScenario.props || [],
                aspectRatio: aspectRatio,
                durationSeconds: durationSeconds,
                language: {
                    name: language.name,
                    code: language.code,
                },
                styleImageUri: styleImageUri,
            };

            logger.debug(JSON.stringify(scenario, null, 4));
        } catch (parseError) {
            logger.error("Error parsing AI response:", parseError);
            throw new Error(
                `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
            );
        }

        const limit = pLimit(10); // Max 10 concurrent image generations

        // Generate all images (characters and settings) simultaneously
        const [charactersWithImages, settingsWithImages, propsWithImages] =
            await Promise.all([
                Promise.all(
                    scenario.characters.map((character, index) =>
                        limit(async () => {
                            try {
                                logger.debug(
                                    `Generating image for character ${index + 1}: ${character.name}`,
                                );
                                // Define the order explicitly
                                const orderedPrompt = {
                                    style: style,
                                    //name: character.name,
                                    shot_type: "Medium Shot",
                                    description: character.description,
                                    // prohibited_elements: "watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
                                };
                                let content: ContentListUnion = yaml.dump(
                                    orderedPrompt,
                                    {
                                        indent: 2,
                                        lineWidth: -1,
                                    },
                                );
                                if (styleImageUri) {
                                    content = [
                                        createPartFromText(
                                            `I am providing a reference image. Use this image strictly for its visual style (color palette, lighting, texture, and art medium). Ignore the subjects, settings, locations, and objects matter of the reference image entirely.
                                            Constraints:

                                            * Adopt: The color grading, shadow density, and line quality of the reference.
                                            * Discard: The original composition and subject matter.
                                            * Reference Strength: High for style, 0% for content.`,
                                        ),
                                        createPartFromUri(
                                            styleImageUri,
                                            "image/png",
                                        ),
                                        createPartFromText(content),
                                    ];
                                }

                                // const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), "1:1", true);
                                const result = await generateImage(content, {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: "1:1",
                                    },
                                });

                                // if (resultJson.predictions[0].raiFilteredReason) {
                                //   throw new Error(getRAIUserMessage(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason)))
                                // } else {
                                //   logger.debug(`Generated character image: ${resultJson.predictions[0].gcsUri}`);
                                //   return { ...character, imageGcsUri: resultJson.predictions[0].gcsUri };
                                // }
                                return {
                                    ...character,
                                    imageGcsUri: result.imageGcsUri!,
                                };
                            } catch (error) {
                                logger.error(
                                    "Error generating character image:",
                                    error,
                                );
                                return { ...character, imageGcsUri: undefined };
                            }
                        }),
                    ),
                ),
                Promise.all(
                    scenario.settings.map((setting, index) =>
                        limit(async () => {
                            try {
                                logger.debug(
                                    `Generating image for setting ${index + 1}: ${setting.name}`,
                                );
                                // Define the order explicitly
                                const orderedPrompt = {
                                    style: style,
                                    //name: setting.name,
                                    shot_type: "Wide Shot",
                                    description: setting.description,
                                    //prohibited_elements: "people, characters, watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
                                };
                                let content: ContentListUnion = yaml.dump(
                                    orderedPrompt,
                                    {
                                        indent: 2,
                                        lineWidth: -1,
                                    },
                                );
                                if (styleImageUri) {
                                    content = [
                                        createPartFromText(
                                            `I am providing a reference image. Use this image strictly for its visual style (color palette, lighting, texture, and art medium). Ignore the subjects, settings, locations, and objects matter of the reference image entirely.
                                            Constraints:
                                            
                                            * Adopt: The color grading, shadow density, and line quality of the reference.
                                            * Discard: The original composition and subject matter.
                                            * Reference Strength: High for style, 0% for content.`,
                                        ),
                                        createPartFromUri(
                                            styleImageUri,
                                            "image/png",
                                        ),
                                        createPartFromText(content),
                                    ];
                                }

                                // const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), aspectRatio, true);
                                const result = await generateImage(content, {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: aspectRatio,
                                    },
                                });
                                // if (resultJson.predictions[0].raiFilteredReason) {
                                //   throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
                                // } else {
                                //   logger.debug(`Generated setting image: ${resultJson.predictions[0].gcsUri}`);
                                //   return { ...setting, imageGcsUri: resultJson.predictions[0].gcsUri };
                                // }
                                return {
                                    ...setting,
                                    imageGcsUri: result.imageGcsUri!,
                                };
                            } catch (error) {
                                logger.error(
                                    "Error generating setting image:",
                                    error,
                                );
                                return { ...setting, imageGcsUri: undefined };
                            }
                        }),
                    ),
                ),
                Promise.all(
                    scenario.props?.map((prop, index) =>
                        limit(async () => {
                            try {
                                logger.debug(
                                    `Generating image for prop ${index + 1}: ${prop.name}`,
                                );
                                // Define the order explicitly
                                const orderedPrompt = {
                                    style: style,
                                    //name: prop.name,
                                    shot_type: "Close Shot",
                                    description: prop.description,
                                    //prohibited_elements: "people, characters, watermark, text overlay, warped face, floating limbs, distorted hands, blurry edges"
                                };
                                let content: ContentListUnion = yaml.dump(
                                    orderedPrompt,
                                    {
                                        indent: 2,
                                        lineWidth: -1,
                                    },
                                );
                                if (styleImageUri) {
                                    content = [
                                        createPartFromText(
                                            `I am providing a reference image. Use this image strictly for its visual style (color palette, lighting, texture, and art medium). Ignore the subjects, settings, locations, and objects matter of the reference image entirely.
                                            Constraints:
                                            
                                            * Adopt: The color grading, shadow density, and line quality of the reference.
                                            * Discard: The original composition and subject matter.
                                            * Reference Strength: High for style, 0% for content.`,
                                        ),
                                        createPartFromUri(
                                            styleImageUri,
                                            "image/png",
                                        ),
                                        createPartFromText(content),
                                    ];
                                }
                                // const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), "1:1", true);
                                const result = await generateImage(content, {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: "1:1",
                                    },
                                });
                                // if (resultJson.predictions[0].raiFilteredReason) {
                                //   throw new Error(getRAIUserMessage(resultJson.predictions[0].raiFilteredReason))
                                // } else {
                                //   logger.debug(`Generated prop image: ${resultJson.predictions[0].gcsUri}`);
                                //   return { ...prop, imageGcsUri: resultJson.predictions[0].gcsUri };
                                // }
                                return {
                                    ...prop,
                                    imageGcsUri: result.imageGcsUri!,
                                };
                            } catch (error) {
                                logger.error(
                                    "Error generating prop image:",
                                    error,
                                );
                                return { ...prop, imageGcsUri: undefined };
                            }
                        }),
                    ) || [],
                ),
            ]);

        scenario.characters = charactersWithImages;
        scenario.settings = settingsWithImages;
        scenario.props = propsWithImages;
        return scenario;
    } catch (error) {
        logger.error("Error generating scenes:", error);
        throw new Error(
            `Failed to generate scenes: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
