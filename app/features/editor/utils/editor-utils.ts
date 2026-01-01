/**
 * Format time in mm:SS format
 */
export const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * Get audio duration from URL
 */
export const getAudioDuration = async (
    url: string,
    fallbackDuration: number,
): Promise<number> => {
    return new Promise((resolve) => {
        const audio = new Audio(url);
        audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
        audio.addEventListener("error", () => resolve(fallbackDuration));
        audio.src = url;
    });
};

/**
 * Get video duration from URL
 */
export const getVideoDuration = async (
    url: string,
    fallbackDuration: number,
): Promise<number> => {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.addEventListener("loadedmetadata", () => resolve(video.duration));
        video.addEventListener("error", () => resolve(fallbackDuration));
        video.src = url;
    });
};
