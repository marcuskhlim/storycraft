import { useRef, useState, useEffect, memo } from "react";
import { TimelineLayer as TimelineLayerType } from "@/app/types";
import { TimelineMarkers } from "./TimelineMarkers";
import { TimelinePlayhead } from "./TimelinePlayhead";
import { TimelineLayer } from "./TimelineLayer";
import { TIMELINE_DURATION } from "../constants/editor-constants";
import { useTimelineInteractions } from "../hooks/use-timeline-interactions";

interface TimelineEditorProps {
    layers: TimelineLayerType[];
    setLayers: React.Dispatch<React.SetStateAction<TimelineLayerType[]>>;
    currentTime: number;
    onTimeUpdate: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    isGeneratingVoiceover: boolean;
    isGeneratingMusic: boolean;
    onRemoveVoiceover: (itemId: string) => void;
    onRemoveMusic: () => void;
    onOpenVoiceDialog: () => void;
    onOpenMusicDialog: () => void;
}

export const TimelineEditor = memo(function TimelineEditor({
    layers,
    setLayers,
    currentTime,
    onTimeUpdate,
    setIsPlaying,
    isGeneratingVoiceover,
    isGeneratingMusic,
    onRemoveVoiceover,
    onRemoveMusic,
    onOpenVoiceDialog,
    onOpenMusicDialog,
}: TimelineEditorProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [timelineWidth, setTimelineWidth] = useState(0);

    const {
        selectedItem,
        isResizing,
        resizingItem,
        isDragging,
        draggingItem,
        snapLinePosition,
        handleItemClick,
        handleResizeStart,
        handleDragStart,
        originalLayerItems,
    } = useTimelineInteractions({
        layers,
        setLayers,
        timelineRef,
    });

    useEffect(() => {
        if (timelineRef.current) {
            setTimelineWidth(timelineRef.current.clientWidth);

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setTimelineWidth(entry.contentRect.width);
                }
            });

            resizeObserver.observe(timelineRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const timeScale = rect.width / TIMELINE_DURATION;
        const newTime = Math.max(
            0,
            Math.min(TIMELINE_DURATION, clickPosition / timeScale),
        );

        setIsPlaying(false);
        onTimeUpdate(newTime);
    };

    return (
        <div className="space-y-2">
            <div
                ref={timelineRef}
                className={`relative w-full rounded-lg bg-gray-100 ${
                    isDragging || isResizing
                        ? "cursor-grabbing"
                        : "cursor-pointer"
                }`}
                onClick={
                    !isDragging && !isResizing ? handleTimelineClick : undefined
                }
            >
                <div className="relative pb-4 pt-4">
                    <TimelineMarkers />
                    <TimelinePlayhead currentTime={currentTime} />

                    {/* Snap indicator line */}
                    {snapLinePosition !== null && (
                        <div
                            className="pointer-events-none absolute bottom-0 top-0 z-20 w-0.5 bg-blue-500"
                            style={{
                                left: `${(snapLinePosition / TIMELINE_DURATION) * 100}%`,
                                height: "100%",
                            }}
                        />
                    )}

                    {/* Layers */}
                    <div className="mt-6 space-y-1">
                        {layers.map((layer) => (
                            <TimelineLayer
                                key={layer.id}
                                layer={layer}
                                selectedItem={selectedItem}
                                isDragging={isDragging}
                                isResizing={isResizing}
                                draggingItem={draggingItem}
                                resizingItem={resizingItem}
                                originalLayerItems={originalLayerItems}
                                timelineWidth={timelineWidth}
                                isGeneratingVoiceover={isGeneratingVoiceover}
                                isGeneratingMusic={isGeneratingMusic}
                                onItemClick={handleItemClick}
                                onDragStart={handleDragStart}
                                onResizeStart={handleResizeStart}
                                onRemoveVoiceover={onRemoveVoiceover}
                                onRemoveMusic={onRemoveMusic}
                                onOpenVoiceDialog={onOpenVoiceDialog}
                                onOpenMusicDialog={onOpenMusicDialog}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});
