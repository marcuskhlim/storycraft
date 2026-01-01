import {
    AudioBufferSource,
    AudioEncodingConfig,
    BufferTarget,
    CanvasSink,
    CanvasSource,
    Input,
    Mp4OutputFormat,
    Output,
    UrlSource,
    VideoEncodingConfig,
    ALL_FORMATS,
} from "mediabunny";
import { TimelineLayer } from "@/app/types";
import { clientLogger } from "@/lib/utils/client-logger";

// Constants
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export async function exportVideoClient(
    layers: TimelineLayer[],
    onProgress?: (progress: number) => void,
): Promise<Blob> {
    clientLogger.info("Starting client-side export...");

    // 1. Initialize Output with BufferTarget (MP4)
    const target = new BufferTarget();
    const output = new Output({
        format: new Mp4OutputFormat(),
        target: target,
    });

    // 2. Setup Video Track
    // Create an OffscreenCanvas for drawing frames
    const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d")!;

    // Video Encoding Config (H.264)
    const videoConfig: VideoEncodingConfig = {
        codec: "avc", // H.264
        bitrate: 5_000_000, // 5 Mbps
    };

    const canvasSource = new CanvasSource(canvas, videoConfig);
    output.addVideoTrack(canvasSource);

    // 3. Setup Audio Track
    // We will mix all audio logic using OfflineAudioContext, then add as a single track
    const audioConfig: AudioEncodingConfig = {
        codec: "aac", // AAC LC
        bitrate: 128_000,
    };

    // We need to mix audio before adding the tracksource, usually.
    // But AudioBufferSource takes an AudioBuffer.
    // We will compute the mixed AudioBuffer and feed it.
    const audioSource = new AudioBufferSource(audioConfig);
    output.addAudioTrack(audioSource);

    // 4. Start Output
    await output.start();

    // 5. Compute Duration
    // Find max duration from layers
    let duration = 0;
    layers.forEach((layer) => {
        layer.items.forEach((item) => {
            duration = Math.max(duration, item.startTime + item.duration);
        });
    });
    if (duration === 0) duration = 1; // Minimum duration

    clientLogger.info(`Export duration: ${duration}s`);

    // 6. Process Audio (Mix to AudioBuffer)
    // We need to load all audio inputs first to decode them.
    // Actually, UrlSource + AudioContext decodeAudioData is easier.
    const audioContext = new OfflineAudioContext(2, duration * 48000, 48000);

    // Helper to load audio buffer
    const loadAudioBuffer = async (
        url: string,
    ): Promise<AudioBuffer | null> => {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            // We need a temp audio context to decode if we weren't in OfflineContext?
            // OfflineAudioContext can decode too via decodeAudioData
            return await audioContext.decodeAudioData(arrayBuffer);
        } catch {
            clientLogger.error("Failed to load audio:", url);
            return null;
        }
    };

    // Process all audio items
    const audioPromises = layers.flatMap((layer) => {
        if (layer.type === "voiceover" || layer.type === "music") {
            return layer.items.map(async (item) => {
                if (!item.content) return;
                const buffer = await loadAudioBuffer(item.content);
                if (buffer) {
                    const source = audioContext.createBufferSource();
                    const gainNode = audioContext.createGain();

                    source.buffer = buffer;

                    // Handle trimming if metadata exists
                    const startTime = item.startTime;
                    // Trim Logic:
                    const offset =
                        typeof item.metadata?.trimStart === "number"
                            ? item.metadata.trimStart
                            : 0;
                    const playDuration = item.duration;

                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    source.start(startTime, offset, playDuration);

                    // Add ducking for music tracks for the last 2 seconds
                    if (layer.type === "music") {
                        const duckStart = Math.max(0, duration - 2);
                        const duckEnd = duration;

                        if (duckEnd > duckStart) {
                            gainNode.gain.setValueAtTime(1, duckStart);
                            gainNode.gain.linearRampToValueAtTime(0, duckEnd);
                        }
                    }
                }
            });
        }
        return [];
    });

    await Promise.all(audioPromises);
    const mixedAudioBuffer = await audioContext.startRendering(); // Returns AudioBuffer

    // Add Audio to Source
    await audioSource.add(mixedAudioBuffer);

    // 7. Process Video (Frame by Frame)
    // We need to load Video Inputs
    const videoLayer = layers.find((l) => l.type === "video");
    const videoInputs = new Map<string, { input: Input; sink: CanvasSink }>();

    if (videoLayer) {
        for (const item of videoLayer.items) {
            if (item.content) {
                try {
                    const input = new Input({
                        source: new UrlSource(item.content),
                        formats: ALL_FORMATS,
                    });
                    const track = await input.getPrimaryVideoTrack();
                    if (track) {
                        const sink = new CanvasSink(track);
                        videoInputs.set(item.id, { input, sink });
                    }
                } catch {
                    clientLogger.error(
                        "Failed to load video input:",
                        item.content,
                    );
                }
            }
        }
    }

    // Render Loop
    const dt = 1 / FPS;
    // Iterate strictly by frame count to avoid float drift issues potentially
    const totalFrames = Math.ceil(duration * FPS);

    for (let i = 0; i < totalFrames; i++) {
        const time = i * dt;

        // Report progress
        if (onProgress) {
            const progress = Math.round((i / totalFrames) * 100);
            onProgress(progress);
        }

        // Clear canvas
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Find active video clip
        const activeClip = videoLayer?.items.find(
            (item) =>
                time >= item.startTime && time < item.startTime + item.duration,
        );

        if (activeClip && videoInputs.has(activeClip.id)) {
            const { sink } = videoInputs.get(activeClip.id)!;

            // Calculate time within clip
            // Account for trimStart
            const offset =
                typeof activeClip.metadata?.trimStart === "number"
                    ? activeClip.metadata.trimStart
                    : 0;
            const clipTime = time - activeClip.startTime + offset;

            try {
                const wrapped = await sink.getCanvas(clipTime);
                if (wrapped && wrapped.canvas) {
                    // Draw to main canvas
                    // Handle aspect ratio? Assuming fit or stretch.
                    // drawImage(image, dx, dy, dWidth, dHeight)
                    ctx.drawImage(wrapped.canvas, 0, 0, WIDTH, HEIGHT);
                }
            } catch {
                // console.warn('Frame fetch failed');
            }
        }

        // Add frame to output
        // timestamp, duration
        await canvasSource.add(time, dt);
    }

    // Finalize
    await output.finalize();

    if (!target.buffer) {
        throw new Error("Export failed: No buffer produced");
    }

    return new Blob([target.buffer], { type: "video/mp4" });
}
