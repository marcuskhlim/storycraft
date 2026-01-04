"use server";

import { getScenarioPrompt, scenarioSchema } from "@/app/prompts";
import { generateContent } from "@/lib/api/gemini";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";

import { Scenario, Language } from "@/app/types";
import logger from "@/app/logger";
import { generateScenarioSchema } from "@/app/schemas";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import pLimit from "p-limit";
import { requireAuth } from "@/lib/api/auth-utils";

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
    await requireAuth();
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
                            logger.debug(
                                `Generating image for character ${index + 1}: ${character.name}`,
                            );
                            const result = await generateImageForScenario({
                                scenario,
                                entity: character,
                                entityType: "character",
                            });
                            return {
                                ...character,
                                imageGcsUri: result.imageGcsUri,
                            };
                        }),
                    ),
                ),
                Promise.all(
                    scenario.settings.map((setting, index) =>
                        limit(async () => {
                            logger.debug(
                                `Generating image for setting ${index + 1}: ${setting.name}`,
                            );
                            const result = await generateImageForScenario({
                                scenario,
                                entity: setting,
                                entityType: "setting",
                                aspectRatio,
                            });
                            return {
                                ...setting,
                                imageGcsUri: result.imageGcsUri,
                            };
                        }),
                    ),
                ),
                Promise.all(
                    scenario.props?.map((prop, index) =>
                        limit(async () => {
                            logger.debug(
                                `Generating image for prop ${index + 1}: ${prop.name}`,
                            );
                            const result = await generateImageForScenario({
                                scenario,
                                entity: prop,
                                entityType: "prop",
                            });
                            return {
                                ...prop,
                                imageGcsUri: result.imageGcsUri,
                            };
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
