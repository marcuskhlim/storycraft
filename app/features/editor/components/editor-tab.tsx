"use client";

import { TimelineLayer, TimelineItem } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Film, Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { MediabunnyPlayer } from "./mediabunny-player";
import { MusicParams, MusicSelectionDialog } from "./music-selection-dialog";
import { Voice, VoiceSelectionDialog } from "./voice-selection-dialog";
import { useTimeline } from "@/app/features/editor/hooks/use-timeline";
import { generateVoiceover } from "@/app/features/editor/actions/generate-voiceover";
import { generateMusic } from "@/app/features/editor/actions/generate-music";
import { clientLogger } from "@/lib/utils/client-logger";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";
import { useEditorStore } from "@/app/features/editor/stores/useEditorStore";
import { TimelineEditor } from "./TimelineEditor";
import { getAudioDuration, getVideoDuration } from "../utils/editor-utils";
import { useEditorActions } from "@/app/features/editor/hooks/use-editor-actions";

export const EditorTab = memo(function EditorTab() {
    const { scenario, logoOverlay } = useScenarioStore();
    const scenarioId = scenario?.id || null;
    const { video: isExporting } = useLoadingStore();
    const {
        currentTime,
        exportProgress,
        setCurrentTime: onTimeUpdate,
    } = useEditorStore();

    const { handleExportMovie } = useEditorActions();

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
    const lastSavedLayersRef = useRef<string | null>(null);

    // Sync logoOverlay from store to layers
    useEffect(() => {
        if (!isTimelineLoaded || !logoOverlay) return;

        setLayers((prevLayers) =>
            prevLayers.map((layer) => {
                if (layer.id !== "videos") return layer;
                return {
                    ...layer,
                    items: layer.items.map((item) => ({
                        ...item,
                        metadata: {
                            ...item.metadata,
                            logoOverlay,
                        },
                    })),
                };
            }),
        );
    }, [logoOverlay, isTimelineLoaded]);

    // Initialize timeline
    useEffect(() => {
        const initializeTimeline = async () => {
            if (isInitializingRef.current || !scenario) return;
            isInitializingRef.current = true;

            try {
                let initialLayers: TimelineLayer[] = [];

                if (scenarioId && isAuthenticated) {
                    const savedLayers = await loadTimeline(scenarioId);
                    if (savedLayers && savedLayers.length > 0) {
                        clientLogger.info(
                            "Loaded saved timeline from Firestore",
                        );
                        initialLayers = savedLayers;
                    }
                }

                if (initialLayers.length === 0) {
                    clientLogger.info("Initializing timeline from scenario");
                    initialLayers = [
                        {
                            id: "videos",
                            name: "Videos",
                            type: "video",
                            items: (scenario?.scenes || []).map(
                                (scene, index) => ({
                                    id: `video-${index}`,
                                    startTime: index * SCENE_DURATION,
                                    duration: SCENE_DURATION,
                                    content: "",
                                    type: "video" as const,
                                    metadata: {
                                        logoOverlay:
                                            scenario?.logoOverlay || undefined,
                                    },
                                }),
                            ),
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
                    ];
                }

                setLayers(initialLayers);
                lastSavedLayersRef.current = JSON.stringify(initialLayers);
                setIsTimelineLoaded(true);

                // Resolve URLs progressively
                await resolveLayerUrlsProgressively(initialLayers);
            } catch (error) {
                clientLogger.error("Error initializing timeline:", error);
                setIsTimelineLoaded(true);
            } finally {
                isInitializingRef.current = false;
            }
        };

        const resolveLayerUrlsProgressively = async (
            baseLayers: TimelineLayer[],
        ) => {
            // Create a deep copy to work with
            const workingLayers = JSON.parse(
                JSON.stringify(baseLayers),
            ) as TimelineLayer[];

            const promises: Promise<void>[] = [];

            // 1. Prepare Video Resolutions
            const videoLayerIndex = workingLayers.findIndex(
                (l) => l.id === "videos",
            );
            if (videoLayerIndex !== -1) {
                const videoLayer = workingLayers[videoLayerIndex];
                videoLayer.items.forEach((item) => {
                    const sceneIndex = parseInt(item.id.replace("video-", ""));
                    const scene = scenario?.scenes?.[sceneIndex];

                    // Always refresh signed URLs - they expire after 1 hour
                    if (scene?.videoUri) {
                        promises.push(
                            (async () => {
                                try {
                                    const response = await fetch(
                                        `/api/media?uri=${encodeURIComponent(scene.videoUri!)}`,
                                    );
                                    if (!response.ok)
                                        throw new Error("Failed to fetch");
                                    const result = await response.json();
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
                                                trimStart: 0,
                                            };
                                        }
                                    }
                                } catch (error) {
                                    clientLogger.error(
                                        `Error resolving video URL for item ${item.id}:`,
                                        error,
                                    );
                                }
                            })(),
                        );
                    }
                });
            }

            // 2. Prepare Voiceover Resolutions
            const voiceoverLayerIndex = workingLayers.findIndex(
                (l) => l.id === "voiceovers",
            );
            if (voiceoverLayerIndex !== -1) {
                const voiceoverLayer = workingLayers[voiceoverLayerIndex];
                if (voiceoverLayer.items.length === 0) {
                    const voiceScenes = scenario?.scenes || [];
                    voiceScenes.forEach((scene, i) => {
                        if (scene.voiceoverAudioUri) {
                            promises.push(
                                (async () => {
                                    try {
                                        const response = await fetch(
                                            `/api/media?uri=${encodeURIComponent(scene.voiceoverAudioUri!)}`,
                                        );
                                        if (!response.ok)
                                            throw new Error("Failed to fetch");
                                        const result = await response.json();
                                        if (result?.url) {
                                            const duration =
                                                await getAudioDuration(
                                                    result.url,
                                                    SCENE_DURATION,
                                                );
                                            voiceoverLayer.items.push({
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
                                })(),
                            );
                        }
                    });
                } else {
                    voiceoverLayer.items.forEach((item) => {
                        const sceneIndex = parseInt(
                            item.id.replace("voiceover-", ""),
                        );
                        const scene = scenario?.scenes?.[sceneIndex];
                        // Always refresh signed URLs - they expire after 1 hour
                        if (scene?.voiceoverAudioUri) {
                            promises.push(
                                (async () => {
                                    try {
                                        const response = await fetch(
                                            `/api/media?uri=${encodeURIComponent(scene.voiceoverAudioUri!)}`,
                                        );
                                        if (!response.ok)
                                            throw new Error("Failed to fetch");
                                        const result = await response.json();
                                        if (result?.url) {
                                            item.content = result.url;
                                        }
                                    } catch (error) {
                                        clientLogger.error(
                                            `Error resolving voiceover URL for item ${item.id}:`,
                                            error,
                                        );
                                    }
                                })(),
                            );
                        }
                    });
                }
            }

            // 3. Prepare Music Resolution - always refresh signed URLs
            const musicLayerIndex = workingLayers.findIndex(
                (l) => l.id === "music",
            );
            if (musicLayerIndex !== -1 && scenario?.musicUrl) {
                const musicLayer = workingLayers[musicLayerIndex];
                promises.push(
                    (async () => {
                        try {
                            const response = await fetch(
                                `/api/media?uri=${encodeURIComponent(scenario.musicUrl!)}`,
                            );
                            if (!response.ok)
                                throw new Error("Failed to fetch");
                            const result = await response.json();
                            if (result?.url) {
                                if (musicLayer.items.length === 0) {
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
                                } else {
                                    musicLayer.items[0].content = result.url;
                                }
                            }
                        } catch (error) {
                            clientLogger.error(
                                "Error resolving music URL:",
                                error,
                            );
                        }
                    })(),
                );
            }

            // Resolve all in parallel (the loader will batch them)
            if (promises.length > 0) {
                await Promise.all(promises);
                // Sort voiceover items by startTime to ensure order after parallel push
                if (voiceoverLayerIndex !== -1) {
                    workingLayers[voiceoverLayerIndex].items.sort(
                        (a, b) => a.startTime - b.startTime,
                    );
                }
                setLayers(workingLayers);
                lastSavedLayersRef.current = JSON.stringify(workingLayers);
            }
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

        const currentContent = JSON.stringify(layers);
        if (
            lastSavedLayersRef.current !== null &&
            currentContent !== lastSavedLayersRef.current
        ) {
            lastSavedLayersRef.current = currentContent;
            clientLogger.info("Auto-saving timeline to Firestore...");
            saveTimelineDebounced(scenarioId, layers);
        }
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

    // Internal handler: Remove voiceover from timeline
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

    // Internal handler: Remove music from timeline
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

                const voiceoverItems: TimelineItem[] = await Promise.all(
                    voiceoverUrls.map(async (url, index) => {
                        const response = await fetch(
                            `/api/media?uri=${encodeURIComponent(url)}`,
                        );
                        if (!response.ok) throw new Error("Failed to fetch");
                        const result = await response.json();
                        const dynamicUrl = result.url || url;
                        const duration = await getAudioDuration(
                            dynamicUrl,
                            SCENE_DURATION,
                        );

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
                const response = await fetch(
                    `/api/media?uri=${encodeURIComponent(musicUrl)}`,
                );
                if (!response.ok) throw new Error("Failed to fetch");
                const result = await response.json();
                const dynamicUrl = result.url || musicUrl;
                const duration = await getAudioDuration(
                    dynamicUrl,
                    SCENE_DURATION,
                );

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
                        onClick={() => handleExportMovie(layers)}
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
});
