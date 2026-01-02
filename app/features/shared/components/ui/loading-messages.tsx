"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/utils";

const SCENARIO_MESSAGES = [
    "Drinking a digital espresso while staring at a blank page...",
    "Searching for a climax that doesn't involve a giant laser in the sky...",
    "Removing all the 'it was all a dream' endings...",
    "Scanning the multiverse for a better plot twist...",
    "Teaching the AI the difference between 'drama' and 'melodrama'...",
    "Asking the algorithm to feel 'vaguely nostalgic'...",
    "Calculating the meaning of life (and also your video)...",
    "Arguing with the AI about whether this scene needs more explosions...",
    "Untangling the digital film reels...",
    "Trying to remember where we put the opening credits...",
    "Brainstorming ways to kill off the protagonist (mercifully)...",
    'Hiding the "Chekhov\'s Gun" behind a digital curtain...',
    'Convincing the AI that "suddenly, a dragon appears" isn\'t a valid ending...',
    "Tightening the subtext until it’s barely readable...",
    "Polishing the dialogue until it sparkles (virtually)...",
    'Removing the 14th mention of "the protagonist sighed"...',
    "Searching for a metaphor that hasn’t been used since 1994...",
    "Checking the script for accidental puns...",
    "Negotiating the script length with a very stubborn chatbot...",
    "Adding 'dramatic tension'... please hold your breath...",
    "Fact-checking the AI's version of history...",
    "Deep-cleaning the inciting incident...",
    "Ensuring the romantic lead has more than one personality trait...",
    'Translating "beep boop" into meaningful dialogue...',
    "Consulting with a digital Shakespeare...",
    "Removing 400 unnecessary adjectives...",
    'Buffering the "Hero\'s Journey"...',
    'Looking for a rhyme that isn\'t "blue" and "you"...',
    "Weaving a web of lies (it’s a thriller)...",
    "Watering the plot seeds...",
    "Checking the third act for logic gaps...",
    "Helping the AI overcome writer's block...",
    "Finding a title that doesn't sound like a generic action movie...",
    "Balancing the exposition so users don't fall asleep...",
    "Giving the villain a tragic backstory (and a cat)...",
    "Deleting a scene that was way too long...",
    'Asking the AI to "make it more noir"...',
    'Drafting the "Previously On" segment...',
    'Hunting for the perfect "Once upon a time"...',
    'Flipping through a digital dictionary for "big words"...',
    "Ensuring the protagonist's motivation makes sense...",
    'Refining the "Call to Adventure"...',
    "Checking if the AI stole the plot from a 90s sitcom...",
    "Making sure the stakes are high enough...",
    'Optimizing the "Emotional Impact" slider to 88%...',
    "Designing a world that doesn't violate physics...",
    "Scrapping the draft and starting over (just kidding)...",
    "Feeding the AI more poetry for better descriptions...",
    'Setting the scene in a way that feels "cinematic"...',
    "Finishing the script before the AI gets distracted by cat videos...",
];

const STORYBOARD_MESSAGES = [
    "Scouting for a location that isn't a warehouse...",
    "Scanning 100 years of cinema to find the perfect lighting...",
    "Dusting off the digital lenses...",
    "Casting the pixels...",
    "Waiting for the golden hour (it's taking forever)...",
    "Reticulating splines (cinematically)...",
    "Negotiating back-end points with the AI's agent...",
    "Convincing the lead actor to come out of their trailer...",
    "Sharpening the digital pencils...",
    "Erasing the storyboard artist’s coffee stains...",
    'Framing the "hero shot" from a low angle...',
    "Finding the rule of thirds in a digital void...",
    'Drawing stick figures and calling it "conceptual"...',
    "Trying to decide if this should be a wide shot or a close-up...",
    'Sketching a sunrise that isn\'t too "cheesy"...',
    "Adjusting the focal length of a non-existent lens...",
    'Looking for the "Depth of Field" button...',
    "Blocking the scene while the AI is at lunch...",
    "Re-aligning the stars for better dramatic timing...",
    'Telling the AI that "Rule of Thirds" isn\'t a law of physics...',
    "Painting the backgrounds with bits and bytes...",
    "Deciding which way the wind is blowing in frame 4...",
    "Checking for lens flares (even though J.J. Abrams isn't here)...",
    "Ensuring the protagonist's hair looks heroic...",
    'Composing a shot that feels "meaningful"...',
    'Finding the perfect shade of "cinematic teal"...',
    "Mapping out the camera movement with a digital crane...",
    "Putting the characters in their places...",
    "Deciding what's in the background so it's not just a void...",
    "Sketching the explosion from three different angles...",
    'Telling the AI that "negative space" is good...',
    'Adjusting the lighting to be "moody but visible"...',
    "Trying to sketch a high-speed chase...",
    "Making sure the characters aren't standing in a line...",
    'Checking for "visual metaphors"...',
    "Cleaning up the ink spills on the digital canvas...",
    'Drafting the character\'s "best side"...',
    "Positioning the digital sun for maximum drama...",
    'Drawing the "X" where the hero stands...',
    "Ensuring the storyboard flows like a flip-book...",
    'Organizing the thumbnails by "vibe"...',
    "Coloring inside the lines (mostly)...",
    'Checking the perspective for "M.C. Escher" errors...',
    "Measuring the distance between the camera and the emotion...",
    'Picking the right filter for a "dream sequence"...',
    "Sketching the architecture of a future city...",
    "Deciding if the protagonist should wear a hat...",
    "Re-drawing the third frame because it looked like a potato...",
    'Organizing the visual "beat sheet"...',
    "Closing the sketchbook and handing it to the GPUs...",
];

const VIDEO_MESSAGES = [
    "Feeding the GPUs extra caffeine for faster rendering...",
    "Deleting 5,000 accidental fingers from the background extras...",
    "Fixing it in post...",
    "Adding more lens flares because J.J. Abrams called...",
    "Editing out the boom mic from the opening shot...",
    "Hydrating the pixels...",
    "Polishing the subtitles...",
    "Cueing the dramatic music...",
    "Calming down the director after a creative tantrum...",
    "Ensuring the AI cat doesn't look 'uncanny'...",
    "Teaching the AI that 'action' doesn't always mean 'explosions'...",
    "Explaining to the bots why we can't use copyrighted music...",
    "Persuading the pixels to stay in their assigned seats...",
    "Generating a waiting message to make this feel faster...",
    "Pretending to work while the GPUs do all the heavy lifting...",
    "Searching for the 'Save' button... just kidding, found it...",
    "Practicing our Oscar acceptance speech in the mirror...",
    "Stitching the frames together with digital thread...",
    "Rendering the motion blur (but not too much)...",
    "Buffering the epicness...",
    "Cleaning the digital sensor...",
    'Removing the "coffee cup" from the medieval tavern scene...',
    'Synchronizing the "oomph" with the "thud"...',
    "Smoothing out the frame rate...",
    'Checking for "glitches in the Matrix"...',
    "Compressing the file without losing its soul...",
    "Baking the lighting into the textures...",
    "Teaching the pixels how to dance...",
    "Telling the GPU it’s doing a great job...",
    "Re-rendering the protagonist's left eyebrow...",
    'Checking the lip-sync for "uncanny valley" vibes...',
    'Adding a "film grain" to make it look expensive...',
    "Defrosting the server room...",
    "Calculating the physics of a falling digital leaf...",
    "Mixing the audio so the dialogue is actually audible...",
    'Removing the "made by AI" birthmark...',
    "Polishing the chrome on the spaceships...",
    "Ensuring the slow-motion is actually slow...",
    'Finalizing the color grade to "Deep Cinema"...',
    'Turning up the "Wow Factor"...',
    "Putting the finishing touches on the digital explosion...",
    "Checking for any stray pixels trying to escape...",
    "Balancing the bass in the soundtrack...",
    "Making sure the protagonist doesn't walk through a wall...",
    'Checking the "CGI budget" (it\'s infinite, but still)...',
    'Adding the final "clink" to the glass...',
    "Wrapping the production in a digital bow...",
    "Rolling the credits in our heads...",
    "Final check for any accidental cameos by the developer...",
    'Your masterpiece is currently being "exported from the future"...',
];

export type LoadingPhase = "scenario" | "storyboard" | "video";

const MESSAGES_BY_PHASE: Record<LoadingPhase, string[]> = {
    scenario: SCENARIO_MESSAGES,
    storyboard: STORYBOARD_MESSAGES,
    video: VIDEO_MESSAGES,
};

interface LoadingMessagesProps {
    isLoading: boolean;
    className?: string;
    phase?: LoadingPhase;
}

export function LoadingMessages({
    isLoading,
    className,
    phase = "scenario",
}: LoadingMessagesProps) {
    const messages = MESSAGES_BY_PHASE[phase];

    // Helper to get a random starting index
    const getRandomIndex = useCallback(
        () => Math.floor(Math.random() * messages.length),
        [messages.length],
    );

    // Initialize with a random index using a function to avoid the lint warning
    const [currentMessageIndex, setCurrentMessageIndex] =
        useState(getRandomIndex);
    const wasLoadingRef = useRef(isLoading);

    // Memoized function to advance to the next message
    const advanceMessage = useCallback(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, [messages.length]);

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
    }, [isLoading, getRandomIndex]);

    useEffect(() => {
        if (!isLoading) return;

        const interval = setInterval(advanceMessage, 3000); // 3 seconds per message
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
                        {messages[currentMessageIndex]}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
