"use client";

import { Button } from "@/components/ui/button";
import {
    LayoutGrid,
    Loader2,
    Pencil,
    Upload,
    Plus,
    X,
    RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { GcsImage } from "@/app/features/shared/components/ui/gcs-image";
import {
    deleteCharacterFromScenario,
    deleteSettingFromScenario,
    deletePropFromScenario,
} from "@/app/features/scenario/actions/modify-scenario";
import { LoadingMessages } from "@/app/features/shared/components/ui/loading-messages";
import { clientLogger } from "@/lib/utils/client-logger";

import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";
import { useLoadingStore } from "@/app/features/shared/stores/useLoadingStore";

interface ScenarioTabProps {
    onGenerateStoryBoard: () => void;
    onRegenerateCharacterImage: (
        characterIndex: number,
        name: string,
        description: string,
        voice: string,
    ) => Promise<void>;
    onUploadCharacterImage: (
        characterIndex: number,
        file: File,
    ) => Promise<void>;
    onRegenerateSettingImage: (
        settingIndex: number,
        name: string,
        description: string,
    ) => Promise<void>;
    onUploadSettingImage: (settingIndex: number, file: File) => Promise<void>;
    onRegeneratePropImage: (
        propIndex: number,
        name: string,
        description: string,
    ) => Promise<void>;
    onUploadPropImage: (propIndex: number, file: File) => Promise<void>;
}

export function ScenarioTab({
    onGenerateStoryBoard,
    onRegenerateCharacterImage,
    onUploadCharacterImage,
    onRegenerateSettingImage,
    onUploadSettingImage,
    onRegeneratePropImage,
    onUploadPropImage,
}: ScenarioTabProps) {
    const { scenario, setScenario } = useScenarioStore();
    const {
        scenario: isLoading,
        characters: generatingCharacterImages,
        settings: generatingSettingImages,
        props: generatingPropImages,
    } = useLoadingStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editedScenario, setEditedScenario] = useState(
        scenario?.scenario || "",
    );
    const [isScenarioHovering, setIsScenarioHovering] = useState(false);
    const [editingCharacterIndex, setEditingCharacterIndex] = useState<
        number | null
    >(null);
    const [editedCharacterDescriptions, setEditedCharacterDescriptions] =
        useState<string[]>([]);
    const [editedCharacterNames, setEditedCharacterNames] = useState<string[]>(
        [],
    );
    const [editedCharacterVoices, setEditedCharacterVoices] = useState<
        string[]
    >([]);
    const [characterHoverStates, setCharacterHoverStates] = useState<boolean[]>(
        [],
    );
    const [editingSettingIndex, setEditingSettingIndex] = useState<
        number | null
    >(null);
    const [editedSettingDescriptions, setEditedSettingDescriptions] = useState<
        string[]
    >([]);
    const [editedSettingNames, setEditedSettingNames] = useState<string[]>([]);
    const [settingHoverStates, setSettingHoverStates] = useState<boolean[]>([]);

    const [editingPropIndex, setEditingPropIndex] = useState<number | null>(
        null,
    );
    const [editedPropDescriptions, setEditedPropDescriptions] = useState<
        string[]
    >([]);
    const [editedPropNames, setEditedPropNames] = useState<string[]>([]);
    const [propHoverStates, setPropHoverStates] = useState<boolean[]>([]);

    const [localGeneratingSettings, setLocalGeneratingSettings] = useState<
        Set<number>
    >(new Set());
    const [isEditingMusic, setIsEditingMusic] = useState(false);
    const [editedMusic, setEditedMusic] = useState("");
    const [isMusicHovering, setIsMusicHovering] = useState(false);
    const [localGeneratingCharacters, setLocalGeneratingCharacters] = useState<
        Set<number>
    >(new Set());
    const [localGeneratingProps, setLocalGeneratingProps] = useState<
        Set<number>
    >(new Set());

    // Helper functions to check if an item is in any loading state
    const isCharacterLoading = (index: number) => {
        return (
            generatingCharacterImages?.has(index) ||
            localGeneratingCharacters.has(index)
        );
    };

    const isSettingLoading = (index: number) => {
        return (
            generatingSettingImages?.has(index) ||
            localGeneratingSettings.has(index)
        );
    };

    const isPropLoading = (index: number) => {
        return (
            generatingPropImages?.has(index) || localGeneratingProps.has(index)
        );
    };

    const scenarioRef = useRef<HTMLDivElement>(null);
    const characterEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const characterFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const settingEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const settingFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const propEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const propFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const musicRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scenario?.scenario) {
            setEditedScenario(scenario.scenario);
        }
        if (scenario?.characters) {
            setEditedCharacterDescriptions(
                scenario.characters.map((char) => char.description),
            );
            setEditedCharacterNames(
                scenario.characters.map((char) => char.name),
            );
            setEditedCharacterVoices(
                scenario.characters.map((char) => char.voice || ""),
            );
            // Initialize refs array for character editing areas
            characterEditingRefs.current = new Array(
                scenario.characters.length,
            ).fill(null);
            // Initialize refs array for character file inputs
            characterFileInputRefs.current = new Array(
                scenario.characters.length,
            ).fill(null);
            // Initialize hover states for characters
            setCharacterHoverStates(
                new Array(scenario.characters.length).fill(false),
            );
        }
        if (scenario?.settings) {
            setEditedSettingDescriptions(
                scenario.settings.map((setting) => setting.description),
            );
            setEditedSettingNames(
                scenario.settings.map((setting) => setting.name),
            );
            // Initialize refs array for setting editing areas
            settingEditingRefs.current = new Array(
                scenario.settings.length,
            ).fill(null);
            // Initialize refs array for setting file inputs
            settingFileInputRefs.current = new Array(
                scenario.settings.length,
            ).fill(null);
            // Initialize hover states for settings
            setSettingHoverStates(
                new Array(scenario.settings.length).fill(false),
            );
        }
        if (scenario?.props) {
            setEditedPropDescriptions(
                scenario.props.map((prop) => prop.description),
            );
            setEditedPropNames(scenario.props.map((prop) => prop.name));
            // Initialize refs array for prop editing areas
            propEditingRefs.current = new Array(scenario.props.length).fill(
                null,
            );
            // Initialize refs array for prop file inputs
            propFileInputRefs.current = new Array(scenario.props.length).fill(
                null,
            );
            // Initialize hover states for props
            setPropHoverStates(new Array(scenario.props.length).fill(false));
        }
        if (scenario?.music) {
            setEditedMusic(scenario.music);
        }
    }, [
        scenario?.scenario,
        scenario?.characters,
        scenario?.settings,
        scenario?.props,
        scenario?.music,
    ]);

    const handleSave = useCallback(async () => {
        if (scenario) {
            const updatedScenario = {
                ...scenario,
                scenario: editedScenario,
            };
            setScenario(updatedScenario);
            setEditedScenario(updatedScenario.scenario);
        }
        setIsEditing(false);
    }, [scenario, setScenario, editedScenario]);

    const handleSaveCharacter = useCallback(
        async (index: number) => {
            if (scenario) {
                const updatedDescription = editedCharacterDescriptions[index];
                const updatedName = editedCharacterNames[index];
                const updatedVoice = editedCharacterVoices[index];

                // Update the scenario with the new description and name
                const updatedCharacters = [...scenario.characters];
                updatedCharacters[index] = {
                    ...updatedCharacters[index],
                    name: updatedName,
                    description: updatedDescription,
                    voice: updatedVoice,
                };
                const updatedScenario = {
                    ...scenario,
                    characters: updatedCharacters,
                };
                setScenario(updatedScenario);
            }
            setEditingCharacterIndex(null);
        },
        [
            scenario,
            setScenario,
            editedCharacterDescriptions,
            editedCharacterNames,
            editedCharacterVoices,
        ],
    );

    const handleSaveSetting = useCallback(
        async (index: number) => {
            if (scenario) {
                const updatedDescription = editedSettingDescriptions[index];
                const updatedName = editedSettingNames[index];

                // Update the scenario with the new description and name
                const updatedSettings = [...scenario.settings];
                updatedSettings[index] = {
                    ...updatedSettings[index],
                    name: updatedName,
                    description: updatedDescription,
                };
                const updatedScenario = {
                    ...scenario,
                    settings: updatedSettings,
                };
                setScenario(updatedScenario);
            }
            setEditingSettingIndex(null);
        },
        [scenario, setScenario, editedSettingDescriptions, editedSettingNames],
    );

    const handleSaveProp = useCallback(
        async (index: number) => {
            if (scenario) {
                const updatedDescription = editedPropDescriptions[index];
                const updatedName = editedPropNames[index];

                // Update the scenario with the new description and name
                const updatedProps = [...scenario.props];
                updatedProps[index] = {
                    ...updatedProps[index],
                    name: updatedName,
                    description: updatedDescription,
                };
                const updatedScenario = {
                    ...scenario,
                    props: updatedProps,
                };
                setScenario(updatedScenario);
            }
            setEditingPropIndex(null);
        },
        [scenario, setScenario, editedPropDescriptions, editedPropNames],
    );

    const handleSaveMusic = useCallback(async () => {
        if (scenario) {
            // Update only the music property without regenerating scenario
            const updatedScenario = {
                ...scenario,
                music: editedMusic,
            };
            setScenario(updatedScenario);
        }
        setIsEditingMusic(false);
    }, [scenario, setScenario, editedMusic]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            // Check if click is outside scenario editing area
            if (scenarioRef.current && !scenarioRef.current.contains(target)) {
                if (isEditing) {
                    handleSave();
                }
            }

            // Check if click is outside character editing area
            if (editingCharacterIndex !== null) {
                const currentCharacterRef =
                    characterEditingRefs.current[editingCharacterIndex];
                if (
                    currentCharacterRef &&
                    !currentCharacterRef.contains(target)
                ) {
                    handleSaveCharacter(editingCharacterIndex);
                }
            }

            // Check if click is outside setting editing area
            if (editingSettingIndex !== null) {
                const currentSettingRef =
                    settingEditingRefs.current[editingSettingIndex];
                if (currentSettingRef && !currentSettingRef.contains(target)) {
                    handleSaveSetting(editingSettingIndex);
                }
            }

            // Check if click is outside prop editing area
            if (editingPropIndex !== null) {
                const currentPropRef =
                    propEditingRefs.current[editingPropIndex];
                if (currentPropRef && !currentPropRef.contains(target)) {
                    handleSaveProp(editingPropIndex);
                }
            }

            // Check if click is outside music editing area
            if (musicRef.current && !musicRef.current.contains(target)) {
                if (isEditingMusic) {
                    handleSaveMusic();
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [
        isEditing,
        editingCharacterIndex,
        editingSettingIndex,
        editingPropIndex,
        isEditingMusic,
        handleSave,
        handleSaveCharacter,
        handleSaveSetting,
        handleSaveProp,
        handleSaveMusic,
    ]);

    const handleScenarioChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setEditedScenario(e.target.value);
    };

    const handleCharacterDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedCharacterDescriptions];
        newDescriptions[index] = value;
        setEditedCharacterDescriptions(newDescriptions);
    };

    const handleCharacterVoiceChange = (index: number, value: string) => {
        const newVoices = [...editedCharacterVoices];
        newVoices[index] = value;
        setEditedCharacterVoices(newVoices);
    };

    const handleCharacterNameChange = (index: number, value: string) => {
        const newNames = [...editedCharacterNames];
        newNames[index] = value;
        setEditedCharacterNames(newNames);
    };

    const handleCharacterHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...characterHoverStates];
        newHoverStates[index] = isHovering;
        setCharacterHoverStates(newHoverStates);
    };

    const handleSettingDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedSettingDescriptions];
        newDescriptions[index] = value;
        setEditedSettingDescriptions(newDescriptions);
    };

    const handleSettingNameChange = (index: number, value: string) => {
        const newNames = [...editedSettingNames];
        newNames[index] = value;
        setEditedSettingNames(newNames);
    };

    const handleSettingHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...settingHoverStates];
        newHoverStates[index] = isHovering;
        setSettingHoverStates(newHoverStates);
    };

    const handlePropDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedPropDescriptions];
        newDescriptions[index] = value;
        setEditedPropDescriptions(newDescriptions);
    };

    const handlePropNameChange = (index: number, value: string) => {
        const newNames = [...editedPropNames];
        newNames[index] = value;
        setEditedPropNames(newNames);
    };

    const handlePropHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...propHoverStates];
        newHoverStates[index] = isHovering;
        setPropHoverStates(newHoverStates);
    };

    const handleMusicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedMusic(e.target.value);
    };

    const handleCharacterUploadClick = (index: number) => {
        characterFileInputRefs.current[index]?.click();
    };

    const handleCharacterFileChange = async (
        index: number,
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (file && onUploadCharacterImage) {
            await onUploadCharacterImage(index, file);
        }
    };

    const handleSettingUploadClick = (index: number) => {
        settingFileInputRefs.current[index]?.click();
    };

    const handleSettingFileChange = async (
        index: number,
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (file && onUploadSettingImage) {
            await onUploadSettingImage(index, file);
        }
    };

    const handlePropUploadClick = (index: number) => {
        propFileInputRefs.current[index]?.click();
    };

    const handlePropFileChange = async (
        index: number,
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (file && onUploadPropImage) {
            await onUploadPropImage(index, file);
        }
    };

    const handleAddCharacter = () => {
        if (scenario) {
            const newCharacter = {
                name: "New Character",
                description: "Enter character description...",
            };
            const updatedCharacters = [...scenario.characters, newCharacter];
            const updatedScenario = {
                ...scenario,
                characters: updatedCharacters,
            };
            setScenario(updatedScenario);

            // Set the new character to editing mode
            setEditingCharacterIndex(updatedCharacters.length - 1);
        }
    };

    const handleRemoveCharacter = async (index: number) => {
        if (scenario) {
            setLocalGeneratingCharacters((prev) => new Set([...prev, index]));
            try {
                const newScenario = await deleteCharacterFromScenario(
                    scenario.scenario,
                    scenario.characters[index].name,
                    scenario.characters[index].description,
                );
                const updatedCharacters = scenario.characters.filter(
                    (item, i) => i !== index,
                );
                const updatedScenario = {
                    ...scenario,
                    characters: updatedCharacters,
                    scenario: newScenario.updatedScenario,
                };
                setScenario(updatedScenario);

                // Clear editing state if we're removing the character being edited
                if (editingCharacterIndex === index) {
                    setEditingCharacterIndex(null);
                } else if (
                    editingCharacterIndex !== null &&
                    editingCharacterIndex > index
                ) {
                    // Adjust editing index if removing a character before the one being edited
                    setEditingCharacterIndex(editingCharacterIndex - 1);
                }
            } catch (error) {
                clientLogger.error("Error deleting character:", error);
            } finally {
                setLocalGeneratingCharacters((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }
        }
    };

    const handleAddSetting = () => {
        if (scenario) {
            const newSetting = {
                name: "New Setting",
                description: "Enter setting description...",
            };
            const updatedSettings = [...scenario.settings, newSetting];
            const updatedScenario = {
                ...scenario,
                settings: updatedSettings,
            };
            setScenario(updatedScenario);

            // Set the new setting to editing mode
            setEditingSettingIndex(updatedSettings.length - 1);
        }
    };

    const handleRemoveSetting = async (index: number) => {
        if (scenario) {
            setLocalGeneratingSettings((prev) => new Set([...prev, index]));
            try {
                const newScenario = await deleteSettingFromScenario(
                    scenario.scenario,
                    scenario.settings[index].name,
                    scenario.settings[index].description,
                );
                const updatedSettings = scenario.settings.filter(
                    (item, i) => i !== index,
                );
                const updatedScenario = {
                    ...scenario,
                    settings: updatedSettings,
                    scenario: newScenario.updatedScenario,
                };
                setScenario(updatedScenario);

                // Clear editing state if we're removing the setting being edited
                if (editingSettingIndex === index) {
                    setEditingSettingIndex(null);
                } else if (
                    editingSettingIndex !== null &&
                    editingSettingIndex > index
                ) {
                    // Adjust editing index if removing a setting before the one being edited
                    setEditingSettingIndex(editingSettingIndex - 1);
                }
            } catch (error) {
                clientLogger.error("Error deleting setting:", error);
            } finally {
                setLocalGeneratingSettings((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }
        }
    };

    const handleAddProp = () => {
        if (scenario) {
            const newProp = {
                name: "New Prop",
                description: "Enter prop description...",
            };
            const updatedProps = [...scenario.props, newProp];
            const updatedScenario = {
                ...scenario,
                props: updatedProps,
            };
            setScenario(updatedScenario);

            // Set the new prop to editing mode
            setEditingPropIndex(updatedProps.length - 1);
        }
    };

    const handleRemoveProp = async (index: number) => {
        if (scenario) {
            setLocalGeneratingProps((prev) => new Set([...prev, index]));
            try {
                const newScenario = await deletePropFromScenario(
                    scenario.scenario,
                    scenario.props[index].name,
                    scenario.props[index].description,
                );
                const updatedProps = scenario.props.filter(
                    (item, i) => i !== index,
                );
                const updatedScenario = {
                    ...scenario,
                    props: updatedProps,
                    scenario: newScenario.updatedScenario,
                };
                setScenario(updatedScenario);

                // Clear editing state if we're removing the prop being edited
                if (editingPropIndex === index) {
                    setEditingPropIndex(null);
                } else if (
                    editingPropIndex !== null &&
                    editingPropIndex > index
                ) {
                    // Adjust editing index if removing a prop before the one being edited
                    setEditingPropIndex(editingPropIndex - 1);
                }
            } catch (error) {
                clientLogger.error("Error deleting prop:", error);
            } finally {
                setLocalGeneratingProps((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }
        }
    };

    return (
        <div className="space-y-8">
            {scenario && (
                <div className="mx-auto max-w-5xl space-y-8 pb-10">
                    {/* Header section */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold tracking-tight">
                                Review your scenario
                            </h2>
                            <p className="text-muted-foreground">
                                Refine the characters, settings, and story
                                details.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <LoadingMessages isLoading={isLoading} />
                            <Button
                                size="lg"
                                onClick={onGenerateStoryBoard}
                                disabled={isLoading}
                                className="rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <LayoutGrid className="mr-2 h-5 w-5" />
                                        Generate Storyboard
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                    <div className="mx-auto max-w-4xl space-y-4">
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Scenario</h3>
                        </div>
                        <div
                            ref={scenarioRef}
                            className="group relative"
                            onMouseEnter={() => setIsScenarioHovering(true)}
                            onMouseLeave={() => setIsScenarioHovering(false)}
                        >
                            {!isEditing && isScenarioHovering && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="absolute right-2 top-2 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                            {isEditing ? (
                                <Textarea
                                    value={editedScenario}
                                    onChange={handleScenarioChange}
                                    className="min-h-[200px] w-full"
                                    placeholder="Enter your scenario..."
                                    autoFocus
                                />
                            ) : (
                                <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                                    {scenario.scenario}
                                </p>
                            )}
                        </div>
                        <div className="col-span-1 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Characters</h3>
                            <Button
                                onClick={handleAddCharacter}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Character
                            </Button>
                        </div>
                        {scenario.characters.map((character, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className="group relative h-[200px] w-[200px] flex-shrink-0">
                                    {isCharacterLoading(index) && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
                                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                                        </div>
                                    )}
                                    <GcsImage
                                        gcsUri={character.imageGcsUri || null}
                                        alt={`Character ${character.name}`}
                                        className="rounded-lg object-cover shadow-md"
                                        sizes="200px"
                                    />
                                    <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-blue-500 hover:text-white"
                                            onClick={() =>
                                                onRegenerateCharacterImage?.(
                                                    index,
                                                    character.name,
                                                    character.description,
                                                    character.voice || "",
                                                )
                                            }
                                            disabled={isCharacterLoading(index)}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            <span className="sr-only">
                                                Regenerate character image
                                            </span>
                                        </Button>
                                    </div>
                                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-green-500 hover:text-white"
                                            onClick={() =>
                                                handleCharacterUploadClick(
                                                    index,
                                                )
                                            }
                                            disabled={isCharacterLoading(index)}
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">
                                                Upload character image
                                            </span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-red-500 hover:text-white"
                                            onClick={() =>
                                                handleRemoveCharacter(index)
                                            }
                                            disabled={isCharacterLoading(index)}
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">
                                                Remove character
                                            </span>
                                        </Button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            characterFileInputRefs.current[
                                                index
                                            ] = el;
                                            return;
                                        }}
                                        onChange={(e) =>
                                            handleCharacterFileChange(index, e)
                                        }
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="group relative flex-grow">
                                    <div
                                        ref={(el) => {
                                            characterEditingRefs.current[
                                                index
                                            ] = el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() =>
                                            handleCharacterHover(index, true)
                                        }
                                        onMouseLeave={() =>
                                            handleCharacterHover(index, false)
                                        }
                                    >
                                        {editingCharacterIndex !== index &&
                                            characterHoverStates[index] && (
                                                <button
                                                    onClick={() =>
                                                        setEditingCharacterIndex(
                                                            index,
                                                        )
                                                    }
                                                    className="absolute right-2 top-0 z-10 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}
                                        {editingCharacterIndex === index ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Character Name
                                                    </label>
                                                    <Input
                                                        value={
                                                            editedCharacterNames[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleCharacterNameChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Enter character name..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Character Description
                                                    </label>
                                                    <Textarea
                                                        value={
                                                            editedCharacterDescriptions[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleCharacterDescriptionChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="min-h-[100px] w-full"
                                                        placeholder="Enter character description..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Voice
                                                    </label>
                                                    <Input
                                                        value={
                                                            editedCharacterVoices[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleCharacterVoiceChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Enter voice description..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="mb-2 text-lg font-semibold">
                                                    {character.name}
                                                </h4>
                                                <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                                                    {character.description}
                                                </p>
                                                <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                                                    Voice: {character.voice}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Props</h3>
                            <Button
                                onClick={handleAddProp}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Prop
                            </Button>
                        </div>
                        {scenario.props?.map((prop, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className="group relative h-[200px] w-[200px] flex-shrink-0">
                                    {isPropLoading(index) && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
                                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                                        </div>
                                    )}
                                    <GcsImage
                                        gcsUri={prop.imageGcsUri || null}
                                        alt={`Prop ${prop.name}`}
                                        className="rounded-lg object-cover shadow-md"
                                        sizes="200px"
                                    />
                                    <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-blue-500 hover:text-white"
                                            onClick={() =>
                                                onRegeneratePropImage?.(
                                                    index,
                                                    prop.name,
                                                    prop.description,
                                                )
                                            }
                                            disabled={isPropLoading(index)}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            <span className="sr-only">
                                                Regenerate prop image
                                            </span>
                                        </Button>
                                    </div>
                                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-green-500 hover:text-white"
                                            onClick={() =>
                                                handlePropUploadClick(index)
                                            }
                                            disabled={isPropLoading(index)}
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">
                                                Upload prop image
                                            </span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-red-500 hover:text-white"
                                            onClick={() =>
                                                handleRemoveProp(index)
                                            }
                                            disabled={isPropLoading(index)}
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">
                                                Remove prop
                                            </span>
                                        </Button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            propFileInputRefs.current[index] =
                                                el;
                                            return;
                                        }}
                                        onChange={(e) =>
                                            handlePropFileChange(index, e)
                                        }
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="group relative flex-grow">
                                    <div
                                        ref={(el) => {
                                            propEditingRefs.current[index] = el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() =>
                                            handlePropHover(index, true)
                                        }
                                        onMouseLeave={() =>
                                            handlePropHover(index, false)
                                        }
                                    >
                                        {editingPropIndex !== index &&
                                            propHoverStates[index] && (
                                                <button
                                                    onClick={() =>
                                                        setEditingPropIndex(
                                                            index,
                                                        )
                                                    }
                                                    className="absolute right-2 top-0 z-10 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}
                                        {editingPropIndex === index ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Prop Name
                                                    </label>
                                                    <Input
                                                        value={
                                                            editedPropNames[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handlePropNameChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Enter prop name..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Prop Description
                                                    </label>
                                                    <Textarea
                                                        value={
                                                            editedPropDescriptions[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handlePropDescriptionChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="min-h-[100px] w-full"
                                                        placeholder="Enter prop description..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="mb-2 text-lg font-semibold">
                                                    {prop.name}
                                                </h4>
                                                <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                                                    {prop.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Settings</h3>
                            <Button
                                onClick={handleAddSetting}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Setting
                            </Button>
                        </div>
                        {scenario.settings.map((setting, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className="group relative h-[200px] w-[200px] flex-shrink-0">
                                    {isSettingLoading(index) && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
                                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                                        </div>
                                    )}
                                    <GcsImage
                                        gcsUri={setting.imageGcsUri || null}
                                        alt={`Setting ${setting.name}`}
                                        className="rounded-lg object-contain shadow-md"
                                        sizes="200px"
                                    />
                                    <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-blue-500 hover:text-white"
                                            onClick={() =>
                                                onRegenerateSettingImage?.(
                                                    index,
                                                    setting.name,
                                                    setting.description,
                                                )
                                            }
                                            disabled={isSettingLoading(index)}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            <span className="sr-only">
                                                Regenerate setting image
                                            </span>
                                        </Button>
                                    </div>
                                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-green-500 hover:text-white"
                                            onClick={() =>
                                                handleSettingUploadClick(index)
                                            }
                                            disabled={isSettingLoading(index)}
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">
                                                Upload setting image
                                            </span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-red-500 hover:text-white"
                                            onClick={() =>
                                                handleRemoveSetting(index)
                                            }
                                            disabled={isSettingLoading(index)}
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">
                                                Remove setting
                                            </span>
                                        </Button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            settingFileInputRefs.current[
                                                index
                                            ] = el;
                                            return;
                                        }}
                                        onChange={(e) =>
                                            handleSettingFileChange(index, e)
                                        }
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="group relative flex-grow">
                                    <div
                                        ref={(el) => {
                                            settingEditingRefs.current[index] =
                                                el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() =>
                                            handleSettingHover(index, true)
                                        }
                                        onMouseLeave={() =>
                                            handleSettingHover(index, false)
                                        }
                                    >
                                        {editingSettingIndex !== index &&
                                            settingHoverStates[index] && (
                                                <button
                                                    onClick={() =>
                                                        setEditingSettingIndex(
                                                            index,
                                                        )
                                                    }
                                                    className="absolute right-2 top-0 z-10 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}
                                        {editingSettingIndex === index ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Setting Name
                                                    </label>
                                                    <Input
                                                        value={
                                                            editedSettingNames[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleSettingNameChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Enter setting name..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium">
                                                        Setting Description
                                                    </label>
                                                    <Textarea
                                                        value={
                                                            editedSettingDescriptions[
                                                                index
                                                            ] || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleSettingDescriptionChange(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="min-h-[100px] w-full"
                                                        placeholder="Enter setting description..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="mb-2 text-lg font-semibold">
                                                    {setting.name}
                                                </h4>
                                                <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                                                    {setting.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Music</h3>
                        </div>
                        <div
                            ref={musicRef}
                            className="group relative col-span-2"
                            onMouseEnter={() => setIsMusicHovering(true)}
                            onMouseLeave={() => setIsMusicHovering(false)}
                        >
                            {!isEditingMusic && isMusicHovering && (
                                <button
                                    onClick={() => setIsEditingMusic(true)}
                                    className="absolute right-2 top-2 rounded-full bg-primary/80 p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                            {isEditingMusic ? (
                                <Textarea
                                    value={editedMusic}
                                    onChange={handleMusicChange}
                                    className="min-h-[100px] w-full"
                                    placeholder="Enter music description..."
                                    autoFocus
                                />
                            ) : (
                                <p className="whitespace-pre-wrap rounded-lg border border-transparent p-4 transition-colors group-hover:border-gray-200">
                                    {scenario.music}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
