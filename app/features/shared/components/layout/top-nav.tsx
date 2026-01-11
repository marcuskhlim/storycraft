"use client";

import { cn } from "@/lib/utils/utils";
import { Check } from "lucide-react";
import { useTopNavActions } from "@/app/features/shared/hooks/use-topnav-actions";
import { memo } from "react";

export const TopNav = memo(function TopNav() {
    const {
        steps,
        activeTab,
        handleTabChange: onTabChange,
    } = useTopNavActions();
    const activeIndex = steps.findIndex((s) => s.id === activeTab);

    return (
        <nav className="my-3 flex w-fit items-center rounded-full border border-border/60 bg-card/30 p-1 shadow-sm backdrop-blur-md">
            {steps.map((step, index) => {
                const isActive = activeTab === step.id;
                const isCompleted = index < activeIndex;
                const isFirst = index === 0;

                return (
                    <div key={step.id} className="flex items-center">
                        {!isFirst && (
                            <div className="mx-0.5 h-5 w-[1px] bg-border/40" />
                        )}
<button
  disabled={step.disabled}
  onClick={() => onTabChange(step.id)}
  className={cn(
    "group relative mx-0.5 flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold transition-all duration-300",

    isActive
      ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shadow-[0_0_0_1px_rgba(59,130,246,0.1)]"
      : isCompleted
        ? "text-slate-900 dark:text-slate-100"
        : "text-slate-500 dark:text-slate-400 hover:bg-muted/50 hover:text-slate-700 dark:hover:text-slate-200",

    step.disabled &&
      "cursor-not-allowed opacity-40 hover:bg-transparent",
  )}
>

                            <div
                                className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300",
                                    isActive
                                        ? "border-blue-500 bg-transparent text-blue-600"
                                        : isCompleted
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-500",
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-3 w-3 stroke-[3.5]" />
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>
                            <span className="whitespace-nowrap">
                                {step.label}
                            </span>
                        </button>
                    </div>
                );
            })}
        </nav>
    );
});
