<template>
  <div class="jmz-home" ref="homeRef">
    <div v-if="loading" class="jmz-home-loading">
      <n-spin size="large" />
    </div>
    <template v-else>
      <section v-for="sec in list" :key="sec.id" class="jmz-home-section">
        <div class="jmz-home-section-header">
          <span class="jmz-home-section-title xxx-text">{{ sec.title }}</span>
          <span v-if="sec.type === 'library' || sec.type === 'novels'" class="jmz-home-tag">暂未实现</span>
          <span v-else-if="sec.type === 'promote' && sec.filter_val" class="jmz-home-more xxx-text" role="link" tabindex="0" @click="goPromoteList(sec.filter_val)" @keyup.enter="goPromoteList(sec.filter_val)">查看更多→</span>
          <span v-else-if="sec.type === 'not_in_category_id' && sec.slug" class="jmz-home-more xxx-text" role="link" tabindex="0" @click="goCategory(sec.slug)" @keyup.enter="goCategory(sec.slug)">查看更多→</span>
          <span v-else-if="sec.type === 'category_id' && sec.slug" class="jmz-home-more xxx-text" role="link" tabindex="0" @click="goCategory(sec.slug)" @keyup.enter="goCategory(sec.slug)">查看更多→</span>
          <span v-else-if="sec.id === '26'" class="jmz-home-more xxx-text" role="link" tabindex="0" @click="goSerial" @keyup.enter="goSerial">查看更多→</span>
        </div>
        <div v-if="sec.type === 'library' || sec.type === 'novels'" class="jmz-home-placeholder">暂未实现</div>
        <div v-else class="jmz-home-card-row">
          <ComicCard
            v-for="c in sec.content"
            :key="c.id"
            :comic="c"
            :tone-class="cardToneClass($index)"
            :cover-ready="coverReady(c.id, c.cover)"
            :fetching="false"
            :meta-open="metaOpen"
            :filter-by-author="filterByAuthor"
            :on-cover-load="() => onCoverLoad(c.id)"
            :on-cover-err="(ev) => onCoverErr(ev, c.id)"
          >
            <template #footer>
              <span v-if="c.update_at" class="jmz-card-pages">{{ fmtTime(c.update_at) }}</span>
            </template>
          </ComicCard>
        </div>
      </section>
      <n-empty v-if="!list.length" description="暂无内容" />
    </template>
    <MetaPageDialog v-model:show="showMeta" :num="metaNum" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onActivated, inject, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson } from '@/api'
import ComicCard from '@/components/ComicCard.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'
import type { Comic } from '@/types'

const router = useRouter()
const message = useMessage()
const currentPageComics = inject<{ value: Comic[] }>('currentPageComics')

const list = ref<any[]>([])
const loading = ref(true)
const showMeta = ref(false)
const metaNum = ref(0)
const coverLoaded = reactive<Record<number, boolean>>({})
const coverErrored = reactive<Record<number, boolean>>({})

const dayNames = ['日', '一', '二', '三', '四', '五', '六']

function goSerial() {
  const d = new Date().getDay()
  router.push({ name: 'serial', query: { day: String(d || 7) } })
}

function goPromoteList(id: string) {
  router.push({ name: 'promote-list', query: { id } })
}

function goCategory(slug: string) {
  router.push({ name: 'category', query: { category: slug } })
}

function cardToneClass(index: number): string {
  const tones = ['jmz-card-tone-a', 'jmz-card-tone-b', 'jmz-card-tone-c', 'jmz-card-tone-d', 'jmz-card-tone-e']
  return tones[index % tones.length]
}

function metaOpen(id: number) {
  metaNum.value = id
  showMeta.value = true
}

function filterByAuthor(name: string, ev: Event) {
  ev?.stopPropagation?.()
  router.push({ name: 'search', query: { author: name } })
}

function onCoverLoad(id: number) {
  coverLoaded[id] = true
}

function onCoverErr(ev: Event, id: number) {
  coverErrored[id] = true
}

function coverReady(id: number, cover?: string): boolean {
  return !!cover && !!coverLoaded[id]
}

function fmtTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadData() {
  if (list.value.length) return
  loading.value = true
  try {
    const j = await getJson('/promote')
    if (j.ok) {
      list.value = j.list || []
    } else {
      message.error(j.message || '加载失败')
    }
  } catch (e: any) {
    message.error(String(e?.message || e))
  } finally {
    loading.value = false
  }
}

const homeRef = ref<HTMLElement | null>(null)
let _scrollTop = 0

onBeforeRouteLeave((_to, _from, next) => {
  _scrollTop = homeRef.value?.scrollTop || 0
  next()
})

onActivated(() => {
  if (!list.value.length) {
    loadData()
  } else {
    nextTick(() => {
      if (homeRef.value) homeRef.value.scrollTop = _scrollTop
    })
  }
})
</script>

<style scoped>
.jmz-home {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
.jmz-home-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
.jmz-home-section {
  margin-bottom: 24px;
}
.jmz-home-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.jmz-home-section-title {
  font-size: 16px;
  font-weight: 700;
  color: #e0e0e6;
}
.jmz-home-more {
  font-size: 12px;
  color: #7a7a8a;
  cursor: pointer;
  user-select: none;
}
.jmz-home-more:hover {
  color: #3b82f6;
}
.jmz-home-tag {
  font-size: 11px;
  color: #7a7a8a;
  background: #2a2a30;
  padding: 2px 8px;
  border-radius: 4px;
}
.jmz-home-placeholder {
  padding: 40px 0;
  text-align: center;
  color: #7a7a8a;
  font-size: 13px;
  border: 1px dashed #2e2e35;
  border-radius: 6px;
}
.jmz-home-card-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.jmz-home-card-row > :deep(.jmz-card) {
  width: 180px;
  flex-shrink: 0;
}
</style>
