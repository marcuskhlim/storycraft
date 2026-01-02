import { NextRequest } from "next/server";
import { generateImageRest } from "@/lib/api/imagen";
import { imagePromptToString } from "@/lib/utils/prompt-utils";
import { ImagePrompt } from "@/app/types";
import yaml from "js-yaml";
import { createPartFromUri, createPartFromText } from "@google/genai";
import { generateImage } from "@/lib/api/gemini";
import logger from "@/app/logger";
import { getRAIUserMessage } from "@/lib/utils/rai";
import { createCollage } from "@/app/features/storyboard/actions/resize-image";
import { auth } from "@/auth";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import {
    regenerateImageApiPostSchema,
    regenerateImageApiPutSchema,
} from "@/app/schemas";
import {
    successResponse,
    unauthorizedResponse,
    errorResponse,
    validationErrorResponse,
} from "@/lib/api/response";

//export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();

        // Validate request body
        const parseResult = regenerateImageApiPostSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
        }

        const {
            prompt,
            scenario,
            modelName = DEFAULT_SETTINGS.imageModel,
        } = parseResult.data;

        const useR2I = true;
        if (useR2I) {
            const presentCharacters: Array<{
                name: string;
                description: string;
                imageGcsUri?: string;
            }> = scenario.characters.filter((character) =>
                prompt.Subject.map((subject) => subject.name).includes(
                    character.name,
                ),
            );
            const props: Array<{
                name: string;
                description: string;
                imageGcsUri?: string;
            }> = scenario.props.filter((prop) =>
                prompt.Prop?.map((prop) => prop.name).includes(prop.name),
            );
            const settings: Array<{
                name: string;
                description: string;
                imageGcsUri?: string;
            }> = scenario.settings.filter((setting) =>
                prompt.Context.map((context) => context.name).includes(
                    setting.name,
                ),
            );
            const orderedPrompt = {
                Style: prompt.Style,
                Scene: prompt.Scene,
                Composition: {
                    shot_type: prompt.Composition.shot_type,
                    lighting: prompt.Composition.lighting,
                    overall_mood: prompt.Composition.overall_mood,
                },
            };
            const promptString = yaml.dump(orderedPrompt, {
                indent: 2,
                lineWidth: -1,
            });
            logger.debug(`Prompt string:\n${promptString}`);

            let result;
            if (
                presentCharacters.length + props.length + settings.length <=
                3
            ) {
                const characterParts = presentCharacters.flatMap(
                    (character) => [
                        createPartFromText(character.name),
                        createPartFromUri(character.imageGcsUri!, "image/png"),
                    ],
                );
                const propsParts = props.flatMap((prop) => [
                    createPartFromText(prop.name),
                    createPartFromUri(prop.imageGcsUri!, "image/png"),
                ]);
                const settingsParts = settings.flatMap((setting) => [
                    createPartFromText(setting.name),
                    createPartFromText(setting.description),
                ]);
                logger.debug(JSON.stringify(settingsParts, null, 2));
                result = await generateImage(
                    characterParts
                        .concat(propsParts)
                        .concat(settingsParts)
                        .concat([createPartFromText(promptString)]),
                    {
                        responseModalities: ["IMAGE"],
                        candidateCount: 1,
                        imageConfig: {
                            aspectRatio: scenario.aspectRatio,
                        },
                    },
                    modelName,
                );
            } else {
                const collageUri = await createCollage(
                    presentCharacters,
                    props,
                    scenario.aspectRatio,
                );
                const settingsParts = settings.flatMap((setting) => [
                    createPartFromText(setting.name),
                    createPartFromText(setting.description),
                ]);
                result = await generateImage(
                    [createPartFromUri(collageUri, "image/png")]
                        .concat(settingsParts)
                        .concat([createPartFromText(promptString)]),
                    {
                        responseModalities: ["IMAGE"],
                        candidateCount: 1,
                        imageConfig: {
                            aspectRatio: scenario.aspectRatio,
                        },
                    },
                    modelName,
                );
            }
            return successResponse(result);
        } else {
            // Convert structured prompt to string if needed
            const promptString =
                typeof prompt === "string"
                    ? prompt
                    : imagePromptToString(prompt as ImagePrompt);

            logger.debug(`Regenerating image with prompt: ${promptString}`);

            const resultJson = await generateImageRest(promptString);

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
                return successResponse({
                    imageGcsUri: resultJson.predictions[0].gcsUri,
                });
            }
        }
    } catch (error) {
        logger.error("Error regenerating image:", error);
        return errorResponse(
            "Failed to regenerate image",
            "IMAGE_REGEN_ERROR",
            500,
            error instanceof Error ? error.message : "Unknown error",
        );
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();

        // Validate request body
        const parseResult = regenerateImageApiPutSchema.safeParse(body);
        if (!parseResult.success) {
            return validationErrorResponse(parseResult.error.format());
        }

        const { prompt } = parseResult.data;

        logger.debug(`Regenerating character image with prompt: ${prompt}`);

        const resultJson = await generateImageRest(prompt, "1:1", false);

        if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(
                getRAIUserMessage(resultJson.predictions[0].raiFilteredReason),
            );
        } else {
            logger.debug(
                `Generated character image: ${resultJson.predictions[0].gcsUri}`,
            );
            return successResponse({
                imageGcsUri: resultJson.predictions[0].gcsUri,
            });
        }
    } catch (error) {
        logger.error("Error regenerating character image:", error);
        return errorResponse(
            "Failed to regenerate character image",
            "CHAR_IMAGE_REGEN_ERROR",
            500,
            error instanceof Error ? error.message : "Unknown error",
        );
    }
}
