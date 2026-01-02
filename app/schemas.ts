import { z } from "zod";
import {
    Character,
    Language,
    Prop,
    Setting,
    Scene,
    Scenario,
    TimelineItem,
    TimelineLayer,
} from "./types";

// Base Types

export const languageSchema: z.ZodType<Language> = z.object({
    name: z.string(),
    code: z.string(),
});

export const imagePromptSchema = z.object({
    Style: z.string(),
    Scene: z.string(),
    Composition: z.object({
        shot_type: z.string(),
        lighting: z.string(),
        overall_mood: z.string(),
    }),
    Subject: z.array(
        z.object({ name: z.string(), description: z.string().optional() }),
    ),
    Prop: z.array(
        z.object({ name: z.string(), description: z.string().optional() }),
    ),
    Context: z.array(
        z.object({ name: z.string(), description: z.string().optional() }),
    ),
});

export const videoPromptSchema = z.object({
    Action: z.string(),
    Camera_Motion: z.string(),
    Ambiance_Audio: z.string(),
    Dialogue: z.array(
        z.object({
            name: z.string(),
            speaker: z.string(),
            line: z.string(),
        }),
    ),
});

export const sceneSchema: z.ZodType<Scene> = z.object({
    imagePrompt: imagePromptSchema,
    videoPrompt: videoPromptSchema,
    description: z.string(),
    voiceover: z.string(),
    charactersPresent: z.array(z.string()),
    imageGcsUri: z.string().optional(),
    videoUri: z.string().optional(),
    voiceoverAudioUri: z.string().optional(),
    errorMessage: z.string().optional(),
});

export const characterSchema: z.ZodType<Character> = z.object({
    name: z.string(),
    description: z.string(),
    voice: z.string().optional(),
    imageGcsUri: z.string().optional(),
});

export const settingSchema: z.ZodType<Setting> = z.object({
    name: z.string(),
    description: z.string(),
    imageGcsUri: z.string().optional(),
});

export const propSchema: z.ZodType<Prop> = z.object({
    name: z.string(),
    description: z.string(),
    imageGcsUri: z.string().optional(),
});

export const scenarioSchema: z.ZodType<Scenario> = z.object({
    id: z.string().optional(),
    name: z.string(),
    pitch: z.string(),
    scenario: z.string(),
    style: z.string(),
    aspectRatio: z.string(),
    durationSeconds: z.number(),
    genre: z.string(),
    mood: z.string(),
    music: z.string(),
    musicUrl: z.string().optional(),
    language: languageSchema,
    characters: z.array(characterSchema),
    settings: z.array(settingSchema),
    props: z.array(propSchema),
    logoOverlay: z.string().optional(),
    styleImageUri: z.string().optional(),
    scenes: z.array(sceneSchema),
});

export const timelineItemSchema: z.ZodType<TimelineItem> = z.object({
    id: z.string(),
    startTime: z.number(),
    duration: z.number(),
    content: z.string(),
    type: z.enum(["video", "voiceover", "music"]),
    metadata: z
        .object({
            logoOverlay: z.string().optional(),
        })
        .and(
            z.record(
                z.string(),
                z.union([z.string(), z.number(), z.boolean(), z.undefined()]),
            ),
        )
        .optional(),
});

export const timelineLayerSchema: z.ZodType<TimelineLayer> = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["video", "voiceover", "music"]),
    items: z.array(timelineItemSchema),
});

// Action Inputs

export const generateScenarioSchema = z.object({
    name: z.string().min(1).max(200),
    pitch: z.string().min(10).max(5000),
    numScenes: z.number().int().min(1).max(20),
    style: z.string(),
    aspectRatio: z.string(), // z.enum(['16:9', '9:16']) but kept string to match existing looser types if needed, though enum is safer
    durationSeconds: z.number(),
    language: languageSchema,
    modelName: z.string().optional(),
    thinkingBudget: z.number().optional(),
    styleImageUri: z.string().optional(),
});

export const generateStoryboardSchema = z.object({
    scenario: scenarioSchema,
    numScenes: z.number().int(),
    style: z.string(),
    language: languageSchema,
    modelName: z.string().optional(),
    thinkingBudget: z.number().optional(),
});

export const conversationalEditSchema = z.object({
    imageGcsUri: z.string(),
    instruction: z.string(),
    sceneNumber: z.number(),
    scenarioId: z.string(),
});

export const generateMusicSchema = z.object({
    prompt: z.string(),
});

export const exportMovieSchema = z.object({
    layers: z.array(timelineLayerSchema),
});

export const generateVoiceoverSchema = z.object({
    scenes: z.array(z.object({ voiceover: z.string() })),
    language: languageSchema,
    voiceName: z.string().optional(),
});

export const resizeImageSchema = z.object({
    base64Image: z.string(),
    width: z.number().default(1920),
    height: z.number().default(1080),
});

export const createCollageSchema = z.object({
    characters: z.array(characterSchema),
    props: z.array(propSchema),
    aspectRatio: z.string(),
});

export const uploadImageToGCSSchema = z.object({
    base64: z.string(),
});

export const getDynamicImageUrlSchema = z.object({
    gcsUri: z.string(),
    download: z.boolean().optional(),
});

export const saveImageToPublicSchema = z.object({
    base64String: z.string(),
    originalFilename: z.string(),
});

export const uploadStyleImageToGCSSchema = z.object({
    base64: z.string(),
    filename: z.string(),
});

// Modify Scenario Schemas
export const deleteCharacterSchema = z.object({
    currentScenario: z.string(),
    oldName: z.string(),
    oldDescription: z.string(),
});

export const regenerateCharacterTextSchema = z.object({
    currentScenario: z.string(),
    oldCharacterName: z.string(),
    newCharacterName: z.string(),
    newCharacterDescription: z.string(),
    style: z.string(),
    llmModel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    imageModel: z.string().optional(),
});

export const regenerateCharacterImageSchema = z.object({
    currentScenario: z.string(),
    characterName: z.string(),
    currentCharacterDescription: z.string(),
    currentCharacterVoice: z.string(),
    imageGcsUri: z.string(),
    allCharacters: z.array(characterSchema),
    style: z.string(),
    llmModel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    imageModel: z.string().optional(),
});

export const deleteSettingSchema = z.object({
    currentScenario: z.string(),
    oldName: z.string(),
    oldDescription: z.string(),
});

export const regenerateSettingTextSchema = z.object({
    currentScenario: z.string(),
    oldSettingName: z.string(),
    newSettingName: z.string(),
    newSettingDescription: z.string(),
    style: z.string(),
    aspectRatio: z.string().optional(),
    llmModel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    imageModel: z.string().optional(),
});

export const regenerateSettingImageSchema = z.object({
    currentScenario: z.string(),
    settingName: z.string(),
    currentSettingDescription: z.string(),
    imageGcsUri: z.string(),
    allSettings: z.array(settingSchema),
    style: z.string(),
    llmModel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    imageModel: z.string().optional(),
});

export const deletePropSchema = z.object({
    currentScenario: z.string(),
    oldName: z.string(),
    oldDescription: z.string(),
});

export const regeneratePropTextSchema = z.object({
    currentScenario: z.string(),
    oldPropName: z.string(),
    newPropName: z.string(),
    newPropDescription: z.string(),
    style: z.string(),
    llmModel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    imageModel: z.string().optional(),
});

export const regeneratePropImageSchema = z.object({
    currentScenario: z.string(),
    propName: z.string(),
    currentPropDescription: z.string(),
    imageGcsUri: z.string(),
    allProps: z.array(propSchema),
    style: z.string(),
    llmModel: z.string().optional(),
    thinkingBudget: z.number().optional(),
    imageModel: z.string().optional(),
});

// Inferred Types
export type GenerateScenarioInput = z.infer<typeof generateScenarioSchema>;
export type GenerateStoryboardInput = z.infer<typeof generateStoryboardSchema>;
export type ConversationalEditInput = z.infer<typeof conversationalEditSchema>;
export type GenerateMusicInput = z.infer<typeof generateMusicSchema>;
export type ExportMovieInput = z.infer<typeof exportMovieSchema>;
export type GenerateVoiceoverInput = z.infer<typeof generateVoiceoverSchema>;
export type ResizeImageInput = z.infer<typeof resizeImageSchema>;
export type CreateCollageInput = z.infer<typeof createCollageSchema>;
export type UploadImageToGCSInput = z.infer<typeof uploadImageToGCSSchema>;
export type GetDynamicImageUrlInput = z.infer<typeof getDynamicImageUrlSchema>;
export type SaveImageToPublicInput = z.infer<typeof saveImageToPublicSchema>;
export type UploadStyleImageInput = z.infer<typeof uploadStyleImageToGCSSchema>;
