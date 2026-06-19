<script setup lang="ts">
import { ref, shallowRef, reactive, computed, nextTick, watch, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson, postJson } from '@/api'
import type { Comic } from '@/types'
import CardDownloadBtn from '@/components/CardDownloadBtn.vue'
import CardReadBtn from '@/components/CardReadBtn.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'

interface BlockItem {
  title: string
  content: string[]
}
interface CatItem {
  id: string | number
  name: string
  slug: string
}

const router = useRouter()
const route = useRoute()
const message = useMessage()

const categories = shallowRef<CatItem[]>([])
const blocks = shallowRef<BlockItem[]>([])
const activeTab = ref('')
const loading = ref(false)
const infoLoading = ref(false)
const fetching = ref<Record<number, boolean>>({})
const list = shallowRef<Comic[]>([])
const total = ref(0)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })
const pages = ref(0)
const currentPage = ref(1)
const timeFilter = ref('a')
const sortFilter = ref('mv')

const cachedList = shallowRef<Comic[]>([])
const cachedTotal = ref(0)
const cachedPages = ref(0)
const cachedTab = ref('')
const cachedTime = ref('a')
const cachedSort = ref('mv')
const cachedPageNum = ref(1)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
function metaOpen(id: number) { metaDialogNum.value = id; metaDialogShow.value = true }

const coverLoaded = reactive<Record<number, boolean>>({})

const tabOptions = computed(() => [
  { label: '分类', value: '_blocks' },
  ...categories.value.map(c => ({ label: c.name, value: String(c.id) }))
])

function cardToneClass(index: number) { return `tone-${(index % 4) + 1}` }
function coverReady(id: number, cover?: string) { return cover && coverLoaded[id] }
function onCoverLoad(id: number) { coverLoaded[id] = true }
function onCoverErr(e: Event, id: number) {
  const img = e.target as HTMLImageElement
  if (img && !img.src.includes('data:')) img.src = ''
  coverLoaded[id] = true
}

const timeOptions = [
  { label: '全部', value: 'a' },
  { label: '今天', value: 't' },
  { label: '本周', value: 'w' },
  { label: '本月', value: 'm' },
]
const sortOptions = [
  { label: '最新', value: 'mr' },
  { label: '最多观看', value: 'mv' },
  { label: '最多图片', value: 'mp' },
  { label: '总排行', value: 'tr' },
  { label: '最多评论', value: 'md' },
  { label: '最多爱心', value: 'tf' },
]

let _syncingUrl = false

watch(() => route.query, (q) => {
  if (route.name !== 'category' || _syncingUrl) return
  const tab = String(q.tab || '')
  if (!tab) return
  activeTab.value = tab
  currentPage.value = Math.max(1, parseInt(String(q.page || '1'), 10) || 1)
  timeFilter.value = String(q.time || 'a').slice(0, 1) || 'a'
  sortFilter.value = String(q.sort || 'mv')
  if (tab !== '_blocks' && !cachedList.value.length) loadCategory()
}, { immediate: true })

onBeforeRouteLeave((_to, _from, next) => {
  if (list.value.length) {
    cachedList.value = list.value
    cachedTotal.value = total.value
    cachedPages.value = pages.value
    cachedTab.value = activeTab.value
    cachedTime.value = timeFilter.value
    cachedSort.value = sortFilter.value
    cachedPageNum.value = currentPage.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

onActivated(() => {
  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    total.value = cachedTotal.value
    pages.value = cachedPages.value
    activeTab.value = cachedTab.value
    timeFilter.value = cachedTime.value
    sortFilter.value = cachedSort.value
    currentPage.value = cachedPageNum.value
    syncUrl()
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else if (!categories.value.length) {
    loadInfo()
  }
})

async function loadInfo() {
  infoLoading.value = true
  try {
    const j = await getJson('/category/info')
    if (!j.ok) throw new Error(j.message || '获取分类失败')
    categories.value = j.categories || []
    blocks.value = j.blocks || []
    if (!activeTab.value) {
      activeTab.value = tabOptions.value[0]?.value || ''
      syncUrl()
    }
    // URL 指定了 tab 且非 blocks 时，补发分类请求
    if (activeTab.value && activeTab.value !== '_blocks') {
      loadCategory()
    }
  } catch (e: any) {
    message.error(e.message || '获取分类信息失败')
  } finally {
    infoLoading.value = false
  }
}

function syncUrl() {
  _syncingUrl = true
  try {
    const q: Record<string, string> = { tab: activeTab.value }
    if (activeTab.value !== '_blocks') {
      q.page = String(currentPage.value)
      q.time = timeFilter.value
      q.sort = sortFilter.value
    }
    router.replace({ name: 'category', query: q })
  } catch {}
  _syncingUrl = false
}

function onTabClick(val: string) {
  if (val === activeTab.value) return
  activeTab.value = val
  cachedList.value = []
  currentPage.value = 1
  syncUrl()
  if (val !== '_blocks') loadCategory()
}

function onTagClick(tag: string) {
  router.push({ name: 'search', query: { keyword: tag } })
}

async function loadCategory(p?: number) {
  const tab = activeTab.value
  if (tab === '_blocks' || !tab) return
  const cat = categories.value.find(c => String(c.id) === tab)
  if (!cat) return
  const pg = p ?? currentPage.value
  currentPage.value = pg
  loading.value = true
  list.value = []
  coverLoaded.value = {}
  syncUrl()
  try {
    const params = new URLSearchParams({ page: String(pg), time: timeFilter.value, slug: cat.slug, sort: sortFilter.value })
    const j = await getJson(`/category/filter?${params}`)
    if (!j.ok) throw new Error(j.message || '获取失败')
    list.value = j.list || []
    total.value = j.total || 0
    pages.value = j.pages || 1
  } catch (e: any) {
    message.error(e.message || '获取分类内容失败')
  } finally {
    loading.value = false
  }
}

function onTimeChange() { cachedList.value = []; currentPage.value = 1; loadCategory() }
function onSortChange() { cachedList.value = []; currentPage.value = 1; loadCategory() }


</script>

<template>
  <div class="jmz-page jmz-cat-page">
    <div v-if="infoLoading && !categories.length" class="jmz-cat-init-loading">
      <n-spin size="medium" />
      <span>加载中...</span>
    </div>
    <template v-else>
    <div class="jmz-cat-header">
      <section class="jmz-panel jmz-panel--pad jmz-cat-bar" :class="{ 'jmz-cat-bar--loading': loading }">
        <div class="jmz-cat-tabs">
          <button
            v-for="t in tabOptions"
            :key="t.value"
            class="jmz-cat-tab"
            :class="{ 'jmz-cat-tab--active': t.value === activeTab }"
            :disabled="loading"
            @click="onTabClick(t.value)"
          >{{ t.label }}</button>
        </div>
        <div v-if="loading" class="jmz-cat-bar-track"><div class="jmz-cat-bar-fill" /></div>
        <div v-if="loading" class="jmz-cat-bar-indicator">加载中...</div>
      </section>
      <section v-if="activeTab && activeTab !== '_blocks'" class="jmz-panel jmz-panel--pad jmz-cat-filter-bar">
        <div class="jmz-cat-filter-row">
          <n-select v-model:value="timeFilter" :options="timeOptions" class="jmz-cat-filter-select" @update:value="onTimeChange" />
          <n-select v-model:value="sortFilter" :options="sortOptions" class="jmz-cat-filter-select" @update:value="onSortChange" />
        </div>
      </section>
    </div>

    <div class="jmz-cat-main" ref="mainScrollRef">
      <section v-if="activeTab === '_blocks'" class="jmz-panel jmz-panel--pad jmz-cat-blocks">
        <div v-for="b in blocks" :key="b.title" class="jmz-cat-block">
          <h3 class="jmz-cat-block-title">{{ b.title }}</h3>
          <div class="jmz-cat-block-tags">
            <span
              v-for="tag in b.content"
              :key="tag"
              class="jmz-chip jmz-chip--click"
              @click="onTagClick(tag)"
            >{{ tag }}</span>
          </div>
        </div>
      </section>

      <template v-if="activeTab && activeTab !== '_blocks'">
        <div class="jmz-cat-cards">
          <n-empty v-if="!loading && !list.length" description="暂无内容" />
          <div
            v-else-if="list.length > 0 || loading"
            class="jmz-card-grid-wrap"
            :class="{ 'jmz-card-grid-wrap--dim': loading && list.length > 0 }"
          >
            <div v-if="loading && list.length > 0" class="jmz-list-reload-mask">
              <n-spin size="medium" />
            </div>
            <div v-if="loading && !list.length" class="jmz-card-grid jmz-skel-grid">
              <div v-for="i in 10" :key="'sk' + i" :class="['jmz-card', 'jmz-skel-card', cardToneClass(i - 1)]">
                <div class="jmz-skel-cover" />
                <div class="jmz-skel-lines" />
              </div>
            </div>
            <div v-if="list.length > 0" class="jmz-card-grid">
              <article
                v-for="(c, i) in list"
                :key="c.id"
                :class="['jmz-card', cardToneClass(i), fetching[c.id] ? 'jmz-card--fetching' : '']"
                role="button"
                tabindex="0"
                @click="metaOpen(c.id)"
                @keyup.enter="metaOpen(c.id)"
              >
                <div class="jmz-card-cover-wrap">
                  <div v-show="!coverReady(c.id, c.cover) && !fetching[c.id]" class="jmz-cover-spinner">
                    <n-spin size="small" />
                  </div>
                  <div v-if="fetching[c.id]" class="jmz-card-fetching-mask">
                    <n-spin size="small" />
                  </div>
                  <div v-if="c.inStore" class="jmz-card-ribbon">已收录</div>
                  <div v-else class="jmz-card-ribbon jmz-card-ribbon--new">未收录</div>
                  <span v-if="c.canRead" class="jmz-card-ribbon jmz-card-ribbon--read">可读</span>
                  <img
                    class="jmz-card-cover xxx-img"
                    :class="{ 'jmz-card-cover--show': coverReady(c.id, c.cover) }"
                    :src="c.cover || ''"
                    :alt="c.name"
                    loading="lazy"
                    width="240"
                    height="320"
                    @load="onCoverLoad(c.id)"
                    @error="onCoverErr($event, c.id)"
                  />
                  <CardDownloadBtn :comic="c" />
                  <CardReadBtn :comic="c" />
                </div>
                <div class="jmz-card-body">
                  <div class="jmz-card-num">JM{{ c.id }}</div>
                    <h2 class="jmz-card-title xxx-text" role="link" tabindex="0" @click.stop="metaOpen(c.id)" @keyup.enter.stop="metaOpen(c.id)">{{ c.name }}</h2>
                  <div v-if="c.author && c.author[0]" class="jmz-card-author">{{ c.author[0] }}</div>
                  <div v-else class="jmz-card-author jmz-card-author--muted">作者未知</div>
                  <div class="jmz-card-tags">
                    <span v-for="t in (c.tags || []).slice(0, 5)" :key="t" class="jmz-chip xxx-text">{{ t }}</span>
                    <span v-if="(c.tags || []).length > 5" class="jmz-chip jmz-chip--more">+{{ (c.tags || []).length - 5 }}</span>
                    <span v-if="!c.tags || !c.tags.length" class="jmz-chip jmz-chip--ghost">无标签</span>
                  </div>
                  <div class="jmz-card-foot">
                    <span v-if="c.total_views" class="jmz-card-pages">{{ c.total_views }}次</span>
                    <span v-if="c.likes" class="jmz-card-pages">{{ c.likes }}❤</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="activeTab && activeTab !== '_blocks'" class="jmz-cat-footer">
      <div class="jmz-cat-pager">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pages"
          :show-size-picker="false"
          :disabled="loading"
          @update:page="loadCategory"
        />
      </div>
      <div v-if="total > 0" class="jmz-cat-info">共 {{ total }} 条</div>
    </div>
    </template>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" />
</template>

<style scoped>
.jmz-cat-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-cat-init-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: #7a7a8a;
  font-size: 14px;
}

.jmz-cat-header {
  flex-shrink: 0;
  margin: 12px;
}

.jmz-cat-bar {
  position: relative;
}

.jmz-cat-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
}

.jmz-cat-footer {
  flex-shrink: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.jmz-cat-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  background: rgba(30, 30, 36, 0.6);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid rgba(46, 46, 53, 0.5);
}
.jmz-cat-bar--loading {
  opacity: 0.65;
  pointer-events: none;
}
.jmz-cat-bar-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(46, 46, 53, 0.3);
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
.jmz-cat-tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.jmz-cat-tab {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(46, 46, 53, 0.7);
  background: transparent;
  color: #9b9bb4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.jmz-cat-tab:hover {
  border-color: #3b3b45;
  color: #c4c4d6;
}
.jmz-cat-tab--active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

/* blocks */
.jmz-cat-blocks {
  margin-bottom: 12px;
}

.jmz-cat-block {
  background: rgba(26, 26, 32, 0.5);
  border: 1px solid rgba(46, 46, 53, 0.6);
  border-radius: 10px;
  padding: 14px 12px;
  margin-bottom: 12px;
}
.jmz-cat-block:last-child {
  margin-bottom: 0;
}

.jmz-cat-block-title {
  font-size: 14px;
  font-weight: 700;
  color: #b0b0c4;
  margin: 0 0 10px 0;
  letter-spacing: 0.03em;
}

.jmz-cat-block-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.jmz-cat-block-tags .jmz-chip {
  font-size: 12px;
  padding: 5px 11px;
  border-radius: 5px;
  background: rgba(42, 42, 50, 0.7);
  border-color: rgba(53, 53, 61, 0.6);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.jmz-cat-block-tags .jmz-chip--click:hover {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

/* filter bar */
.jmz-cat-filter-bar {
  margin-top: 12px;
}

.jmz-cat-filter-row {
  display: flex;
  gap: 8px;
}

.jmz-cat-filter-select {
  width: 180px;
}

/* main */
.jmz-cat-pager {
  display: flex;
  justify-content: center;
}

.jmz-cat-info {
  text-align: center;
  font-size: 13px;
  color: #7a7a8a;
}

/* shared card grid styles (same as other pages) */
.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
}
.jmz-list-reload-mask {
  position: fixed;
  left: 180px;
  right: 0;
  top: 44px;
  bottom: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 16, 20, 0.6);
  pointer-events: none;
}
.jmz-card-grid-wrap--dim {
  opacity: 0.65;
  pointer-events: none;
}
.jmz-skel-grid {
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
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
  border-radius: 8px 8px 0 0;
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

.jmz-card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
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
.jmz-card--fetching {
  opacity: 0.6;
  pointer-events: none;
}

.jmz-card-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #2a2a30;
}

.jmz-cover-spinner {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jmz-card-ribbon {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
  background: rgba(37, 99, 235, 0.85);
  color: #fff;
  pointer-events: none;
}
.jmz-card-ribbon--new {
  background: rgba(80, 80, 90, 0.75);
  color: #b0b0c0;
}
.jmz-card-ribbon--read {
  left: auto;
  right: 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.jmz-card-fetching-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 16, 20, 0.7);
}

.jmz-card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.25s;
}
.jmz-card-cover--show {
  opacity: 1;
}

.jmz-card-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.jmz-card-num {
  font-size: 11px;
  font-weight: 700;
  color: #7a7a8a;
  font-variant-numeric: tabular-nums;
}

.jmz-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #e0e0e6;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.jmz-card-author {
  font-size: 11px;
  color: #6b9fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jmz-card-author--muted {
  color: #6a6a7a;
}

.jmz-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.jmz-card-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: #7a7a8a;
  align-items: center;
}

.jmz-card-pages {
  font-variant-numeric: tabular-nums;
}
</style>
