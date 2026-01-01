"use client";

import { TimelineLayer, TimelineItem } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Film, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MediabunnyPlayer } from "./mediabunny-player";
import { MusicParams, MusicSelectionDialog } from "./music-selection-dialog";
import { Voice, VoiceSelectionDialog } from "./voice-selection-dialog";
import { getDynamicImageUrl } from "@/app/features/shared/actions/upload-to-gcs";
import { useTimeline } from "@/app/features/editor/hooks/use-timeline";
import { generateVoiceover } from "@/app/features/editor/actions/generate-voiceover";
import { generateMusic } from "@/app/features/editor/actions/generate-music";
import { clientLogger } from "@/lib/utils/client-logger";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { TimelineEditor } from "./TimelineEditor";
import { getAudioDuration, getVideoDuration } from "../utils/editor-utils";

interface EditorTabProps {
    scenarioId: string | null;
    onExportMovie: (layers: TimelineLayer[]) => Promise<void>;
}

export function EditorTab({ scenarioId, onExportMovie }: EditorTabProps) {
    const { scenario, logoOverlay } = useScenarioStore();
    const { video: isExporting } = useLoadingStore();
    const {
        currentTime,
        exportProgress,
        setCurrentTime: onTimeUpdate,
    } = useEditorStore();

    const SCENE_DURATION = scenario?.durationSeconds || 8;

    // Timeline persistence
    const { saveTimelineDebounced, loadTimeline, isAuthenticated } =
        useTimeline();
    const [isTimelineLoaded, setIsTimelineLoaded] = useState(false);
    const isInitializingRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
    const [isMusicDialogOpen, setIsMusicDialogOpen] = useState(false);
    const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
    const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);

    const [layers, setLayers] = useState<TimelineLayer[]>([]);

    useEffect(() => {
        if (scenario && layers.length === 0) {
            setLayers([
                {
                    id: "videos",
                    name: "Videos",
                    type: "video",
                    items: scenario.scenes.map((scene, index) => ({
                        id: `video-${index}`,
                        startTime: index * SCENE_DURATION,
                        duration: SCENE_DURATION,
                        content: "",
                        type: "video",
                        metadata: {
                            logoOverlay: scenario.logoOverlay || undefined,
                        },
                    })),
                },
                {
                    id: "voiceovers",
                    name: "Voiceovers",
                    type: "voiceover",
                    items: [],
                },
                {
                    id: "music",
                    name: "Music",
                    type: "music",
                    items: [],
                },
            ]);
        }
    }, [scenario, SCENE_DURATION, layers.length]);

    // Voice selection handlers
    const handleOpenVoiceDialog = () => setIsVoiceDialogOpen(true);
    const handleCloseVoiceDialog = () => setIsVoiceDialogOpen(false);
    const handleVoiceSelect = async (voice: Voice) => {
        setIsVoiceDialogOpen(false);
        await handleGenerateVoiceoverInternal(voice);
    };

    // Music selection handlers
    const handleOpenMusicDialog = () => setIsMusicDialogOpen(true);
    const handleCloseMusicDialog = () => setIsMusicDialogOpen(false);
    const handleMusicGenerate = async (params: MusicParams) => {
        setIsMusicDialogOpen(false);
        await handleGenerateMusicInternal(params);
    };

    // Internal handler: Remove voiceover from timeline (not scenario)
    const handleRemoveVoiceoverFromTimeline = useCallback((itemId: string) => {
        setLayers((prevLayers) =>
            prevLayers.map((layer) => {
                if (layer.id !== "voiceovers") return layer;
                return {
                    ...layer,
                    items: layer.items.filter((i) => i.id !== itemId),
                };
            }),
        );
    }, []);

    // Internal handler: Remove music from timeline (not scenario)
    const handleRemoveMusicFromTimeline = useCallback(() => {
        setLayers((prevLayers) =>
            prevLayers.map((layer) => {
                if (layer.id !== "music") return layer;
                return { ...layer, items: [] };
            }),
        );
    }, []);

    // Internal handler: Generate voiceover and add to timeline
    const handleGenerateVoiceoverInternal = useCallback(
        async (voice?: Voice) => {
            if (!scenario?.scenes || scenario.scenes.length === 0) return;

            setIsGeneratingVoiceover(true);
            try {
                const voiceoverUrls = await generateVoiceover(
                    scenario?.scenes || [],
                    scenario?.language || { name: "English", code: "en-US" },
                    voice?.name,
                );

                // Convert URLs and calculate durations
                const voiceoverItems: TimelineItem[] = await Promise.all(
                    voiceoverUrls.map(async (url, index) => {
                        const result = await getDynamicImageUrl(url);
                        const dynamicUrl = result.url || url;
                        const duration = await getAudioDuration(
                            dynamicUrl,
                            SCENE_DURATION,
                        );

                        // Find the video item at this index to align start time
                        const videoLayer = layers.find(
                            (l) => l.id === "videos",
                        );
                        const videoItem = videoLayer?.items[index];
                        const startTime =
                            videoItem?.startTime ?? index * SCENE_DURATION;

                        return {
                            id: `voiceover-${index}`,
                            startTime,
                            duration,
                            content: dynamicUrl,
                            type: "voiceover" as const,
                            metadata: {
                                originalDuration: duration,
                                trimStart: 0,
                            },
                        };
                    }),
                );

                // Update voiceovers layer
                setLayers((prevLayers) =>
                    prevLayers.map((layer) => {
                        if (layer.id !== "voiceovers") return layer;
                        return { ...layer, items: voiceoverItems };
                    }),
                );
            } catch (error) {
                clientLogger.error("Error generating voiceover:", error);
            } finally {
                setIsGeneratingVoiceover(false);
            }
        },
        [scenario?.scenes, scenario?.language, layers, SCENE_DURATION],
    );

    // Internal handler: Generate music and add to timeline
    const handleGenerateMusicInternal = useCallback(
        async (params?: MusicParams) => {
            setIsGeneratingMusic(true);
            try {
                const prompt =
                    params?.description ||
                    `Create background music for a video advertisement`;
                const musicUrl = await generateMusic(prompt);
                const result = await getDynamicImageUrl(musicUrl);
                const dynamicUrl = result.url || musicUrl;
                const duration = await getAudioDuration(
                    dynamicUrl,
                    SCENE_DURATION,
                );

                // Calculate total timeline duration from video items
                const videoLayer = layers.find((l) => l.id === "videos");
                const totalVideoDuration =
                    videoLayer?.items.reduce(
                        (max, item) =>
                            Math.max(max, item.startTime + item.duration),
                        0,
                    ) ?? (scenario?.scenes?.length || 0) * SCENE_DURATION;

                const musicItem: TimelineItem = {
                    id: "music-0",
                    startTime: 0,
                    duration: Math.min(duration, totalVideoDuration),
                    content: dynamicUrl,
                    type: "music" as const,
                    metadata: {
                        originalDuration: duration,
                        trimStart: 0,
                    },
                };

                // Update music layer
                setLayers((prevLayers) =>
                    prevLayers.map((layer) => {
                        if (layer.id !== "music") return layer;
                        return { ...layer, items: [musicItem] };
                    }),
                );
            } catch (error) {
                clientLogger.error("Error generating music:", error);
            } finally {
                setIsGeneratingMusic(false);
            }
        },
        [layers, scenario?.scenes?.length, SCENE_DURATION],
    );

    // Initialize timeline
    useEffect(() => {
        const initializeTimeline = async () => {
            if (isInitializingRef.current) return;
            isInitializingRef.current = true;

            try {
                if (scenarioId && isAuthenticated) {
                    const savedLayers = await loadTimeline(scenarioId);
                    if (savedLayers && savedLayers.length > 0) {
                        clientLogger.info(
                            "Loaded saved timeline from Firestore",
                        );
                        const resolvedLayers =
                            await resolveLayerUrls(savedLayers);
                        setLayers(resolvedLayers);
                        setIsTimelineLoaded(true);
                        isInitializingRef.current = false;
                        return;
                    }
                }

                clientLogger.info("Initializing timeline from scenario");
                const initialLayers = await initializeLayersFromScenario();
                setLayers(initialLayers);
                setIsTimelineLoaded(true);
            } catch (error) {
                clientLogger.error("Error initializing timeline:", error);
                const initialLayers = await initializeLayersFromScenario();
                setLayers(initialLayers);
                setIsTimelineLoaded(true);
            } finally {
                isInitializingRef.current = false;
            }
        };

        const resolveLayerUrls = async (
            savedLayers: TimelineLayer[],
        ): Promise<TimelineLayer[]> => {
            const resolvedLayers = JSON.parse(
                JSON.stringify(savedLayers),
            ) as TimelineLayer[];
            const videoLayer = resolvedLayers.find(
                (layer) => layer.id === "videos",
            );
            const voiceoverLayer = resolvedLayers.find(
                (layer) => layer.id === "voiceovers",
            );
            const musicLayer = resolvedLayers.find(
                (layer) => layer.id === "music",
            );

            if (videoLayer) {
                for (let i = 0; i < videoLayer.items.length; i++) {
                    const item = videoLayer.items[i];
                    const sceneIndex = parseInt(item.id.replace("video-", ""));
                    const scene = scenario?.scenes?.[sceneIndex];
                    if (scene?.videoUri) {
                        try {
                            const result = await getDynamicImageUrl(
                                scene.videoUri,
                            );
                            if (result?.url) {
                                item.content = result.url;
                                if (!item.metadata?.originalDuration) {
                                    const originalDuration =
                                        await getVideoDuration(
                                            result.url,
                                            SCENE_DURATION,
                                        );
                                    item.metadata = {
                                        ...item.metadata,
                                        originalDuration,
                                    };
                                }
                            }
                        } catch (error) {
                            clientLogger.error(
                                `Error resolving video URL for item ${item.id}:`,
                                error,
                            );
                        }
                    }
                }
            }

            if (voiceoverLayer) {
                for (const item of voiceoverLayer.items) {
                    const sceneIndex = parseInt(
                        item.id.replace("voiceover-", ""),
                    );
                    const scene = scenario?.scenes?.[sceneIndex];
                    if (scene?.voiceoverAudioUri) {
                        try {
                            const result = await getDynamicImageUrl(
                                scene.voiceoverAudioUri,
                            );
                            if (result?.url) item.content = result.url;
                        } catch (error) {
                            clientLogger.error(
                                `Error resolving voiceover URL for item ${item.id}:`,
                                error,
                            );
                        }
                    }
                }
            }

            if (
                musicLayer &&
                musicLayer.items.length > 0 &&
                scenario?.musicUrl
            ) {
                try {
                    const result = await getDynamicImageUrl(scenario.musicUrl);
                    if (result?.url) musicLayer.items[0].content = result.url;
                } catch (error) {
                    clientLogger.error("Error resolving music URL:", error);
                }
            }

            return resolvedLayers;
        };

        const initializeLayersFromScenario = async (): Promise<
            TimelineLayer[]
        > => {
            const initialLayers: TimelineLayer[] = [
                {
                    id: "videos",
                    name: "Videos",
                    type: "video",
                    items: (scenario?.scenes || []).map((scene, index) => ({
                        id: `video-${index}`,
                        startTime: index * SCENE_DURATION,
                        duration: SCENE_DURATION,
                        content: "",
                        type: "video" as const,
                        metadata: {
                            logoOverlay: scenario?.logoOverlay || undefined,
                        },
                    })),
                },
                {
                    id: "voiceovers",
                    name: "Voiceovers",
                    type: "voiceover",
                    items: [],
                },
                { id: "music", name: "Music", type: "music", items: [] },
            ];

            const videoLayer = initialLayers.find(
                (layer) => layer.id === "videos",
            )!;
            const voiceoverLayer = initialLayers.find(
                (layer) => layer.id === "voiceovers",
            )!;
            const musicLayer = initialLayers.find(
                (layer) => layer.id === "music",
            )!;

            const videoScenes = scenario?.scenes || [];
            for (let i = 0; i < videoScenes.length; i++) {
                const scene = videoScenes[i];
                if (scene.videoUri) {
                    try {
                        const result = await getDynamicImageUrl(scene.videoUri);
                        if (result?.url && videoLayer.items[i]) {
                            videoLayer.items[i].content = result.url;
                            const originalDuration = await getVideoDuration(
                                result.url,
                                SCENE_DURATION,
                            );
                            videoLayer.items[i].metadata = {
                                ...videoLayer.items[i].metadata,
                                originalDuration,
                                trimStart: 0,
                            };
                        }
                    } catch (error) {
                        clientLogger.error(
                            `Error resolving video URL for scene ${i}:`,
                            error,
                        );
                    }
                }
            }

            const voiceoverItems: TimelineItem[] = [];
            const voiceScenes = scenario?.scenes || [];
            for (let i = 0; i < voiceScenes.length; i++) {
                const scene = voiceScenes[i];
                if (scene.voiceoverAudioUri) {
                    try {
                        const result = await getDynamicImageUrl(
                            scene.voiceoverAudioUri,
                        );
                        if (result?.url) {
                            const duration = await getAudioDuration(
                                result.url,
                                SCENE_DURATION,
                            );
                            voiceoverItems.push({
                                id: `voiceover-${i}`,
                                startTime: i * SCENE_DURATION,
                                duration,
                                content: result.url,
                                type: "voiceover",
                                metadata: {
                                    originalDuration: duration,
                                    trimStart: 0,
                                },
                            });
                        }
                    } catch (error) {
                        clientLogger.error(
                            `Error resolving voiceover for scene ${i}:`,
                            error,
                        );
                    }
                }
            }
            voiceoverLayer.items = voiceoverItems;

            if (scenario?.musicUrl) {
                try {
                    const result = await getDynamicImageUrl(scenario.musicUrl);
                    if (result?.url) {
                        const duration = await getAudioDuration(
                            result.url,
                            SCENE_DURATION,
                        );
                        musicLayer.items = [
                            {
                                id: "background-music",
                                startTime: 0,
                                duration,
                                content: result.url,
                                type: "music",
                                metadata: {
                                    originalDuration: duration,
                                    trimStart: 0,
                                },
                            },
                        ];
                    }
                } catch (error) {
                    clientLogger.error("Error resolving music:", error);
                }
            }

            return initialLayers;
        };

        initializeTimeline();
    }, [scenario, scenarioId, SCENE_DURATION, isAuthenticated, loadTimeline]);

    // Auto-save timeline
    useEffect(() => {
        if (
            !isTimelineLoaded ||
            !scenarioId ||
            !isAuthenticated ||
            isInitializingRef.current
        )
            return;
        clientLogger.info("Auto-saving timeline to Firestore...");
        saveTimelineDebounced(scenarioId, layers);
    }, [
        layers,
        scenarioId,
        isAuthenticated,
        isTimelineLoaded,
        saveTimelineDebounced,
    ]);

    // Playback controls
    const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);
    const handlePlaybackEnded = useCallback(() => {
        setIsPlaying(false);
        onTimeUpdate(0);
    }, [onTimeUpdate]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.code === "Space" &&
                !(
                    e.target instanceof HTMLInputElement ||
                    e.target instanceof HTMLTextAreaElement
                )
            ) {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [togglePlay]);

    if (!scenario) return null;

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Produce your movie
                    </h2>
                    <p className="text-muted-foreground">
                        Finalize transitions, audio, and export your final
                        video.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {isExporting && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${exportProgress}%` }}
                                />
                            </div>
                            <span>{exportProgress}%</span>
                        </div>
                    )}
                    <Button
                        size="lg"
                        onClick={() => onExportMovie(layers)}
                        disabled={isExporting}
                        className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Film className="mr-2 h-5 w-5" />
                                Export Movie
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="mx-auto w-full max-w-3xl">
                <MediabunnyPlayer
                    layers={layers}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onPlayPause={togglePlay}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={handlePlaybackEnded}
                    logoOverlay={logoOverlay}
                    aspectRatio={
                        scenario?.aspectRatio === "9:16" ? "9:16" : "16:9"
                    }
                />
            </div>

            <TimelineEditor
                layers={layers}
                setLayers={setLayers}
                currentTime={currentTime}
                onTimeUpdate={onTimeUpdate}
                setIsPlaying={setIsPlaying}
                isGeneratingVoiceover={isGeneratingVoiceover}
                isGeneratingMusic={isGeneratingMusic}
                onRemoveVoiceover={handleRemoveVoiceoverFromTimeline}
                onRemoveMusic={handleRemoveMusicFromTimeline}
                onOpenVoiceDialog={handleOpenVoiceDialog}
                onOpenMusicDialog={handleOpenMusicDialog}
            />

            <VoiceSelectionDialog
                isOpen={isVoiceDialogOpen}
                onClose={handleCloseVoiceDialog}
                onVoiceSelect={handleVoiceSelect}
                isGenerating={isGeneratingVoiceover}
            />

            <MusicSelectionDialog
                isOpen={isMusicDialogOpen}
                onClose={handleCloseMusicDialog}
                onMusicGenerate={handleMusicGenerate}
                isGenerating={isGeneratingMusic}
                currentParams={{ description: scenario.music || "" }}
            />
        </div>
    );
}
