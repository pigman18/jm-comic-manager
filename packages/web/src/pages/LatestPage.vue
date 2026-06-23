<template>
  <div class="jmz-page jmz-latest-page">
    <div class="jmz-latest-main" ref="mainScrollRef" @scroll="onScroll">
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
        <div v-if="loadingMore" class="jmz-latest-more-indicator">加载中...</div>
        <div v-if="noMore && list.length > 0" class="jmz-latest-more-indicator jmz-latest-more-end">没有更多了</div>
      </div>
    </div>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" />
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, watch, nextTick, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson } from '@/api'
import type { Comic } from '@/types'
import ComicCard from '@/components/ComicCard.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const fetching = ref<Record<number, boolean>>({})
const list = shallowRef<Comic[]>([])
const page = ref(1)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })

const cachedList = shallowRef<Comic[]>([])
const cachedPage = ref(1)
const cachedNoMore = ref(false)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
function metaOpen(id: number) { metaDialogNum.value = id; metaDialogShow.value = true }
function filterByAuthor(name: string, ev?: Event) { ev?.stopPropagation?.(); const a = String(name || '').trim(); if (!a) return; router.push({ name: 'catalog', query: { author: a, page: '1' } }) }

const coverLoaded = reactive<Record<number, boolean>>({})

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
    cachedPage.value = page.value
    cachedNoMore.value = noMore.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

let _firstActivation = true

onActivated(() => {
  if (_firstActivation) {
    _firstActivation = false
    if (!cachedList.value.length) loadFirstPage()
    return
  }

  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    page.value = cachedPage.value
    noMore.value = cachedNoMore.value
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else {
    loadFirstPage()
  }
})

function onScroll() {
  const el = mainScrollRef.value
  if (!el || loadingMore.value || noMore.value || loading.value) return
  const threshold = 300
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
    loadMore()
  }
}

async function loadFirstPage() {
  page.value = 1
  noMore.value = false
  loading.value = true
  list.value = []
  coverLoaded.value = {}
  try {
    const j = await getJson(`/latest/comics?page=1`)
    if (!j.ok) throw new Error(j.message || '获取失败')
    const items = j.list || []
    list.value = items
    if (!items.length) noMore.value = true
  } catch (e: any) {
    message.error(e.message || '获取最新发布失败')
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || noMore.value) return
  const nextPage = page.value + 1
  loadingMore.value = true
  try {
    const j = await getJson(`/latest/comics?page=${nextPage}`)
    if (!j.ok) throw new Error(j.message || '获取失败')
    const items = j.list || []
    if (items.length) {
      list.value = [...list.value, ...items]
      page.value = nextPage
    } else {
      noMore.value = true
    }
  } catch (e: any) {
    message.error(e.message || '加载更多失败')
  } finally {
    loadingMore.value = false
  }
}
</script>

<style scoped>
.jmz-latest-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-latest-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.jmz-latest-more-indicator {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: #7a7a8a;
}
.jmz-latest-more-end {
  color: #5a5a6a;
}

.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
}
</style>
