"use server";

import { generateImageRest } from "@/lib/api/imagen";
import { getScenesPrompt, storyboardSchema } from "@/app/prompts";
import { generateContent, generateImage } from "@/lib/api/gemini";

import { imagePromptToString } from "@/lib/utils/prompt-utils";
import yaml from "js-yaml";
import { createPartFromUri, createPartFromText } from "@google/genai";
import { getRAIUserMessage } from "@/lib/utils/rai";

import { Scenario, Language } from "@/app/types";
import logger from "@/app/logger";
import { createCollage } from "@/app/features/storyboard/actions/resize-image";
import { generateStoryboardSchema } from "@/app/schemas";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import pLimit from "p-limit";

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
        // Ensure scenes is at least an empty array for validation
        const scenarioToValidate = {
            ...scenario,
            scenes: scenario.scenes || [],
        };

        const parseResult = generateStoryboardSchema.safeParse({
            scenario: scenarioToValidate,
            numScenes,
            style,
            language,
            modelName,
            thinkingBudget,
        });
        if (!parseResult.success) {
            logger.error(
                "Validation error in generateStoryboard:",
                parseResult.error,
            );
            throw new Error(`Invalid input: ${parseResult.error.message}`);
        }

        // Create a new scenario object to ensure proper serialization
        const newScenario: Scenario = {
            ...scenarioToValidate,
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

        const limit = pLimit(10); // Max 10 concurrent image generations

        // Generate images for each scene
        const scenesWithImages = await Promise.all(
            newScenario.scenes.map((scene, index) =>
                limit(async () => {
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
                                    shot_type:
                                        imagePrompt.Composition.shot_type,
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
                                14
                            ) {
                                const characterParts =
                                    presentCharacters.flatMap((character) => [
                                        createPartFromText(character.name),
                                        createPartFromUri(
                                            character.imageGcsUri!,
                                            "image/png",
                                        ),
                                    ]);
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
                                // let resizedimageUri;
                                // if (scenario.aspectRatio === "16:9") {
                                //     resizedimageUri = await resizeImage(
                                //         await gcsUriToBase64(
                                //             result.imageGcsUri!,
                                //         ),
                                //         1980,
                                //         1080,
                                //     );
                                // } else {
                                //     resizedimageUri = await resizeImage(
                                //         await gcsUriToBase64(
                                //             result.imageGcsUri!,
                                //         ),
                                //         1080,
                                //         1920,
                                //     );
                                // }
                                return {
                                    ...scene,
                                    imageGcsUri: result.imageGcsUri!,
                                };
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
                                        resultJson.predictions[0]
                                            .raiFilteredReason,
                                    ),
                                );
                            } else {
                                logger.debug(
                                    `Generated image: ${resultJson.predictions[0].gcsUri}`,
                                );
                                return {
                                    ...scene,
                                    imageGcsUri:
                                        resultJson.predictions[0].gcsUri,
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
            ),
        );

        newScenario.scenes = scenesWithImages;
        // Return the fresh copy
        return newScenario;
    } catch (error) {
        logger.error("Error generating scenes:", error);
        throw new Error(
            `Failed to generate scenes: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
