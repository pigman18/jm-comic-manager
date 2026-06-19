<template>
  <div class="jmz-page jmz-serial-page">
    <div class="jmz-serial-header">
      <section class="jmz-panel jmz-panel--pad jmz-serial-bar">
        <div class="jmz-serial-days">
          <button
            v-for="d in dayOptions"
            :key="d.value"
            class="jmz-serial-day-btn"
            :class="{ 'jmz-serial-day-btn--active': d.value === activeDay }"
            :disabled="loading"
            @click="onDayClick(d.value)"
          >{{ d.label }}</button>
        </div>
      </section>
    </div>

    <div class="jmz-serial-main" ref="mainScrollRef">
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
            @click="goDetail(c)"
            @keyup.enter="goDetail(c)"
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
            </div>
            <div class="jmz-card-body">
              <div class="jmz-card-num">JM{{ c.id }}</div>
              <h2 class="jmz-card-title xxx-text">{{ c.name }}</h2>
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

    <div v-if="total > 0" class="jmz-serial-footer">
      <div class="jmz-serial-info">共 {{ total }} 条</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, computed, nextTick, watch, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson, postJson } from '@/api'
import type { Comic } from '@/types'

interface DayOption { label: string; value: number }

const dayOptions: DayOption[] = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
  { label: '已完结', value: 0 },
]

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const fetching = ref<Record<number, boolean>>({})
const list = shallowRef<Comic[]>([])
const activeDay = ref(0)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })

const cachedList = shallowRef<Comic[]>([])
const cachedDay = ref(0)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const coverLoaded = reactive<Record<number, boolean>>({})
const total = computed(() => list.value.length)

let _syncingUrl = false
let _loaded = false

watch(() => route.query, (q) => {
  if (route.name !== 'serial' || _syncingUrl) return
  const d = parseInt(String(q.day || ''), 10)
  if (Number.isFinite(d)) {
    activeDay.value = d
    if (!cachedList.value.length) {
      _loaded = true
      loadComics()
    }
  }
}, { immediate: true })

function cardToneClass(index: number) { return `tone-${(index % 4) + 1}` }

function coverReady(id: number, cover?: string) { return cover && coverLoaded[id] }
function onCoverLoad(id: number) { coverLoaded[id] = true }
function onCoverErr(e: Event, id: number) {
  const img = e.target as HTMLImageElement
  if (img && !img.src.includes('data:')) img.src = ''
  coverLoaded[id] = true
}

onBeforeRouteLeave((_to, _from, next) => {
  if (list.value.length) {
    cachedList.value = list.value
    cachedDay.value = activeDay.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

onActivated(() => {
  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    activeDay.value = cachedDay.value
    syncUrl()
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else if (!_loaded) {
    _loaded = true
    loadComics()
  }
})

function syncUrl() {
  _syncingUrl = true
  try { router.replace({ name: 'serial', query: { day: String(activeDay.value) } }) } catch {}
  _syncingUrl = false
}

async function loadComics() {
  loading.value = true
  list.value = []
  coverLoaded.value = {}
  try {
    const j = await getJson(`/serial/comics?day=${activeDay.value}`)
    if (!j.ok) throw new Error(j.message || '获取失败')
    list.value = j.list || []
  } catch (e: any) {
    message.error(e.message || '获取每日连载失败')
  } finally {
    loading.value = false
  }
}

function onDayClick(day: number) {
  if (day === activeDay.value) return
  activeDay.value = day
  cachedList.value = []
  syncUrl()
  loadComics()
}

async function goDetail(c: Comic) {
  if (!c.id) return
  fetching.value = { ...fetching.value, [c.id]: true }
  try {
    const j = await postJson(`/comics/${c.id}/fetch-meta`)
    if (!j.ok) throw new Error(j.message || '获取信息失败')
    router.push({ name: 'detail', params: { num: String(c.id) }, query: { from: 'serial' } })
  } catch (e: any) {
    message.error(e.message || '获取信息失败')
  } finally {
    fetching.value = { ...fetching.value, [c.id]: false }
  }
}
</script>

<style scoped>
.jmz-serial-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-serial-header {
  flex-shrink: 0;
  margin: 12px 16px;
}

.jmz-serial-bar {
  position: relative;
}
.jmz-serial-days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.jmz-serial-day-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(46, 46, 53, 0.7);
  background: transparent;
  color: #9b9bb4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.jmz-serial-day-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.jmz-serial-day-btn:hover {
  background: rgba(46, 46, 53, 0.8);
  color: #c4c4d6;
}
.jmz-serial-day-btn--active {
  background: #1a5cdb;
  color: #fff;
}

.jmz-serial-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px;
}

.jmz-serial-footer {
  flex-shrink: 0;
  padding: 12px 16px 20px;
  display: flex;
  justify-content: center;
}

.jmz-serial-info {
  text-align: center;
  font-size: 13px;
  color: #7a7a8a;
}

.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
  margin-top: 12px;
}
.jmz-list-reload-mask {
  position: absolute;
  inset: 0;
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
