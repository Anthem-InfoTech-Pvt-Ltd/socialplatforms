// lib/image/platformPresets.ts

export interface AspectPreset {
  id: string
  label: string
  ratio?: number // undefined = freeform (no locked aspect ratio)
  width: number
  height: number
}

// Add a new platform key here (e.g. 'twitter', 'pinterest') and its presets
// automatically show up in the image editor whenever that platform is
// selected in the composer. No other file needs to change.
export const PLATFORM_PRESETS: Record<string, AspectPreset[]> = {
  facebook: [
    { id: 'fb-landscape', label: 'FB Landscape (1.91:1)', ratio: 1.91, width: 1200, height: 630 },
    { id: 'fb-square', label: 'FB Square (1:1)', ratio: 1, width: 1200, height: 1200 },
    { id: 'fb-portrait', label: 'FB Portrait (4:5)', ratio: 4 / 5, width: 1080, height: 1350 },
  ],
  instagram: [
    { id: 'ig-square', label: 'IG Square (1:1)', ratio: 1, width: 1080, height: 1080 },
    { id: 'ig-portrait', label: 'IG Portrait (4:5)', ratio: 4 / 5, width: 1080, height: 1350 },
    { id: 'ig-landscape', label: 'IG Landscape (1.91:1)', ratio: 1.91, width: 1080, height: 566 },
  ],
  linkedin: [
    { id: 'li-landscape', label: 'LinkedIn Landscape (1.91:1)', ratio: 1.91, width: 1200, height: 627 },
    { id: 'li-square', label: 'LinkedIn Square (1:1)', ratio: 1, width: 1200, height: 1200 },
  ],
}

export const FREEFORM_PRESET: AspectPreset = {
  id: 'freeform',
  label: 'Free / custom',
  ratio: undefined,
  width: 1200,
  height: 1200,
}

// Dedupes presets shared across selected platforms and always appends a
// freeform option so the user can override crop/size manually.
export function getPresetsForPlatforms(platforms: string[]): AspectPreset[] {
  const seen = new Set<string>()
  const presets: AspectPreset[] = []
  platforms.forEach((platform) => {
    ;(PLATFORM_PRESETS[platform] || []).forEach((preset) => {
      if (!seen.has(preset.id)) {
        seen.add(preset.id)
        presets.push(preset)
      }
    })
  })
  presets.push(FREEFORM_PRESET)
  return presets
}