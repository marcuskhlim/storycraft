"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    BookOpen,
    Loader2,
    Info,
    Sparkles,
    Clapperboard,
    Clock,
    Minus,
    Plus,
    Video,
    Smartphone,
    Languages,
    RectangleHorizontal,
} from "lucide-react";
import { type Language } from "../../types";
import { StyleSelector, type Style } from "./style-selector";
import { LoadingMessages } from "@/app/components/ui/loading-messages";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const LANGUAGES: Language[] = [
    { name: "Arabic (Generic)", code: "ar-XA" },
    { name: "Bengali (India)", code: "bn-IN" },
    { name: "Dutch (Belgium)", code: "nl-BE" },
    { name: "Dutch (Netherlands)", code: "nl-NL" },
    { name: "English (Australia)", code: "en-AU" },
    { name: "English (India)", code: "en-IN" },
    { name: "English (United Kingdom)", code: "en-GB" },
    { name: "English (United States)", code: "en-US" },
    { name: "French (Canada)", code: "fr-CA" },
    { name: "French (France)", code: "fr-FR" },
    { name: "German (Germany)", code: "de-DE" },
    { name: "Gujarati (India)", code: "gu-IN" },
    { name: "Hindi (India)", code: "hi-IN" },
    { name: "Indonesian (Indonesia)", code: "id-ID" },
    { name: "Italian (Italy)", code: "it-IT" },
    { name: "Japanese (Japan)", code: "ja-JP" },
    { name: "Kannada (India)", code: "kn-IN" },
    { name: "Korean (South Korea)", code: "ko-KR" },
    { name: "Malayalam (India)", code: "ml-IN" },
    { name: "Mandarin Chinese (China)", code: "cmn-CN" },
    { name: "Marathi (India)", code: "mr-IN" },
    { name: "Polish (Poland)", code: "pl-PL" },
    { name: "Portuguese (Brazil)", code: "pt-BR" },
    { name: "Russian (Russia)", code: "ru-RU" },
    { name: "Spanish (Spain)", code: "es-ES" },
    { name: "Spanish (United States)", code: "es-US" },
    { name: "Swahili (Kenya)", code: "sw-KE" },
    { name: "Tamil (India)", code: "ta-IN" },
    { name: "Telugu (India)", code: "te-IN" },
    { name: "Thai (Thailand)", code: "th-TH" },
    { name: "Turkish (Turkey)", code: "tr-TR" },
    { name: "Ukrainian (Ukraine)", code: "uk-UA" },
    { name: "Urdu (India)", code: "ur-IN" },
    { name: "Vietnamese (Vietnam)", code: "vi-VN" },
];

const ASPECT_RATIOS = [
    { name: "16:9", value: "16:9", icon: RectangleHorizontal },
    { name: "9:16", value: "9:16", icon: Smartphone },
];

interface CreateTabProps {
    name: string;
    setName: (name: string) => void;
    pitch: string;
    setPitch: (pitch: string) => void;
    numScenes: number;
    setNumScenes: (num: number) => void;
    style: string;
    setStyle: (style: string) => void;
    aspectRatio: string;
    setAspectRatio: (aspectRatio: string) => void;
    durationSeconds: number;
    setDurationSeconds: (duration: number) => void;
    language: Language;
    setLanguage: (language: Language) => void;
    isLoading: boolean;
    errorMessage: string | null;
    onGenerate: () => Promise<void>;
    styles: Style[];
    styleImageUri: string | null;
    setStyleImageUri: (uri: string | null) => void;
}

export function CreateTab({
    name,
    setName,
    pitch,
    setPitch,
    numScenes,
    setNumScenes,
    style,
    setStyle,
    aspectRatio,
    setAspectRatio,
    durationSeconds,
    setDurationSeconds,
    language,
    setLanguage,
    isLoading,
    errorMessage,
    onGenerate,
    styles,
    styleImageUri,
    setStyleImageUri,
}: CreateTabProps) {
    const totalLength = numScenes * durationSeconds;

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Define your story
                    </h2>
                    <p className="text-muted-foreground">
                        Start by pitching your idea and setting the visual tone.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <LoadingMessages isLoading={isLoading} />
                    <Button
                        size="lg"
                        onClick={onGenerate}
                        disabled={
                            isLoading ||
                            pitch.trim() === "" ||
                            name.trim() === ""
                        }
                        className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <BookOpen className="mr-2 h-5 w-5" />
                                Generate Scenario
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Story Basics Card */}
                <Card className="border border-zinc-200 shadow-none dark:border-zinc-800 md:col-span-3 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            <Clapperboard className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-xl">Story Basics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                                id="project-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Give a name to your story..."
                                className="h-12 bg-gray-50/50 dark:bg-gray-900/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="pitch">Pitch</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-full"
                                            >
                                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="sr-only">
                                                    Help
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="space-y-4">
                                                <h4 className="font-medium leading-none">
                                                    Pitch Guidance
                                                </h4>
                                                <div className="grid gap-4 text-xs text-muted-foreground">
                                                    <div className="grid gap-1">
                                                        <p className="font-medium text-foreground">
                                                            From Concept to
                                                            Creation
                                                        </p>
                                                        <p>
                                                            The AI can generate
                                                            a complete scenario
                                                            from a simple
                                                            logline or concept.
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <p className="font-medium text-foreground">
                                                            Detail Matters
                                                        </p>
                                                        <p>
                                                            The more details you
                                                            provide, the more
                                                            your instructions
                                                            will be respected.
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-1 pt-1">
                                                        <p className="font-medium text-foreground">
                                                            What you can specify
                                                        </p>
                                                        <ul className="list-inside list-disc space-y-1">
                                                            <li>
                                                                Scenario &
                                                                Characters
                                                            </li>
                                                            <li>
                                                                Settings &
                                                                Objects
                                                            </li>
                                                            <li>
                                                                Cinematography &
                                                                Lighting
                                                            </li>
                                                            <li>
                                                                Voiceovers,
                                                                Pacing & Music
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {pitch.length} Characters
                                </span>
                            </div>
                            <Textarea
                                id="pitch"
                                value={pitch}
                                onChange={(e) => setPitch(e.target.value)}
                                placeholder="Love at the Google Cloud conference..."
                                className="min-h-[140px] resize-none bg-gray-50/50 dark:bg-gray-900/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Languages className="h-4 w-4" /> Language
                            </Label>
                            <Select
                                value={language.code}
                                onValueChange={(code) => {
                                    const selected = LANGUAGES.find(
                                        (l) => l.code === code,
                                    );
                                    if (selected) setLanguage(selected);
                                }}
                            >
                                <SelectTrigger className="h-12 bg-gray-50/50 dark:bg-gray-900/50">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((lang) => (
                                        <SelectItem
                                            key={lang.code}
                                            value={lang.code}
                                        >
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column Grid */}
                <div className="flex flex-col gap-6 md:col-span-3 lg:col-span-1">
                    {/* Format Card */}
                    <Card className="flex-1 border border-zinc-200 shadow-none dark:border-zinc-800">
                        <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                                <div className="h-4 w-4 rounded border-2 border-current" />
                            </div>
                            <CardTitle className="text-lg">Format</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                {ASPECT_RATIOS.map((ratio) => {
                                    const Icon = ratio.icon;
                                    const isSelected =
                                        aspectRatio === ratio.value;
                                    return (
                                        <button
                                            key={ratio.value}
                                            onClick={() =>
                                                setAspectRatio(ratio.value)
                                            }
                                            className={cn(
                                                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                                                isSelected
                                                    ? "border-[#0EA5E9] bg-blue-50/50 dark:bg-blue-900/20"
                                                    : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800",
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "flex h-10 w-10 items-center justify-center rounded-lg",
                                                    isSelected
                                                        ? "bg-[#0EA5E9] text-white"
                                                        : "bg-gray-200 text-gray-500 dark:bg-gray-800",
                                                )}
                                            >
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <span className="text-sm font-semibold">
                                                {ratio.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Video Configuration Card */}
                    <Card className="flex-[2] border border-zinc-200 shadow-none dark:border-zinc-800">
                        <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                                <Video className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg">
                                Video Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="uppercase tracking-wider text-muted-foreground">
                                        Scene Count
                                    </Label>
                                    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                                setNumScenes(
                                                    Math.max(1, numScenes - 1),
                                                )
                                            }
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <div className="flex w-8 items-center justify-center font-bold">
                                            {numScenes}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                                setNumScenes(
                                                    Math.min(20, numScenes + 1),
                                                )
                                            }
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="uppercase tracking-wider text-muted-foreground">
                                            Duration per scene
                                        </Label>
                                        <span className="font-bold text-[#0EA5E9]">
                                            {durationSeconds}s
                                        </span>
                                    </div>
                                    <div className="pt-2">
                                        <Slider
                                            min={4}
                                            max={8}
                                            step={2}
                                            value={durationSeconds}
                                            onValueChange={(val) =>
                                                setDurationSeconds(val)
                                            }
                                        />
                                        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                                            <span>4s</span>
                                            <span>6s</span>
                                            <span>8s</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-4">
                                <span className="text-sm text-muted-foreground">
                                    Estimated Total Length
                                </span>
                                <div className="flex items-center gap-2 text-lg font-bold">
                                    <Clock className="h-5 w-5 text-[#0EA5E9]" />
                                    <span>{totalLength} seconds</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Style Selector Card */}
            <Card className="border border-zinc-200 shadow-none dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
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

            {errorMessage && (
                <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive shadow-sm animate-in fade-in slide-in-from-top-4">
                    {errorMessage}
                </div>
            )}
        </div>
    );
}
