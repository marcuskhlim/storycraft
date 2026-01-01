import {
    TIMELINE_DURATION,
    MARKER_INTERVAL,
} from "../constants/editor-constants";
import { formatTime } from "../utils/editor-utils";
import { memo } from "react";

export const TimelineMarkers = memo(function TimelineMarkers() {
    return (
        <div className="absolute left-0 right-0 top-0 flex h-6 justify-between text-xs text-gray-500">
            {Array.from({
                length: TIMELINE_DURATION / MARKER_INTERVAL + 1,
            }).map((_, i) => (
                <div key={i} className="relative">
                    <div className="absolute -top-4 left-0 -translate-x-1/2 transform select-none">
                        {formatTime(i * MARKER_INTERVAL)}
                    </div>
                    <div className="absolute left-0 top-0 h-6 w-px bg-gray-300" />
                </div>
            ))}
        </div>
    );
});
