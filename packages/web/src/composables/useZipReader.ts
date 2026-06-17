import { ref } from 'vue'
import { API } from '@/constants'
import JSZip from 'jszip'

export function useZipReader() {
  const readerError = ref('')
  let overlay: HTMLDivElement | null = null
  let pages: string[] = []
  let currentIndex = 0

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeOverlay()
    if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; updateView() }
    if (e.key === 'ArrowRight' && currentIndex < pages.length - 1) { currentIndex++; updateView() }
  }

  function updateView() {
    const img = overlay?.querySelector('#jmz-reader-img') as HTMLImageElement
    const countEl = overlay?.querySelector('#jmz-reader-count') as HTMLElement
    const prevBtn = overlay?.querySelector('#jmz-reader-prev') as HTMLButtonElement
    const nextBtn = overlay?.querySelector('#jmz-reader-next') as HTMLButtonElement
    if (!overlay) return
    if (img) img.src = pages[currentIndex] || ''
    if (countEl) countEl.textContent = `${currentIndex + 1} / ${pages.length}`
    if (prevBtn) prevBtn.disabled = currentIndex <= 0
    if (nextBtn) nextBtn.disabled = currentIndex >= pages.length - 1
  }

  function closeOverlay() {
    if (overlay) { overlay.remove(); overlay = null }
    pages.forEach(u => URL.revokeObjectURL(u))
    pages = []
    document.removeEventListener('keydown', onKeydown)
  }

  async function openComic(albumNum: number, zipKey: string, title: string) {
    closeOverlay()
    readerError.value = ''

    // 1. 询问服务端是否走浏览器阅读
    const body = zipKey != null && String(zipKey) !== String(albumNum)
      ? { episodeNumber: Number(zipKey) }
      : {}
    try {
      const r = await fetch(`${API}/comics/${albumNum}/open-viewer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (j.useBrowser) {
        await openZipInBrowser(albumNum, zipKey, title)
        return
      }
      if (!j.ok) readerError.value = j.message || `打开失败 (${r.status})`
    } catch (e: any) {
      readerError.value = String(e?.message || e)
    }
  }

  async function openZipInBrowser(albumNum: number, zipKey: string, title: string) {
    // 2. 获取 ZIP 文件
    const url = `${API}/comics/${albumNum}/zip-file/${zipKey}`
    let res
    try {
      res = await fetch(url)
    } catch (e: any) {
      readerError.value = String(e?.message || e)
      return
    }
    if (!res.ok) {
      readerError.value = `无法加载压缩包 (${res.status})`
      return
    }

    // 3. 用 JSZip 解析
    const buf = await res.arrayBuffer()
    let zip
    try {
      zip = await JSZip.loadAsync(buf)
    } catch {
      readerError.value = 'ZIP 解析失败'
      return
    }

    // 4. 收集图片
    const paths: string[] = []
    zip.forEach((rel, entry) => {
      if (entry.dir) return
      if (/\.(jpe?g|png|webp|gif|bmp)$/i.test(rel)) paths.push(rel)
    })
    paths.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    if (!paths.length) {
      readerError.value = '压缩包内没有图片'
      return
    }

    // 5. 提取为 Blob URL
    pages = []
    for (const name of paths) {
      try {
        const blob = await zip.files[name].async('blob')
        pages.push(URL.createObjectURL(blob))
      } catch { /* 略过损坏的图片 */ }
    }
    if (!pages.length) {
      readerError.value = '无法读取图片'
      return
    }

    currentIndex = 0
    renderOverlay(title)
  }

  function renderOverlay(title: string) {
    overlay = document.createElement('div')
    overlay.className = 'jmz-reader-overlay'
    overlay.innerHTML = `
      <div class="jmz-reader-shell">
        <div class="jmz-reader-top">
          <button class="jmz-reader-close">✕ 关闭</button>
          <span class="jmz-reader-title">${escapeHtml(title)}</span>
          <span class="jmz-reader-count" id="jmz-reader-count">1 / ${pages.length}</span>
        </div>
        <div class="jmz-reader-stage">
          <button class="jmz-reader-nav" id="jmz-reader-prev">‹</button>
          <div class="jmz-reader-img-wrap">
            <img class="jmz-reader-img" id="jmz-reader-img" src="${pages[0] || ''}" alt="" />
          </div>
          <button class="jmz-reader-nav" id="jmz-reader-next">›</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    updateView()
    overlay.querySelector('.jmz-reader-close')?.addEventListener('click', closeOverlay)
    overlay.querySelector('#jmz-reader-prev')?.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateView() } })
    overlay.querySelector('#jmz-reader-next')?.addEventListener('click', () => { if (currentIndex < pages.length - 1) { currentIndex++; updateView() } })
    document.addEventListener('keydown', onKeydown)
  }

  return { openComic, readerError, closeOverlay }
}

function escapeHtml(s: string): string {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}
