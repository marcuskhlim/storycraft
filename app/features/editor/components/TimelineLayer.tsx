import {
    TimelineLayer as TimelineLayerType,
    TimelineItem as TimelineItemType,
} from "@/app/types";
import { TimelineItem } from "./TimelineItem";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { memo } from "react";

interface TimelineLayerProps {
    layer: TimelineLayerType;
    selectedItem: { layerId: string; itemId: string } | null;
    isDragging: boolean;
    isResizing: boolean;
    draggingItem: { layerId: string; itemId: string } | null;
    resizingItem: { layerId: string; itemId: string } | null;
    originalLayerItems: TimelineItemType[];
    timelineWidth: number;
    isGeneratingVoiceover: boolean;
    isGeneratingMusic: boolean;
    onItemClick: (e: React.MouseEvent, layerId: string, itemId: string) => void;
    onDragStart: (e: React.MouseEvent, layerId: string, itemId: string) => void;
    onResizeStart: (
        e: React.MouseEvent,
        layerId: string,
        itemId: string,
        handle: "start" | "end",
    ) => void;
    onRemoveVoiceover: (itemId: string) => void;
    onRemoveMusic: () => void;
    onOpenVoiceDialog: () => void;
    onOpenMusicDialog: () => void;
}

export const TimelineLayer = memo(function TimelineLayer({
    layer,
    selectedItem,
    isDragging,
    isResizing,
    draggingItem,
    resizingItem,
    originalLayerItems,
    timelineWidth,
    isGeneratingVoiceover,
    isGeneratingMusic,
    onItemClick,
    onDragStart,
    onResizeStart,
    onRemoveVoiceover,
    onRemoveMusic,
    onOpenVoiceDialog,
    onOpenMusicDialog,
}: TimelineLayerProps) {
    return (
        <div className="relative h-12 rounded border border-border bg-card">
            <div className="absolute -left-24 top-0 flex h-full select-none items-center px-2 text-sm font-medium">
                {layer.name}
            </div>
            <div className="relative h-full">
                {layer.items.length > 0 ? (
                    layer.items.map((item) => {
                        const isSelected =
                            selectedItem?.layerId === layer.id &&
                            selectedItem?.itemId === item.id;
                        const isBeingDragged =
                            draggingItem?.layerId === layer.id &&
                            draggingItem?.itemId === item.id;
                        const isBeingResized =
                            resizingItem?.layerId === layer.id &&
                            resizingItem?.itemId === item.id;

                        // Check if this clip is being pushed
                        const originalItem = originalLayerItems.find(
                            (i) => i.id === item.id,
                        );
                        const isBeingPushed = !!(
                            isDragging &&
                            !isBeingDragged &&
                            originalItem &&
                            Math.abs(item.startTime - originalItem.startTime) >
                                0.01
                        );

                        return (
                            <TimelineItem
                                key={item.id}
                                item={item}
                                layer={layer}
                                isSelected={isSelected}
                                isDragging={isDragging}
                                isResizing={isResizing}
                                isBeingDragged={isBeingDragged}
                                isBeingResized={isBeingResized}
                                isBeingPushed={isBeingPushed}
                                timelineWidth={timelineWidth}
                                onClick={(e) =>
                                    !isDragging &&
                                    onItemClick(e, layer.id, item.id)
                                }
                                onMouseDown={(e) =>
                                    onDragStart(e, layer.id, item.id)
                                }
                                onResizeStart={(e, handle) =>
                                    onResizeStart(e, layer.id, item.id, handle)
                                }
                                onRemove={() => {
                                    if (layer.id === "voiceovers")
                                        onRemoveVoiceover(item.id);
                                    else if (layer.id === "music")
                                        onRemoveMusic();
                                }}
                            />
                        );
                    })
                ) : (
                    <div className="flex h-full w-full items-center justify-center rounded border border-border bg-muted p-1">
                        {layer.type === "voiceover" ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenVoiceDialog();
                                }}
                                disabled={isGeneratingVoiceover}
                                className="flex items-center gap-2 bg-black/50 hover:bg-green-500 hover:text-white"
                            >
                                {isGeneratingVoiceover ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                    >
                                        <path d="M9 18V5l12-2v13" />
                                        <circle cx="6" cy="18" r="3" />
                                        <circle cx="18" cy="16" r="3" />
                                    </svg>
                                )}
                                {isGeneratingVoiceover
                                    ? "Generating..."
                                    : "Generate voiceover with Gemini-TTS"}
                            </Button>
                        ) : layer.type === "music" ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenMusicDialog();
                                }}
                                disabled={isGeneratingMusic}
                                className="flex items-center gap-2 bg-black/50 hover:bg-purple-500 hover:text-white"
                            >
                                {isGeneratingMusic ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                    >
                                        <path d="M9 18V5l12-2v13" />
                                        <circle cx="6" cy="18" r="3" />
                                        <circle cx="18" cy="16" r="3" />
                                    </svg>
                                )}
                                {isGeneratingMusic
                                    ? "Generating..."
                                    : "Generate music with Lyria"}
                            </Button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
});
