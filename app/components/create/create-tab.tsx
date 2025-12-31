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
import { BookOpen, Loader2 } from "lucide-react";
import { type Language } from "../../types";
import { StyleSelector, type Style } from "./style-selector";
import { LoadingMessages } from "@/app/components/ui/loading-messages";

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
    { name: "16:9", value: "16:9", icon: "aspect-video" },
    { name: "9:16", value: "9:16", icon: "aspect-square" },
];

const DURATION_OPTIONS = [
    { name: "4 seconds", value: 4 },
    { name: "6 seconds", value: 6 },
    { name: "8 seconds", value: 8 },
];

const VALID_DURATIONS = [4, 6, 8] as const;

const validateDuration = (duration: number): number => {
    return VALID_DURATIONS.includes(
        duration as (typeof VALID_DURATIONS)[number],
    )
        ? duration
        : 8;
};

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
}: CreateTabProps) {
    const handleGenerateClick = () => {
        onGenerate();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end gap-4">
                <LoadingMessages isLoading={isLoading} />
                <div className="flex">
                    <Button
                        onClick={handleGenerateClick}
                        disabled={
                            isLoading ||
                            pitch.trim() === "" ||
                            name.trim() === ""
                        }
                        className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Generate Scenario
                            </>
                        )}
                    </Button>
                </div>
            </div>
            <div className="mx-auto max-w-xl">
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Name</h3>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter story name..."
                    />
                    <h3 className="text-lg font-semibold">Pitch</h3>
                    <p className="text-muted-foreground">
                        Describe your story idea.
                    </p>
                    <Textarea
                        value={pitch}
                        onChange={(e) => setPitch(e.target.value)}
                        placeholder="Once upon a time..."
                        className="min-h-[100px]"
                        rows={4}
                    />
                </div>
                <div className="mt-6 space-y-4">
                    <div className="flex items-center space-x-2">
                        <label
                            htmlFor="language"
                            className="text-sm font-medium"
                        >
                            Language:
                        </label>
                        <Select
                            value={language.code}
                            onValueChange={(code) => {
                                const selectedLanguage = LANGUAGES.find(
                                    (lang) => lang.code === code,
                                );
                                if (selectedLanguage) {
                                    setLanguage(selectedLanguage);
                                }
                            }}
                        >
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select language">
                                    {language.name}
                                </SelectValue>
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
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Scenes</h3>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <label
                                    htmlFor="numScenes"
                                    className="text-sm font-medium"
                                >
                                    Number:
                                </label>
                                <Input
                                    id="numScenes"
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={numScenes}
                                    onChange={(e) =>
                                        setNumScenes(
                                            Math.max(
                                                1,
                                                Math.min(
                                                    20,
                                                    parseInt(e.target.value) ||
                                                        1,
                                                ),
                                            ),
                                        )
                                    }
                                    className="w-20"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label
                                    htmlFor="durationSeconds"
                                    className="text-sm font-medium"
                                >
                                    Duration:
                                </label>
                                <Select
                                    value={durationSeconds.toString()}
                                    onValueChange={(value) =>
                                        setDurationSeconds(
                                            validateDuration(parseInt(value)),
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select duration">
                                            {durationSeconds} seconds
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DURATION_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value.toString()}
                                            >
                                                {option.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium">
                                    Aspect Ratio:
                                </label>
                                <div className="flex space-x-3">
                                    {ASPECT_RATIOS.map((ratio) => (
                                        <div
                                            key={ratio.value}
                                            className="flex flex-col items-center space-y-1"
                                        >
                                            <div
                                                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 transition-colors ${
                                                    aspectRatio === ratio.value
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-gray-300 bg-white hover:border-gray-400"
                                                }`}
                                                onClick={() =>
                                                    setAspectRatio(ratio.value)
                                                }
                                            >
                                                <div
                                                    className={`flex items-center justify-center rounded-sm border-2 transition-colors ${
                                                        aspectRatio ===
                                                        ratio.value
                                                            ? "border-primary-foreground bg-primary-foreground"
                                                            : "border-gray-600 bg-gray-600"
                                                    }`}
                                                    style={{
                                                        aspectRatio:
                                                            ratio.value ===
                                                            "16:9"
                                                                ? "16/9"
                                                                : "9/16",
                                                        width:
                                                            ratio.value ===
                                                            "16:9"
                                                                ? "28px"
                                                                : "16px",
                                                        height:
                                                            ratio.value ===
                                                            "16:9"
                                                                ? "16px"
                                                                : "28px",
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {ratio.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Style</h3>
                        <StyleSelector styles={styles} onSelect={setStyle} />
                        <div className="flex items-center space-x-2">
                            <Input
                                id="style"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-200"
                            />
                        </div>
                    </div>
                    {errorMessage && (
                        <div className="mt-4 whitespace-pre-wrap rounded border border-red-400 bg-red-100 p-8 text-red-700">
                            {errorMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
