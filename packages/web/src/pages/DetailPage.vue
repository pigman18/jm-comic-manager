<script setup lang="ts">
import { ref, computed, watch, inject, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson, postJson } from '@/api'
import { useZipReader } from '@/composables/useZipReader'
import { peekCatalogReturnQuery } from '@/utils/catalogReturn'
import { useJmLiveStore } from '@/stores/jmLive'
import type { Comic, ZipStatus } from '@/types'

const props = defineProps<{ num?: string }>()

const route = useRoute()
const router = useRouter()
const message = useMessage()

const applyHarmony = inject<(() => void) | undefined>('applyHarmony', undefined)
const live = useJmLiveStore()

const albumNum = computed(() => Math.floor(Number(props.num || route.params.num)))
const { openComic, readerError, closeOverlay } = useZipReader()
const withMeta = ref(true)

watch(readerError, (msg) => {
  if (!msg) return
  message.error(msg)
  readerError.value = ''
})

const loading = ref(true)
const comic = ref<Comic | null>(null)
const zipStatus = ref<Record<string, ZipStatus>>({})
const pend = ref<Set<string>>(new Set())

function addPending(k: string) {
  const n = new Set(pend.value); n.add(String(k)); pend.value = n
}
function delPending(k: string) {
  if (!pend.value.has(String(k))) return
  const n = new Set(pend.value); n.delete(String(k)); pend.value = n
}

async function loadDetail(silent = false) {
  const n = albumNum.value
  if (!Number.isFinite(n) || n < 1) return
  if (!silent) loading.value = true
  try {
    const j = await getJson(`/comics/${n}`)
    if (!j.ok) throw new Error(j.msg || j.message || '加载失败')
    comic.value = j.comic
    zipStatus.value = j.zipStatus || {}
    const base = zipStatus.value
    const ws = live.zipByKey
    for (const k of new Set([...Object.keys(base), ...Object.keys(ws)])) {
      const b = base[k] || {}
      const w = ws[k] || {}
      const st = {
        exists: 'exists' in w ? w.exists : b.exists,
        download: 'download' in w ? w.download : b.download,
      }
      if (pend.value.has(k) && (st.exists || st.download?.status === 'waiting')) delPending(k)
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
    z[sk] = {
      exists: 'exists' in w ? w.exists : b.exists,
      download: 'download' in w ? w.download : b.download,
    }
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

function zipRowClassName(index: number) {
  return `jmz-zip-row jmz-zip-tone-${(index % 4) + 1}`
}

function fmtBytes(n: number) {
  const x = Number(n)
  if (!Number.isFinite(x) || x < 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let v = x
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1 }
  const d = i === 0 ? 0 : i === 1 ? 1 : 2
  return `${v.toFixed(d)} ${u[i]}`
}

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

const showDownloadAll = computed(() => {
  const rows = zipRows.value
  return rows.length > 1 || rows.some(r => !r.st?.exists)
})

onUnmounted(() => closeOverlay())

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
    if (!j.ok) throw new Error(j.msg || j.message || '排队失败')
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
  const n = albumNum.value
  await openComic(n, row.zipKey, `${comic.value?.name || ''} · ${row.zipLabel}`)
}

function backToCatalog() {
  if (route.query.from === 'search') {
    router.push({ name: 'search' })
  } else {
    router.push({ name: 'catalog', query: peekCatalogReturnQuery() })
  }
}

function fmtTime(ts: string | undefined): string {
  if (!ts) return ''
  const n = Number(ts)
  if (!Number.isFinite(n)) return ts
  const d = new Date(n * 1000)
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}`
}

function filterByTag(t: string, ev?: Event) {
  ev?.stopPropagation?.()
  t = t.trim()
  if (!t) return
  router.replace({ name: 'catalog', query: { ...peekCatalogReturnQuery(), tags: t, page: '1' } })
}

function filterByAuthor(name: string, ev?: Event) {
  ev?.stopPropagation?.()
  const a = String(name || '').trim()
  if (!a) return
  router.replace({ name: 'catalog', query: { ...peekCatalogReturnQuery(), author: a, page: '1' } })
}

const asideRows = computed(() => {
  if (!comic.value) return []
  const c = comic.value
  const rows: { label: string; val: string }[] = []
  const push = (label: string, val: any) => {
    const s = val == null ? '' : String(val).trim()
    if (s) rows.push({ label, val: s })
  }
  push('浏览', c.total_views)
  push('点赞', c.likes)
  push('时间', c.addtime ? fmtTime(c.addtime) : '')
  push('作者', c.author?.join(', '))
  return rows
})

const detailHeroClass = computed(() => asideRows.value.length ? 'jmz-detail-hero--wide' : 'jmz-detail-hero--narrow')
</script>

<template>
  <div :class="['jmz-page', 'jmz-detail-wrap']">
    <n-spin :show="loading && !comic">
      <template v-if="comic">
        <div class="jmz-detail">
          <section :class="['jmz-detail-hero', 'jmz-panel', 'jmz-panel--pad', detailHeroClass]">
            <div class="jmz-detail-cover-wrap">
              <img class="jmz-detail-cover xxx-img" :src="comic.cover || ''" :alt="comic.name" />
            </div>
            <div class="jmz-detail-meta">
              <h1 class="jmz-detail-title xxx-text">{{ comic.name }}</h1>
              <p class="jmz-detail-line">JM{{ comic.id }} · {{ comic.displayKindLabel }}</p>
              <p v-if="comic.author?.length" class="jmz-detail-line">
                <span class="jmz-detail-author-label">作者：</span>
                <span v-for="(a, ai) in comic.author" :key="a" class="jmz-author-link xxx-text" role="link" tabindex="0" @click="filterByAuthor(a, $event)" @keyup.enter="filterByAuthor(a, $event)">{{ a }}{{ ai < comic.author.length - 1 ? ' / ' : '' }}</span>
              </p>
              <div v-if="comic.tags?.length" class="jmz-detail-tags">
                <span v-for="t in comic.tags" :key="t" class="jmz-chip jmz-chip--click xxx-text" role="link" tabindex="0" @click="filterByTag(t, $event)" @keyup.enter="filterByTag(t, $event)">{{ t }}</span>
              </div>
              <p v-if="comic.description" class="jmz-intro">{{ comic.description }}</p>
            </div>
            <aside v-if="asideRows.length" class="jmz-detail-aside" aria-label="漫画属性">
              <h3 class="jmz-aside-title">漫画属性</h3>
              <dl class="jmz-aside-dl">
                <template v-for="row in asideRows" :key="row.label">
                  <dt>{{ row.label }}</dt>
                  <dd>{{ row.val }}</dd>
                </template>
              </dl>
            </aside>
          </section>

          <section class="jmz-panel jmz-panel--pad">
            <div class="jmz-zip-head">
              <h2 class="jmz-block-title">ZIP / 阅读</h2>
              <n-checkbox v-model:checked="withMeta" class="jmz-zip-meta">附带作品信息</n-checkbox>
              <n-button v-if="showDownloadAll" type="primary" @click="downloadAllMissing" class="jmz-zip-dlall">全部下载</n-button>
            </div>
            <div v-if="zipRows.length" class="jmz-zip-table">
              <div
                v-for="(row, i) in zipRows"
                :key="row.zipKey"
                :class="['jmz-zip-row', `jmz-zip-tone-${(i % 4) + 1}`]"
              >
                <div class="jmz-zip-cell jmz-zip-cell--num xxx-text">{{ row.zipLabel }}</div>
                <div class="jmz-zip-cell jmz-zip-cell--title xxx-text" :title="row.epTitle">{{ row.epTitle }}</div>
                <div class="jmz-zip-cell jmz-zip-cell--action">
                  <template v-if="dlUi(row).kind === 'ready'">
                    <n-button type="success" @click="onRead(row)">阅读</n-button>
                  </template>
                  <template v-else-if="dlUi(row).kind === 'idle'">
                    <n-button type="primary" @click="postDownload(row.zipKey, row.label)">下载</n-button>
                  </template>
                  <template v-else-if="dlUi(row).kind === 'queued'">
                    <n-tag type="info">{{ (dlUi(row) as any).label || '排队中' }}</n-tag>
                  </template>
                  <template v-else-if="dlUi(row).kind === 'connect'">
                    <n-button type="warning" disabled>{{ (dlUi(row) as any).stepText || '进行中' }}</n-button>
                  </template>
                  <template v-else-if="dlUi(row).kind === 'pct'">
                    <div class="jmz-dl-pct">
                      <div class="jmz-dl-track" :class="{ 'jmz-dl-track--busy': (dlUi(row) as any).indeterminate }" role="progressbar">
                        <div v-if="!(dlUi(row) as any).indeterminate" class="jmz-dl-fill" :style="{ width: `${(dlUi(row) as any).pct}%` }" />
                      </div>
                      <span class="jmz-dl-pct-text">{{ (dlUi(row) as any).sub }}</span>
                    </div>
                  </template>
                  <template v-else-if="dlUi(row).kind === 'error'">
                    <div class="jmz-dl-err">
                      <span>{{ (dlUi(row) as any).msg }}</span>
                      <n-button type="error" quaternary @click="postDownload(row.zipKey, row.label)">重试</n-button>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <n-empty v-else description="无 ZIP 项" />
          </section>
        </div>
      </template>
      <template v-else-if="!loading">
        <div class="jmz-detail-empty">
          <n-empty description="未找到该漫画" />
          <n-button class="jmz-back-only" @click="backToCatalog">返回</n-button>
        </div>
      </template>
    </n-spin>
  </div>
</template>

<style scoped>
.jmz-detail-wrap {
  min-height: 40vh;
  padding: 20px 24px 48px;
}
.jmz-detail-empty {
  padding: 32px 0;
  text-align: center;
}
.jmz-detail-hero {
  display: grid;
  gap: 20px;
  margin-bottom: 14px;
}
.jmz-detail-hero--narrow {
  grid-template-columns: 160px minmax(0, 1fr);
  grid-template-areas: 'cover meta';
}
.jmz-detail-hero--wide {
  grid-template-columns: 160px minmax(0, 1fr);
  grid-template-areas:
    'cover meta'
    'aside aside';
}
@media (min-width: 900px) {
  .jmz-detail-hero--wide {
    grid-template-columns: 160px minmax(0, 1fr) minmax(200px, 260px);
    grid-template-areas: 'cover meta aside';
  }
}
.jmz-detail-cover-wrap {
  grid-area: cover;
  width: 160px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #2e2e35;
  background: #1e1e22;
}
.jmz-detail-meta {
  grid-area: meta;
  min-width: 0;
}
.jmz-detail-aside {
  grid-area: aside;
  border-top: 1px solid #2e2e35;
  padding-top: 14px;
}
@media (min-width: 900px) {
  .jmz-detail-aside {
    border-top: none;
    padding-top: 0;
    border-left: 1px solid #2e2e35;
    padding-left: 18px;
    margin-left: 0;
  }
}
.jmz-aside-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: #7a7a8a;
  text-transform: none;
  letter-spacing: 0.02em;
}
.jmz-aside-dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  font-size: 13px;
  align-items: baseline;
}
.jmz-aside-dl dt {
  margin: 0;
  color: #7a7a8a;
  font-weight: 600;
  white-space: nowrap;
}
.jmz-aside-dl dd {
  margin: 0;
  color: #c4c4d6;
  font-weight: 500;
  word-break: break-word;
}
.jmz-detail-author-label {
  color: #7a7a8a;
  font-weight: 500;
}
.jmz-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}
.jmz-detail-cover {
  width: 100%;
  display: block;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
.jmz-detail-title {
  margin: 0 0 8px;
  font-size: 1.35rem;
  line-height: 1.3;
  color: #e0e0e6;
}
.jmz-detail-line {
  margin: 0 0 6px;
  font-size: 14px;
  color: #7a7a8a;
}
.jmz-intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #7a7a8a;
  white-space: pre-wrap;
}
.jmz-zip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: nowrap;
  margin-bottom: 12px;
  min-height: 32px;
}
.jmz-zip-head .jmz-block-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  line-height: 32px;
}
.jmz-zip-dlall {
  flex-shrink: 0;
  align-self: center;
}
.jmz-zip-meta {
  flex-shrink: 0;
  white-space: nowrap;
}
.jmz-block-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #e0e0e6;
}
.jmz-zip-table {
  width: 100%;
}
.jmz-zip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 4px;
  background: #1a1a20;
  border: 1px solid #2e2e35;
}
.jmz-zip-row.jmz-zip-tone-1 { border-left: 4px solid #3b82f6; }
.jmz-zip-row.jmz-zip-tone-2 { border-left: 4px solid #8b5cf6; }
.jmz-zip-row.jmz-zip-tone-3 { border-left: 4px solid #10b981; }
.jmz-zip-row.jmz-zip-tone-4 { border-left: 4px solid #f59e0b; }
.jmz-zip-cell {
  font-size: 13px;
  color: #c4c4d6;
}
.jmz-zip-cell--num {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #7a7a8a;
  width: 80px;
  flex-shrink: 0;
}
.jmz-zip-cell--title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #9b9bb4;
}
.jmz-zip-cell--action {
  flex-shrink: 0;
  width: 160px;
  display: flex;
  justify-content: center;
}
.jmz-dl-pct {
  width: 100%;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}
.jmz-dl-track {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: #2e2e35;
  overflow: hidden;
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
  line-height: 1.35;
  color: #7a7a8a;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.jmz-dl-err {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #f06060;
}
.jmz-back-only {
  margin-top: 12px;
}
</style>
