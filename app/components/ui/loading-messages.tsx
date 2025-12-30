'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"

const MESSAGES = [
    "Convincing the lead actor to come out of their trailer...",
    "Editing out the boom mic from the opening shot...",
    "Negotiating back-end points with the AI’s agent...",
    "Adding more lens flares because J.J. Abrams called...",
    "Fixing it in post...",
    "Practicing our Oscar acceptance speech in the mirror...",
    "Teaching the AI the difference between 'drama' and 'melodrama'...",
    "Feeding the GPUs extra caffeine for faster rendering...",
    "Deleting 5,000 accidental fingers from the background extras...",
    "Asking the algorithm to feel 'vaguely nostalgic'...",
    "Untangling the digital film reels...",
    "Scanning 100 years of cinema to find the perfect lighting...",
    "Drinking a digital espresso while staring at a blank page...",
    "Removing all the 'it was all a dream' endings...",
    "Arguing with the AI about whether this scene needs more explosions...",
    "Searching for a climax that doesn't involve a giant laser in the sky...",
    "Adding 'dramatic tension'... please hold your breath...",
    "Reticulating splines (cinematically)...",
    "Hydrating the pixels...",
    "Polishing the subtitles...",
    "Casting the pixels...",
    "Cueing the dramatic music..."
]

interface LoadingMessagesProps {
    isLoading: boolean;
    className?: string;
}

export function LoadingMessages({ isLoading, className }: LoadingMessagesProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

    useEffect(() => {
        if (!isLoading) {
            setCurrentMessageIndex(0)
            return
        }

        // Pick a random start index
        setCurrentMessageIndex(Math.floor(Math.random() * MESSAGES.length))

        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % MESSAGES.length)
        }, 5000)

        return () => clearInterval(interval)
    }, [isLoading])

    return (
        <div className={cn("h-6 flex items-center justify-end overflow-hidden", className)}>
            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.p
                        key={currentMessageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="text-sm text-muted-foreground italic truncate max-w-[400px]"
                    >
                        {MESSAGES[currentMessageIndex]}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}
