"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { StyleSelector, type Style } from "./style-selector";

const styles: Style[] = [
    { name: "Photographic", image: "/styles/photographic_v2.png" },
    { name: "2D Animation", image: "/styles/2d.png" },
    { name: "Anime", image: "/styles/anime.png" },
    { name: "3D Animation", image: "/styles/3d.png" },
    { name: "Claymation", image: "/styles/claymation.png" },
];

interface VisualStyleSelectorProps {
    style: string;
    setStyle: (val: string) => void;
    styleImageUri: string | null;
    setStyleImageUri: (val: string | null) => void;
}

export function VisualStyleSelector({
    style,
    setStyle,
    styleImageUri,
    setStyleImageUri,
}: VisualStyleSelectorProps) {
    return (
        <Card className="border border-border shadow-none">
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Visual Style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <StyleSelector
                    styles={styles}
                    onSelect={setStyle}
                    styleImageUri={styleImageUri}
                    onStyleImageUpload={setStyleImageUri}
                    currentStyle={style}
                />
                <div className="mt-4 flex items-center gap-2 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Selected Style:
                    </span>
                    <span className="text-sm font-medium text-[#0EA5E9]">
                        {style || "None"}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
