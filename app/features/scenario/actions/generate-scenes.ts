"use server";

import { generateImageRest } from "@/lib/api/imagen";
import {
    getScenarioPrompt,
    getScenesPrompt,
    scenarioSchema,
    storyboardSchema,
} from "@/app/prompts";
import { generateContent, generateImage } from "@/lib/api/gemini";

import { imagePromptToString } from "@/lib/utils/prompt-utils";
import yaml from "js-yaml";
import { createPartFromUri, createPartFromText } from "@google/genai";
import { getRAIUserMessage } from "@/lib/utils/rai";

import { Scenario, Language } from "@/app/types";
import logger from "@/app/logger";
import {
    createCollage,
    resizeImage,
} from "@/app/features/storyboard/actions/resize-image";
import { gcsUriToBase64 } from "@/lib/storage/storage";
import {
    generateScenarioSchema,
    generateStoryboardSchema,
} from "@/app/schemas";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";

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
        generateScenarioSchema.parse({
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

        // Generate all images (characters and settings) simultaneously
        const [charactersWithImages, settingsWithImages, propsWithImages] =
            await Promise.all([
                Promise.all(
                    scenario.characters.map(async (character, index) => {
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
                            // const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), "1:1", true);
                            const result = await generateImage(
                                yaml.dump(orderedPrompt, {
                                    indent: 2,
                                    lineWidth: -1,
                                }),
                                {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: "1:1",
                                    },
                                },
                            );

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
                Promise.all(
                    scenario.settings.map(async (setting, index) => {
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
                            // const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), aspectRatio, true);
                            const result = await generateImage(
                                yaml.dump(orderedPrompt, {
                                    indent: 2,
                                    lineWidth: -1,
                                }),
                                {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: aspectRatio,
                                    },
                                },
                            );
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
                Promise.all(
                    scenario.props?.map(async (prop, index) => {
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
                            // const resultJson = await generateImageRest(yaml.dump(orderedPrompt, { indent: 2, lineWidth: -1 }), "1:1", true);
                            const result = await generateImage(
                                yaml.dump(orderedPrompt, {
                                    indent: 2,
                                    lineWidth: -1,
                                }),
                                {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: "1:1",
                                    },
                                },
                            );
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
                            logger.error("Error generating prop image:", error);
                            return { ...prop, imageGcsUri: undefined };
                        }
                    }),
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

export async function generateStoryboard(
    scenario: Scenario,
    numScenes: number,
    style: string,
    language: Language,
    modelName: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
): Promise<Scenario> {
    logger.debug("Create a storyboard");
    logger.debug(scenario.scenario);
    try {
        generateStoryboardSchema.parse({
            scenario,
            numScenes,
            style,
            language,
            modelName,
            thinkingBudget,
        });

        // Create a new scenario object to ensure proper serialization
        const newScenario: Scenario = {
            ...scenario,
            scenes: [],
        };

        const prompt = getScenesPrompt(scenario, numScenes, style, language);
        const text = await generateContent(
            prompt,
            {
                thinkingConfig: {
                    includeThoughts: false,
                    thinkingBudget: thinkingBudget,
                },
                responseMimeType: "application/json",
                responseSchema: storyboardSchema,
            },
            modelName,
        );
        logger.debug(text);

        if (!text) {
            throw new Error("No text generated from the AI model");
        }

        try {
            const parsedScenes = JSON.parse(text);
            newScenario.scenes = parsedScenes.scenes;
            logger.debug(
                `Server side scenes after parsing: ${JSON.stringify(newScenario.scenes, null, 4)}`,
            );
        } catch (parseError) {
            logger.error("Error parsing AI response:", parseError);
            throw new Error(
                `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
            );
        }

        // Generate images for each scene
        const scenesWithImages = await Promise.all(
            newScenario.scenes.map(async (scene, index) => {
                try {
                    logger.debug(`Generating image for scene ${index + 1}`);
                    let resultJson;
                    const useR2I = true;
                    if (useR2I && scene.charactersPresent.length > 0) {
                        const presentCharacters: Array<{
                            name: string;
                            description: string;
                            imageGcsUri?: string;
                        }> = newScenario.characters.filter((character) =>
                            scene.imagePrompt.Subject.map(
                                (subject) => subject.name,
                            ).includes(character.name),
                        );
                        const props: Array<{
                            name: string;
                            description: string;
                            imageGcsUri?: string;
                        }> = newScenario.props.filter((prop) =>
                            scene.imagePrompt.Prop?.map(
                                (prop) => prop.name,
                            ).includes(prop.name),
                        );
                        const settings: Array<{
                            name: string;
                            description: string;
                            imageGcsUri?: string;
                        }> = newScenario.settings.filter((setting) =>
                            scene.imagePrompt.Context.map(
                                (context) => context.name,
                            ).includes(setting.name),
                        );
                        const imagePrompt = scene.imagePrompt;
                        const orderedPrompt = {
                            Style: imagePrompt.Style,
                            Scene: imagePrompt.Scene,
                            Composition: {
                                shot_type: imagePrompt.Composition.shot_type,
                                lighting: imagePrompt.Composition.lighting,
                                overall_mood:
                                    imagePrompt.Composition.overall_mood,
                            },
                        };
                        const prompt = yaml.dump(orderedPrompt, {
                            indent: 2,
                            lineWidth: -1,
                        });
                        let result;
                        if (
                            presentCharacters.length +
                                props.length +
                                settings.length <=
                            3
                        ) {
                            const characterParts = presentCharacters.flatMap(
                                (character) => [
                                    createPartFromText(character.name),
                                    createPartFromUri(
                                        character.imageGcsUri!,
                                        "image/png",
                                    ),
                                ],
                            );
                            const propsParts = props.flatMap((prop) => [
                                createPartFromText(prop.name),
                                createPartFromUri(
                                    prop.imageGcsUri!,
                                    "image/png",
                                ),
                            ]);
                            const settingsParts = settings.flatMap(
                                (setting) => [
                                    createPartFromText(setting.name),
                                    createPartFromText(setting.description),
                                ],
                            );
                            result = await generateImage(
                                characterParts
                                    .concat(propsParts)
                                    .concat(settingsParts)
                                    .concat([createPartFromText(prompt)]),
                                {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: scenario.aspectRatio,
                                    },
                                },
                            );
                        } else {
                            const collageUri = await createCollage(
                                presentCharacters,
                                props,
                                scenario.aspectRatio,
                            );
                            const settingsParts = settings.flatMap(
                                (setting) => [
                                    createPartFromText(setting.name),
                                    createPartFromText(setting.description),
                                ],
                            );
                            result = await generateImage(
                                [createPartFromUri(collageUri, "image/png")]
                                    .concat(settingsParts)
                                    .concat([createPartFromText(prompt)]),
                                {
                                    responseModalities: ["IMAGE"],
                                    candidateCount: 1,
                                    imageConfig: {
                                        aspectRatio: scenario.aspectRatio,
                                    },
                                },
                            );
                        }
                        if (result.success) {
                            let resizedimageUri;
                            if (scenario.aspectRatio === "16:9") {
                                resizedimageUri = await resizeImage(
                                    await gcsUriToBase64(result.imageGcsUri!),
                                    1980,
                                    1080,
                                );
                            } else {
                                resizedimageUri = await resizeImage(
                                    await gcsUriToBase64(result.imageGcsUri!),
                                    1080,
                                    1920,
                                );
                            }
                            return { ...scene, imageGcsUri: resizedimageUri };
                        } else {
                            throw {
                                ...scene,
                                errorMessage: result.errorMessage,
                            };
                        }
                    } else {
                        resultJson = await generateImageRest(
                            imagePromptToString(scene.imagePrompt),
                        );
                        if (resultJson.predictions[0].raiFilteredReason) {
                            throw new Error(
                                getRAIUserMessage(
                                    resultJson.predictions[0].raiFilteredReason,
                                ),
                            );
                        } else {
                            logger.debug(
                                `Generated image: ${resultJson.predictions[0].gcsUri}`,
                            );
                            return {
                                ...scene,
                                imageGcsUri: resultJson.predictions[0].gcsUri,
                            };
                        }
                    }
                } catch (error) {
                    logger.error("Error generating image:", error);
                    if (error instanceof Error) {
                        return {
                            ...scene,
                            imageGcsUri: undefined,
                            errorMessage: error.message,
                        };
                    } else {
                        return { ...scene, imageGcsUri: undefined };
                    }
                }
            }),
        );

        newScenario.scenes = scenesWithImages;
        // Create a fresh copy to ensure proper serialization
        return JSON.parse(JSON.stringify(newScenario));
    } catch (error) {
        logger.error("Error generating scenes:", error);
        throw new Error(
            `Failed to generate scenes: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
