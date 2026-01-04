"use server";

import { getScenesPrompt, storyboardSchema } from "@/app/prompts";
import { generateContent } from "@/lib/api/gemini";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";

import { Scenario, Language } from "@/app/types";
import logger from "@/app/logger";
import { generateStoryboardSchema } from "@/app/schemas";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import pLimit from "p-limit";
import { requireAuth } from "@/lib/api/auth-utils";

export async function generateStoryboard(
    scenario: Scenario,
    numScenes: number,
    style: string,
    language: Language,
    modelName: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
): Promise<Scenario> {
    await requireAuth();
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
                        const result = await generateImageForScenario({
                            scenario: newScenario,
                            imagePrompt: scene.imagePrompt,
                        });

                        if (result.success) {
                            return {
                                ...scene,
                                imageGcsUri: result.imageGcsUri!,
                            };
                        } else {
                            throw new Error(result.errorMessage);
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
