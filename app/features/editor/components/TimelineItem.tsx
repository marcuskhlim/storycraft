import {
    TimelineItem as TimelineItemType,
    TimelineLayer as TimelineLayerType,
} from "@/app/types";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { VideoThumbnail } from "./video-thumbnail";
import { AudioWaveform } from "./audio-wave-form";
import { TIMELINE_DURATION, CLIP_PADDING } from "../constants/editor-constants";

interface TimelineItemProps {
    item: TimelineItemType;
    layer: TimelineLayerType;
    isSelected: boolean;
    isDragging: boolean;
    isResizing: boolean;
    isBeingDragged: boolean;
    isBeingResized: boolean;
    isBeingPushed: boolean;
    timelineWidth: number;
    onClick: (e: React.MouseEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onResizeStart: (e: React.MouseEvent, handle: "start" | "end") => void;
    onRemove: () => void;
}

export function TimelineItem({
    item,
    layer,
    isSelected,
    isDragging,
    isResizing,
    isBeingDragged,
    isBeingResized,
    isBeingPushed,
    timelineWidth,
    onClick,
    onMouseDown,
    onResizeStart,
    onRemove,
}: TimelineItemProps) {
    const paddingTime = (CLIP_PADDING * 2 * TIMELINE_DURATION) / timelineWidth;
    const hasContent = !!item.content;

    return (
        <div
            className={`group absolute bottom-1 top-1 overflow-hidden rounded ${isDragging || isBeingPushed ? "" : "transition-shadow"} ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""} ${isBeingDragged ? "z-20 shadow-xl ring-2 ring-blue-400" : ""} ${isBeingPushed ? "z-10 ring-2 ring-amber-400 ring-offset-1" : ""} ${isBeingResized ? "z-20" : ""} ${!isDragging && !isResizing ? "cursor-grab hover:shadow-md" : ""}`}
            style={{
                left: `${((item.startTime + paddingTime / 2) / TIMELINE_DURATION) * 100}%`,
                width: `calc(${(item.duration / TIMELINE_DURATION) * 100}% - ${CLIP_PADDING * 2}px)`,
            }}
            onClick={onClick}
            onMouseDown={onMouseDown}
        >
            {layer.type === "video" && hasContent ? (
                <VideoThumbnail
                    src={item.content!}
                    duration={item.duration}
                    trimStart={(item.metadata?.trimStart as number) || 0}
                    originalDuration={
                        (item.metadata?.originalDuration as number) || undefined
                    }
                    isResizing={isBeingResized}
                    className="h-full w-full"
                />
            ) : (layer.type === "voiceover" || layer.type === "music") &&
              hasContent ? (
                <div
                    className={`relative h-full w-full rounded border ${layer.type === "voiceover" ? "border-green-500/30 bg-green-500/10" : "border-purple-500/30 bg-purple-500/10"} p-1`}
                >
                    <AudioWaveform
                        src={item.content!}
                        className="h-full w-full"
                        color={
                            layer.type === "voiceover"
                                ? "bg-green-500"
                                : "bg-purple-500"
                        }
                        duration={item.duration}
                        trimStart={(item.metadata?.trimStart as number) || 0}
                        originalDuration={
                            (item.metadata?.originalDuration as number) ||
                            undefined
                        }
                        isResizing={isBeingResized}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="absolute right-0 top-0 h-6 w-6 bg-red-500 p-0 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        title={`Remove ${layer.type}`}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            ) : (
                <div
                    className={`h-full w-full rounded ${
                        layer.type === "video"
                            ? "border border-blue-500 bg-blue-500/20"
                            : "border border-gray-400 bg-gray-300/20"
                    }`}
                />
            )}

            {/* Resize handles */}
            <div
                className="resize-handle absolute bottom-0 left-0 top-0 z-10 w-2 cursor-ew-resize bg-gradient-to-r from-blue-500/60 to-transparent opacity-0 transition-opacity hover:from-blue-500 hover:!opacity-100 group-hover:opacity-100"
                onMouseDown={(e) => onResizeStart(e, "start")}
            >
                <div className="absolute left-0.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>
            <div
                className="resize-handle absolute bottom-0 right-0 top-0 z-10 w-2 cursor-ew-resize bg-gradient-to-l from-blue-500/60 to-transparent opacity-0 transition-opacity hover:from-blue-500 hover:!opacity-100 group-hover:opacity-100"
                onMouseDown={(e) => onResizeStart(e, "end")}
            >
                <div className="absolute right-0.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>
        </div>
    );
}
