import { useCallback } from "react";
import { TimelineLayer, TimelineItem } from "@/app/types";
import {
    TIMELINE_DURATION,
    RESIZE_SNAP_THRESHOLD,
    SNAP_THRESHOLD,
} from "../constants/editor-constants";

export function useSnapPoints(layers: TimelineLayer[]) {
    // Find snap point for resize operations - snaps an edge position to other clip edges
    const findResizeSnapPoint = useCallback(
        (
            edgePosition: number,
            layerId: string,
            excludeItemId: string,
        ): { snappedPosition: number; snapLineAt: number | null } => {
            const layer = layers.find((l) => l.id === layerId);
            if (!layer)
                return { snappedPosition: edgePosition, snapLineAt: null };

            const otherClips = layer.items.filter(
                (i) => i.id !== excludeItemId,
            );

            let bestSnap = edgePosition;
            let snapLineAt: number | null = null;
            let minDistance = RESIZE_SNAP_THRESHOLD;

            // Snap to timeline start
            if (Math.abs(edgePosition) < minDistance) {
                minDistance = Math.abs(edgePosition);
                bestSnap = 0;
                snapLineAt = 0;
            }

            // Snap to timeline end
            if (Math.abs(edgePosition - TIMELINE_DURATION) < minDistance) {
                minDistance = Math.abs(edgePosition - TIMELINE_DURATION);
                bestSnap = TIMELINE_DURATION;
                snapLineAt = TIMELINE_DURATION;
            }

            // Snap to other clips in the same layer
            for (const clip of otherClips) {
                const clipEnd = clip.startTime + clip.duration;

                // Snap to clip's start
                if (Math.abs(edgePosition - clip.startTime) < minDistance) {
                    minDistance = Math.abs(edgePosition - clip.startTime);
                    bestSnap = clip.startTime;
                    snapLineAt = clip.startTime;
                }

                // Snap to clip's end
                if (Math.abs(edgePosition - clipEnd) < minDistance) {
                    minDistance = Math.abs(edgePosition - clipEnd);
                    bestSnap = clipEnd;
                    snapLineAt = clipEnd;
                }
            }

            // Cross-layer snapping: audio clips snap to video clip edges
            const isAudioLayer =
                layerId === "voiceovers" || layerId === "music";
            if (isAudioLayer) {
                const videoLayer = layers.find((l) => l.id === "videos");
                if (videoLayer) {
                    for (const videoClip of videoLayer.items) {
                        const videoClipEnd =
                            videoClip.startTime + videoClip.duration;

                        // Snap to video clip's start
                        if (
                            Math.abs(edgePosition - videoClip.startTime) <
                            minDistance
                        ) {
                            minDistance = Math.abs(
                                edgePosition - videoClip.startTime,
                            );
                            bestSnap = videoClip.startTime;
                            snapLineAt = videoClip.startTime;
                        }

                        // Snap to video clip's end
                        if (
                            Math.abs(edgePosition - videoClipEnd) < minDistance
                        ) {
                            minDistance = Math.abs(edgePosition - videoClipEnd);
                            bestSnap = videoClipEnd;
                            snapLineAt = videoClipEnd;
                        }
                    }
                }
            }

            return { snappedPosition: bestSnap, snapLineAt };
        },
        [layers],
    );

    // Find snap point for insert mode - snaps to edges of other clips
    const findSnapPointForInsert = useCallback(
        (
            proposedStart: number,
            duration: number,
            excludeItemId: string,
            originalLayerItems: TimelineItem[],
            draggingItemLayerId: string | undefined,
        ): { clipStart: number; snapLineAt: number | null } => {
            const otherClips = originalLayerItems
                .filter((i) => i.id !== excludeItemId)
                .sort((a, b) => a.startTime - b.startTime);

            let bestSnap = proposedStart;
            let snapLineAt: number | null = null;
            let minDistance = SNAP_THRESHOLD;

            // Snap to timeline start
            if (Math.abs(proposedStart) < minDistance) {
                minDistance = Math.abs(proposedStart);
                bestSnap = 0;
                snapLineAt = 0;
            }

            // Snap to timeline end (clip END snaps to timeline end)
            const endPos = TIMELINE_DURATION - duration;
            if (Math.abs(proposedStart - endPos) < minDistance) {
                minDistance = Math.abs(proposedStart - endPos);
                bestSnap = endPos;
                snapLineAt = TIMELINE_DURATION; // Line at clip's END position
            }

            for (const clip of otherClips) {
                const clipEnd = clip.startTime + clip.duration;

                // Snap dragged clip's START to this clip's END
                if (Math.abs(proposedStart - clipEnd) < minDistance) {
                    minDistance = Math.abs(proposedStart - clipEnd);
                    bestSnap = clipEnd;
                    snapLineAt = clipEnd; // Line at clip's START position
                }

                // Snap dragged clip's END to this clip's START
                const alignedStart = clip.startTime - duration;
                if (
                    alignedStart >= 0 &&
                    Math.abs(proposedStart - alignedStart) < minDistance
                ) {
                    minDistance = Math.abs(proposedStart - alignedStart);
                    bestSnap = alignedStart;
                    snapLineAt = clip.startTime; // Line at clip's END position
                }

                // Snap dragged clip's START to this clip's START
                if (Math.abs(proposedStart - clip.startTime) < minDistance) {
                    minDistance = Math.abs(proposedStart - clip.startTime);
                    bestSnap = clip.startTime;
                    snapLineAt = clip.startTime; // Line at clip's START position
                }
            }

            // Cross-layer snapping: audio clips snap to video clip edges
            const isAudioLayer =
                draggingItemLayerId === "voiceovers" ||
                draggingItemLayerId === "music";
            if (isAudioLayer) {
                const videoLayer = layers.find((l) => l.id === "videos");
                if (videoLayer) {
                    for (const videoClip of videoLayer.items) {
                        const videoClipEnd =
                            videoClip.startTime + videoClip.duration;

                        // Snap audio clip's START to video clip's START
                        if (
                            Math.abs(proposedStart - videoClip.startTime) <
                            minDistance
                        ) {
                            minDistance = Math.abs(
                                proposedStart - videoClip.startTime,
                            );
                            bestSnap = videoClip.startTime;
                            snapLineAt = videoClip.startTime;
                        }

                        // Snap audio clip's START to video clip's END
                        if (
                            Math.abs(proposedStart - videoClipEnd) < minDistance
                        ) {
                            minDistance = Math.abs(
                                proposedStart - videoClipEnd,
                            );
                            bestSnap = videoClipEnd;
                            snapLineAt = videoClipEnd;
                        }

                        // Snap audio clip's END to video clip's START
                        const alignedToVideoStart =
                            videoClip.startTime - duration;
                        if (
                            alignedToVideoStart >= 0 &&
                            Math.abs(proposedStart - alignedToVideoStart) <
                                minDistance
                        ) {
                            minDistance = Math.abs(
                                proposedStart - alignedToVideoStart,
                            );
                            bestSnap = alignedToVideoStart;
                            snapLineAt = videoClip.startTime; // Line at audio's END position
                        }

                        // Snap audio clip's END to video clip's END
                        const alignedToVideoEnd = videoClipEnd - duration;
                        if (
                            alignedToVideoEnd >= 0 &&
                            Math.abs(proposedStart - alignedToVideoEnd) <
                                minDistance
                        ) {
                            minDistance = Math.abs(
                                proposedStart - alignedToVideoEnd,
                            );
                            bestSnap = alignedToVideoEnd;
                            snapLineAt = videoClipEnd; // Line at audio's END position
                        }
                    }
                }
            }

            return { clipStart: bestSnap, snapLineAt };
        },
        [layers],
    );

    return { findResizeSnapPoint, findSnapPointForInsert };
}
