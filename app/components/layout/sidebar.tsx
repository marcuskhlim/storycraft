'use client'

import { useEffect, useState } from 'react'
import { Plus, BookOpen, Film, MoreVertical, Trash2, PanelLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useScenario } from '@/hooks/use-scenario'
import { useAuth } from '@/hooks/use-auth'
import { Scenario } from '@/app/types'
import { cn } from "@/lib/utils"

interface SidebarProps {
    currentScenarioId?: string
    onSelectScenario: (scenario: Scenario, scenarioId?: string) => void
    onCreateNewStory: () => void
    isCollapsed: boolean
    onToggle: () => void
    refreshTrigger?: number // Increment this to trigger a refresh of the scenarios list
}

export function Sidebar({ currentScenarioId, onSelectScenario, onCreateNewStory, isCollapsed, onToggle, refreshTrigger }: SidebarProps) {
    const [scenarios, setScenarios] = useState<Array<any>>([])
    const { loadUserScenarios, loadScenario, setCurrentScenarioId } = useScenario()
    const { session } = useAuth()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (session?.user?.id) {
            loadScenarios()
        }
    }, [session?.user?.id])

    // Refresh scenarios when refreshTrigger changes
    useEffect(() => {
        if (session?.user?.id && refreshTrigger !== undefined && refreshTrigger > 0) {
            loadScenarios()
        }
    }, [refreshTrigger])

    const loadScenarios = async () => {
        try {
            setIsLoading(true)
            const userScenarios = await loadUserScenarios()
            setScenarios(userScenarios)
        } catch (err) {
            console.error('Error loading scenarios:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelect = async (scenario: any) => {
        setCurrentScenarioId(scenario.id)

        try {
            // Fetch fresh data from Firestore instead of using cached sidebar data
            const freshScenario = await loadScenario(scenario.id)

            if (freshScenario) {
                onSelectScenario(freshScenario, scenario.id)
            } else {
                // Fallback to cached data if fetch fails
                const appScenario: Scenario = {
                    name: scenario.name,
                    pitch: scenario.pitch,
                    scenario: scenario.scenario,
                    style: scenario.style,
                    aspectRatio: scenario.aspectRatio || "16:9",
                    durationSeconds: scenario.durationSeconds || 8,
                    genre: scenario.genre,
                    mood: scenario.mood,
                    music: scenario.music,
                    language: scenario.language,
                    characters: scenario.characters || [],
                    props: scenario.props || [],
                    settings: scenario.settings || [],
                    scenes: scenario.scenes || [],
                    musicUrl: scenario.musicUrl,
                    logoOverlay: scenario.logoOverlay
                }
                onSelectScenario(appScenario, scenario.id)
            }
        } catch (error) {
            console.error('Error loading fresh scenario:', error)
            // Fallback to cached data if fetch fails
            const appScenario: Scenario = {
                name: scenario.name,
                pitch: scenario.pitch,
                scenario: scenario.scenario,
                style: scenario.style,
                aspectRatio: scenario.aspectRatio || "16:9",
                durationSeconds: scenario.durationSeconds || 8,
                genre: scenario.genre,
                mood: scenario.mood,
                music: scenario.music,
                language: scenario.language,
                characters: scenario.characters || [],
                props: scenario.props || [],
                settings: scenario.settings || [],
                scenes: scenario.scenes || [],
                musicUrl: scenario.musicUrl,
                logoOverlay: scenario.logoOverlay
            }
            onSelectScenario(appScenario, scenario.id)
        }
    }

    return (
        <aside
            className={cn(
                "flex-shrink-0 border-r border-gray-200 bg-card/50 flex flex-col h-screen fixed left-0 top-0 bottom-0 z-30 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[70px]" : "w-[280px]"
            )}
        >
            <div className="h-16 flex items-center border-gray-200 transition-all duration-300 px-3">
                {/* Toggle Button - Centered in Rail (46px zone) */}
                <div className="w-[46px] flex justify-center shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="text-muted-foreground hover:text-foreground"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <PanelLeft className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="px-3 py-4 overflow-hidden">
                <Button
                    onClick={onCreateNewStory}
                    className={cn(
                        "w-full justify-start h-12 rounded-2xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 p-0 overflow-hidden",
                    )}
                    title="New Story"
                >
                    {/* Icon Slot - Fixed width to match rail center */}
                    <div className="w-[46px] h-full flex items-center justify-center shrink-0">
                        <Plus className="w-5 h-5" />
                    </div>
                    <span
                        className={cn(
                            "whitespace-nowrap overflow-hidden transition-all duration-300",
                            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 pr-4"
                        )}
                    >
                        New Story
                    </span>
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide overflow-x-hidden px-3">
                <div className={cn(
                    "flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider h-8 transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-full px-2"
                )}>
                    Your Stories
                </div>

                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-muted/50 rounded-full animate-pulse w-full" />
                        ))}
                    </div>
                ) : scenarios.length === 0 ? (
                    !isCollapsed && <div className="px-2 text-sm text-muted-foreground whitespace-nowrap">No stories yet.</div>
                ) : (
                    scenarios.map((scenario) => (
                        <button
                            key={scenario.id}
                            onClick={() => handleSelect(scenario)}
                            className={cn(
                                "w-full flex items-center h-12 rounded-full transition-all duration-200 overflow-hidden",
                                currentScenarioId === scenario.id
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-foreground hover:bg-muted"
                            )}
                            title={scenario.name}
                        >
                            {/* Icon Slot - Fixed width 46px + relative centering */}
                            <div className="w-[46px] h-full flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4" />
                            </div>

                            <span
                                className={cn(
                                    "truncate text-left transition-all duration-300",
                                    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 flex-1 pr-4"
                                )}
                            >
                                {scenario.name || "Untitled Story"}
                            </span>
                        </button>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-200 overflow-hidden">
                <p
                    className={cn(
                        "text-xs text-muted-foreground whitespace-nowrap",
                        // Use transition-none to hide instantly on collapse
                        isCollapsed ? "opacity-0 h-0 w-0 transition-none" : "opacity-100 h-auto w-full text-center transition-all duration-300"
                    )}
                >
                    Made with ❤️ by @mblanc
                </p>
            </div>
        </aside>
    )
}
