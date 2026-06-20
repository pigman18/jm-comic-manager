<script setup lang="ts">
import { reactive, ref, shallowRef, computed, onMounted, watch, nextTick, onActivated, inject, type Ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMessage, type MessageApi } from 'naive-ui'
import { SearchOutline, RefreshOutline } from '@vicons/ionicons5'
import CatalogCard from '@/components/CatalogCard.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'
import { buildQuery, getJson, postJson } from '@/api'

import { useJmLiveStore } from '@/stores/jmLive'
import type { Comic } from '@/types'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const live = useJmLiveStore()
const { syncLocalToDb, syncDbToLocal } = storeToRefs(live)

const tagsOptions = ref<string[]>([])
const tagsLoading = ref(false)
let tagsDebounceTimer: ReturnType<typeof setTimeout> | null = null

const loading = ref(false)
const list = shallowRef<Comic[]>([])
const total = ref(0)
const coverLoaded = reactive<Record<number, boolean>>({})

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })

const cachedList = shallowRef<Comic[]>([])
const cachedTotal = ref(0)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)

const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
function metaOpen(id: number) { metaDialogNum.value = id; metaDialogShow.value = true }

const filters = reactive({
  title: '',
  author: '',
  number: '',
  tags: [] as string[],
  kind: '',
  available: false,
  sort: 'update_time',
  order: 'desc',
  page: 1,
  pageSize: 10,
})

watch(
    () => ({ page: filters.page, pageSize: filters.pageSize }),
    () => {
      router.replace({ name: 'catalog', query: filtersToQuery() })
      nextTick(() => mainScrollRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
    },
)

const queryParams = computed(() => {
  const tags = filters.tags.length ? filters.tags.map(t => String(t).trim()).filter(Boolean).join(',') : ''
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    title: filters.title.trim(),
    author: filters.author.trim(),
    number: filters.number.trim(),
    tags,
    kind: filters.kind,
    available: filters.available ? 'true' : undefined,
    sort: filters.sort,
    order: filters.order,
  }
})

function scalarQ(v: any): string {
  if (Array.isArray(v)) return String(v[0] ?? '')
  return v == null ? '' : String(v)
}

function readFiltersFromRoute() {
  const q = route.query
  filters.title = scalarQ(q.title)
  filters.author = scalarQ(q.author)
  filters.number = scalarQ(q.number)
  const ts = scalarQ(q.tags)
  filters.tags = ts ? ts.split(',').map(x => x.trim()).filter(Boolean) : []
  filters.kind = scalarQ(q.kind)
  filters.available = q.available === 'true'
  filters.sort = scalarQ(q.sort) || 'update_time'
  filters.order = scalarQ(q.order) || 'desc'
  const p = parseInt(scalarQ(q.page), 10)
  filters.page = Number.isFinite(p) && p >= 1 ? p : 1
  const ps = parseInt(scalarQ(q.pageSize), 10)
  filters.pageSize = [10, 20, 30, 40, 50].includes(ps) ? ps : 10
}

function filtersToQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  if (filters.title.trim()) q.title = filters.title.trim()
  if (filters.author.trim()) q.author = filters.author.trim()
  if (filters.number.trim()) q.number = filters.number.trim()
  if (filters.tags.length) q.tags = filters.tags.join(',')
  if (filters.kind) q.kind = filters.kind
  if (filters.available) q.available = 'true'
  if (filters.sort !== 'update_time') q.sort = filters.sort
  if (filters.order !== 'desc') q.order = filters.order
  if (filters.page > 1) q.page = String(filters.page)
  if (filters.pageSize !== 10) q.pageSize = String(filters.pageSize)
  return q
}

let listAbort: AbortController | null = null

async function loadList() {
  listAbort?.abort()
  const ac = new AbortController()
  listAbort = ac
  const { signal } = ac
  loading.value = true
  try {
    const j = await getJson(`/comics${buildQuery(queryParams.value as any)}`, { signal })
    if (signal.aborted) return
    if (!j.ok) throw new Error(j.message || '加载失败')
    list.value = j.list || []
    total.value = j.total ?? 0
    for (const k of Object.keys(coverLoaded)) delete coverLoaded[Number(k)]
  } catch (e: any) {
    if (e?.name === 'AbortError' || signal.aborted) return
    message.error(String(e?.message || e))
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

onBeforeRouteLeave(() => {
  cachedList.value = [...list.value]
  cachedTotal.value = total.value
  scrollTop.value = mainScrollRef.value?.scrollTop || 0
})

onActivated(() => {
  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    total.value = cachedTotal.value
    cachedQueryKey = JSON.stringify(filtersToQuery() || {})
    router.replace({ name: 'catalog', query: filtersToQuery() })
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  }
})

function resetPage() {
  filters.page = 1
  router.replace({ name: 'catalog', query: filtersToQuery() })
}
function doSearch() {
  loadList()
}
function clearNumber() {
  filters.number = ''
  resetPage()
}

let cachedQueryKey = ''

watch(
    () => route.query,
    (newQuery) => {
      if (route.name !== 'catalog') return
      const key = JSON.stringify(newQuery || {})
      if (key === cachedQueryKey) return
      cachedList.value = []
      cachedTotal.value = 0
      cachedQueryKey = key
      readFiltersFromRoute()
      void loadList()
    },
)

onMounted(() => {
  readFiltersFromRoute()
  cachedQueryKey = JSON.stringify(route.query || {})
  void loadList()
})

function searchTags(query: string) {
  if (tagsDebounceTimer) { clearTimeout(tagsDebounceTimer); tagsDebounceTimer = null }
  if (!query || !query.trim()) { tagsOptions.value = []; return }
  tagsDebounceTimer = setTimeout(async () => {
    tagsLoading.value = true
    try {
      const j = await getJson(`/tags${buildQuery({ query: query.trim() })}`)
      tagsOptions.value = j.tags || []
    } catch { tagsOptions.value = [] }
    finally { tagsLoading.value = false }
  }, 300)
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
  const tags = new Set(filters.tags || [])
  tags.add(String(t))
  router.replace({ name: 'catalog', query: { ...filtersToQuery(), tags: [...tags].join(','), page: '1' } })
}

function filterByAuthor(name: string, ev?: Event) {
  ev?.stopPropagation?.()
  const a = String(name || '').trim()
  if (!a) return
  router.replace({ name: 'catalog', query: { ...filtersToQuery(), author: a, page: '1' } })
}

function tagsLine(c: Comic) {
  return (c.tags || []).slice(0, 5)
}

function tagsMore(c: Comic) {
  return Math.max(0, (c.tags || []).length - 5)
}

function syncBtnLabel(busy: boolean, idleText: string, slot: { busy: boolean; complete: number; total: number }) {
  if (!busy) return idleText
  return `${idleText}：${slot.complete} / ${slot.total}`
}

function syncBtnProgressStyle(slot: { busy: boolean; complete: number; total: number }) {
  if (!slot.busy || !slot.total) return { '--jmz-sync-ratio': '0' }
  const ratio = Math.min(1, Math.max(0, Number(slot.complete) / Number(slot.total)))
  return { '--jmz-sync-ratio': String(ratio) }
}

const syncL2dLabel = computed(() => syncBtnLabel(syncLocalToDb.value.busy, 'local→库', syncLocalToDb.value))
const syncD2lLabel = computed(() => syncBtnLabel(syncDbToLocal.value.busy, '库→local', syncDbToLocal.value))
const syncL2dStyle = computed(() => syncBtnProgressStyle(syncLocalToDb.value))
const syncD2lStyle = computed(() => syncBtnProgressStyle(syncDbToLocal.value))

const fetchNum = ref('')
const fetchBusy = ref(false)

async function fetchByNumber() {
  const n = Math.floor(Number(fetchNum.value))
  if (!Number.isFinite(n) || n < 1) { message.warning('请输入有效 JM 编码'); return }
  fetchBusy.value = true
  try {
    const j = await postJson(`/comics/${n}/fetch-meta`)
    if (!j.ok) { message.warning(j.message || '拉取失败'); return }
    message.success('已更新')
    fetchNum.value = ''
    filters.number = String(n)
    filters.page = 1
    router.replace({ name: 'catalog', query: filtersToQuery() })
  } catch (e: any) { message.error(String(e?.message || e)) }
  finally { fetchBusy.value = false }
}

async function syncLocal2Db() {
  if (syncLocalToDb.value.busy) return
  try { const j = await postJson('/sync/local2db'); if (!j.ok) throw new Error(j.message || '同步失败') }
  catch (e: any) { message.error(String(e?.message || e)) }
}

async function syncDb2Local() {
  if (syncDbToLocal.value.busy) return
  try { const j = await postJson('/sync/db2local'); if (!j.ok) throw new Error(j.message || '同步失败') }
  catch (e: any) { message.error(String(e?.message || e)) }
}

watch(
    () => [syncLocalToDb.value.busy, syncDbToLocal.value.busy],
    (busyNow, busyPrev) => {
      const wasL2d = busyPrev?.[0]; const wasD2l = busyPrev?.[1]
      if (wasL2d && !busyNow[0] && live.lastPayload?.phase === 'sync_local_to_db' && live.lastPayload?.state === 'success') {
        message.success('local → 库 已完成'); void loadList()
      }
      if (wasD2l && !busyNow[1] && live.lastPayload?.phase === 'sync_db_to_local' && live.lastPayload?.state === 'success') {
        message.success('库 → local 已完成'); void loadList()
      }
    },
)



function onCoverLoad(n: number) { if (n != null) coverLoaded[n] = true }

function onCoverErr(ev: Event, n: number) {
  const el = ev?.target as HTMLElement
  if (el?.style) el.style.opacity = '0.25'
  onCoverLoad(n)
}

function onCoverImg(el: HTMLImageElement | null, n: number, coverUrl?: string) {
  if (!el || n == null) return
  if (!String(coverUrl || '').trim()) { onCoverLoad(n); return }
  if (el.complete && el.naturalWidth > 0) onCoverLoad(n)
}

function coverReady(n: number, coverUrl?: string) {
  return coverLoaded[n] || !String(coverUrl || '').trim()
}

function imgLazy(i: number) { return i > 6 ? 'lazy' as const : 'eager' as const }

function coverFetchPriority(i: number) { return i < 4 ? 'high' as const : 'low' as const }

function cardToneClass(index: number) { return `tone-${(index % 4) + 1}` }

const kindOptions = [
  { label: '全部', value: '' },
  { label: '单集', value: 'single' },
  { label: '多集', value: 'series' },
]
const sortOptions = [
  { label: 'JM 编码', value: 'id' },
  { label: '标题', value: 'name' },
  { label: '浏览', value: 'total_views' },
  { label: '点赞', value: 'likes' },
  { label: '元数据更新时间', value: 'update_time' },
  { label: '元数据录入时间', value: 'create_time' },
]
const orderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
]
</script>

<template>
  <div class="jmz-page jmz-catalog">
    <section class="jmz-panel jmz-panel--pad jmz-catalog-header">
      <div class="jmz-filter-body">
        <div class="jmz-filter-fetch">
          <n-input v-model:value="fetchNum" placeholder="JM 编码" clearable @keyup.enter="fetchByNumber" />
          <n-button :loading="fetchBusy" @click="fetchByNumber" block>拉取</n-button>
        </div>
        <div class="jmz-filter-left">
          <div class="jmz-search-row">
            <n-input v-model:value="filters.title" clearable placeholder="标题" @clear="resetPage" @keyup.enter="resetPage">
              <template #prefix><n-icon :component="SearchOutline" /></template>
            </n-input>
            <n-input v-model:value="filters.author" clearable placeholder="作者" @clear="resetPage" @keyup.enter="resetPage" />
            <n-input v-model:value="filters.number" clearable placeholder="JM 编码" @clear="clearNumber" @keyup.enter="resetPage" />
            <n-select
                v-model:value="filters.tags"
                multiple filterable tag
                placeholder="标签"
                clearable
                :options="tagsOptions.map(t => ({ label: t, value: t }))"
                :loading="tagsLoading"
                @search="searchTags"
                @clear="resetPage"
                @update:value="resetPage"
            />
            <n-select v-model:value="filters.kind" placeholder="类型" clearable :options="kindOptions" @update:value="resetPage" />
            <n-checkbox v-model:checked="filters.available" @update:checked="resetPage">可读</n-checkbox>
          </div>
          <div class="jmz-sort-row">
            <n-select v-model:value="filters.sort" :options="sortOptions" @update:value="resetPage" />
            <n-select v-model:value="filters.order" :options="orderOptions" @update:value="resetPage" />
            <n-button type="primary" :loading="loading" @click="doSearch">搜索</n-button>
          </div>
        </div>
      </div>
      <div v-if="loading" class="jmz-cat-bar-track"><div class="jmz-cat-bar-fill" /></div>
      <div v-if="loading" class="jmz-cat-bar-indicator">加载中...</div>
    </section>

    <div class="jmz-catalog-main" ref="mainScrollRef">
      <n-empty v-if="!loading && !list.length" description="暂无数据" />
      <div v-else class="jmz-card-grid-wrap">
        <div v-if="loading" class="jmz-card-grid jmz-skel-grid" aria-hidden="true">
          <div
              v-for="i in filters.pageSize"
              :key="'sk' + i"
              :class="['jmz-card', 'jmz-skel-card', cardToneClass(i - 1)]"
          >
            <div class="jmz-skel-cover" />
            <div class="jmz-skel-lines" />
          </div>
        </div>
        <div v-else class="jmz-card-grid">
          <CatalogCard
              v-for="(c, i) in list"
              :key="c.id"
              :comic="c"
              :fetch-remote="false"
              :tone-class="cardToneClass(i)"
              :cover-ready="coverReady(c.id, c.cover)"
              :img-loading="imgLazy(i)"
              :cover-priority="coverFetchPriority(i)"
              :meta-open="metaOpen"
              :filter-by-author="filterByAuthor"
              :on-cover-img="onCoverImg"
              :on-cover-load="() => onCoverLoad(c.id)"
              :on-cover-err="(ev) => onCoverErr(ev, c.id)"
          >
            <template #tags>
              <span
                  v-for="t in tagsLine(c)"
                  :key="t"
                  class="jmz-chip jmz-chip--click xxx-text"
                  role="link"
                  tabindex="0"
                  @click.stop="filterByTag(t, $event)"
                  @keyup.enter.stop="filterByTag(t, $event)"
              >{{ t }}</span>
              <span v-if="tagsMore(c)" class="jmz-chip jmz-chip--more">+{{ tagsMore(c) }}</span>
              <span v-if="!tagsLine(c).length && !tagsMore(c)" class="jmz-chip jmz-chip--ghost">无标签</span>
            </template>
            <template #dates>
              <span v-if="c.addtime" class="jmz-date"><b>添加</b> {{ fmtTime(c.addtime) }}</span>
              <span v-if="!c.addtime" class="jmz-date jmz-date--muted">日期未收录</span>
            </template>
          </CatalogCard>
        </div>
      </div>
    </div>
    <div v-if="total > 0" class="jmz-catalog-footer">
      <n-pagination
          v-model:page="filters.page"
          v-model:page-size="filters.pageSize"
          :page-count="Math.ceil(total / filters.pageSize)"
          :page-sizes="[10, 20, 30, 40, 50]"
          :show-size-picker="true"
          :simple="false"
      />
    </div>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" :fetch-remote="false" />
</template>

<style scoped>

.jmz-catalog {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-catalog-header {
  flex-shrink: 0;
  margin: 12px;
  background: #1e1e22;
  position: relative;
}
.jmz-cat-bar-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  background: rgba(46, 46, 53, 0.4);
  border-radius: 2px;
  overflow: hidden;
}
.jmz-cat-bar-fill {
  height: 100%;
  width: 25%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6);
  background-size: 200% 100%;
  animation: jmz-cat-bar-slide 1s linear infinite;
}
@keyframes jmz-cat-bar-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
.jmz-cat-bar-indicator {
  margin-top: 10px;
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
}
.jmz-filter-body {
  display: flex;
}
.jmz-filter-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.jmz-search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.jmz-search-row > * {
  flex: 1;
  min-width: 0;
}
.jmz-search-row .n-checkbox {
  flex: none;
  white-space: nowrap;
  min-width: 80px;
  justify-content: center;
}
.jmz-sort-row .n-button {
  min-width: 80px;
}
.jmz-sort-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}
.jmz-filter-fetch {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding-right: 16px;
  margin-right: 16px;
  justify-content: center;
}
.jmz-filter-fetch .n-input {
  width: 100%;
}


.jmz-catalog-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
}

.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
}
.jmz-card-grid,
.jmz-skel-grid {
  display: grid;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 640px) {
  .jmz-card-grid,
  .jmz-skel-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 900px) {
  .jmz-card-grid,
  .jmz-skel-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1200px) {
  .jmz-card-grid,
  .jmz-skel-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.jmz-skel-card {
  cursor: default;
  pointer-events: none;
}
.jmz-skel-cover {
  aspect-ratio: 3 / 4;
  background: linear-gradient(90deg, #2a2a30 0%, #35353d 50%, #2a2a30 100%);
  background-size: 200% 100%;
  animation: jmz-shimmer 1.1s ease-in-out infinite;
}
.jmz-skel-lines {
  height: 72px;
  margin: 12px 14px 14px;
  border-radius: 8px;
  background: #2a2a30;
}
@keyframes jmz-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.jmz-card {
  width: 100%;
  min-width: 0;
  max-width: none;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: linear-gradient(180deg, #22222a 0%, #1a1a20 100%);
  border: 1px solid #2e2e35;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 12px 28px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  cursor: pointer;
  outline: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.jmz-card.tone-1 { border-left-color: #3b82f6; }
.jmz-card.tone-2 { border-left-color: #8b5cf6; }
.jmz-card.tone-3 { border-left-color: #10b981; }
.jmz-card.tone-4 { border-left-color: #f59e0b; }
.jmz-card:hover,
.jmz-card:focus-visible {
  transform: translateY(-3px);
  border-color: #3d3d4a;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15), 0 18px 40px rgba(0, 0, 0, 0.4);
}

.jmz-card-cover-wrap {
  position: relative;
  aspect-ratio: 3 / 4;
  background: linear-gradient(160deg, #2a2a30 0%, #1a1a20 55%, #1c1c3a 100%);
  flex-shrink: 0;
  overflow: hidden;
}
.jmz-cover-spinner {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(16, 16, 20, 0.72);
  color: #6b9fff;
}
.jmz-card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  position: relative;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.28s ease;
}
.jmz-card-cover--show {
  opacity: 1;
}
.jmz-card-ribbon {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 4;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.95);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.jmz-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 9px 11px 11px;
  gap: 4px;
  min-height: 0;
}
.jmz-card-num {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #7a7a8a;
  letter-spacing: 0.02em;
}
.jmz-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  color: #e0e0e6;
  min-height: 2.7em;
  max-height: 2.7em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.jmz-card-author {
  font-size: 13px;
  color: #9b9bb4;
  font-weight: 600;
  min-height: 1.35em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jmz-card-author--muted {
  color: #6a6a7a;
  font-weight: 500;
}
.jmz-author-link { color: inherit; }
.jmz-author-sep { color: inherit; text-decoration: none; white-space: pre; }
.jmz-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  align-content: flex-start;
}
.jmz-card-dates {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #7a7a8a;
  min-height: 2.2em;
}
.jmz-date b {
  color: #9b9bb4;
  font-weight: 700;
}
.jmz-date--muted {
  color: #6a6a7a;
}
.jmz-card-foot {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #2e2e35;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #7a7a8a;
}
.jmz-card-kind {
  font-weight: 700;
  color: #9b9bb4;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jmz-card-pages {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #6a6a7a;
}
.jmz-catalog-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 12px;
}
</style>
