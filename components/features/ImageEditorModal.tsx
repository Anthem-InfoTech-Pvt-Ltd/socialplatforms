'use client'

import { useEffect, useRef, useState } from 'react'
import ReactCrop, { Crop, PercentCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  X,
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Check,
  Loader2,
} from 'lucide-react'
import {
  bakeTransform,
  exportEditedImage,
  filtersToCss,
  DEFAULT_FILTERS,
  ImageFilters,
  PixelRect,
} from '@/lib/image/imageEditing'
import { getPresetsForPlatforms, FREEFORM_PRESET, AspectPreset } from '@/lib/image/platformPresets'

interface ImageEditorModalProps {
  open: boolean
  imageFile: File | null
  // Drives which aspect-ratio presets show up (Facebook/Instagram/LinkedIn
  // today — add a platform to platformPresets.ts and it appears here too).
  availablePlatforms: string[]
  onClose: () => void
  onSave: (blob: Blob, fileName: string) => void
}

interface EditSnapshot {
  workingSrc: string
  crop: PercentCrop
  aspect: number | undefined
  presetId: string
  filters: ImageFilters
  quality: number
}

const FULL_CROP: PercentCrop = { unit: '%', x: 0, y: 0, width: 100, height: 100 }

export function ImageEditorModal({
  open,
  imageFile,
  availablePlatforms,
  onClose,
  onSave,
}: ImageEditorModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)

  const [originalSrc, setOriginalSrc] = useState<string | null>(null)
  const [workingSrc, setWorkingSrc] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  const [crop, setCrop] = useState<PercentCrop>(FULL_CROP)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [presetId, setPresetId] = useState('freeform')

  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS)
  const [quality, setQuality] = useState(92)
  const [zoom, setZoom] = useState(1)
  const [activeTab, setActiveTab] = useState<'crop' | 'adjust' | 'effects'>('crop')
  const [isSaving, setIsSaving] = useState(false)

  const [history, setHistory] = useState<EditSnapshot[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const presets = getPresetsForPlatforms(availablePlatforms)
  const orderedPresets: AspectPreset[] = [FREEFORM_PRESET, ...presets.filter((p) => p.id !== 'freeform')]

  // Reset everything each time a new file is handed to the editor.
  useEffect(() => {
    if (!open || !imageFile) return
    const url = URL.createObjectURL(imageFile)
    setOriginalSrc(url)
    setWorkingSrc(url)
    setNaturalSize({ width: 0, height: 0 })
    setCrop(FULL_CROP)
    setAspect(undefined)
    setPresetId('freeform')
    setFilters(DEFAULT_FILTERS)
    setQuality(92)
    setZoom(1)
    setActiveTab('crop')
    setHistory([])
    setHistoryIndex(-1)
    return () => URL.revokeObjectURL(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageFile])

  const pushHistory = (snap: EditSnapshot) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), snap])
    setHistoryIndex((i) => i + 1)
  }

  const applySnapshot = (snap: EditSnapshot) => {
    setWorkingSrc(snap.workingSrc)
    setCrop(snap.crop)
    setAspect(snap.aspect)
    setPresetId(snap.presetId)
    setFilters(snap.filters)
    setQuality(snap.quality)
  }

  const handleUndo = () => {
    if (historyIndex <= 0) return
    applySnapshot(history[historyIndex - 1])
    setHistoryIndex(historyIndex - 1)
  }
  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    applySnapshot(history[historyIndex + 1])
    setHistoryIndex(historyIndex + 1)
  }

  const onImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    if (history.length === 0 && workingSrc) {
      setHistory([
        { workingSrc, crop: FULL_CROP, aspect: undefined, presetId: 'freeform', filters: DEFAULT_FILTERS, quality: 92 },
      ])
      setHistoryIndex(0)
    }
  }

  // The crop box in the *original* image's real pixels — this is what gets
  // exported, and what the width/height fields above the canvas show.
  const naturalCropRect: PixelRect | null =
    naturalSize.width > 0
      ? {
          x: Math.round((crop.x / 100) * naturalSize.width),
          y: Math.round((crop.y / 100) * naturalSize.height),
          width: Math.round((crop.width / 100) * naturalSize.width),
          height: Math.round((crop.height / 100) * naturalSize.height),
        }
      : null

  const applyPreset = (preset: AspectPreset) => {
    setPresetId(preset.id)
    setAspect(preset.ratio)
    if (!naturalSize.width) return
    let next: PercentCrop
    if (preset.ratio) {
      const base = makeAspectCrop({ unit: '%', width: 90 }, preset.ratio, naturalSize.width, naturalSize.height)
      next = centerCrop(base, naturalSize.width, naturalSize.height) as PercentCrop
    } else {
      next = FULL_CROP
    }
    setCrop(next)
    if (workingSrc) {
      pushHistory({ workingSrc, crop: next, aspect: preset.ratio, presetId: preset.id, filters, quality })
    }
  }

  const updateCropSize = (dim: 'width' | 'height', value: number) => {
    if (!naturalSize.width || !naturalCropRect || Number.isNaN(value)) return
    const v = Math.max(10, value)
    let widthPx = dim === 'width' ? v : naturalCropRect.width
    let heightPx = dim === 'height' ? v : naturalCropRect.height
    if (aspect) {
      if (dim === 'width') heightPx = widthPx / aspect
      else widthPx = heightPx * aspect
    }
    widthPx = Math.min(widthPx, naturalSize.width - naturalCropRect.x)
    heightPx = Math.min(heightPx, naturalSize.height - naturalCropRect.y)
    setCrop({
      unit: '%',
      x: crop.x,
      y: crop.y,
      width: (widthPx / naturalSize.width) * 100,
      height: (heightPx / naturalSize.height) * 100,
    })
  }

  const commitCropHistory = () => {
    if (!workingSrc) return
    pushHistory({ workingSrc, crop, aspect, presetId, filters, quality })
  }

  const handleTransform = async (action: 'rotate-cw' | 'rotate-ccw' | 'flip-h') => {
    if (!workingSrc) return
    const newSrc = await bakeTransform(workingSrc, action)
    setWorkingSrc(newSrc)
    setCrop(FULL_CROP)
    pushHistory({ workingSrc: newSrc, crop: FULL_CROP, aspect, presetId, filters, quality })
  }

  const handleReset = () => {
    if (!originalSrc) return
    setWorkingSrc(originalSrc)
    setCrop(FULL_CROP)
    setAspect(undefined)
    setPresetId('freeform')
    setFilters(DEFAULT_FILTERS)
    setQuality(92)
    setZoom(1)
    pushHistory({
      workingSrc: originalSrc,
      crop: FULL_CROP,
      aspect: undefined,
      presetId: 'freeform',
      filters: DEFAULT_FILTERS,
      quality: 92,
    })
  }

  const handleFilterCommit = () => {
    if (!workingSrc) return
    pushHistory({ workingSrc, crop, aspect, presetId, filters, quality })
  }

  const handleSave = async () => {
    if (!workingSrc || !naturalCropRect || !imageFile) return
    try {
      setIsSaving(true)
      const blob = await exportEditedImage(
        workingSrc,
        naturalCropRect,
        naturalCropRect.width,
        naturalCropRect.height,
        filters,
        quality / 100
      )
      onSave(blob, imageFile.name)
    } catch (err) {
      console.error('Image edit failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!open || !workingSrc) return null

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl w-full max-w-3xl shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Edit image</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-border mx-1.5" />

            <button
              type="button"
              onClick={() => handleTransform('rotate-ccw')}
              title="Rotate left"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleTransform('rotate-cw')}
              title="Rotate right"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleTransform('flip-h')}
              title="Flip horizontal"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            title="Reset to original"
            className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground px-2 py-1 rounded-md hover:bg-muted"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Live width / height of the crop box, in real image pixels */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <label className="text-xs text-muted-foreground">Width</label>
          <input
            type="number"
            min={10}
            value={naturalCropRect?.width ?? ''}
            onChange={(e) => updateCropSize('width', Number(e.target.value))}
            onBlur={commitCropHistory}
            className="w-20 text-xs px-2 py-1 border border-border rounded-md bg-background"
          />
          <label className="text-xs text-muted-foreground ml-2">Height</label>
          <input
            type="number"
            min={10}
            value={naturalCropRect?.height ?? ''}
            onChange={(e) => updateCropSize('height', Number(e.target.value))}
            onBlur={commitCropHistory}
            className="w-20 text-xs px-2 py-1 border border-border rounded-md bg-background"
          />
          <span className="text-[11px] text-muted-foreground ml-auto">
            {naturalSize.width} × {naturalSize.height} original
          </span>
        </div>

        {/* Crop stage */}
        <div className="relative w-full h-80 bg-muted overflow-auto flex items-center justify-center">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <ReactCrop
              crop={crop}
              aspect={aspect}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(_, percentCrop) => {
                setCrop(percentCrop)
                if (workingSrc) pushHistory({ workingSrc, crop: percentCrop, aspect, presetId, filters, quality })
              }}
              keepSelection
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={workingSrc}
                alt="editing"
                onLoad={onImageLoaded}
                style={{ filter: filtersToCss(filters), maxHeight: '18rem', display: 'block' }}
              />
            </ReactCrop>
          </div>
        </div>

        {/* Zoom bar */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border bg-muted/10">
          <button type="button" onClick={() => setZoom(1)} title="Fit" className="text-muted-foreground/70 hover:text-foreground">
            <Maximize className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            className="text-muted-foreground/70 hover:text-foreground"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            className="text-muted-foreground/70 hover:text-foreground"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-muted-foreground w-10 text-right">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          {(['crop', 'adjust', 'effects'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'crop' ? 'Crop' : tab === 'adjust' ? 'Adjust' : 'Effects'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4 min-h-[110px]">
          {activeTab === 'crop' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aspect ratio</label>
              <div className="flex flex-wrap gap-1.5">
                {orderedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      presetId === preset.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'adjust' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Brightness {filters.brightness}%</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={filters.brightness}
                  onChange={(e) => setFilters((f) => ({ ...f, brightness: Number(e.target.value) }))}
                  onPointerUp={handleFilterCommit}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Contrast {filters.contrast}%</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={filters.contrast}
                  onChange={(e) => setFilters((f) => ({ ...f, contrast: Number(e.target.value) }))}
                  onPointerUp={handleFilterCommit}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Saturation {filters.saturate}%</label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={filters.saturate}
                  onChange={(e) => setFilters((f) => ({ ...f, saturate: Number(e.target.value) }))}
                  onPointerUp={handleFilterCommit}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Blur {filters.blur}px</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={filters.blur}
                  onChange={(e) => setFilters((f) => ({ ...f, blur: Number(e.target.value) }))}
                  onPointerUp={handleFilterCommit}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Export quality {quality}%</label>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  onPointerUp={handleFilterCommit}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3.5 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}