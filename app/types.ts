export interface ImagePrompt {
    Style: string;
    Scene: string;
    Composition: {
        shot_type: string;
        lighting: string;
        overall_mood: string;
    };
    Subject: Array<{ name: string; description?: string }>;
    Prop: Array<{ name: string; description?: string }>;
    Context: Array<{ name: string; description?: string }>;
}

export interface VideoPrompt {
    Action: string;
    Camera_Motion: string;
    Ambiance_Audio: string;
    Dialogue: Array<{
        name: string;
        speaker: string;
        line: string;
    }>;
}

export interface Scene {
    imagePrompt: ImagePrompt;
    videoPrompt: VideoPrompt;
    description: string;
    voiceover: string;
    charactersPresent: string[];
    imageGcsUri?: string;
    videoUri?: string;
    voiceoverAudioUri?: string;
    errorMessage?: string;
}

export interface Entity {
    name: string;
    description: string;
    imageGcsUri?: string;
    [key: string]: string | number | boolean | undefined | null;
}

export interface Character extends Entity {
    voice?: string;
}

export type Setting = Entity;

export type Prop = Entity;

export interface Scenario {
    id?: string;
    name: string;
    pitch: string;
    scenario: string;
    style: string;
    aspectRatio: string;
    durationSeconds: number;
    genre: string;
    mood: string;
    music: string;
    musicUrl?: string;
    language: Language;
    characters: Character[];
    settings: Setting[];
    props: Prop[];
    logoOverlay?: string;
    styleImageUri?: string;
    scenes: Scene[];
}

export interface Language {
    name: string;
    code: string;
}

export interface TimelineLayer {
    id: string;
    name: string;
    type: "video" | "voiceover" | "music";
    items: TimelineItem[];
}

export interface TimelineItem {
    id: string;
    startTime: number;
    duration: number;
    content: string; // URL for video/music/voiceover
    type: "video" | "voiceover" | "music";
    metadata?: {
        logoOverlay?: string;
        [key: string]: string | number | boolean | undefined; // Allow for additional metadata fields
    };
}

export interface TimelineState {
    id: string;
    scenarioId: string;
    layers: TimelineLayer[];
}
