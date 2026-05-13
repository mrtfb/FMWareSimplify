function hueFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  // Spread across 360° but skip the amber/yellow band (50–80°) used by UI chrome.
  const raw = h % 300
  return raw < 50 ? raw : raw + 30
}

export function clientColor(id: string | null | undefined) {
  const hue = id ? hueFromId(id) : 200
  return {
    bg:   `oklch(0.93 0.06 ${hue})`,
    bar:  `oklch(0.55 0.15 ${hue})`,
    text: `oklch(0.28 0.09 ${hue})`,
    dot:  `oklch(0.55 0.15 ${hue})`,
  }
}
