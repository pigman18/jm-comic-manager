<template>
  <div class="jmz-page jmz-serial-page">
    <div class="jmz-serial-header">
      <section class="jmz-panel jmz-panel--pad jmz-serial-bar">
        <div class="jmz-serial-days">
          <button
            v-for="s in sections"
            :key="s.id"
            class="jmz-serial-day-btn"
            :class="{ 'jmz-serial-day-btn--active': s.id === activeId }"
            :disabled="loading"
            @click="onSectionClick(s.id)"
          >{{ s.title }}</button>
          <div v-if="loadingSections" class="jmz-section-loading">加载推广列表...</div>
        </div>
        <div v-if="loading" class="jmz-cat-bar-track"><div class="jmz-cat-bar-fill" /></div>
        <div v-if="loading" class="jmz-cat-bar-indicator">加载中...</div>
      </section>
    </div>

    <div class="jmz-serial-main" ref="mainScrollRef">
      <n-empty v-if="!loading && !list.length" description="暂无内容" />
      <div v-else class="jmz-card-grid-wrap">
        <div v-if="loading" class="jmz-card-grid jmz-skel-grid" aria-hidden="true">
          <div v-for="i in 10" :key="'sk' + i" :class="['jmz-card', 'jmz-skel-card', cardToneClass(i - 1)]">
            <div class="jmz-skel-cover" />
            <div class="jmz-skel-lines" />
          </div>
        </div>
        <div v-else class="jmz-card-grid">
          <ComicCard
            v-for="(c, i) in list"
            :key="c.id"
            :comic="c"
            :tone-class="cardToneClass(i)"
            :fetching="!!fetching[c.id]"
            :cover-ready="coverReady(c.id, c.cover)"
            :meta-open="metaOpen"
            :filter-by-author="filterByAuthor"
            :on-cover-load="() => onCoverLoad(c.id)"
            :on-cover-err="(ev) => onCoverErr(ev, c.id)"
          >
            <template #footer>
              <span v-if="c.total_views" class="jmz-card-pages">{{ c.total_views }}次</span>
              <span v-if="c.likes" class="jmz-card-pages">{{ c.likes }}❤</span>
            </template>
          </ComicCard>
        </div>
      </div>
    </div>

    <div v-if="pages > 0 && list.length > 0" class="jmz-pager-footer">
      <div class="jmz-pager-pagination">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pages"
          :show-size-picker="false"
          :disabled="loading"
          @update:page="doPage"
          size="small"
        />
      </div>
      <div v-if="total > 0" class="jmz-pager-info">共 {{ total }} 条</div>
    </div>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" />
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, computed, nextTick, watch, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson } from '@/api'
import type { Comic } from '@/types'
import ComicCard from '@/components/ComicCard.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'

interface Section { id: string; title: string }

const PAGE_SIZE = 27

const router = useRouter()
const route = useRoute()
const message = useMessage()

const sections = ref<Section[]>([])
const loadingSections = ref(false)
const loading = ref(false)
const fetching = ref<Record<number, boolean>>({})
const list = shallowRef<Comic[]>([])
const activeId = ref('')
const currentPage = ref(1)
const total = ref(0)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })

const cachedList = shallowRef<Comic[]>([])
const cachedId = ref('')
const cachedPage = ref(1)
const cachedTotal = ref(0)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
function metaOpen(id: number) { metaDialogNum.value = id; metaDialogShow.value = true }
function filterByAuthor(name: string, ev?: Event) { ev?.stopPropagation?.(); const a = String(name || '').trim(); if (!a) return; router.push({ name: 'catalog', query: { author: a, page: '1' } }) }

const coverLoaded = reactive<Record<number, boolean>>({})
const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

let _syncingUrl = false

watch(() => route.query, (q) => {
  if (route.name !== 'promote-list' || _syncingUrl) return
  const id = String(q.id || '')
  if (id) {
    activeId.value = id
    if (!cachedList.value.length) {
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
    cachedList.value = [...list.value]
    cachedId.value = activeId.value
    cachedPage.value = currentPage.value
    cachedTotal.value = total.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

let _firstActivation = true

onActivated(() => {
  const q = route.query
  const id = String(q.id || '')

  if (id) {
    if (_firstActivation) { _firstActivation = false; return }
    activeId.value = id
    cachedList.value = []
    syncUrl()
    loadComics()
    return
  }

  if (_firstActivation) {
    _firstActivation = false
    if (sections.value.length && !cachedList.value.length) {
      activeId.value = sections.value[0].id
      syncUrl()
      loadComics()
    }
    return
  }

  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    activeId.value = cachedId.value
    currentPage.value = cachedPage.value
    total.value = cachedTotal.value
    syncUrl()
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else {
    loadComics()
  }
})

function syncUrl() {
  _syncingUrl = true
  router.replace({ name: 'promote-list', query: { id: activeId.value } }).catch(() => {}).finally(() => { _syncingUrl = false })
}

async function loadSections() {
  loadingSections.value = true
  try {
    const j = await getJson('/promote/sections')
    if (j.ok && j.list) {
      sections.value = j.list
      if (!activeId.value && j.list.length) {
        activeId.value = j.list[0].id
        if (!cachedList.value.length) {
          syncUrl()
          loadComics()
        }
      }
    }
  } catch {
    // fallback
  } finally {
    loadingSections.value = false
  }
}

async function loadComics() {
  loading.value = true
  list.value = []
  coverLoaded.value = {}
  try {
    const j = await getJson(`/promote/list?id=${activeId.value}&page=${currentPage.value}`)
    if (!j.ok) throw new Error(j.msg || j.message || '获取失败')
    list.value = j.list || []
    total.value = j.total || 0
  } catch (e: any) {
    message.error(e.message || '获取推广列表失败')
  } finally {
    loading.value = false
  }
}

function doPage(p: number) {
  currentPage.value = p
  mainScrollRef.value?.scrollTo({ top: 0 })
  loadComics()
}

function onSectionClick(id: string) {
  if (id === activeId.value) return
  activeId.value = id
  currentPage.value = 1
  cachedList.value = []
  syncUrl()
  loadComics()
}

loadSections()
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
  margin: 12px;
}

.jmz-serial-bar {
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
.jmz-serial-days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.jmz-serial-day-btn {
  padding: 6px 12px;
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
  padding: 0 12px;
}

.jmz-card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
}

.jmz-section-loading {
  font-size: 13px;
  color: #7a7a8a;
  padding: 6px 0;
}
</style>
