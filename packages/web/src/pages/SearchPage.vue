<script setup lang="ts">
import { ref, shallowRef, reactive, onActivated, watch, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { buildQuery, getJson, postJson } from '@/api'
import type { Comic } from '@/types'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const keyword = ref('')
const sort = ref('mr')
const loading = ref(false)
const fetching = ref<Record<number, boolean>>({})
const list = shallowRef<Comic[]>([])
const total = ref(0)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })
const pages = ref(0)
const currentPage = ref(1)

const cachedList = shallowRef<Comic[]>([])
const cachedTotal = ref(0)
const cachedPages = ref(0)
const lastKw = ref('')
const scrollTop = ref(0)

let _syncingUrl = false
// 从 URL 恢复搜索参数
watch(() => route.query, (q) => {
  if (route.name !== 'search' || _syncingUrl) return
  const kw = String(q.keyword || '').trim()
  if (!kw) return
  keyword.value = kw
  sort.value = String(q.sort || 'mr')
  currentPage.value = Math.max(1, parseInt(String(q.page || '1'), 10) || 1)
  // 关键字不同时忽略缓存，重新搜索
  if (kw !== lastKw.value) {
    cachedList.value = []
    doSearch(currentPage.value)
  } else if (!cachedList.value.length) {
    doSearch(currentPage.value)
  }
}, { immediate: true })

// 离开前保存滚动位置和列表
onBeforeRouteLeave((_to, _from, next) => {
  if (list.value.length) {
    cachedList.value = list.value
    cachedTotal.value = total.value
    cachedPages.value = pages.value
    scrollTop.value = window.scrollY || 0
  }
  next()
})

// 从 keep-alive 恢复
onActivated(() => {
  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    total.value = cachedTotal.value
    pages.value = cachedPages.value
    _syncingUrl = true
    try { router.replace({ name: 'search', query: { keyword: keyword.value, sort: sort.value, page: String(currentPage.value) } }) } catch {}
    _syncingUrl = false
    setTimeout(() => window.scrollTo(0, scrollTop.value), 0)
  }
})

function cardToneClass(index: number) { return `tone-${(index % 4) + 1}` }

const sortOptions = [
  { label: '最新的', value: 'mr' },
  { label: '最多点阅的', value: 'mv' },
  { label: '最多图片', value: 'mp' },
  { label: '最多爱心', value: 'tf' },
]

async function doSearch(page?: number) {
  const kw = keyword.value.trim()
  if (!kw) return
  lastKw.value = kw
  const p = page ?? currentPage.value
  currentPage.value = p
  // 写 URL 便于恢复
  _syncingUrl = true
  try { router.replace({ name: 'search', query: { keyword: kw, sort: sort.value, page: String(p) } }) } catch {}
  _syncingUrl = false
  // 新搜索时清缓存
  cachedList.value = []
  loading.value = true
  list.value = []
  total.value = 0
  pages.value = 0
  try {
    const j = await getJson(`/search/comics${buildQuery({ keyword: kw, sort: sort.value, page: p })}`)
    if (!j.ok) throw new Error(j.message || '搜索失败')
    list.value = j.list || []
    total.value = j.total || 0
    pages.value = j.pages || 1
  } catch (e: any) {
    message.error(e.message || '搜索失败')
  } finally {
    loading.value = false
  }
}

async function goDetail(c: Comic) {
  if (!c.id) return
  fetching.value = { ...fetching.value, [c.id]: true }
  try {
    const j = await postJson(`/comics/${c.id}/fetch-meta`)
    if (!j.ok) throw new Error(j.message || '获取信息失败')
    router.push({ name: 'detail', params: { num: String(c.id) }, query: { from: 'search' } })
  } catch (e: any) {
    message.error(e.message || '获取信息失败')
  } finally {
    fetching.value = { ...fetching.value, [c.id]: false }
  }
}

const coverLoaded = reactive<Record<number, boolean>>({})

function coverReady(id: number, cover?: string) {
  return cover && coverLoaded[id]
}

function onCoverLoad(id: number) {
  coverLoaded[id] = true
}

function onCoverErr(e: Event, id: number) {
  const img = e.target as HTMLImageElement
  if (img && !img.src.includes('data:')) {
    img.src = ''
  }
  coverLoaded[id] = true
}
</script>

<template>
  <div class="jmz-page jmz-search-page">
    <section class="jmz-panel jmz-panel--pad jmz-search-bar">
      <div class="jmz-search-row">
        <n-input
          v-model:value="keyword"
          clearable
          placeholder="输入关键词搜索"
          :disabled="loading"
          @keyup.enter="doSearch(1)"
        >
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-select
          v-model:value="sort"
          :options="sortOptions"
          class="jmz-search-sort"
          :disabled="loading"
        />
        <n-button type="primary" :loading="loading" :disabled="loading" @click="doSearch(1)">搜索</n-button>
      </div>
    </section>

    <div class="jmz-search-main">
      <n-empty v-if="!loading && !list.length && keyword.trim()" description="未找到相关漫画" />
      <n-empty v-else-if="!loading && !list.length" description="输入关键词开始搜索" />
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
            <div v-show="!coverReady(c.id, c.cover) && !fetching[c.id]" class="jmz-cover-spinner" aria-hidden="true">
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
            <div class="jmz-card-tags" aria-label="标签">
              <span
                v-for="t in (c.tags || []).slice(0, 5)"
                :key="t"
                class="jmz-chip xxx-text"
              >{{ t }}</span>
              <span v-if="(c.tags || []).length > 5" class="jmz-chip jmz-chip--more">+{{ (c.tags || []).length - 5 }}</span>
              <span v-if="!c.tags || !c.tags.length" class="jmz-chip jmz-chip--ghost">无标签</span>
            </div>
            <div class="jmz-card-foot">
              <span v-if="c.displayKindLabel" class="jmz-card-kind">{{ c.displayKindLabel }}</span>
              <span v-if="c.total_views" class="jmz-card-pages">{{ c.total_views }}次</span>
              <span v-if="c.likes" class="jmz-card-pages">{{ c.likes }}❤</span>
              <span v-if="c.updateDate" class="jmz-card-date">{{ c.updateDate }}</span>
            </div>
          </div>
        </article>
      </div>
      </div>
      <div v-if="pages > 1" class="jmz-search-pager">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pages"
          :show-size-picker="false"
          :disabled="loading"
          @update:page="doSearch"
        />
      </div>
      <div v-if="total > 0" class="jmz-search-info">
        共 {{ total }} 条结果
      </div>
    </div>
  </div>
</template>

<style scoped>
.jmz-search-page {
}

.jmz-card-grid-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 200px;
  margin-top: 16px;
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

.jmz-search-bar {
  margin-bottom: 16px;
}

.jmz-search-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.jmz-search-row > :first-child {
  flex: 1;
}

.jmz-search-sort {
  width: 130px;
}

.jmz-search-main {
  min-height: 200px;
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

.jmz-card-kind {
  color: #8b8be0;
  font-weight: 600;
}

.jmz-card-pages {
  font-variant-numeric: tabular-nums;
}

.jmz-card-date {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.jmz-search-pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.jmz-search-info {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
  color: #7a7a8a;
}


</style>
