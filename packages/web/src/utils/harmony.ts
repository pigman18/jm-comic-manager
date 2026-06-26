export function createHarmonyDataUrl(srcImg: HTMLImageElement, outW: number, outH: number): string {
  const BLOCK = 108
  const bw = Math.max(1, Math.ceil(outW / BLOCK))
  const bh = Math.max(1, Math.ceil(outH / BLOCK))
  const tiny = document.createElement('canvas')
  tiny.width = bw; tiny.height = bh
  const tc = tiny.getContext('2d')!
  tc.imageSmoothingEnabled = false
  tc.drawImage(srcImg, 0, 0, bw, bh)
  const td = tc.getImageData(0, 0, bw, bh)

  const d = td.data
  const freq = new Map<number, number>()
  for (let i = 0; i < d.length; i += 4) {
    const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)
    freq.set(key, (freq.get(key) || 0) + 1)
  }
  let bestKey = 0, bestCnt = 0
  for (const [k, c] of freq) { if (c > bestCnt) { bestCnt = c; bestKey = k } }

  const out = document.createElement('canvas')
  out.width = outW; out.height = outH
  const oc = out.getContext('2d')!
  const dr = (bestKey >> 10) & 0x1f, dg = (bestKey >> 5) & 0x1f, db = bestKey & 0x1f
  oc.fillStyle = '#' + [dr << 3, dg << 3, db << 3].map(c => c.toString(16).padStart(2, '0')).join('')
  oc.fillRect(0, 0, outW, outH)
  oc.globalAlpha = 0.7
  oc.imageSmoothingEnabled = false
  oc.drawImage(tiny, 0, 0, outW, outH)
  return out.toDataURL('image/jpeg', 0.85)
}
