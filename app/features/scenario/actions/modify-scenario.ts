"use server";

import { generateContent } from "@/lib/api/gemini";
import { z } from "zod";
import logger from "@/app/logger";
import { generateImageForScenario } from "@/app/features/shared/actions/image-generation";
import { Character, Setting, Prop, Scenario } from "@/app/types";
import {
    deleteCharacterSchema,
    deletePropSchema,
    deleteSettingSchema,
    regenerateCharacterImageSchema,
    regenerateCharacterTextSchema,
    regeneratePropImageSchema,
    regeneratePropTextSchema,
    regenerateSettingImageSchema,
    regenerateSettingTextSchema,
} from "@/app/schemas";

import { DEFAULT_SETTINGS } from "@/lib/ai-config";

// ScenarioUpdateResult interface remains as it's specific to these actions
export interface ScenarioUpdateResult {
    updatedScenario: string;
    updatedCharacter?: {
        name: string;
        description: string;
        voice: string;
    };
    updatedSetting?: {
        name: string;
        description: string;
    };
    updatedProp?: {
        name: string;
        description: string;
    };
    newImageGcsUri?: string;
}

// Zod schema for character and scenario updates
const CharacterScenarioUpdateSchema = z.object({
    updatedScenario: z.string(),
    updatedCharacter: z.object({
        name: z.string(),
        description: z.string(),
        voice: z.string(),
    }),
});

const SettingScenarioUpdateSchema = z.object({
    updatedScenario: z.string(),
    updatedSetting: z.object({
        name: z.string(),
        description: z.string(),
    }),
});

const PropScenarioUpdateSchema = z.object({
    updatedScenario: z.string(),
    updatedProp: z.object({
        name: z.string(),
        description: z.string(),
    }),
});

// Common error handling
const handleError = (operation: string, error: unknown): never => {
    const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error in ${operation}:`, error);
    throw new Error(`Failed to ${operation}: ${errorMessage}`);
};

// Common Gemini configuration
const geminiConfig = {
    thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: -1,
    },
    responseMimeType: "text/plain" as const,
};

// Shared function to update scenario text
async function updateScenarioText(
    currentScenario: string,
    oldName: string,
    newName: string,
    newDescription: string,
    entityType: "character" | "setting" | "prop" = "character",
    modelName: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
): Promise<string> {
    const text = await generateContent(
        `Update the following scenario to reflect ${entityType} changes. The ${entityType} previously named "${oldName}" is now named "${newName}" with the following updated description: "${newDescription}".

CURRENT SCENARIO:
"${currentScenario}"

INSTRUCTIONS:
1. Replace all references to "${oldName}" with "${newName}" (if the name changed)
2. Update any ${entityType} descriptions in the scenario to match the new ${entityType} description
3. Ensure the story flow and narrative remain coherent
4. Maintain the same tone and style as the original scenario
5. Keep the scenario length similar to the original

Return ONLY the updated scenario text, no additional formatting or explanations.`,
        {
            ...geminiConfig,
            thinkingConfig: {
                includeThoughts: false,
                thinkingBudget,
            },
        },
        modelName,
    );

    return text!.trim();
}

async function deleteFromScenarioText(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
    entityType: "character" | "setting" | "prop" = "character",
): Promise<string> {
    const text = await generateContent(
        `Delete the following ${entityType} from the scenario.

CURRENT SCENARIO:
"${currentScenario}"

INSTRUCTIONS:
1. Delete all references to "${oldName}" and "${oldDescription}" from the scenario
2. Ensure the story flow and narrative remain coherent
3. Maintain the same tone and style as the original scenario
4. Keep the scenario length similar to the original

Return ONLY the updated scenario text, no additional formatting or explanations.`,
        geminiConfig,
    );
    return text!.trim();
}

export async function deleteCharacterFromScenario(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = deleteCharacterSchema.safeParse({
            currentScenario,
            oldName,
            oldDescription,
        });
        if (!parseResult.success) {
            handleError(
                "delete character from scenario text",
                parseResult.error,
            );
        }
        // Update scenario text
        const updatedScenario = await deleteFromScenarioText(
            currentScenario,
            oldName,
            oldDescription,
            "character",
        );

        return {
            updatedScenario,
        };
    } catch (error) {
        handleError("delete character from scenario text", error);
    }
    throw new Error("Unreachable code");
}

export async function deleteSettingFromScenario(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = deleteSettingSchema.safeParse({
            currentScenario,
            oldName,
            oldDescription,
        });
        if (!parseResult.success) {
            handleError("delete setting from scenario text", parseResult.error);
        }
        const updatedScenario = await deleteFromScenarioText(
            currentScenario,
            oldName,
            oldDescription,
            "setting",
        );

        return {
            updatedScenario,
        };
    } catch (error) {
        handleError("delete setting from scenario text", error);
    }
    throw new Error("Unreachable code");
}

export async function deletePropFromScenario(
    currentScenario: string,
    oldName: string,
    oldDescription: string,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = deletePropSchema.safeParse({
            currentScenario,
            oldName,
            oldDescription,
        });
        if (!parseResult.success) {
            handleError("delete prop from scenario text", parseResult.error);
        }
        const updatedScenario = await deleteFromScenarioText(
            currentScenario,
            oldName,
            oldDescription,
            "prop",
        );

        return {
            updatedScenario,
        };
    } catch (error) {
        handleError("delete prop from scenario text", error);
    }
    throw new Error("Unreachable code");
}

/**
 * Regenerate character and scenario from text input
 * Creates a new character image and updates the scenario accordingly
 */
export async function regenerateCharacterAndScenarioFromText(
    scenario: Scenario,
    oldCharacterName: string,
    newCharacterName: string,
    newCharacterDescription: string,
    style: string,
    llmModel: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    imageModel: string = DEFAULT_SETTINGS.imageModel,
): Promise<ScenarioUpdateResult> {
    logger.info("regenerateCharacterAndScenarioFromText");
    logger.debug("scenario :" + JSON.stringify(scenario, null, 2));
    try {
        const parseResult = regenerateCharacterTextSchema.safeParse({
            currentScenario: scenario.scenario,
            oldCharacterName,
            newCharacterName,
            newCharacterDescription,
            style,
            llmModel,
            thinkingBudget,
            imageModel,
        });
        if (!parseResult.success) {
            handleError(
                "regenerate character and scenario from text",
                parseResult.error,
            );
        }

        // Generate new character image
        const imageResult = await generateImageForScenario({
            scenario,
            entity: {
                name: newCharacterName,
                description: newCharacterDescription,
            },
            entityType: "character",
            modelName: imageModel,
        });

        if (!imageResult.success) {
            throw new Error(
                `Character image generation failed: ${imageResult.errorMessage}`,
            );
        }

        // Update scenario text
        const updatedScenario = await updateScenarioText(
            scenario.scenario,
            oldCharacterName,
            newCharacterName,
            newCharacterDescription,
            "character",
            llmModel,
            thinkingBudget,
        );

        return {
            updatedScenario,
            newImageGcsUri: imageResult.imageGcsUri,
        };
    } catch (error) {
        handleError("regenerate character and scenario from text", error);
    }
    throw new Error("Unreachable code");
}

/**
 * Regenerate character and scenario from image analysis
 * Analyzes an existing character image and updates both character description and scenario
 */
export async function regenerateCharacterAndScenarioFromImage(
    scenario: Scenario,
    characterName: string,
    currentCharacterDescription: string,
    currentCharacterVoice: string,
    imageGcsUri: string,
    allCharacters: Character[],
    style: string,
    llmModel: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    imageModel: string = DEFAULT_SETTINGS.imageModel,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = regenerateCharacterImageSchema.safeParse({
            currentScenario: scenario.scenario,
            characterName,
            currentCharacterDescription,
            currentCharacterVoice,
            imageGcsUri,
            allCharacters,
            style,
            llmModel,
            thinkingBudget,
            imageModel,
        });
        if (!parseResult.success) {
            handleError("regenerate character and scenario", parseResult.error);
        }

        const characterListText = allCharacters
            .map((char) => `- ${char.name}: ${char.description}`)
            .join("\n");

        const text = await generateContent(
            [
                {
                    fileData: {
                        fileUri: imageGcsUri,
                        mimeType: "image/png",
                    },
                },
                `Analyze the provided image and update both the character description and scenario text to match the visual characteristics shown.

CURRENT SCENARIO:
"${scenario.scenario}"

ALL CHARACTERS IN THE STORY:
${characterListText}

CHARACTER TO UPDATE (${characterName}):
"Description: ${currentCharacterDescription}"
"Voice: ${currentCharacterVoice}"

INSTRUCTIONS:
1. Examine the uploaded image carefully
2. Update ONLY the description and voice of ${characterName} to accurately reflect what you see in the image (appearance, clothing, features, etc.)
3. Update any references to ${characterName} in the scenario text to maintain consistency with the new appearance
4. PRESERVE ALL OTHER CHARACTERS - do not remove or modify descriptions of other characters
5. Keep the story as a multi-character narrative - maintain all character interactions and plot elements
6. Preserve the story narrative and flow, but ensure all descriptions of ${characterName} match the visual characteristics
7. Keep the same tone and style as the original text

Return both the updated scenario (maintaining all characters) and the updated description for ${characterName}.`,
            ],
            {
                ...geminiConfig,
                thinkingConfig: {
                    includeThoughts: false,
                    thinkingBudget,
                },
                responseMimeType: "application/json",
                responseSchema: z.toJSONSchema(CharacterScenarioUpdateSchema),
            },
            llmModel,
        );

        const characterScenarioUpdateResult =
            CharacterScenarioUpdateSchema.safeParse(JSON.parse(text!));
        if (!characterScenarioUpdateResult.success) {
            handleError(
                "parse character scenario update",
                characterScenarioUpdateResult.error,
            );
        }
        const characterScenarioUpdate = characterScenarioUpdateResult.data!;

        const imageResult = await generateImageForScenario({
            scenario,
            entity: {
                name: characterScenarioUpdate.updatedCharacter.name,
                description:
                    characterScenarioUpdate.updatedCharacter.description,
            },
            entityType: "character",
            modelName: imageModel,
        });

        return {
            updatedScenario: characterScenarioUpdate.updatedScenario,
            updatedCharacter: characterScenarioUpdate.updatedCharacter,
            newImageGcsUri: imageResult.imageGcsUri,
        };
    } catch (error) {
        handleError("regenerate character and scenario", error);
    }
    throw new Error("Unreachable code");
}

/**
 * Regenerate scenario from setting changes
 * Updates scenario text to reflect setting modifications
 */
export async function regenerateSettingAndScenarioFromText(
    scenario: Scenario,
    oldSettingName: string,
    newSettingName: string,
    newSettingDescription: string,
    style: string,
    aspectRatio: string = "16:9",
    llmModel: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    imageModel: string = DEFAULT_SETTINGS.imageModel,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = regenerateSettingTextSchema.safeParse({
            currentScenario: scenario.scenario,
            oldSettingName,
            newSettingName,
            newSettingDescription,
            style,
            aspectRatio,
            llmModel,
            thinkingBudget,
            imageModel,
        });
        if (!parseResult.success) {
            handleError("regenerate scenario from setting", parseResult.error);
        }

        // Generate new setting image
        const imageResult = await generateImageForScenario({
            scenario,
            entity: {
                name: newSettingName,
                description: newSettingDescription,
            },
            entityType: "setting",
            modelName: imageModel,
            aspectRatio,
        });

        if (!imageResult.success) {
            throw new Error(
                `Setting image generation failed: ${imageResult.errorMessage}`,
            );
        }

        // Update scenario text
        const updatedScenario = await updateScenarioText(
            scenario.scenario,
            oldSettingName,
            newSettingName,
            newSettingDescription,
            "setting",
            llmModel,
            thinkingBudget,
        );

        logger.debug(updatedScenario);

        return {
            updatedScenario,
            newImageGcsUri: imageResult.imageGcsUri,
        };
    } catch (error) {
        handleError("regenerate scenario from setting", error);
    }
    throw new Error("Unreachable code");
}

/**
 * Regenerate scenario from prop changes
 * Updates scenario text to reflect prop modifications
 */
export async function regeneratePropAndScenarioFromText(
    scenario: Scenario,
    oldPropName: string,
    newPropName: string,
    newPropDescription: string,
    style: string,
    llmModel: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    imageModel: string = DEFAULT_SETTINGS.imageModel,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = regeneratePropTextSchema.safeParse({
            currentScenario: scenario.scenario,
            oldPropName,
            newPropName,
            newPropDescription,
            style,
            llmModel,
            thinkingBudget,
            imageModel,
        });
        if (!parseResult.success) {
            handleError("regenerate scenario from prop", parseResult.error);
        }

        // Generate new prop image
        const imageResult = await generateImageForScenario({
            scenario,
            entity: { name: newPropName, description: newPropDescription },
            entityType: "prop",
            modelName: imageModel,
        });

        if (!imageResult.success) {
            throw new Error(
                `Prop image generation failed: ${imageResult.errorMessage}`,
            );
        }

        // Update scenario text
        const updatedScenario = await updateScenarioText(
            scenario.scenario,
            oldPropName,
            newPropName,
            newPropDescription,
            "prop",
            llmModel,
            thinkingBudget,
        );

        logger.debug(updatedScenario);

        return {
            updatedScenario,
            newImageGcsUri: imageResult.imageGcsUri,
        };
    } catch (error) {
        handleError("regenerate scenario from prop", error);
    }
    throw new Error("Unreachable code");
}

/**
 * Regenerate character and scenario from image analysis
 * Analyzes an existing character image and updates both character description and scenario
 */
export async function regenerateSettingAndScenarioFromImage(
    scenario: Scenario,
    settingName: string,
    currentSettingDescription: string,
    imageGcsUri: string,
    allSettings: Setting[],
    style: string,
    llmModel: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    imageModel: string = DEFAULT_SETTINGS.imageModel,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = regenerateSettingImageSchema.safeParse({
            currentScenario: scenario.scenario,
            settingName,
            currentSettingDescription,
            imageGcsUri,
            allSettings,
            style,
            llmModel,
            thinkingBudget,
            imageModel,
        });
        if (!parseResult.success) {
            handleError("regenerate setting and scenario", parseResult.error);
        }

        const settingListText = allSettings
            .map((setting) => `- ${setting.name}: ${setting.description}`)
            .join("\n");

        const text = await generateContent(
            [
                {
                    fileData: {
                        fileUri: imageGcsUri,
                        mimeType: "image/png",
                    },
                },
                `Analyze the provided image and update both the setting description and scenario text to match the visual characteristics shown.

CURRENT SCENARIO:
"${scenario.scenario}"

ALL SETTINGS IN THE STORY:
${settingListText}

SETTING TO UPDATE (${settingName}):
"${currentSettingDescription}"

INSTRUCTIONS:
1. Examine the uploaded image carefully
2. Update ONLY the description of ${settingName} to accurately reflect what you see in the image
3. Update any references to ${settingName} in the scenario text to maintain consistency with the new setting
4. PRESERVE ALL OTHER SETTINGS - do not remove or modify descriptions of other settings
7. Preserve the story narrative and flow, but ensure all descriptions of ${settingName} match the visual characteristics
8. Keep the same tone and style as the original text

Return both the updated scenario (maintaining all settings) and the updated description for ${settingName}.`,
            ],
            {
                ...geminiConfig,
                thinkingConfig: {
                    includeThoughts: false,
                    thinkingBudget,
                },
                responseMimeType: "application/json",
                responseSchema: z.toJSONSchema(SettingScenarioUpdateSchema),
            },
            llmModel,
        );

        const settingScenarioUpdateResult =
            SettingScenarioUpdateSchema.safeParse(JSON.parse(text!));
        if (!settingScenarioUpdateResult.success) {
            handleError(
                "parse setting scenario update",
                settingScenarioUpdateResult.error,
            );
        }
        const settingScenarioUpdate = settingScenarioUpdateResult.data!;

        const imageResult = await generateImageForScenario({
            scenario,
            entity: {
                name: settingScenarioUpdate.updatedSetting.name,
                description: settingScenarioUpdate.updatedSetting.description,
            },
            entityType: "setting",
            modelName: imageModel,
        });

        return {
            updatedScenario: settingScenarioUpdate.updatedScenario,
            updatedSetting: settingScenarioUpdate.updatedSetting,
            newImageGcsUri: imageResult.imageGcsUri,
        };
    } catch (error) {
        handleError("regenerate setting and scenario", error);
    }
    throw new Error("Unreachable code");
}

/**
 * Regenerate character and scenario from image analysis
 * Analyzes an existing character image and updates both character description and scenario
 */
export async function regeneratePropAndScenarioFromImage(
    scenario: Scenario,
    propName: string,
    currentPropDescription: string,
    imageGcsUri: string,
    allProps: Prop[],
    style: string,
    llmModel: string = DEFAULT_SETTINGS.llmModel,
    thinkingBudget: number = DEFAULT_SETTINGS.thinkingBudget,
    imageModel: string = DEFAULT_SETTINGS.imageModel,
): Promise<ScenarioUpdateResult> {
    try {
        const parseResult = regeneratePropImageSchema.safeParse({
            currentScenario: scenario.scenario,
            propName,
            currentPropDescription,
            imageGcsUri,
            allProps,
            style,
            llmModel,
            thinkingBudget,
            imageModel,
        });
        if (!parseResult.success) {
            handleError("regenerate prop and scenario", parseResult.error);
        }

        const propListText = allProps
            .map((prop) => `- ${prop.name}: ${prop.description}`)
            .join("\n");

        const text = await generateContent(
            [
                {
                    fileData: {
                        fileUri: imageGcsUri,
                        mimeType: "image/png",
                    },
                },
                `Analyze the provided image and update both the prop description and scenario text to match the visual characteristics shown.

CURRENT SCENARIO:
"${scenario.scenario}"

ALL PROPS IN THE STORY:
${propListText}

PROP TO UPDATE (${propName}):
"${currentPropDescription}"

INSTRUCTIONS:
1. Examine the uploaded image carefully
2. Update ONLY the description of ${propName} to accurately reflect what you see in the image
3. Update any references to ${propName} in the scenario text to maintain consistency with the new prop
4. PRESERVE ALL OTHER PROPS - do not remove or modify descriptions of other props
7. Preserve the story narrative and flow, but ensure all descriptions of ${propName} match the visual characteristics
8. Keep the same tone and style as the original text

Return both the updated scenario (maintaining all props) and the updated description for ${propName}.`,
            ],
            {
                ...geminiConfig,
                thinkingConfig: {
                    includeThoughts: false,
                    thinkingBudget,
                },
                responseMimeType: "application/json",
                responseSchema: z.toJSONSchema(PropScenarioUpdateSchema),
            },
            llmModel,
        );

        const propScenarioUpdateResult = PropScenarioUpdateSchema.safeParse(
            JSON.parse(text!),
        );
        if (!propScenarioUpdateResult.success) {
            handleError(
                "parse prop scenario update",
                propScenarioUpdateResult.error,
            );
        }
        const propScenarioUpdate = propScenarioUpdateResult.data!;

        const imageResult = await generateImageForScenario({
            scenario,
            entity: {
                name: propScenarioUpdate.updatedProp.name,
                description: propScenarioUpdate.updatedProp.description,
            },
            entityType: "prop",
            modelName: imageModel,
        });

        return {
            updatedScenario: propScenarioUpdate.updatedScenario,
            updatedProp: propScenarioUpdate.updatedProp,
            newImageGcsUri: imageResult.imageGcsUri,
        };
    } catch (error) {
        handleError("regenerate prop and scenario", error);
    }
    throw new Error("Unreachable code");
}
