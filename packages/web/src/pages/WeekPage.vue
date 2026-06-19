<script setup lang="ts">
import { ref, shallowRef, reactive, nextTick, watch, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson, postJson } from '@/api'
import type { Comic } from '@/types'
import CardDownloadBtn from '@/components/CardDownloadBtn.vue'
import CardReadBtn from '@/components/CardReadBtn.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'

interface WeekCategory {
  id: string
  title: string
  time: string
}
interface WeekType {
  id: string
  title: string
}

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const fetching = ref<Record<number, boolean>>({})
const categories = shallowRef<WeekCategory[]>([])
const types = shallowRef<WeekType[]>([])
const activeCategory = ref('')
const activeType = ref('')
const list = shallowRef<Comic[]>([])
const total = ref(0)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })

const cachedList = shallowRef<Comic[]>([])
const cachedTotal = ref(0)
const cachedCategory = ref('')
const cachedType = ref('')
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
function metaOpen(id: number) { metaDialogNum.value = id; metaDialogShow.value = true }

const coverLoaded = reactive<Record<number, boolean>>({})

let _syncingUrl = false

// 从 URL 恢复参数
watch(() => route.query, (q) => {
  if (route.name !== 'week' || _syncingUrl) return
  const cat = String(q.category || '')
  const typ = String(q.type || '')
  if (!cat) return
  activeCategory.value = cat
  activeType.value = typ || ''
  if (!cachedList.value.length) loadComics()
}, { immediate: true })

function cardToneClass(index: number) { return `tone-${(index % 4) + 1}` }

function coverReady(id: number, cover?: string) {
  return cover && coverLoaded[id]
}
function onCoverLoad(id: number) {
  coverLoaded[id] = true
}
function onCoverErr(e: Event, id: number) {
  const img = e.target as HTMLImageElement
  if (img && !img.src.includes('data:')) img.src = ''
  coverLoaded[id] = true
}

onBeforeRouteLeave((_to, _from, next) => {
  if (list.value.length) {
    cachedList.value = list.value
    cachedTotal.value = total.value
    cachedCategory.value = activeCategory.value
    cachedType.value = activeType.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

onActivated(() => {
  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    total.value = cachedTotal.value
    activeCategory.value = cachedCategory.value
    activeType.value = cachedType.value
    syncUrl()
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else if (!categories.value.length) {
    loadWeekInfo()
  }
})

async function loadWeekInfo() {
  try {
    const j = await getJson('/week/info')
    if (!j.ok) throw new Error(j.message || '获取周信息失败')
    categories.value = j.categories || []
    const typeOrder = ['manga', 'hanman', 'another']
    types.value = (j.type || []).slice().sort((a: WeekType, b: WeekType) => {
      const ai = typeOrder.indexOf(a.id)
      const bi = typeOrder.indexOf(b.id)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
    if (categories.value.length && !activeCategory.value) {
      activeCategory.value = categories.value[0].id
      loadComics()
    }
  } catch (e: any) {
    message.error(e.message || '获取周信息失败')
  }
}

async function loadComics() {
  if (!activeCategory.value) return
  loading.value = true
  list.value = []
  coverLoaded.value = {}
  try {
    const params = new URLSearchParams({ categoryId: activeCategory.value })
    if (activeType.value) params.set('typeId', activeType.value)
    const j = await getJson(`/week/comics?${params}`)
    if (!j.ok) throw new Error(j.message || '获取失败')
    list.value = j.list || []
    total.value = j.total || 0
  } catch (e: any) {
    message.error(e.message || '获取每周必看失败')
  } finally {
    loading.value = false
  }
}

function syncUrl() {
  _syncingUrl = true
  try {
    const q: Record<string, string> = { category: activeCategory.value }
    if (activeType.value) q.type = activeType.value
    router.replace({ name: 'week', query: q })
  } catch {}
  _syncingUrl = false
}

function onCategoryChange(id: string) {
  activeCategory.value = id
  cachedList.value = []
  syncUrl()
  loadComics()
}

function onTypeClick(id: string) {
  const next = activeType.value === id ? '' : id
  activeType.value = next
  cachedList.value = []
  syncUrl()
  loadComics()
}


</script>

<template>
  <div class="jmz-page jmz-week-page">
    <div class="jmz-week-header">
      <section class="jmz-panel jmz-panel--pad jmz-week-bar">
      <div class="jmz-week-bar-track-wrap">
      <div class="jmz-week-categories">
        <n-select
          v-model:value="activeCategory"
          :options="categories.map(c => ({ label: c.time, value: c.id }))"
          :disabled="loading"
          :loading="loading"
          @update:value="onCategoryChange"
        />
      </div>
      <div v-if="types.length" class="jmz-week-types">
        <button
          v-for="t in types"
          :key="t.id"
          class="jmz-week-type-btn"
          :class="{ 'jmz-week-type-btn--active': t.id === activeType }"
          :disabled="loading"
          @click="onTypeClick(t.id)"
        >
          {{ t.title }}
        </button>
      </div>
      <div v-if="loading" class="jmz-week-bar-track"><div class="jmz-week-bar-fill" /></div>
      </div>
      <div v-if="loading" class="jmz-week-bar-indicator">加载中...</div>
    </section>
    </div>

    <div class="jmz-week-main" ref="mainScrollRef">
      <n-empty v-if="!loading && !list.length" description="该期暂无内容" />
      <div v-else class="jmz-card-grid-wrap">
        <div v-if="loading" class="jmz-card-grid jmz-skel-grid" aria-hidden="true">
          <div v-for="i in 10" :key="'sk' + i" :class="['jmz-card', 'jmz-skel-card', cardToneClass(i - 1)]">
            <div class="jmz-skel-cover" />
            <div class="jmz-skel-lines" />
          </div>
        </div>
        <div v-else class="jmz-card-grid">
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

    <div v-if="total > 0" class="jmz-week-footer">
      <div class="jmz-week-info">共 {{ total }} 条</div>
    </div>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" />
</template>

<style scoped>
.jmz-week-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-week-header {
  flex-shrink: 0;
  margin: 12px;
  position: relative;
}
.jmz-week-bar-track-wrap {
  position: relative;
}
.jmz-week-bar-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 3px;
  background: rgba(46, 46, 53, 0.4);
  border-radius: 2px;
  overflow: hidden;
}
.jmz-week-bar-fill {
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
.jmz-week-bar-indicator {
  margin-top: 10px;
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
}
.jmz-week-categories {
  margin-bottom: 12px;
}

.jmz-week-types {
  display: flex;
  gap: 6px;
}

.jmz-week-type-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(46, 46, 53, 0.7);
  background: transparent;
  color: #9b9bb4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.jmz-week-type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.jmz-week-type-btn:hover {
  background: rgba(46, 46, 53, 0.8);
  color: #c4c4d6;
}
.jmz-week-type-btn--active {
  background: #1a5cdb;
  color: #fff;
}

.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
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

.jmz-week-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
}

.jmz-week-footer {
  flex-shrink: 0;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
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
