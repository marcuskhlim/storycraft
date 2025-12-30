# Done

- props?
- 9/16
- choose model
- fix GCSImage?
- voice description
- clip duration
- fix delete character/settings/props loader
- nano banana more than 3 reference images
- fix image generation language Imagen4

# On Hold:

    * google_searc + url_context
    * upload style image

# Next:

    * specify model when generating content
    * specify aspectRatio when generatingImage
    * refactor regenerate-image
    * resize scenes images
    * fix scene action full character description
    * Review Scene data:
        * scene by scene model choice + params
        * conversational edit images

# TODO:

    * add images to conversational edit (e.g. add this logo onto ...)
    * linter and prettier format
    * Editor:
        ✅ shorten move clips
        * refactor editor and data model
        * logo text overlays
        * captions https://www.angel1254.com/blog/posts/word-by-word-captions
        * upload music/video
        * zoom
        * undo/redo
        * transitions
        * cut clips
        * full screen
        * show hide timeline
        * timestamp display
    * character poses variation
    * Posthog / Analytics
    * Tests (Jest/Vitest + E2E Playwright/Cypress)
    * Major Review and refactor

## Editor

### 🔊 Audio Controls

1. Per-clip volume control - Adjust volume for individual clips
2. Audio fade in/out - Smooth audio transitions at clip edges
3. Mute/solo tracks - Quickly isolate or silence layers

### 🎬 Video Transitions

4. Crossfade/dissolve between video clips
5. Fade to/from black at start/end
6. Wipe transitions

### ✂️ Editing Operations

7. Split clip at playhead - Divide a clip into two
8. Delete clip with keyboard (Delete/Backspace key)
9. Copy/paste clips
10. Undo/Redo - Essential for non-destructive editing

### 🔍 Timeline Navigation

11. Zoom in/out on timeline (currently fixed at 65 seconds)
12. Timeline markers/bookmarks
13. J/K/L playback controls (reverse, pause, forward)

### 📝 Overlays

14. Text/title overlays - Add custom text on video
15. Subtitles/captions layer

### ⚡ Advanced

16. Speed control - Slow motion, speed up clips
17. Multiple video tracks - Picture-in-picture, overlays
18. Audio scrubbing - Hear audio while seeking

---

### Priority Recommendations

If you want to add features incrementally, I'd suggest this order:

1. Per-clip volume control - High impact, essential for mixing audio
2. Split clip at playhead - Core editing function
3. Undo/Redo - Critical for user experience
4. Timeline zoom - Better editing precision
5. Audio fade in/out - Polishes audio transitions
6. Keyboard shortcuts (Delete, Ctrl+Z, etc.)
