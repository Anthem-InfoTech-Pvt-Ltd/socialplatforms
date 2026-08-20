// lib/image/imageEditing.ts
// Replaces the old cropImage.ts with two clearer steps:
//  1. bakeTransform — rotate/flip the *whole* image into a new base image,
//     so the crop tool always works against an axis-aligned image (no
//     rotation math mixed into the crop coordinates).
//  2. exportEditedImage — crop the current base image, scale it to the
//     requested output size, and bake in brightness/contrast/saturation/
//     blur + a JPEG quality setting.

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageFilters {
  brightness: number // 100 = unchanged
  contrast: number
  saturate: number
  blur: number // px
}

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
}

export function filtersToCss(f: ImageFilters): string {
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) blur(${f.blur}px)`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function bakeTransform(
  src: string,
  action: 'rotate-cw' | 'rotate-ccw' | 'flip-h' | 'flip-v'
): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  const rotated = action === 'rotate-cw' || action === 'rotate-ccw'

  canvas.width = rotated ? img.height : img.width
  canvas.height = rotated ? img.width : img.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.translate(canvas.width / 2, canvas.height / 2)
  if (action === 'rotate-cw') ctx.rotate(Math.PI / 2)
  if (action === 'rotate-ccw') ctx.rotate(-Math.PI / 2)
  if (action === 'flip-h') ctx.scale(-1, 1)
  if (action === 'flip-v') ctx.scale(1, -1)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)

  return canvas.toDataURL('image/png')
}

export async function exportEditedImage(
  src: string,
  crop: PixelRect,
  outputWidth: number,
  outputHeight: number,
  filters: ImageFilters,
  quality: number // 0-1
): Promise<Blob> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(outputWidth))
  canvas.height = Math.max(1, Math.round(outputHeight))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.filter = filtersToCss(filters)
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      'image/jpeg',
      quality
    )
  })
}