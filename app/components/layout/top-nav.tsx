'use client'

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
    id: string
    label: string
    disabled?: boolean
}

interface TopNavProps {
    steps: Step[]
    activeTab: string
    onTabChange: (id: string) => void
}

export function TopNav({ steps, activeTab, onTabChange }: TopNavProps) {
    return (
        <nav className="flex items-center space-x-2 bg-card/50 p-2 rounded-full border border-border/50 shadow-sm w-fit mx-auto">
            {steps.map((step, index) => {
                const isActive = activeTab === step.id
                // Find if this step is "completed" (this logic depends on your needs, 
                // for now we just verify if it's previous to active or logic handled by parent)
                // But for a tab bar, we usually just show active state.

                return (
                    <button
                        key={step.id}
                        disabled={step.disabled}
                        onClick={() => onTabChange(step.id)}
                        className={cn(
                            "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            step.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                        )}
                    >
                        {step.label}
                    </button>
                )
            })}
        </nav>
    )
}
