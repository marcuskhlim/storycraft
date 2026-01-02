"use client";

import { ImagePrompt } from "@/app/types";

export function ImagePromptDisplay({
    imagePrompt,
}: {
    imagePrompt: ImagePrompt;
}) {
    return (
        <div className="space-y-3">
            <div>
                <span className="text-xs font-medium">Style:</span>
                <p className="text-sm text-card-foreground/80">
                    {imagePrompt.Style}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Scene:</span>
                <p className="text-sm text-card-foreground/80">
                    {imagePrompt.Scene}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Composition:</span>
                <p className="text-sm text-card-foreground/80">
                    {imagePrompt.Composition.shot_type},{" "}
                    {imagePrompt.Composition.lighting},{" "}
                    {imagePrompt.Composition.overall_mood}
                </p>
            </div>
            <div>
                <span className="text-xs font-medium">Subjects:</span>
                {imagePrompt.Subject.map((subject, index) => (
                    <p
                        key={index}
                        className="ml-2 text-sm text-card-foreground/80"
                    >
                        • {subject.name}
                    </p>
                ))}
            </div>
            {imagePrompt.Prop && imagePrompt.Prop.length > 0 && (
                <div>
                    <span className="text-xs font-medium">Props:</span>
                    {imagePrompt.Prop.map((prop, index) => (
                        <p
                            key={index}
                            className="ml-2 text-sm text-card-foreground/80"
                        >
                            • {prop.name}
                        </p>
                    ))}
                </div>
            )}
            <div>
                <span className="text-xs font-medium">Context:</span>
                {imagePrompt.Context.map((context, index) => (
                    <p
                        key={index}
                        className="ml-2 text-sm text-card-foreground/80"
                    >
                        • {context.name}
                    </p>
                ))}
            </div>
        </div>
    );
}
