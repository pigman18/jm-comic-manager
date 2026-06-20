<template>
  <div :class="['jmz-meta', { 'jmz-meta--page': !dialog, 'jmz-meta--dialog': dialog }]">
    <div v-if="!dialog" class="jmz-meta-head">
      <n-button quaternary @click="goBack">
        <template #icon><n-icon :component="ArrowBackOutline" /></template>
      </n-button>
      <span class="jmz-meta-head-title xxx-text" v-if="comic">{{ comic.name }}</span>
      <span class="jmz-meta-head-title" v-else>漫画元数据</span>
    </div>

    <div class="jmz-meta-body">
      <n-spin :show="loading">
        <div class="jmt-meta-inner">
          <template v-if="comic">
            <div class="jmt-meta-hero">
              <div class="jmt-meta-cover-wrap"><img class="jmt-meta-cover xxx-img" :src="comic.cover || ''" :alt="comic.name" /></div>
              <div class="jmt-meta-info">
                <p class="jmt-meta-tags">
                  <span class="xxx-text">JM{{ comic.id }}</span>
                  <span class="xxx-text">{{ comic.displayKindLabel }}</span>
                </p>
                <div v-if="comic.author?.length" class="jmt-meta-chips"><span style="font-size:14px;color:#c4c4d6;margin-right:2px">作者：</span><span v-for="a in comic.author" :key="a" class="jmz-chip jmz-chip--click xxx-text" role="link" tabindex="0" @click="filterByAuthor(a, $event)" @keyup.enter="filterByAuthor(a, $event)">{{ a }}</span></div>
                <div v-if="comic.tags?.length" class="jmt-meta-chips">
                  <span v-for="t in comic.tags" :key="t" class="jmz-chip jmz-chip--click xxx-text" role="link" tabindex="0" @click="filterByTag(t, $event)" @keyup.enter="filterByTag(t, $event)">{{ t }}</span>
                </div>
                <p v-if="comic.description" class="jmt-meta-desc xxx-text">{{ comic.description }}</p>
                <div v-if="comic" class="jmt-meta-stats">
                  <span v-if="comic.total_views" class="jmz-stat-item xxx-text">
                    <n-icon :component="EyeOutline" size="14" style="vertical-align:-2px;margin-right:3px" />{{ comic.total_views }}
                  </span>
                  <span v-if="comic.likes" class="jmz-stat-item xxx-text" style="margin-left:8px">
                    <n-icon :component="HeartOutline" size="14" style="vertical-align:-2px;margin-right:3px" />{{ comic.likes }}
                  </span>
                  <span v-if="comic.addtime" class="jmz-stat-item xxx-text" style="margin-left:8px">
                    {{ fmtTime(comic.addtime) }}
                  </span>
                </div>
              </div>
            </div>
            <section class="jmt-meta-zip">
              <div class="jmt-ep-list-header">
                <div class="jmt-ep-list-header-left">
                  <n-checkbox v-model:checked="showReadable" size="small">可读</n-checkbox>
                  <n-input v-model:value="filterText" placeholder="筛选章节" size="tiny" clearable class="jmt-ep-filter" />
                </div>
                <div class="jmt-ep-list-header-right">
                  <n-checkbox v-model:checked="withMeta">附带作品信息</n-checkbox>
                  <n-button v-if="showDownloadAll" type="primary" size="tiny" @click="downloadAllMissing">全部下载</n-button>
                </div>
              </div>
            <div v-if="filteredRows.length" class="jmt-ep-list">
              <div v-for="row in filteredRows" :key="row.zipKey" class="jmt-ep-row">
                <span class="jmt-ep-num xxx-text">{{ row.zipLabel }}</span>
                <span class="jmt-ep-title xxx-text">{{ row.epTitle }}</span>
                <n-tag v-if="dlUi(row).kind === 'ready' && isRead(row.zipKey)" size="small" type="success" bordered>已读</n-tag>
                <n-button v-if="dlUi(row).kind === 'ready'" size="tiny" type="success" @click="onRead(row)">阅读</n-button>
                <n-button v-else-if="dlUi(row).kind === 'idle'" size="tiny" type="primary" @click="postDownload(row.zipKey, row.label)">下载</n-button>
                <n-tag v-else-if="dlUi(row).kind === 'queued'" size="small" type="info">{{ (dlUi(row) as any).label || '排队中' }}</n-tag>
                <n-button v-else-if="dlUi(row).kind === 'connect'" size="tiny" disabled>{{ (dlUi(row) as any).stepText || '进行中' }}</n-button>
                <span v-else-if="dlUi(row).kind === 'pct'" style="display:flex;align-items:center;gap:6px">
                  <div class="jmz-dl-track" :class="{ 'jmz-dl-track--busy': (dlUi(row) as any).indeterminate }">
                    <div v-if="!(dlUi(row) as any).indeterminate" class="jmz-dl-fill" :style="{ width: `${(dlUi(row) as any).pct}%` }" />
                  </div>
                  <span class="jmz-dl-pct-text">{{ (dlUi(row) as any).sub }}</span>
                </span>
                <span v-else-if="dlUi(row).kind === 'error'" style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:11px;color:#f06060">{{ (dlUi(row) as any).msg }}</span>
                  <n-button size="tiny" quaternary type="error" @click="postDownload(row.zipKey, row.label)">重试</n-button>
                </span>
              </div>
            </div>
            <n-empty v-else description="无 ZIP 项" style="padding:20px 0" />
          </section>
        </template>
        <div v-else-if="loading" class="jmt-meta-loading" />
        <n-empty v-else description="未找到该漫画" />
      </div>
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, EyeOutline, HeartOutline } from '@vicons/ionicons5'
import { getJson, postJson } from '@/api'
import { useZipReader } from '@/composables/useZipReader'
import { useJmLiveStore } from '@/stores/jmLive'
import { useReadStore } from '@/stores/reads'
import type { Comic, ZipStatus } from '@/types'

const props = defineProps<{ num?: string; dialog?: boolean }>()
const emit = defineEmits<{ close: []; 'title-changed': [title: string] }>()

const route = useRoute()
const router = useRouter()
const message = useMessage()

const applyHarmony = inject<(() => void) | undefined>('applyHarmony', undefined)
const live = useJmLiveStore()
const { openComic } = useZipReader()
const withMeta = ref(true)

const filterText = ref('')
const showReadable = ref(false)

const filteredRows = computed(() => {
  let rows = zipRows.value
  if (showReadable.value) {
    rows = rows.filter(r => r.st?.exists)
  }
  if (filterText.value) {
    const q = filterText.value.toLowerCase()
    rows = rows.filter(r => r.epTitle.toLowerCase().includes(q) || r.zipKey.includes(q))
  }
  return rows
})

const albumNum = computed(() => Math.floor(Number(props.num || route.params.num)))
const readStore = useReadStore()

function isRead(zipKey: string) {
  return readStore.isRead(Number(zipKey))
}

const loading = ref(true)
const comic = ref<Comic | null>(null)
watch(comic, async (c) => {
  if (c?.series?.length) {
    const ids = c.series.map((e: any) => Number(e.id))
    await readStore.checkReads(ids)
  }
})
const zipStatus = ref<Record<string, ZipStatus>>({})
const pend = ref<Set<string>>(new Set())

function addPending(k: string) { const n = new Set(pend.value); n.add(String(k)); pend.value = n }
function delPending(k: string) {
  if (!pend.value.has(String(k))) return
  const n = new Set(pend.value); n.delete(String(k)); pend.value = n
}

async function loadDetail(silent = false) {
  const n = albumNum.value
  if (!Number.isFinite(n) || n < 1) return
  if (!silent) loading.value = true
  try {
    const j = await postJson(`/comics/${n}/fetch-meta`)
    if (!j.ok) throw new Error(j.message || '加载失败')
    comic.value = j.comic
    if (j.comic) emit('title-changed', `${j.comic.name || ''}`)
    zipStatus.value = j.zipStatus || {}
    const base = zipStatus.value
    const ws = live.zipByKey
    for (const k of new Set([...Object.keys(base), ...Object.keys(ws)])) {
      if (pend.value.has(k) && ((ws[k]?.exists || base[k]?.exists) || ws[k]?.download?.status === 'waiting')) delPending(k)
    }
  } catch (e: any) {
    if (!silent) { message.error(String(e?.message || e)); comic.value = null }
  } finally {
    if (!silent) loading.value = false
    await nextTick()
    applyHarmony?.()
  }
}

watch(() => props.num || route.params.num, () => void loadDetail(false), { immediate: true })
watch(albumNum, (num) => { if (Number.isFinite(num) && num >= 1) live.clearZipByKey() }, { immediate: true })

interface ZipRow {
  zipKey: string; num: number; zipLabel: string; epTitle: string; label: string; st: ZipStatus
}

const zipStatusMerged = computed(() => {
  if (!comic.value) return {}
  const c = comic.value
  const eps = Array.isArray(c.series) && c.series.length ? c.series : null
  const nums = eps ? eps.map(e => Number(e.id)).filter(n => Number.isFinite(n)) : [Number(c.id)].filter(n => Number.isFinite(n))
  const base = zipStatus.value || {}
  const ws = live.zipByKey
  const z: Record<string, ZipStatus> = {}
  for (const num of nums) {
    const sk = String(num)
    const b = base[sk] || {}
    const w = ws[sk] || {}
    z[sk] = { exists: 'exists' in w ? w.exists : b.exists, download: 'download' in w ? w.download : b.download }
  }
  return z
})

const zipRows = computed<ZipRow[]>(() => {
  if (!comic.value) return []
  const c = comic.value
  const z = zipStatusMerged.value
  const eps = Array.isArray(c.series) && c.series.length ? c.series : null
  const nums = eps ? eps.map(e => Number(e.id)).filter(n => Number.isFinite(n)) : [Number(c.id)].filter(n => Number.isFinite(n))
  return nums.map(num => {
    const sk = String(num)
    const st = z[sk] || {}
    const ep = eps?.find(e => Number(e.id) === num)
    const siteName = (ep ? String(ep.name ?? '') : String(c.name ?? '')).trim()
    const zipLabel = `JM${num}`
    return { zipKey: sk, num, zipLabel, epTitle: siteName, label: [zipLabel, siteName].filter(Boolean).join(' '), st }
  })
})

const showDownloadAll = computed(() => {
  const rows = zipRows.value
  return rows.length > 1 || rows.some(r => !r.st?.exists)
})

const STEP_LABEL: Record<string, string> = {
  download_page: '下载页', captcha: '验证码', real_link: '获取链接',
  download: '写入文件', cloud_flare_cookie: '访问校验', login_page: '登录页',
  login_api: '登录接口', login_meiman: '门户', info_page: '信息页', file: '文件',
}

function stepLabel(step?: string, stepState?: string) {
  if (!step) return ''
  const name = STEP_LABEL[step] || String(step).replace(/_/g, ' ')
  if (stepState === 'start' || stepState === 'running') return `正在${name}`
  if (stepState === 'success') return `${name}完成`
  if (stepState === 'error') return `${name}失败`
  return name
}

function dlUi(row: ZipRow) {
  const sk = String(row.zipKey)
  const st = row.st
  if (st?.exists) return { kind: 'ready' } as const
  const d = st?.download
  const stText = stepLabel(d?.step, d?.stepState)
  if (d?.status === 'error') return { kind: 'error', msg: String(d.error || '下载失败'), stepText: stText } as const
  const run = d?.status === 'running' || d?.status === 'start'
  if (run) {
    const t = Number(d.total); const c = Number(d.complete)
    if (Number.isFinite(t) && t > 0) {
      const pct = Math.min(100, Math.round((c / t) * 100))
      return { kind: 'pct', pct, sub: [stText, `${fmtBytes(c)} / ${fmtBytes(t)}`].filter(Boolean).join(' · '), indeterminate: false } as const
    }
    if (Number.isFinite(c) && c > 0) return { kind: 'pct', pct: 0, sub: [stText, `${fmtBytes(c)}（总长未知）`].filter(Boolean).join(' · '), indeterminate: true } as const
    return { kind: 'connect', stepText: stText || '准备中' } as const
  }
  if (d?.status === 'waiting') return { kind: 'queued', label: stText || '排队中' } as const
  if (d?.status === 'done' && !st?.exists) return { kind: 'idle' } as const
  if (pend.value.has(sk)) return { kind: 'queued', label: '排队中' } as const
  return { kind: 'idle' } as const
}

const posting = new Set<string>()
async function postDownload(zipKey: string, label: string, silent = false) {
  if (posting.has(zipKey)) return
  posting.add(zipKey)
  const n = albumNum.value
  addPending(zipKey)
  try {
    const j = await postJson(`/comics/${n}/download`, {
      episodeNumber: Number(zipKey),
      downloadLabel: String(label || '').slice(0, 240),
      coverUrl: comic.value?.cover || '',
      title: comic.value?.name || '',
      episodeTitle: zipRows.value.find(r => r.zipKey === zipKey)?.epTitle || '',
      withMeta: withMeta.value,
    })
    if (!j.ok) throw new Error(j.message || '排队失败')
    if (!silent) message.success('已加入下载队列')
  } catch (e: any) { delPending(zipKey); if (!silent) message.error(String(e?.message || e)); throw e }
  finally { posting.delete(zipKey) }
}

async function downloadAllMissing() {
  const rows = zipRows.value.filter(row => !row.st?.exists)
  if (!rows.length) { message.info('ZIP 均已就绪'); return }
  let ok = 0
  for (const row of rows) {
    const d = row.st?.download
    if (d && ['waiting', 'running', 'start'].includes(d.status)) continue
    try { await postDownload(row.zipKey, row.label, true); ok += 1 }
    catch { break }
  }
  if (ok) message.success(`已加入 ${ok} 项到下载队列`)
  else message.info('没有可排队的项')
}

async function onRead(row: ZipRow) {
  readStore.markRead(albumNum.value, Number(row.zipKey))
  await openComic(albumNum.value, row.zipKey, `${comic.value?.name || ''} · ${row.zipLabel}`)
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'catalog' })
}

function filterByTag(t: string, ev?: Event) {
  ev?.stopPropagation?.()
  if (props.dialog) emit('close')
  router.replace({ name: 'catalog', query: { tags: String(t), page: '1' } })
}

function filterByAuthor(name: string, ev?: Event) {
  ev?.stopPropagation?.()
  const a = String(name || '').trim()
  if (!a) return
  if (props.dialog) emit('close')
  router.replace({ name: 'catalog', query: { author: a, page: '1' } })
}

function fmtTime(ts: string | undefined): string {
  if (!ts) return ''
  const n = Number(ts)
  if (!Number.isFinite(n)) return ts
  const d = new Date(n * 1000)
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  return `${Y}-${M}-${D}`
}

function fmtBytes(n: number) {
  const x = Number(n)
  if (!Number.isFinite(x) || x < 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let v = x
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1 }
  const d = i === 0 ? 0 : i === 1 ? 1 : 2
  return `${v.toFixed(d)} ${u[i]}`
}
</script>

<style scoped>
.jmt-meta-loading {
  min-height: 250px;
}
/* --- layout --- */
.jmz-meta {
  display: flex;
  flex-direction: column;
}
.jmz-meta--page {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}
.jmz-meta--dialog {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.jmz-meta-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.jmz-meta-head-title {
  font-size: 16px;
  font-weight: 700;
  color: #e0e0e6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jmz-meta-body {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
:deep(.jmz-meta-body > .n-spin-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
:deep(.jmz-meta-body > .n-spin-container > .n-spin-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.jmt-meta-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.jmz-meta--page .jmt-meta-zip {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.jmz-meta--page .jmt-ep-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid #2e2e35;
  border-radius: 6px;
  background: #1e1e22;
}
.jmz-meta--dialog .jmt-ep-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #2e2e35;
  border-radius: 6px;
  background: #1e1e22;
}

.jmt-meta-hero {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.jmz-meta--page .jmt-meta-hero {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1a1a20;
  padding-bottom: 8px;
}
.jmz-meta--dialog .jmt-meta-cover-wrap {
  width: 30%;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #2e2e35;
  background: #1e1e22;
}
.jmz-meta--page .jmt-meta-cover-wrap {
  width: 20%;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #2e2e35;
  background: #1e1e22;
}
.jmt-meta-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.jmt-meta-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.jmt-meta-tags {
  margin: 0;
  display: flex;
  gap: 6px;
  font-size: 15px;
}
.jmt-meta-author {
  margin: 0;
  font-size: 14px;
  color: #c4c4d6;
}
.jmt-meta-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #7a7a8a;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.jmt-meta-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #7a7a8a;
}

/* --- chips (tags) --- */
.jmt-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.jmt-meta-chips .jmz-chip {
  font-size: 12px;
  padding: 5px 9px;
}

/* --- zip section --- */
.jmt-meta-zip {
  margin-top: 2px;
}
.jmt-ep-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.jmt-ep-list-header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.jmt-ep-filter {
  flex: 1;
  min-width: 0;
}
.jmt-ep-list-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.jmt-ep-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  font-size: 14px;
  border-bottom: 1px solid #2a2a30;
  overflow: hidden;
}
.jmt-ep-row:last-child {
  border-bottom: none;
}
.jmt-ep-num {
  font-weight: 700;
  color: #9b9bb4;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.jmt-ep-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c4c4d6;
}

/* --- dl progress --- */
.jmz-dl-track {
  width: 80px;
  height: 4px;
  border-radius: 999px;
  background: #2e2e35;
  overflow: hidden;
  position: relative;
}
.jmz-dl-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  transition: width 0.22s ease;
}
.jmz-dl-track--busy::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 40%;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.45), transparent);
  animation: jmz-dl-busy 1.05s ease-in-out infinite;
}
@keyframes jmz-dl-busy {
  0% { transform: translateX(-30%); }
  100% { transform: translateX(260%); }
}
.jmz-dl-pct-text {
  font-size: 11px;
  color: #7a7a8a;
  white-space: nowrap;
}
</style>
