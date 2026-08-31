import { View, Image, StyleSheet } from '@react-pdf/renderer'
import { imageSize } from 'image-size'

const GRAY4 = '#e5e7eb'

const s = StyleSheet.create({
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  photoWrap: { borderRadius: 4, overflow: 'hidden', border: `1 solid ${GRAY4}` },
})

// ── Photo loading — fetch each image once, read its real dimensions, and
// hand react-pdf the raw bytes directly (no distortion, no forced square crop). ──
export interface LoadedPhoto {
  key: string
  ok: true
  data: Buffer
  format: 'jpg' | 'png'
  aspectRatio: number
}
export interface FailedPhoto {
  key: string
  ok: false
  url: string
}

export async function loadPhoto(url: string, key: string): Promise<LoadedPhoto | FailedPhoto> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const dim = imageSize(bytes)
    const format = dim.type === 'png' ? 'png' : dim.type === 'jpg' || dim.type === 'jpeg' ? 'jpg' : null
    if (!format || !dim.width || !dim.height) throw new Error(`Unsupported format: ${dim.type}`)
    return { key, ok: true, data: Buffer.from(bytes), format, aspectRatio: dim.width / dim.height }
  } catch (err) {
    console.warn('[PDF] failed to load photo for sizing, falling back to URL:', url, err)
    return { key, ok: false, url }
  }
}

export async function loadPhotosById(media: { id: string; public_url: string }[]): Promise<Map<string, LoadedPhoto | FailedPhoto>> {
  const loaded = await Promise.all(media.map(m => loadPhoto(m.public_url, m.id)))
  return new Map(loaded.map(p => [p.key, p]))
}

// Renders photos in a "justified gallery" style: fixed row height, width
// proportional to each photo's real aspect ratio — landscape shots come out
// wide, portrait shots come out narrow and tall, nothing gets squashed.
export function PhotoMosaic({ photos, rowHeight = 130, maxWidth = 260 }: { photos: (LoadedPhoto | FailedPhoto)[]; rowHeight?: number; maxWidth?: number }) {
  return (
    <View style={s.photoGrid}>
      {photos.map(p => {
        if (p.ok) {
          const width = Math.min(maxWidth, rowHeight * p.aspectRatio)
          const height = width / p.aspectRatio
          return (
            <View key={p.key} style={[s.photoWrap, { width, height }]}>
              <Image src={{ data: p.data, format: p.format }} style={{ width, height }} />
            </View>
          )
        }
        return (
          <View key={p.key} style={[s.photoWrap, { width: rowHeight * 1.3, height: rowHeight }]}>
            <Image src={p.url} style={{ width: rowHeight * 1.3, height: rowHeight, objectFit: 'cover' }} />
          </View>
        )
      })}
    </View>
  )
}
