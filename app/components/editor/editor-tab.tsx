'use client'

import { TimelineLayer } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Film, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Scenario, TimelineItem } from '../../types'
import { AudioWaveform } from './audio-wave-form'
import { MediabunnyPlayer } from './mediabunny-player'
import { MusicParams, MusicSelectionDialog } from './music-selection-dialog'
import { VideoThumbnail } from './video-thumbnail'
import { Voice, VoiceSelectionDialog } from './voice-selection-dialog'
import { getDynamicImageUrl } from '@/app/actions/storageActions'

interface EditorTabProps {
    scenario: Scenario
    currentTime: number
    onTimeUpdate: (time: number) => void
    onTimelineItemUpdate: (layerId: string, itemId: string, updates: Partial<TimelineItem>) => void
    logoOverlay: string | null
    setLogoOverlay: (logo: string | null) => void
    onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    onLogoRemove: () => void
    onGenerateMusic: (params?: MusicParams) => Promise<void>
    isGeneratingMusic?: boolean
    onGenerateVoiceover: (voice?: Voice) => Promise<void>
    isGeneratingVoiceover?: boolean
    onExportMovie: (layers: TimelineLayer[]) => Promise<void>
    isExporting?: boolean
    onRemoveVoiceover?: (sceneIndex: number) => void
    onRemoveMusic?: () => void
}

const TIMELINE_DURATION = 65 // Total timeline duration in seconds
const MARKER_INTERVAL = 5 // Time marker interval in seconds
const CLIP_PADDING = 2 // Padding between clips in pixels

// Format time in mm:SS format
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function EditorTab({
    scenario,
    currentTime,
    onTimeUpdate,
    onTimelineItemUpdate,
    logoOverlay,
    setLogoOverlay,
    onLogoUpload,
    onLogoRemove,
    onGenerateMusic,
    isGeneratingMusic = false,
    onGenerateVoiceover,
    isGeneratingVoiceover = false,
    onExportMovie,
    isExporting = false,
    onRemoveVoiceover,
    onRemoveMusic,
}: EditorTabProps) {

    const SCENE_DURATION = scenario.durationSeconds || 8
    const timelineRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Simplified state management
    const [selectedItem, setSelectedItem] = useState<{ layerId: string, itemId: string } | null>(null)
    
    // Resize state
    const [isResizing, setIsResizing] = useState(false)
    const [resizeStartX, setResizeStartX] = useState(0)
    const [resizeStartTime, setResizeStartTime] = useState(0)
    const [resizeStartDuration, setResizeStartDuration] = useState(0)
    const [resizeStartTrimStart, setResizeStartTrimStart] = useState(0) // Track initial trim offset
    const [resizeHandle, setResizeHandle] = useState<'start' | 'end' | null>(null)
    const [resizingItem, setResizingItem] = useState<{ layerId: string, itemId: string } | null>(null)

    // Drag state for moving clips
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartX, setDragStartX] = useState(0)
    const [dragStartTime, setDragStartTime] = useState(0)
    const [draggingItem, setDraggingItem] = useState<{ layerId: string, itemId: string } | null>(null)
    const [dropIndicator, setDropIndicator] = useState<{ layerId: string, position: number } | null>(null)
    const originalLayerItemsRef = useRef<TimelineItem[]>([]) // Store original positions for swap detection

    // Playback state - driven by MediabunnyPlayer
    const [isPlaying, setIsPlaying] = useState(false)
    
    // Dialog states
    const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false)
    const [isMusicDialogOpen, setIsMusicDialogOpen] = useState(false)
    
    // Timeline layers
    const [layers, setLayers] = useState<TimelineLayer[]>([
        {
            id: 'videos',
            name: 'Videos',
            type: 'video',
            items: scenario.scenes.map((scene, index) => ({
                id: `video-${index}`,
                startTime: index * SCENE_DURATION,
                duration: SCENE_DURATION,
                content: '',
                type: 'video',
                metadata: {
                    logoOverlay: scenario.logoOverlay || undefined
                }
            }))
        },
        {
            id: 'voiceovers',
            name: 'Voiceovers',
            type: 'voiceover',
            items: []
        },
        {
            id: 'music',
            name: 'Music',
            type: 'music',
            items: []
        }
    ])

    const handleLogoClick = () => {
        fileInputRef.current?.click()
    }

    // Voice selection handlers
    const handleOpenVoiceDialog = () => setIsVoiceDialogOpen(true)
    const handleCloseVoiceDialog = () => setIsVoiceDialogOpen(false)
    const handleVoiceSelect = async (voice: Voice) => {
        setIsVoiceDialogOpen(false)
        await onGenerateVoiceover(voice)
    }

    // Music selection handlers
    const handleOpenMusicDialog = () => setIsMusicDialogOpen(true)
    const handleCloseMusicDialog = () => setIsMusicDialogOpen(false)
    const handleMusicGenerate = async (params: MusicParams) => {
        setIsMusicDialogOpen(false)
        await onGenerateMusic(params)
    }

    // Get audio duration helper
    const getAudioDuration = async (url: string): Promise<number> => {
        return new Promise((resolve) => {
            const audio = new Audio(url)
            audio.addEventListener('loadedmetadata', () => resolve(audio.duration))
            audio.addEventListener('error', () => resolve(SCENE_DURATION))
        })
    }

    // Get video duration helper
    const getVideoDuration = async (url: string): Promise<number> => {
        return new Promise((resolve) => {
            const video = document.createElement('video')
            video.preload = 'metadata'
            video.addEventListener('loadedmetadata', () => resolve(video.duration))
            video.addEventListener('error', () => resolve(SCENE_DURATION))
            video.src = url
        })
    }

    // Resolve URLs and update layers
    useEffect(() => {
        const resolveUrlsAndUpdateLayers = async () => {
            if (layers.length === 0) return

            const updatedLayers = JSON.parse(JSON.stringify(layers)) as TimelineLayer[]
            const videoLayer = updatedLayers.find(layer => layer.id === 'videos')
            const voiceoverLayer = updatedLayers.find(layer => layer.id === 'voiceovers')
            const musicLayer = updatedLayers.find(layer => layer.id === 'music')
            
            // Resolve video URLs and get original durations
            if (videoLayer) {
                for (let i = 0; i < scenario.scenes.length; i++) {
                    const scene = scenario.scenes[i]
                    if (scene.videoUri) {
                        try {
                            const result = await getDynamicImageUrl(scene.videoUri)
                            if (result?.url && videoLayer.items[i]) {
                                videoLayer.items[i].content = result.url
                                // Get and store the original video duration and initialize trim
                                const originalDuration = await getVideoDuration(result.url)
                                videoLayer.items[i].metadata = {
                                    ...videoLayer.items[i].metadata,
                                    originalDuration,
                                    trimStart: 0  // Start from beginning of source video
                                }
                            }
                        } catch (error) {
                            console.error(`Error resolving video URL for scene ${i}:`, error)
                        }
                    }
                }
            }

            // Resolve voiceover URLs
            if (voiceoverLayer) {
                const voiceoverItems: TimelineItem[] = []
                for (let i = 0; i < scenario.scenes.length; i++) {
                    const scene = scenario.scenes[i]
                    if (scene.voiceoverAudioUri) {
                        try {
                            const result = await getDynamicImageUrl(scene.voiceoverAudioUri)
                            if (result?.url) {
                                const duration = await getAudioDuration(result.url)
                                voiceoverItems.push({
                                    id: `voiceover-${i}`,
                                    startTime: i * SCENE_DURATION,
                                    duration,
                                    content: result.url,
                                    type: 'voiceover',
                                    metadata: {
                                        originalDuration: duration,
                                        trimStart: 0
                                    }
                                })
                            }
                        } catch (error) {
                            console.error(`Error resolving voiceover for scene ${i}:`, error)
                        }
                    }
                }
                voiceoverLayer.items = voiceoverItems
            }

            // Resolve music URL
            if (musicLayer) {
                if (scenario.musicUrl) {
                    try {
                        const result = await getDynamicImageUrl(scenario.musicUrl)
                        if (result?.url) {
                            const duration = await getAudioDuration(result.url)
                            musicLayer.items = [{
                                id: 'background-music',
                                startTime: 0,
                                duration,
                                content: result.url,
                                type: 'music',
                                metadata: {
                                    originalDuration: duration,
                                    trimStart: 0
                                }
                            }]
                        }
                    } catch (error) {
                        console.error('Error resolving music:', error)
                    }
                } else {
                    musicLayer.items = []
                }
            }

            setLayers(updatedLayers)
        }

        resolveUrlsAndUpdateLayers()
    }, [scenario, SCENE_DURATION])

    // Item selection handler
    const handleItemClick = (e: React.MouseEvent, layerId: string, itemId: string) => {
        e.stopPropagation()
        setSelectedItem({ layerId, itemId })
    }

    // Resize handlers
    const handleResizeStart = (e: React.MouseEvent, layerId: string, itemId: string, handle: 'start' | 'end') => {
        e.stopPropagation()
        e.preventDefault()
        setIsResizing(true)
        setResizeHandle(handle)
        setResizeStartX(e.clientX)
        setResizingItem({ layerId, itemId })
        setSelectedItem({ layerId, itemId })

        const layer = layers.find(l => l.id === layerId)
        const item = layer?.items.find(i => i.id === itemId)
        if (item) {
            setResizeStartTime(item.startTime)
            setResizeStartDuration(item.duration)
            setResizeStartTrimStart((item.metadata?.trimStart as number) || 0)
        }
    }

    const handleResizeMove = (e: MouseEvent | React.MouseEvent) => {
        if (!isResizing || !timelineRef.current || !resizingItem || !resizeHandle) return

        const rect = timelineRef.current.getBoundingClientRect()
        const timeScale = rect.width / TIMELINE_DURATION
        const deltaX = e.clientX - resizeStartX
        const deltaTime = deltaX / timeScale

        // Find neighboring clips to prevent overlap
        const layer = layers.find(l => l.id === resizingItem.layerId)
        const currentItem = layer?.items.find(i => i.id === resizingItem.itemId)
        if (!layer || !currentItem) return

        const sortedItems = [...layer.items].sort((a, b) => a.startTime - b.startTime)
        const currentIndex = sortedItems.findIndex(i => i.id === resizingItem.itemId)
        const prevItem = currentIndex > 0 ? sortedItems[currentIndex - 1] : null
        const nextItem = currentIndex < sortedItems.length - 1 ? sortedItems[currentIndex + 1] : null

        // Get the original duration for clips with trim capability (video, voiceover, music)
        const originalDuration = currentItem.metadata?.originalDuration as number | undefined
        const hasTrimmableContent = originalDuration !== undefined

        const updatedLayers = layers.map(l => {
            if (l.id !== resizingItem.layerId) return l

            return {
                ...l,
                items: l.items.map(item => {
                    if (item.id !== resizingItem.itemId) return item

                    let newStartTime = resizeStartTime
                    let newDuration = resizeStartDuration
                    let newTrimStart = resizeStartTrimStart

                    if (resizeHandle === 'start') {
                        // Dragging start handle
                        const potentialNewStart = resizeStartTime + deltaTime
                        const minStart = prevItem ? prevItem.startTime + prevItem.duration : 0
                        
                        if (deltaTime > 0) {
                            // Dragging RIGHT - shrink clip, increase trimStart (skip more of content start)
                            // Can't shrink below 0.5s duration
                            const maxDelta = resizeStartDuration - 0.5
                            const clampedDelta = Math.min(deltaTime, maxDelta)
                            newStartTime = resizeStartTime + clampedDelta
                            newDuration = resizeStartDuration - clampedDelta
                            
                            if (hasTrimmableContent) {
                                // Increase trimStart - we're skipping more of the beginning
                                newTrimStart = resizeStartTrimStart + clampedDelta
                            }
                        } else {
                            // Dragging LEFT - expand clip, decrease trimStart (show earlier content)
                            if (hasTrimmableContent) {
                                // Can only expand if trimStart > 0 (there's hidden content at the start)
                                const maxExpand = Math.min(resizeStartTrimStart, resizeStartTime - minStart)
                                const expandAmount = Math.min(-deltaTime, maxExpand)
                                newStartTime = resizeStartTime - expandAmount
                                newDuration = resizeStartDuration + expandAmount
                                newTrimStart = resizeStartTrimStart - expandAmount
                            } else {
                                // Non-trimmable clips: just move start, respecting min boundary
                                newStartTime = Math.max(minStart, potentialNewStart)
                                newDuration = resizeStartDuration - (newStartTime - resizeStartTime)
                            }
                        }
                    } else {
                        // Dragging end handle
                        const maxEnd = nextItem ? nextItem.startTime : TIMELINE_DURATION
                        
                        if (deltaTime < 0) {
                            // Dragging LEFT - shrink clip (cut end of content)
                            // Can't shrink below 0.5s duration
                            newDuration = Math.max(0.5, resizeStartDuration + deltaTime)
                            // trimStart stays the same - we're just showing less of the end
                        } else {
                            // Dragging RIGHT - expand clip (show more of content end)
                            if (hasTrimmableContent) {
                                // Can only expand if trimStart + duration < originalDuration
                                const currentTrimEnd = resizeStartTrimStart + resizeStartDuration
                                const availableAtEnd = originalDuration - currentTrimEnd
                                const maxExpandForTimeline = maxEnd - (resizeStartTime + resizeStartDuration)
                                const maxExpand = Math.min(availableAtEnd, maxExpandForTimeline)
                                const expandAmount = Math.min(deltaTime, maxExpand)
                                newDuration = resizeStartDuration + expandAmount
                            } else {
                                // Non-trimmable clips: just expand, respecting timeline boundary
                                const maxDuration = maxEnd - resizeStartTime
                                newDuration = Math.min(resizeStartDuration + deltaTime, maxDuration)
                            }
                        }
                    }

                    return { 
                        ...item, 
                        startTime: newStartTime, 
                        duration: newDuration,
                        metadata: {
                            ...item.metadata,
                            trimStart: newTrimStart
                        }
                    }
                })
            }
        })

        setLayers(updatedLayers)
    }

    const handleResizeEnd = () => {
        if (isResizing && resizingItem) {
            // Notify parent of the update
            const layer = layers.find(l => l.id === resizingItem.layerId)
            const item = layer?.items.find(i => i.id === resizingItem.itemId)
            if (item) {
                onTimelineItemUpdate(resizingItem.layerId, resizingItem.itemId, {
                    startTime: item.startTime,
                    duration: item.duration,
                    metadata: item.metadata
                })
            }
        }
        setIsResizing(false)
        setResizeHandle(null)
        setResizingItem(null)
    }

    // Snap threshold in seconds
    const SNAP_THRESHOLD = 0.3
    // Small epsilon for floating-point comparisons
    const OVERLAP_EPSILON = 0.001

    // Drag handlers for moving clips
    const handleDragStart = (e: React.MouseEvent, layerId: string, itemId: string) => {
        // Don't start drag if we're on resize handles
        const target = e.target as HTMLElement
        if (target.classList.contains('resize-handle')) return

        e.stopPropagation()
        e.preventDefault()
        setIsDragging(true)
        setDragStartX(e.clientX)
        setDraggingItem({ layerId, itemId })
        setSelectedItem({ layerId, itemId })

        const layer = layers.find(l => l.id === layerId)
        const item = layer?.items.find(i => i.id === itemId)
        if (item && layer) {
            setDragStartTime(item.startTime)
            // Store original positions of all items for reordering
            originalLayerItemsRef.current = layer.items.map(i => ({ ...i }))
        }
    }

    // Check if a position would overlap during drag (uses original positions)
    // Uses epsilon to allow edge-to-edge placement
    const checkOverlapDuringDrag = (startTime: number, duration: number, excludeItemId: string): boolean => {
        const endTime = startTime + duration
        return originalLayerItemsRef.current.some(clip => {
            if (clip.id === excludeItemId) return false
            const clipEnd = clip.startTime + clip.duration
            // Use epsilon to allow clips to touch at edges
            return startTime < clipEnd - OVERLAP_EPSILON && endTime > clip.startTime + OVERLAP_EPSILON
        })
    }

    // Find snap points for a clip being dragged (only non-overlapping positions)
    const findSnapPoint = (proposedStart: number, clipDuration: number, excludeItemId: string): number => {
        const proposedEnd = proposedStart + clipDuration
        const otherClips = originalLayerItemsRef.current.filter(i => i.id !== excludeItemId)
        
        let bestSnap = proposedStart
        let closestDistance = SNAP_THRESHOLD

        // Check snap to start of timeline
        if (Math.abs(proposedStart) < closestDistance) {
            const snapPos = 0
            if (!checkOverlapDuringDrag(snapPos, clipDuration, excludeItemId)) {
                bestSnap = snapPos
                closestDistance = Math.abs(proposedStart)
            }
        }

        // Check snap to end of timeline
        if (Math.abs(proposedEnd - TIMELINE_DURATION) < closestDistance) {
            const snapPos = TIMELINE_DURATION - clipDuration
            if (!checkOverlapDuringDrag(snapPos, clipDuration, excludeItemId)) {
                bestSnap = snapPos
                closestDistance = Math.abs(proposedEnd - TIMELINE_DURATION)
            }
        }

        for (const clip of otherClips) {
            const clipEnd = clip.startTime + clip.duration

            // Snap our start to their end (place after this clip)
            if (Math.abs(proposedStart - clipEnd) < closestDistance) {
                const snapPos = clipEnd
                if (!checkOverlapDuringDrag(snapPos, clipDuration, excludeItemId)) {
                    bestSnap = snapPos
                    closestDistance = Math.abs(proposedStart - clipEnd)
                }
            }

            // Snap our end to their start (place before this clip)
            if (Math.abs(proposedEnd - clip.startTime) < closestDistance) {
                const snapPos = clip.startTime - clipDuration
                if (snapPos >= 0 && !checkOverlapDuringDrag(snapPos, clipDuration, excludeItemId)) {
                    bestSnap = snapPos
                    closestDistance = Math.abs(proposedEnd - clip.startTime)
                }
            }
        }

        return bestSnap
    }

    const handleDragMove = (e: MouseEvent | React.MouseEvent) => {
        if (!isDragging || !timelineRef.current || !draggingItem) return

        const rect = timelineRef.current.getBoundingClientRect()
        const timeScale = rect.width / TIMELINE_DURATION
        const deltaX = e.clientX - dragStartX
        const deltaTime = deltaX / timeScale

        const originalItem = originalLayerItemsRef.current.find(i => i.id === draggingItem.itemId)
        if (!originalItem) return

        // Calculate proposed position (clamped to timeline bounds)
        const proposedStart = Math.max(0, Math.min(dragStartTime + deltaTime, TIMELINE_DURATION - originalItem.duration))
        
        // Try snapping to edges of other clips (using ORIGINAL positions)
        const snappedStart = findSnapPointForInsert(proposedStart, originalItem.duration, draggingItem.itemId)
        
        // Use snapped position if close enough, otherwise use proposed
        const SNAP_THRESHOLD = 0.5 // seconds
        let finalPosition: number
        if (Math.abs(snappedStart - proposedStart) < SNAP_THRESHOLD) {
            finalPosition = snappedStart
        } else {
            finalPosition = proposedStart
        }

        // Store the drop position for handleDragEnd
        setDropIndicator({ layerId: draggingItem.layerId, position: finalPosition })

        // Calculate cascade positions (same logic as handleDragEnd) for live preview
        const draggedDuration = originalItem.duration
        
        // Get all other clips using ORIGINAL positions
        const otherClips = originalLayerItemsRef.current
            .filter(i => i.id !== draggingItem.itemId)
            .map(i => ({ ...i }))
            .sort((a, b) => a.startTime - b.startTime)
        
        // Find clips that would overlap with the proposed position
        const overlappingClips = otherClips.filter(clip => {
            const clipEnd = clip.startTime + clip.duration
            const draggedEndTime = finalPosition + draggedDuration
            return finalPosition < clipEnd && draggedEndTime > clip.startTime
        })
        
        // Build a map of preview positions for all clips
        const previewPositions = new Map<string, number>()
        
        let draggedPreviewPosition = finalPosition
        
        if (overlappingClips.length > 0) {
            // Find the leftmost overlapping clip
            const leftmostOverlap = overlappingClips.sort((a, b) => a.startTime - b.startTime)[0]
            
            // Position the dragged clip at the leftmost overlapping clip's start
            draggedPreviewPosition = leftmostOverlap.startTime
        }
        
        previewPositions.set(draggingItem.itemId, draggedPreviewPosition)
        
        // Cascade push: start from where the dragged clip ends
        let currentEndTime = draggedPreviewPosition + draggedDuration
        
        // Get clips that might need to be pushed
        const clipsToProcess = otherClips
            .filter(clip => {
                const clipEnd = clip.startTime + clip.duration
                return clip.startTime >= draggedPreviewPosition || 
                       (draggedPreviewPosition < clipEnd && currentEndTime > clip.startTime)
            })
            .sort((a, b) => a.startTime - b.startTime)
        
        // Cascade push
        for (const clip of clipsToProcess) {
            const clipOriginalStart = clip.startTime
            const clipEnd = clipOriginalStart + clip.duration
            
            if (clipOriginalStart < currentEndTime && clipEnd > draggedPreviewPosition) {
                // This clip needs to be pushed
                const newStart = currentEndTime
                
                if (newStart + clip.duration <= TIMELINE_DURATION) {
                    previewPositions.set(clip.id, newStart)
                    currentEndTime = newStart + clip.duration
                } else {
                    previewPositions.set(clip.id, clipOriginalStart)
                }
            }
        }
        
        // Clips not affected keep their original positions
        for (const clip of otherClips) {
            if (!previewPositions.has(clip.id)) {
                previewPositions.set(clip.id, clip.startTime)
            }
        }

        // Update all clip positions for live preview
        const updatedLayers = layers.map(l => {
            if (l.id !== draggingItem.layerId) return l

            return {
                ...l,
                items: l.items.map(i => {
                    const previewPos = previewPositions.get(i.id)
                    if (previewPos !== undefined) {
                        return { ...i, startTime: previewPos }
                    }
                    return i
                })
            }
        })

        setLayers(updatedLayers)
    }
    
    // Find snap point for insert mode - snaps to edges of other clips
    const findSnapPointForInsert = (proposedStart: number, duration: number, excludeItemId: string): number => {
        const SNAP_THRESHOLD = 0.5 // seconds
        
        const otherClips = originalLayerItemsRef.current
            .filter(i => i.id !== excludeItemId)
            .sort((a, b) => a.startTime - b.startTime)
        
        let bestSnap = proposedStart
        let minDistance = SNAP_THRESHOLD
        
        // Snap to timeline start
        if (Math.abs(proposedStart) < minDistance) {
            minDistance = Math.abs(proposedStart)
            bestSnap = 0
        }
        
        // Snap to timeline end
        const endPos = TIMELINE_DURATION - duration
        if (Math.abs(proposedStart - endPos) < minDistance) {
            minDistance = Math.abs(proposedStart - endPos)
            bestSnap = endPos
        }
        
        for (const clip of otherClips) {
            const clipEnd = clip.startTime + clip.duration
            
            // Snap dragged clip's START to this clip's END
            if (Math.abs(proposedStart - clipEnd) < minDistance) {
                minDistance = Math.abs(proposedStart - clipEnd)
                bestSnap = clipEnd
            }
            
            // Snap dragged clip's END to this clip's START
            const alignedStart = clip.startTime - duration
            if (alignedStart >= 0 && Math.abs(proposedStart - alignedStart) < minDistance) {
                minDistance = Math.abs(proposedStart - alignedStart)
                bestSnap = alignedStart
            }
            
            // Snap dragged clip's START to this clip's START
            if (Math.abs(proposedStart - clip.startTime) < minDistance) {
                minDistance = Math.abs(proposedStart - clip.startTime)
                bestSnap = clip.startTime
            }
        }
        
        return bestSnap
    }

    // Check if a position would overlap with any other clip
    const wouldOverlap = (startTime: number, duration: number, excludeItemId: string): boolean => {
        const endTime = startTime + duration
        return originalLayerItemsRef.current.some(clip => {
            if (clip.id === excludeItemId) return false
            const clipEnd = clip.startTime + clip.duration
            // Check for any overlap
            return startTime < clipEnd && endTime > clip.startTime
        })
    }

    // Find the nearest valid position that doesn't overlap
    const findNearestValidPosition = (proposedStart: number, duration: number, excludeItemId: string): number => {
        if (!wouldOverlap(proposedStart, duration, excludeItemId)) {
            return proposedStart
        }

        const proposedEnd = proposedStart + duration
        const otherClips = originalLayerItemsRef.current
            .filter(i => i.id !== excludeItemId)
            .sort((a, b) => a.startTime - b.startTime)

        // Find the best alternative position
        let bestPosition = proposedStart
        let minDistance = Infinity

        // Try placing before each clip
        for (const clip of otherClips) {
            const beforePos = clip.startTime - duration
            if (beforePos >= 0 && !wouldOverlap(beforePos, duration, excludeItemId)) {
                const distance = Math.abs(proposedStart - beforePos)
                if (distance < minDistance) {
                    minDistance = distance
                    bestPosition = beforePos
                }
            }

            // Try placing after each clip
            const afterPos = clip.startTime + clip.duration
            if (afterPos + duration <= TIMELINE_DURATION && !wouldOverlap(afterPos, duration, excludeItemId)) {
                const distance = Math.abs(proposedStart - afterPos)
                if (distance < minDistance) {
                    minDistance = distance
                    bestPosition = afterPos
                }
            }
        }

        // Try start of timeline
        if (!wouldOverlap(0, duration, excludeItemId)) {
            const distance = Math.abs(proposedStart - 0)
            if (distance < minDistance) {
                minDistance = distance
                bestPosition = 0
            }
        }

        return bestPosition
    }

    const handleDragEnd = () => {
        if (isDragging && draggingItem && dropIndicator) {
            const originalDraggedItem = originalLayerItemsRef.current.find(i => i.id === draggingItem.itemId)
            
            if (originalDraggedItem) {
                // Get the proposed position (already snapped during drag)
                const proposedStartTime = dropIndicator.position
                const draggedDuration = originalDraggedItem.duration
                
                // Get all other clips in the same layer (excluding the dragged one), using ORIGINAL positions
                const otherClips = originalLayerItemsRef.current
                    .filter(i => i.id !== draggingItem.itemId)
                    .map(i => ({ ...i })) // Clone to avoid mutation
                    .sort((a, b) => a.startTime - b.startTime)
                
                // Find clips that would overlap with the proposed position
                const overlappingClips = otherClips.filter(clip => {
                    const clipEnd = clip.startTime + clip.duration
                    const draggedEndTime = proposedStartTime + draggedDuration
                    return proposedStartTime < clipEnd && draggedEndTime > clip.startTime
                })
                
                // Build a map of new positions for all clips
                const newPositions = new Map<string, number>()
                
                let finalDraggedPosition = proposedStartTime
                
                if (overlappingClips.length > 0) {
                    // Find the leftmost overlapping clip
                    const leftmostOverlap = overlappingClips.sort((a, b) => a.startTime - b.startTime)[0]
                    
                    // Position the dragged clip at the leftmost overlapping clip's start
                    finalDraggedPosition = leftmostOverlap.startTime
                }
                
                // Set the dragged clip's new position
                newPositions.set(draggingItem.itemId, finalDraggedPosition)
                
                // Now cascade push: start from where the dragged clip ends and push everything to the right
                let currentEndTime = finalDraggedPosition + draggedDuration
                
                // Get all clips sorted by their original start time
                // We need to process clips that might need to be pushed
                const clipsToProcess = otherClips
                    .filter(clip => {
                        // Only process clips that are at or after the dragged clip's new position
                        // OR clips that overlap with where the dragged clip will be
                        const clipEnd = clip.startTime + clip.duration
                        return clip.startTime >= finalDraggedPosition || 
                               (finalDraggedPosition < clipEnd && currentEndTime > clip.startTime)
                    })
                    .sort((a, b) => a.startTime - b.startTime)
                
                // Cascade push: for each clip in order, if it overlaps with currentEndTime, push it
                for (const clip of clipsToProcess) {
                    const clipOriginalStart = clip.startTime
                    const clipEnd = clipOriginalStart + clip.duration
                    
                    // Check if this clip overlaps with the current end time (where the previous clip ends)
                    if (clipOriginalStart < currentEndTime && clipEnd > finalDraggedPosition) {
                        // This clip needs to be pushed - snap it right after the current end
                        const newStart = currentEndTime
                        
                        // Make sure we don't exceed timeline
                        if (newStart + clip.duration <= TIMELINE_DURATION) {
                            newPositions.set(clip.id, newStart)
                            currentEndTime = newStart + clip.duration
                        } else {
                            // Can't fit, keep original (edge case)
                            newPositions.set(clip.id, clipOriginalStart)
                        }
                    } else {
                        // This clip doesn't overlap, keep its original position
                        // But update currentEndTime if this clip is snapped after our chain
                        if (clipOriginalStart >= currentEndTime) {
                            // No push needed, clip stays in place
                            // Don't update currentEndTime - we stop the cascade here
                        }
                    }
                }
                
                // Clips that weren't processed keep their original positions
                for (const clip of otherClips) {
                    if (!newPositions.has(clip.id)) {
                        newPositions.set(clip.id, clip.startTime)
                    }
                }
                
                // Apply all positions
                let updatedLayers = layers.map(l => {
                    if (l.id !== draggingItem.layerId) return l
                    
                    return {
                        ...l,
                        items: l.items.map(item => {
                            const newPos = newPositions.get(item.id)
                            if (newPos !== undefined) {
                                return { ...item, startTime: newPos }
                            }
                            return item
                        })
                    }
                })
                
                // Sort items by start time
                updatedLayers = updatedLayers.map(l => {
                    if (l.id !== draggingItem.layerId) return l
                    const sortedItems = [...l.items].sort((a, b) => a.startTime - b.startTime)
                    return { ...l, items: sortedItems }
                })
                
                setLayers(updatedLayers)
                
                // Notify parent of all position changes
                newPositions.forEach((newStart, itemId) => {
                    const originalItem = originalLayerItemsRef.current.find(i => i.id === itemId)
                    if (originalItem && originalItem.startTime !== newStart) {
                        onTimelineItemUpdate(draggingItem.layerId, itemId, { startTime: newStart })
                    }
                })
            }
        }
        setIsDragging(false)
        setDraggingItem(null)
        setDropIndicator(null)
        originalLayerItemsRef.current = []
    }

    // Global mouse event handlers for drag/resize outside timeline
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isResizing) handleResizeMove(e)
            if (isDragging) handleDragMove(e)
        }

        const handleGlobalMouseUp = () => {
            if (isResizing) handleResizeEnd()
            if (isDragging) handleDragEnd()
        }

        if (isResizing || isDragging) {
            document.addEventListener('mousemove', handleGlobalMouseMove)
            document.addEventListener('mouseup', handleGlobalMouseUp)
        return () => {
                document.removeEventListener('mousemove', handleGlobalMouseMove)
                document.removeEventListener('mouseup', handleGlobalMouseUp)
            }
        }
    }, [isResizing, isDragging, resizingItem, draggingItem, resizeHandle, layers])

    // Playback controls
    const togglePlay = useCallback(() => {
        setIsPlaying(prev => !prev)
    }, [])

    const handlePlaybackEnded = useCallback(() => {
            setIsPlaying(false)
            onTimeUpdate(0)
    }, [onTimeUpdate])

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault()
                togglePlay()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [togglePlay])

    // Timeline click handler
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return

        const rect = timelineRef.current.getBoundingClientRect()
        const clickPosition = e.clientX - rect.left
        const timeScale = rect.width / TIMELINE_DURATION
        const newTime = Math.max(0, Math.min(TIMELINE_DURATION, clickPosition / timeScale))

        setIsPlaying(false)
        onTimeUpdate(newTime)
    }

    return (
        <div className="space-y-8">
            {/* Header with Export Movie button */}
            <div className="flex justify-end">
                                <Button
                    onClick={() => onExportMovie(layers)}
                    disabled={isExporting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting Movie...
                        </>
                    ) : (
                        <>
                            <Film className="mr-2 h-4 w-4" />
                            Export Movie
                        </>
                    )}
                            </Button>
                        </div>

            {/* Video Preview - Using MediabunnyPlayer */}
            <div className="w-full max-w-3xl mx-auto">
                <MediabunnyPlayer
                    layers={layers}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onPlayPause={togglePlay}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={handlePlaybackEnded}
                    logoOverlay={logoOverlay}
                    aspectRatio={scenario.aspectRatio === '9:16' ? '9:16' : '16:9'}
                />
            </div>

            {/* Timeline */}
            <div className="space-y-2">
                <div
                    ref={timelineRef}
                    className={`relative w-full bg-gray-100 rounded-lg ${
                        isDragging || isResizing ? 'cursor-grabbing' : 'cursor-pointer'
                    }`}
                    onClick={!isDragging && !isResizing ? handleTimelineClick : undefined}
                >
                    <div className="relative pt-4 pb-4">
                        {/* Time markers */}
                        <div className="absolute top-0 left-0 right-0 h-6 flex justify-between text-xs text-gray-500">
                            {Array.from({ length: TIMELINE_DURATION / MARKER_INTERVAL + 1 }).map((_, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -top-4 left-0 transform -translate-x-1/2 select-none">
                                        {formatTime(i * MARKER_INTERVAL)}
                                    </div>
                                    <div className="absolute top-0 left-0 w-px h-6 bg-gray-300" />
                                </div>
                            ))}
                        </div>

                        {/* Playhead - Smooth RAF-driven positioning */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none transition-none"
                            style={{
                                left: `${(currentTime / TIMELINE_DURATION) * 100}%`,
                                height: '100%',
                                willChange: 'left',
                            }}
                        >
                            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-md" />
                        </div>

                        {/* Layers */}
                        <div className="mt-6 space-y-1">
                            {layers.map((layer) => (
                                <div key={layer.id} className="relative h-12 bg-white rounded border border-gray-200">
                                    <div className="absolute -left-24 top-0 h-full flex items-center px-2 text-sm font-medium select-none">
                                        {layer.name}
                                    </div>
                                    <div className="relative h-full">
                                        {layer.items.length > 0 ? (
                                            layer.items.map((item) => {
                                            const isSelected = selectedItem?.layerId === layer.id && selectedItem?.itemId === item.id
                                            const timelineWidth = timelineRef.current?.clientWidth || 0
                                            const paddingTime = (CLIP_PADDING * 2 * TIMELINE_DURATION) / timelineWidth
                                                const hasContent = !!item.content

                                                const isBeingDragged = draggingItem?.layerId === layer.id && draggingItem?.itemId === item.id
                                                const isBeingResized = resizingItem?.layerId === layer.id && resizingItem?.itemId === item.id
                                                
                                                // Check if this clip is being pushed (position changed from original)
                                                const originalItem = originalLayerItemsRef.current.find(i => i.id === item.id)
                                                const isBeingPushed = isDragging && !isBeingDragged && originalItem && 
                                                    Math.abs(item.startTime - originalItem.startTime) > 0.01

                                            return (
                                                <div
                                                    key={item.id}
                                                        className={`absolute top-1 bottom-1 rounded overflow-hidden group
                                                            ${isDragging || isBeingPushed ? '' : 'transition-shadow'}
                                                            ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                                                            ${isBeingDragged ? 'ring-2 ring-blue-400 shadow-xl z-20' : ''}
                                                            ${isBeingPushed ? 'ring-2 ring-amber-400 ring-offset-1 z-10' : ''}
                                                            ${isBeingResized ? 'z-20' : ''}
                                                            ${!isDragging && !isResizing ? 'cursor-grab hover:shadow-md' : ''}`}
                                                    style={{
                                                        left: `${((item.startTime + paddingTime / 2) / TIMELINE_DURATION) * 100}%`,
                                                        width: `calc(${(item.duration / TIMELINE_DURATION) * 100}% - ${CLIP_PADDING * 2}px)`,
                                                    }}
                                                        onClick={(e) => !isDragging && handleItemClick(e, layer.id, item.id)}
                                                        onMouseDown={(e) => handleDragStart(e, layer.id, item.id)}
                                                >
                                                    {layer.type === 'video' && hasContent ? (
                                                        <VideoThumbnail
                                                            src={item.content!}
                                                            duration={item.duration}
                                                            trimStart={(item.metadata?.trimStart as number) || 0}
                                                            originalDuration={(item.metadata?.originalDuration as number) || undefined}
                                                            isResizing={isBeingResized}
                                                            className="w-full h-full"
                                                        />
                                                    ) : layer.type === 'voiceover' && hasContent ? (
                                                        <div className="w-full h-full bg-green-500/10 border border-green-500/30 rounded p-1 relative">
                                                            <AudioWaveform
                                                                src={item.content!}
                                                                className="w-full h-full"
                                                                color="bg-green-500"
                                                                duration={item.duration}
                                                                trimStart={(item.metadata?.trimStart as number) || 0}
                                                                originalDuration={(item.metadata?.originalDuration as number) || undefined}
                                                                isResizing={isBeingResized}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        const sceneIndex = parseInt(item.id.replace('voiceover-', ''))
                                                                    if (!isNaN(sceneIndex) && onRemoveVoiceover) {
                                                                            onRemoveVoiceover(sceneIndex)
                                                                    }
                                                                }}
                                                                className="absolute top-0 right-0 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Remove voiceover"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : layer.type === 'music' && hasContent ? (
                                                            <div className="w-full h-full bg-purple-500/10 border border-purple-500/30 rounded p-1 relative">
                                                            <AudioWaveform
                                                                src={item.content!}
                                                                className="w-full h-full"
                                                                color="bg-purple-500"
                                                                duration={item.duration}
                                                                trimStart={(item.metadata?.trimStart as number) || 0}
                                                                originalDuration={(item.metadata?.originalDuration as number) || undefined}
                                                                isResizing={isBeingResized}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        if (onRemoveMusic) onRemoveMusic()
                                                                }}
                                                                className="absolute top-0 right-0 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Remove music"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        ) : (
                                                            <div className={`w-full h-full rounded ${
                                                                layer.type === 'video' ? 'bg-blue-500/20 border border-blue-500' : 'bg-gray-300/20 border border-gray-400'
                                                            }`} />
                                                        )}

                                                        {/* Resize handles - always visible on hover */}
                                                        <div
                                                            className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize 
                                                                bg-gradient-to-r from-blue-500/60 to-transparent
                                                                opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:from-blue-500
                                                                transition-opacity z-10"
                                                                onMouseDown={(e) => handleResizeStart(e, layer.id, item.id, 'start')}
                                                        >
                                                            <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-full shadow" />
                                                        </div>
                                                            <div
                                                            className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize 
                                                                bg-gradient-to-l from-blue-500/60 to-transparent
                                                                opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:from-blue-500
                                                                transition-opacity z-10"
                                                                onMouseDown={(e) => handleResizeStart(e, layer.id, item.id, 'end')}
                                                        >
                                                            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-full shadow" />
                                                        </div>
                                                </div>
                                            )
                                            })
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-gray-200 rounded p-1">
                                                {layer.type === 'voiceover' ? (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleOpenVoiceDialog()
                                                        }}
                                                        disabled={isGeneratingVoiceover}
                                                        className="bg-black/50 hover:bg-green-500 hover:text-white flex items-center gap-2"
                                                    >
                                                        {isGeneratingVoiceover ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                                <path d="M9 18V5l12-2v13" />
                                                                <circle cx="6" cy="18" r="3" />
                                                                <circle cx="18" cy="16" r="3" />
                                                            </svg>
                                                        )}
                                                        {isGeneratingVoiceover ? 'Generating...' : 'Generate voiceover with Gemini-TTS'}
                                                    </Button>
                                                ) : layer.type === 'music' ? (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleOpenMusicDialog()
                                                        }}
                                                        disabled={isGeneratingMusic}
                                                        className="bg-black/50 hover:bg-purple-500 hover:text-white flex items-center gap-2"
                                                    >
                                                        {isGeneratingMusic ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                                <path d="M9 18V5l12-2v13" />
                                                                <circle cx="6" cy="18" r="3" />
                                                                <circle cx="18" cy="16" r="3" />
                                                            </svg>
                                                        )}
                                                        {isGeneratingMusic ? 'Generating...' : 'Generate music with Lyria'}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Voice Selection Dialog */}
            <VoiceSelectionDialog
                isOpen={isVoiceDialogOpen}
                onClose={handleCloseVoiceDialog}
                onVoiceSelect={handleVoiceSelect}
                isGenerating={isGeneratingVoiceover}
            />

            {/* Music Selection Dialog */}
            <MusicSelectionDialog
                isOpen={isMusicDialogOpen}
                onClose={handleCloseMusicDialog}
                onMusicGenerate={handleMusicGenerate}
                isGenerating={isGeneratingMusic}
                currentParams={{
                    description: scenario.music
                }}
            />
        </div>
    )
} 
