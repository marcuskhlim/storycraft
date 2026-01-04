"use client";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clapperboard, Info, Languages } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { type Language } from "@/app/types";
import { LANGUAGES } from "../constants/languages";

interface StoryBasicsFormProps {
    name: string;
    setName: (val: string) => void;
    pitch: string;
    setPitch: (val: string) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
}

export function StoryBasicsForm({
    name,
    setName,
    pitch,
    setPitch,
    language,
    setLanguage,
}: StoryBasicsFormProps) {
    return (
        <Card className="border border-border shadow-none md:col-span-3 lg:col-span-2">
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
                                        <span className="sr-only">Help</span>
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
                                                    From Concept to Creation
                                                </p>
                                                <p>
                                                    The AI can generate a
                                                    complete scenario from a
                                                    simple logline or concept.
                                                </p>
                                            </div>
                                            <div className="grid gap-1">
                                                <p className="font-medium text-foreground">
                                                    Detail Matters
                                                </p>
                                                <p>
                                                    The more details you
                                                    provide, the more your
                                                    instructions will be
                                                    respected.
                                                </p>
                                            </div>
                                            <div className="grid gap-1 pt-1">
                                                <p className="font-medium text-foreground">
                                                    What you can specify
                                                </p>
                                                <ul className="list-inside list-disc space-y-1">
                                                    <li>
                                                        Scenario & Characters
                                                    </li>
                                                    <li>Settings & Objects</li>
                                                    <li>
                                                        Cinematography &
                                                        Lighting
                                                    </li>
                                                    <li>
                                                        Voiceovers, Pacing &
                                                        Music
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
                                <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
}
