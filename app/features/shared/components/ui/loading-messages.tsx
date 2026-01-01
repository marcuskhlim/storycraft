"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/utils";

const MESSAGES = [
    "Convincing the lead actor to come out of their trailer...",
    "Editing out the boom mic from the opening shot...",
    "Negotiating back-end points with the AI's agent...",
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
    "Cueing the dramatic music...",
    "Calming down the director after a creative tantrum...",
    "Waiting for the golden hour (it's taking forever)...",
    "Ensuring the AI cat doesn't look 'uncanny'...",
    "Scouting for a location that isn't a warehouse...",
    "Re-aligning the stars for better dramatic timing...",
    "Teaching the AI that 'action' doesn't always mean 'explosions'...",
    "Explaining to the bots why we can't use copyrighted music...",
    "Scanning the multiverse for a better plot twist...",
    "Persuading the pixels to stay in their assigned seats...",
    "Dusting off the digital lenses...",
    "Optimizing the 'Emotional Impact' slider to 88%...",
    "Generating a waiting message to make this feel faster...",
    "Pretending to work while the GPUs do all the heavy lifting...",
    "Searching for the 'Save' button... just kidding, found it...",
    "Trying to remember where we put the opening credits...",
    "Calculating the meaning of life (and also your video)...",
];

interface LoadingMessagesProps {
    isLoading: boolean;
    className?: string;
}

// Helper to get a random starting index
const getRandomIndex = () => Math.floor(Math.random() * MESSAGES.length);

export function LoadingMessages({
    isLoading,
    className,
}: LoadingMessagesProps) {
    // Initialize with a random index using a function to avoid the lint warning
    const [currentMessageIndex, setCurrentMessageIndex] =
        useState(getRandomIndex);
    const wasLoadingRef = useRef(isLoading);

    // Memoized function to advance to the next message
    const advanceMessage = useCallback(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, []);

    useEffect(() => {
        // When transitioning from not loading to loading, reset to random index
        if (isLoading && !wasLoadingRef.current) {
            // Use setTimeout to avoid synchronous setState warning if needed
            const timer = setTimeout(() => {
                setCurrentMessageIndex(getRandomIndex());
            }, 0);
            wasLoadingRef.current = true;
            return () => clearTimeout(timer);
        }

        if (!isLoading && wasLoadingRef.current) {
            wasLoadingRef.current = false;
        }
    }, [isLoading]);

    useEffect(() => {
        if (!isLoading) return;

        const interval = setInterval(advanceMessage, 5000);
        return () => clearInterval(interval);
    }, [isLoading, advanceMessage]);

    return (
        <div
            className={cn(
                "flex h-6 items-center justify-end overflow-hidden",
                className,
            )}
        >
            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.p
                        key={currentMessageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-[500px] text-sm italic text-muted-foreground"
                    >
                        {MESSAGES[currentMessageIndex]}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
