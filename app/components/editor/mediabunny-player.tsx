'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TimelineLayer, TimelineItem } from '@/app/types'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface MediabunnyPlayerProps {
  layers: TimelineLayer[]
  currentTime: number
  isPlaying: boolean
  onPlayPause: () => void
  onTimeUpdate: (time: number) => void
  onEnded: () => void
  logoOverlay?: string | null
  aspectRatio?: '16:9' | '9:16'
}

export function MediabunnyPlayer({
  layers,
  currentTime,
  isPlaying,
  onPlayPause,
  onTimeUpdate,
  onEnded,
  logoOverlay,
  aspectRatio = '16:9',
}: MediabunnyPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const nextVideoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeSourcesRef = useRef<Map<string, { source: AudioBufferSourceNode; gainNode: GainNode }>>(new Map())
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
  const currentClipRef = useRef<{ id: string; startTime: number; endTime: number; url: string; trimStart: number } | null>(null)
  const preloadedClipIdRef = useRef<string | null>(null) // Track which clip is preloaded in nextVideoRef
  const isPlayingRef = useRef(false) // Track playing state in ref to avoid stale closures
  const rafIdRef = useRef<number | null>(null) // For smooth RAF-based updates
  const lastAudioSyncTimeRef = useRef<number>(0) // Throttle audio sync checks
  const lastFrameTimeRef = useRef<number>(0) // For tracking frame delta during gaps
  const timelinePositionRef = useRef<number>(0) // Current timeline position
  const activeVideoRef = useRef<'main' | 'next'>('main') // Track which video element is currently active
  
  const [isReady, setIsReady] = useState(false)
  const [totalDuration, setTotalDuration] = useState(0)
  const [showBlackScreen, setShowBlackScreen] = useState(false)
  const [activeVideoElement, setActiveVideoElement] = useState<'main' | 'next'>('main')

  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Calculate total duration from all layers (max end time)
  useEffect(() => {
    let maxEndTime = 0
    layers.forEach(layer => {
      layer.items.forEach(item => {
        if (item.content) {
          const endTime = item.startTime + item.duration
          if (endTime > maxEndTime) maxEndTime = endTime
        }
      })
    })
    setTotalDuration(maxEndTime)
  }, [layers])

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new AudioContext({
        latencyHint: 'playback',
        sampleRate: 48000,
      })
    }

    return () => {
      // Cancel any running RAF loop
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      // Full cleanup on unmount
      activeSourcesRef.current.forEach(({ source, gainNode }) => {
        try {
          source.stop()
          source.disconnect()
          gainNode.disconnect()
        } catch (e) { /* ignore */ }
      })
      activeSourcesRef.current.clear()

      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  // Load audio buffer
  const loadAudioBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null

    if (audioBufferCacheRef.current.has(url)) {
      return audioBufferCacheRef.current.get(url)!
    }

    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      audioBufferCacheRef.current.set(url, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error('Failed to load audio buffer:', url, error)
      return null
    }
  }, [])

  // Get current video clip at timeline time
  const getCurrentVideoClip = useCallback((time: number): { item: TimelineItem; clipTime: number } | null => {
    const videoLayer = layers.find(l => l.type === 'video')
    if (!videoLayer) return null

    const clip = videoLayer.items.find(
      item => time >= item.startTime && time < item.startTime + item.duration && item.content
    )

    if (!clip) return null

    // clipTime is the position in the source video file
    // = (timeline position relative to clip start) + trimStart offset
    const trimStart = (clip.metadata?.trimStart as number) || 0
    return {
      item: clip,
      clipTime: (time - clip.startTime) + trimStart,
    }
  }, [layers])

  // Get audio clips active at timeline time
  const getActiveAudioClips = useCallback((time: number): { item: TimelineItem; clipTime: number; type: 'voiceover' | 'music' }[] => {
    const clips: { item: TimelineItem; clipTime: number; type: 'voiceover' | 'music' }[] = []

    layers.forEach(layer => {
      if (layer.type === 'voiceover' || layer.type === 'music') {
        layer.items.forEach(item => {
          if (time >= item.startTime && time < item.startTime + item.duration && item.content) {
            // clipTime is the position in the source audio file
            // = (timeline position relative to clip start) + trimStart offset
            const trimStart = (item.metadata?.trimStart as number) || 0
            clips.push({
              item,
              clipTime: (time - item.startTime) + trimStart,
              type: layer.type as 'voiceover' | 'music',
            })
          }
        })
      }
    })

    return clips
  }, [layers])

  // Get next video clip for preloading (by start time, not array index)
  const getNextVideoClip = useCallback((currentClipId: string): TimelineItem | null => {
    const videoLayer = layers.find(l => l.type === 'video')
    if (!videoLayer) return null

    const currentClip = videoLayer.items.find(item => item.id === currentClipId)
    if (!currentClip) return null

    // Find the clip that starts immediately after the current clip ends
    const sortedItems = [...videoLayer.items]
      .filter(item => item.content && item.startTime >= currentClip.startTime + currentClip.duration - 0.1)
      .sort((a, b) => a.startTime - b.startTime)

    return sortedItems.length > 0 ? sortedItems[0] : null
  }, [layers])

  // Get the currently active video element
  const getActiveVideo = useCallback((): HTMLVideoElement | null => {
    return activeVideoRef.current === 'main' ? videoRef.current : nextVideoRef.current
  }, [])

  // Get the preload video element (the one not currently active)
  const getPreloadVideo = useCallback((): HTMLVideoElement | null => {
    return activeVideoRef.current === 'main' ? nextVideoRef.current : videoRef.current
  }, [])

  // Swap which video element is active
  const swapVideoElements = useCallback(() => {
    const newActive = activeVideoRef.current === 'main' ? 'next' : 'main'
    activeVideoRef.current = newActive
    setActiveVideoElement(newActive)
  }, [])

  // Preload the next clip into the preload video element
  const preloadNextClip = useCallback((currentClipId: string) => {
    const nextClip = getNextVideoClip(currentClipId)
    const preloadVideo = getPreloadVideo()
    
    if (nextClip && preloadVideo && preloadedClipIdRef.current !== nextClip.id) {
      preloadVideo.src = nextClip.content
      preloadVideo.load()
      preloadedClipIdRef.current = nextClip.id
    }
  }, [getNextVideoClip, getPreloadVideo])

  // Track clips that are currently being started (to prevent race conditions)
  const startingAudioClipsRef = useRef<Set<string>>(new Set())
  
  // Generation counter to invalidate any in-flight audio operations
  const audioGenerationRef = useRef<number>(0)

  // Stop all audio immediately - this is aggressive and ensures complete silence
  const stopAllAudio = useCallback((shouldRecreateContext: boolean = false) => {
    // Increment generation to invalidate any in-flight async audio operations
    audioGenerationRef.current += 1
    
    const audioContext = audioContextRef.current
    
    // Stop all active sources
    activeSourcesRef.current.forEach(({ source, gainNode }) => {
      try {
        // Immediately mute by setting gain to 0
        gainNode.gain.value = 0
        if (audioContext) {
          gainNode.gain.cancelScheduledValues(audioContext.currentTime)
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        }
      } catch (e) { /* ignore */ }
      
      try {
        // Remove the onended callback to prevent any lingering references
        source.onended = null
      } catch (e) { /* ignore */ }
      
      try {
        source.stop(0) // Stop immediately (0 = now)
      } catch (e) { /* ignore - might already be stopped */ }
      
      try {
        source.disconnect()
      } catch (e) { /* ignore */ }
      
      try {
        gainNode.disconnect()
      } catch (e) { /* ignore */ }
    })
    
    activeSourcesRef.current.clear()
    startingAudioClipsRef.current.clear()
    
    // Nuclear option: close and recreate the audio context to ensure all audio stops
    if (shouldRecreateContext && audioContext) {
      try {
        audioContext.close()
      } catch (e) { /* ignore */ }
      
      // Create a new audio context
      audioContextRef.current = new AudioContext({
        latencyHint: 'playback',
        sampleRate: 48000,
      })
      // Clear the buffer cache since the old context is gone
      // Actually, buffers are transferable, but to be safe we keep them
    }
  }, [])

  // Start a single audio clip (only if not already playing or being started)
  const startAudioClip = useCallback(async (clip: { item: TimelineItem; clipTime: number; type: 'voiceover' | 'music' }) => {
    const clipId = clip.item.id
    
    // Capture the current generation at the start of this operation
    const startGeneration = audioGenerationRef.current
    
    // Don't start if already playing, already being started, or if we're not in playing state
    if (activeSourcesRef.current.has(clipId) || startingAudioClipsRef.current.has(clipId) || !isPlayingRef.current) {
      return
    }

    // Mark as starting BEFORE any async operations to prevent race conditions
    startingAudioClipsRef.current.add(clipId)

    const audioContext = audioContextRef.current
    if (!audioContext) {
      startingAudioClipsRef.current.delete(clipId)
      return
    }

    try {
      // Ensure context is running
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Check if we've been invalidated by a stop call
      if (audioGenerationRef.current !== startGeneration) {
        startingAudioClipsRef.current.delete(clipId)
        return
      }

      // Check again after async - might have been stopped
      if (!isPlayingRef.current) {
        startingAudioClipsRef.current.delete(clipId)
        return
      }

      const buffer = await loadAudioBuffer(clip.item.content)
      
      // Check again after loading buffer - generation might have changed
      if (audioGenerationRef.current !== startGeneration) {
        startingAudioClipsRef.current.delete(clipId)
        return
      }
      
      // Check again after loading buffer
      if (!buffer || !isPlayingRef.current) {
        startingAudioClipsRef.current.delete(clipId)
        return
      }

      // Final check - clip might have been started by another call that snuck through
      if (activeSourcesRef.current.has(clipId)) {
        startingAudioClipsRef.current.delete(clipId)
        return
      }

      const source = audioContext.createBufferSource()
      const gainNode = audioContext.createGain()
      
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const targetVolume = clip.type === 'voiceover' ? 0.8 : 0.4
      gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime)

      const startOffset = Math.max(0, Math.min(clip.clipTime, buffer.duration - 0.01))
      source.start(audioContext.currentTime, startOffset)
      
      activeSourcesRef.current.set(clipId, { source, gainNode })
      startingAudioClipsRef.current.delete(clipId)

      source.onended = () => {
        activeSourcesRef.current.delete(clipId)
      }
    } catch (e) {
      console.warn('Audio start error:', e)
      startingAudioClipsRef.current.delete(clipId)
    }
  }, [loadAudioBuffer])

  // Sync audio state with current timeline time (called periodically, not every frame)
  const syncAudioState = useCallback((timelineTime: number) => {
    const activeAudioClips = getActiveAudioClips(timelineTime)
    const activeIds = new Set(activeAudioClips.map(c => c.item.id))
    const audioContext = audioContextRef.current

    // Stop clips no longer active
    activeSourcesRef.current.forEach(({ source, gainNode }, clipId) => {
      if (!activeIds.has(clipId)) {
        try {
          if (audioContext) {
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          }
          source.stop()
          source.disconnect()
          gainNode.disconnect()
        } catch (e) { /* ignore */ }
        activeSourcesRef.current.delete(clipId)
      }
    })

    // Start new clips (only if not already playing or being started)
    activeAudioClips.forEach(clip => {
      if (!activeSourcesRef.current.has(clip.item.id) && !startingAudioClipsRef.current.has(clip.item.id)) {
        startAudioClip(clip)
      }
    })
  }, [getActiveAudioClips, startAudioClip])

  // Smooth RAF-based timeline update loop - handles both video playback and gaps
  const startPlaybackLoop = useCallback(() => {
    lastFrameTimeRef.current = performance.now()
    let isLoadingClip = false // Track when we're waiting for a clip to load
    
    const tick = () => {
      if (!isPlayingRef.current) {
        rafIdRef.current = null
        return
      }

      const now = performance.now()
      const deltaTime = (now - lastFrameTimeRef.current) / 1000 // Convert to seconds
      lastFrameTimeRef.current = now

      const video = getActiveVideo()
      const currentClip = currentClipRef.current
      let timelineTime = timelinePositionRef.current

      // First check if we've reached the total duration - stop completely
      if (timelineTime >= totalDuration) {
        if (video && !video.paused) {
          video.pause()
        }
        setShowBlackScreen(true)
        stopAllAudio()
        onEnded()
        return
      }

      // Check if we're currently in a clip and it has ended
      if (currentClip && video) {
        const clipEndTime = currentClip.endTime
        // Calculate timeline time from video time: startTime + (videoCurrentTime - trimStart)
        const videoTime = currentClip.startTime + (video.currentTime - currentClip.trimStart)
        
        if (videoTime >= clipEndTime - 0.05) { // Small buffer to prevent stuttering
          // Current clip has ended
          video.pause()
          currentClipRef.current = null
          timelineTime = clipEndTime
          timelinePositionRef.current = timelineTime
          isLoadingClip = false
        }
      }

      // Check if we're in a video clip
      const clipAtTime = getCurrentVideoClip(timelineTime)
      
      // Determine if video is actually playing and ready
      const videoIsPlaying = video && !video.paused && video.readyState >= 2
      
      if (clipAtTime && video) {
        // We're in a video clip
        setShowBlackScreen(false)
        
        // Check if we need to switch to this clip (different clip or no current clip)
        if (!currentClipRef.current || currentClipRef.current.id !== clipAtTime.item.id) {
          // Stop audio when loading a new clip to prevent desync
          isLoadingClip = true
          stopAllAudio()
          
          const trimStart = (clipAtTime.item.metadata?.trimStart as number) || 0
          currentClipRef.current = {
            id: clipAtTime.item.id,
            startTime: clipAtTime.item.startTime,
            endTime: clipAtTime.item.startTime + clipAtTime.item.duration,
            url: clipAtTime.item.content,
            trimStart,
          }
          
          // Check if this clip is already preloaded in the other video element
          const preloadVideo = getPreloadVideo()
          if (preloadedClipIdRef.current === clipAtTime.item.id && preloadVideo && preloadVideo.readyState >= 2) {
            // Swap to the preloaded video - instant playback!
            video.pause()
            swapVideoElements()
            preloadVideo.currentTime = clipAtTime.clipTime
            preloadVideo.play().catch(console.error)
            preloadedClipIdRef.current = null // Clear preloaded ref since we're using it now
            isLoadingClip = false // No loading needed, it was preloaded!
          } else {
            // Fall back to regular loading
            video.src = clipAtTime.item.content
            video.currentTime = clipAtTime.clipTime
            video.play().catch(console.error)
          }
          
          // Preload the next clip while this one plays
          preloadNextClip(clipAtTime.item.id)
        }
        
        // Get time from video if it's playing (use the currently active video)
        const activeVideo = getActiveVideo()
        const activeVideoIsPlaying = activeVideo && !activeVideo.paused && activeVideo.readyState >= 2
        if (activeVideoIsPlaying && currentClipRef.current) {
          // Calculate timeline time from video time: startTime + (videoCurrentTime - trimStart)
          timelineTime = currentClipRef.current.startTime + (activeVideo.currentTime - currentClipRef.current.trimStart)
          isLoadingClip = false // Video is now playing, loading is done
        }
        // If video is not ready yet, DON'T advance timeline - wait for video
      } else {
        // We're in a gap (or past all clips) - show black screen and advance time manually
        setShowBlackScreen(true)
        if (video && !video.paused) {
          video.pause()
        }
        currentClipRef.current = null
        isLoadingClip = false
        timelineTime += deltaTime
      }

      timelinePositionRef.current = timelineTime

      // Update playhead position every frame for smooth movement
      onTimeUpdate(timelineTime)

      // Sync audio less frequently (every ~100ms) - but ONLY if we're not loading a clip
      // This prevents audio from playing ahead while video is buffering
      if (!isLoadingClip && now - lastAudioSyncTimeRef.current > 100) {
        lastAudioSyncTimeRef.current = now
        syncAudioState(timelineTime)
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    // Start the loop
    rafIdRef.current = requestAnimationFrame(tick)
  }, [totalDuration, onTimeUpdate, onEnded, syncAudioState, getCurrentVideoClip, stopAllAudio, getActiveVideo, getPreloadVideo, swapVideoElements, preloadNextClip])

  // Stop the playback loop
  const stopPlaybackLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  // Video ended handler - the RAF loop handles transitions, this is just a fallback
  const handleVideoEnded = useCallback(() => {
    // RAF loop handles transitions - this just ensures we don't get stuck
    if (currentClipRef.current) {
      currentClipRef.current = null
    }
  }, [])

  // Track last loaded video URL to prevent redundant loads
  const lastLoadedVideoRef = useRef<string | null>(null)

  // Set initial video clip when seeking (not during playback)
  useEffect(() => {
    if (isPlaying) return

    const video = getActiveVideo()
    if (!video) return

    timelinePositionRef.current = currentTime
    const clipData = getCurrentVideoClip(currentTime)
    
    if (!clipData) {
      // We're in a gap - show black screen
      setShowBlackScreen(true)
      currentClipRef.current = null
      return
    }

    // We're in a clip
    setShowBlackScreen(false)
    const { item, clipTime } = clipData
    const trimStart = (item.metadata?.trimStart as number) || 0
    
    currentClipRef.current = {
      id: item.id,
      startTime: item.startTime,
      endTime: item.startTime + item.duration,
      url: item.content,
      trimStart,
    }

    // Only load if the video content actually changed (not just positions)
    const needsLoad = lastLoadedVideoRef.current !== item.content
    if (needsLoad) {
      video.src = item.content
      video.load()
      lastLoadedVideoRef.current = item.content
    }
    
    video.currentTime = clipTime
    
    // Preload next clip when seeking
    preloadNextClip(item.id)
  }, [currentTime, isPlaying, getCurrentVideoClip, getActiveVideo, preloadNextClip])

  // Handle play/pause - single source of truth for starting/stopping
  useEffect(() => {
    const mainVideo = videoRef.current
    const nextVideo = nextVideoRef.current
    if (!mainVideo) return

    if (isPlaying) {
      // FIRST: Stop any existing audio to ensure clean state
      // This is critical when seeking to a new position
      stopAllAudio(false) // false = don't recreate context, just stop sources
      
      // Resume audio context and wait for it
      const resumeAndStart = async () => {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        // Double check we're still supposed to be playing
        if (!isPlayingRef.current) return
        
        // Start audio for current position (only clips not already playing or starting)
        const audioClips = getActiveAudioClips(currentTime)
        audioClips.forEach(clip => {
          if (!activeSourcesRef.current.has(clip.item.id) && !startingAudioClipsRef.current.has(clip.item.id)) {
            startAudioClip(clip)
          }
        })
      }
      
      resumeAndStart()

      // Initialize timeline position
      timelinePositionRef.current = currentTime

      // Check if we're starting in a video clip or a gap
      const clipData = getCurrentVideoClip(currentTime)
      if (clipData) {
        const { item, clipTime } = clipData
        const trimStart = (item.metadata?.trimStart as number) || 0
        
        currentClipRef.current = {
          id: item.id,
          startTime: item.startTime,
          endTime: item.startTime + item.duration,
          url: item.content,
          trimStart,
        }

        // Use the currently active video element
        const video = getActiveVideo()
        if (video) {
          video.src = item.content
          video.currentTime = clipTime
          video.play().catch(console.error)
        }
        setShowBlackScreen(false)
        
        // Preload the next clip immediately
        preloadNextClip(item.id)
      } else {
        // Starting in a gap
        setShowBlackScreen(true)
        currentClipRef.current = null
      }

      // Start the smooth RAF playback loop
      startPlaybackLoop()
    } else {
      // STOP everything immediately
      // Set isPlayingRef FIRST to prevent any async audio from starting
      isPlayingRef.current = false
      
      // Pause both video elements
      mainVideo.pause()
      if (nextVideo) nextVideo.pause()
      
      // Stop the RAF loop FIRST to prevent any new audio from being started
      stopPlaybackLoop()
      
      // Stop all audio sources and recreate context to ensure clean slate
      stopAllAudio(true) // true = recreate audio context
    }
  }, [isPlaying]) // Only run when play state changes - functions access refs directly

  // Pre-load audio buffers
  useEffect(() => {
    const preloadAudio = async () => {
      for (const layer of layers) {
        if (layer.type === 'voiceover' || layer.type === 'music') {
          for (const item of layer.items) {
            if (item.content) {
              await loadAudioBuffer(item.content)
            }
          }
        }
      }
    }
    preloadAudio()
  }, [layers, loadAudioBuffer])

  // Track which video URLs we've already preloaded to avoid repeated loads
  const preloadedUrlsRef = useRef<Set<string>>(new Set())
  
  // Pre-load first video clip for instant playback on first play
  // Only reacts to actual content changes, not position changes
  useEffect(() => {
    const videoLayer = layers.find(l => l.type === 'video')
    if (!videoLayer) return

    // Get unique video URLs (content only, not positions)
    const videoUrls = videoLayer.items
      .filter(item => item.content)
      .map(item => item.content)
    
    // Check if we have any new URLs that need preloading
    const hasNewContent = videoUrls.some(url => !preloadedUrlsRef.current.has(url))
    
    if (!hasNewContent) return // No new content, skip

    const sortedClips = [...videoLayer.items]
      .filter(item => item.content)
      .sort((a, b) => a.startTime - b.startTime)
    
    if (sortedClips.length > 0 && videoRef.current) {
      const firstClip = sortedClips[0]
      // Only load if this URL hasn't been loaded into this element
      if (!videoRef.current.src || !videoRef.current.src.includes(firstClip.content.split('/').pop() || '')) {
        videoRef.current.src = firstClip.content
        videoRef.current.load()
        preloadedUrlsRef.current.add(firstClip.content)
      }
      
      // If there's a second clip with different content, preload it
      if (sortedClips.length > 1 && nextVideoRef.current) {
        const secondClip = sortedClips[1]
        if (secondClip.content !== firstClip.content && !preloadedUrlsRef.current.has(secondClip.content)) {
          nextVideoRef.current.src = secondClip.content
          nextVideoRef.current.load()
          preloadedClipIdRef.current = secondClip.id
          preloadedUrlsRef.current.add(secondClip.content)
        }
      }
    }
  }, [layers])

  const handleLoadedMetadata = useCallback(() => {
    if (!isReady) setIsReady(true)
  }, [isReady])

  const handleCanPlay = useCallback(() => {
    if (!isReady) setIsReady(true)
  }, [isReady])

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', e)
    if (!isReady) setIsReady(true)
  }, [isReady])

  const hasVideoContent = layers.find(l => l.type === 'video')?.items.some(i => i.content)

  return (
    <div className="relative w-full">
      <div 
        className={`relative w-full bg-black rounded-lg overflow-hidden ${
          aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        }`}
      >
        <video
          ref={videoRef}
          className={`w-full h-full object-contain absolute inset-0 ${
            showBlackScreen || activeVideoElement !== 'main' ? 'hidden' : ''
          }`}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          playsInline
          muted
          preload="auto"
        />
        
        <video
          ref={nextVideoRef}
          className={`w-full h-full object-contain absolute inset-0 ${
            showBlackScreen || activeVideoElement !== 'next' ? 'hidden' : ''
          }`}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          playsInline
          muted
          preload="auto"
        />
        
        {!isReady && hasVideoContent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-8 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-white/60 text-sm">Loading media...</span>
            </div>
          </div>
        )}

        {!hasVideoContent && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <span className="text-gray-400">No video clips</span>
          </div>
        )}

        {logoOverlay && (
          <div className="absolute top-4 right-4 w-24 aspect-video">
            <Image
              src={logoOverlay}
              alt="Logo Overlay"
              className="w-full h-full object-contain"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            variant="secondary"
            size="icon"
            onClick={onPlayPause}
            className="bg-black/50 hover:bg-green-500 hover:text-white transition-colors"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function clearMediaCache() {
  // No-op for compatibility
}
