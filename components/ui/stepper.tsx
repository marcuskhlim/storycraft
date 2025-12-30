"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
    steps: {
        id: string;
        label: string;
        icon: LucideIcon;
        disabled?: boolean;
    }[];
    currentStep: string;
    onStepClick?: (stepId: string) => void;
}

export function Stepper({
    steps,
    currentStep,
    onStepClick,
    className,
    ...props
}: StepperProps) {
    const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

    return (
        <ol
            className={cn(
                "flex w-full items-center text-center text-sm font-medium text-gray-500 dark:text-gray-400 sm:text-base",
                className,
            )}
            {...props}
        >
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                const Icon = step.icon;

                return (
                    <li
                        key={step.id}
                        className={cn(
                            "relative flex items-center md:w-full",
                            isActive ? "text-blue-600 dark:text-blue-500" : "",
                            isCompleted
                                ? "text-green-600 dark:text-green-500"
                                : "",
                            step.disabled
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer",
                            index < steps.length - 1
                                ? "after:mx-6 after:hidden after:h-[2px] after:w-full after:border-b-2 after:border-solid after:border-gray-300 after:content-[''] dark:after:border-gray-600 sm:after:inline-block xl:after:mx-10"
                                : "",
                        )}
                        onClick={() => !step.disabled && onStepClick?.(step.id)}
                    >
                        <div
                            className={cn(
                                "relative z-10 flex items-center bg-background px-2",
                                step.disabled
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer",
                            )}
                        >
                            <span
                                className={cn(
                                    "me-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                    isActive
                                        ? "border-blue-600 dark:border-blue-500"
                                        : "border-gray-300 dark:border-gray-600",
                                    isCompleted
                                        ? "border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500"
                                        : "",
                                    step.disabled
                                        ? "border-gray-200 dark:border-gray-700"
                                        : "",
                                )}
                            >
                                {isCompleted ? (
                                    <svg
                                        className="h-4 w-4 text-white"
                                        aria-hidden="true"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 16 12"
                                    >
                                        <path
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M1 5.917 5.724 10.5 15 1.5"
                                        />
                                    </svg>
                                ) : (
                                    <span
                                        className={cn(
                                            "text-sm font-medium",
                                            isActive
                                                ? "text-blue-600 dark:text-blue-500"
                                                : "text-gray-500 dark:text-gray-400",
                                            step.disabled
                                                ? "text-gray-300 dark:text-gray-600"
                                                : "",
                                        )}
                                    >
                                        {index + 1}
                                    </span>
                                )}
                            </span>
                            <span className="flex items-center">
                                <Icon
                                    className={cn(
                                        "me-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4",
                                        step.disabled
                                            ? "text-gray-300 dark:text-gray-600"
                                            : "",
                                    )}
                                />
                                {step.label}
                            </span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
