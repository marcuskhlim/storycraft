"use client";

import { VideoPrompt } from "@/app/types";

export function VideoPromptDisplay({
    videoPrompt,
}: {
    videoPrompt: VideoPrompt;
}) {
    return (
        <div className="space-y-3">
            <div>
                <span className="text-xs font-medium">Action:</span>
                <p className="text-sm text-card-foreground/80">
                    {videoPrompt.Action}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Camera Motion:</span>
                <p className="text-sm text-card-foreground/80">
                    {videoPrompt.Camera_Motion}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Ambiance Audio:</span>
                <p className="text-sm text-card-foreground/80">
                    {videoPrompt.Ambiance_Audio}
                </p>
            </div>
            {videoPrompt.Dialogue.length > 0 && (
                <div>
                    <span className="text-xs font-medium">Dialogue:</span>
                    {videoPrompt.Dialogue.map((dialogue, index) => (
                        <p
                            key={index}
                            className="ml-2 text-sm text-card-foreground/80"
                        >
                            • {dialogue.speaker}: &quot;{dialogue.line}&quot;
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
