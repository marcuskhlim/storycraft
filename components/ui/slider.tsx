"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    min: number;
    max: number;
    step?: number;
    value: number;
    onValueChange: (value: number) => void;
}

export function Slider({
    min,
    max,
    step = 1,
    value,
    onValueChange,
    className,
    ...props
}: SliderProps) {
    return (
        <div
            className={cn(
                "relative flex w-full touch-none select-none items-center",
                className,
            )}
        >
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onValueChange(parseInt(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-700"
                {...props}
            />
        </div>
    );
}
