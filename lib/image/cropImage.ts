// lib/image/cropImage.ts
// Pure canvas utility: takes a crop rectangle + rotation from react-easy-crop
// and an explicit output width/height (the "dimension setter"), and returns
// a Blob at exactly that size — used both for the initial upload edit and
// for re-editing an already-uploaded image.

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (err) => reject(err))
    image.src = url
  })
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

// Bounding box of the image after rotation, so nothing gets clipped while rotating.
function rotatedBoundingBox(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

export async function getCroppedImageBlob(
  imageSrc: string,
  cropAreaPixels: CropArea,
  rotation = 0,
  outputWidth?: number,
  outputHeight?: number,
  mimeType: string = 'image/jpeg',
  quality = 0.92
): Promise<Blob> {
  const image = await createImage(imageSrc)

  // Step 1 — draw the full (rotated) image onto a scratch canvas.
  const rotRad = getRadianAngle(rotation)
  const { width: boxWidth, height: boxHeight } = rotatedBoundingBox(image.width, image.height, rotation)

  const scratch = document.createElement('canvas')
  scratch.width = boxWidth
  scratch.height = boxHeight
  const scratchCtx = scratch.getContext('2d')
  if (!scratchCtx) throw new Error('Could not get canvas context')

  scratchCtx.translate(boxWidth / 2, boxHeight / 2)
  scratchCtx.rotate(rotRad)
  scratchCtx.translate(-image.width / 2, -image.height / 2)
  scratchCtx.drawImage(image, 0, 0)

  // Step 2 — pull out just the cropped rectangle.
  const cropped = scratchCtx.getImageData(
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height
  )

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = cropAreaPixels.width
  cropCanvas.height = cropAreaPixels.height
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) throw new Error('Could not get canvas context')
  cropCtx.putImageData(cropped, 0, 0)

  // Step 3 — scale the crop to the requested output dimensions (resize/dimension setter).
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outputWidth || cropAreaPixels.width
  outCanvas.height = outputHeight || cropAreaPixels.height
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('Could not get canvas context')

  outCtx.drawImage(
    cropCanvas,
    0,
    0,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outCanvas.width,
    outCanvas.height
  )

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      mimeType,
      quality
    )
  })
}