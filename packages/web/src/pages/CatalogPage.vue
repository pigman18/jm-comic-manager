<script setup lang="ts">
import {
  reactive, ref, shallowRef, computed, watch, onMounted, onBeforeUnmount,
  onActivated, nextTick, inject, type Ref
} from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useMessage } from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';

import CatalogCard from '@/components/CatalogCard.vue';
import MetaPageDialog from '@/components/MetaPageDialog.vue';
import { buildQuery, getJson, postJson } from '@/api';

import { useJmLiveStore } from '@/stores/jmLive';
import { useBanStore } from '@/stores/ban';
import { useStarStore } from '@/stores/star';
import type { Comic } from '@/types';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const live = useJmLiveStore();
const { syncLocalToDb, syncDbToLocal } = storeToRefs(live);
const banStore = useBanStore();
const starStore = useStarStore();

const tagsOptions = ref<string[]>([]);
const tagsLoading = ref(false);
let tagsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const loading = ref(false);
const list = shallowRef<Comic[]>([]);
const total = ref(0);
const coverLoaded = reactive<Record<number, boolean>>({});

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics', ref<Comic[]>([]));

const scrollTop = ref(0);
const mainScrollRef = ref<HTMLElement | null>(null);

const cachedList = shallowRef<Comic[]>([]);
const cachedTotal = ref(0);

const metaDialogNum = ref(0);
const metaDialogShow = ref(false);
const metaOpen = (id: number): void => {
  metaDialogNum.value = id;
  metaDialogShow.value = true;
};

const filters = reactive({
  title: '',
  author: '',
  number: '',
  tags: [] as string[],
  kind: '',
  available: false,
  banned: false,
  starred: false,
  sort: 'update_time',
  order: 'desc',
  page: 1,
  pageSize: 10,
});

/* ===== 从 URL 读 ===== */
function readFiltersFromRoute(): void {
  const q = route.query;
  filters.title = String(q.title || '');
  filters.author = String(q.author || '');
  filters.number = String(q.number || '');
  filters.tags = q.tags ? String(q.tags).split(',').filter(Boolean) : [];
  filters.kind = String(q.kind || '');
  filters.available = q.available === 'true';
  filters.banned = q.banned === 'true';
  filters.starred = q.starred === 'true';
  filters.sort = String(q.sort || 'update_time');
  filters.order = String(q.order || 'desc');
  filters.page = Math.max(1, Number(q.page) || 1);
  filters.pageSize = Number(q.pageSize) || 10;
}

/* ✅ 只有非默认值才进 URL */
function filtersToQuery(): Record<string, string> {
  const q: Record<string, string> = {};

  if (filters.title) q.title = filters.title;
  if (filters.author) q.author = filters.author;
  if (filters.number) q.number = filters.number;
  if (filters.tags.length) q.tags = filters.tags.join(',');
  if (filters.kind) q.kind = filters.kind;
  if (filters.available) q.available = 'true';
  if (filters.banned) q.banned = 'true';
  if (filters.starred) q.starred = 'true';
  if (filters.sort !== 'update_time') q.sort = filters.sort;
  if (filters.order !== 'desc') q.order = filters.order;
  if (filters.page > 1) q.page = String(filters.page);
  if (filters.pageSize !== 10) q.pageSize = String(filters.pageSize);

  return q;
}

/* ✅ 分页参数永远包含所有字段 */
const requestParams = computed(() => ({
  page: filters.page,
  pageSize: filters.pageSize,
  sort: filters.sort,
  order: filters.order,
  title: filters.title || undefined,
  author: filters.author || undefined,
  number: filters.number || undefined,
  tags: filters.tags.length ? filters.tags.join(',') : undefined,
  kind: filters.kind || undefined,
  available: filters.available ? 'true' : undefined,
  banned: filters.banned ? 'true' : undefined,
  starred: filters.starred ? 'true' : undefined,
}));

/* ===== 加载 ===== */
async function loadList(): Promise<void> {
  loading.value = true;
  for (const k of Object.keys(coverLoaded)) {
    coverLoaded[Number(k)] = false;
  }

  try {
    const j = await getJson(`/comics${buildQuery(requestParams.value)}`);
    if (!j.ok) throw new Error(j.message || '加载失败');

    list.value = j.list || [];
    total.value = j.total ?? 0;
    currentPageComics.value = j.list || [];
    if (list.value.length) {
      banStore.checkBans(list.value.map((c) => c.id));
      starStore.checkStars(list.value.map((c) => c.id));
    }
  } catch (e: any) {
    message.error(String(e?.message || e));
  } finally {
    loading.value = false;
  }
}

/* ✅ 分页 / 搜索统一出口 */
function resetPage(): void {
  filters.page = 1;
  router.replace({ name: 'catalog', query: filtersToQuery() });
}

/* ✅ 分页变化（修好分页点击） */
function onPageChange(): void {
  router.replace({ name: 'catalog', query: filtersToQuery() });
  mainScrollRef.value?.scrollTo({ top: 0 });
}

onMounted(() => {
  readFiltersFromRoute();
  loadList();
});

watch(() => route.query, () => {
  readFiltersFromRoute();
  loadList();
});

/* ===== keep-alive 支持 ===== */
let _savedFilters: typeof filters | null = null;

onBeforeRouteLeave(() => {
  scrollTop.value = mainScrollRef.value?.scrollTop || 0;
  _savedFilters = JSON.parse(JSON.stringify(filters));
  cachedList.value = [...list.value];
  cachedTotal.value = total.value;
});

let _firstActivation = true;

onActivated(() => {
  if (_firstActivation) { _firstActivation = false; return; }
  if (Object.keys(route.query).length > 0) {
    readFiltersFromRoute();
    loadList();
  } else if (_savedFilters) {
    Object.assign(filters, _savedFilters);
    router.replace({ name: 'catalog', query: filtersToQuery() });
    _savedFilters = null;
    if (cachedList.value.length > 0) {
      list.value = cachedList.value;
      total.value = cachedTotal.value;
    } else {
      loadList();
    }
  }
  nextTick(() => {
    if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value;
  });
});

onBeforeUnmount(() => {
  scrollTop.value = mainScrollRef.value?.scrollTop || 0;
});

/* ===== 清空 ===== */
function clearTitle(): void { filters.title = ''; resetPage(); }
function clearAuthor(): void { filters.author = ''; resetPage(); }
function clearNumber(): void { filters.number = ''; resetPage(); }
function clearTags(): void { filters.tags = []; resetPage(); }
function clearKind(): void { filters.kind = ''; resetPage(); }

/* ===== 其余函数原样保留 ===== */
function doSearch(): void { loadList(); }
function onBanToggle(): void { loadList(); }

function searchTags(query: string): void {
  if (tagsDebounceTimer) clearTimeout(tagsDebounceTimer);
  if (!query?.trim()) return;
  tagsDebounceTimer = setTimeout(async () => {
    tagsLoading.value = true;
    try {
      const j = await getJson(`/tags${buildQuery({ query: query.trim() })}`);
      tagsOptions.value = j.tags || [];
    } finally {
      tagsLoading.value = false;
    }
  }, 300);
}

function fmtTime(ts?: string): string {
  if (!ts) return '';
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
}

function filterByTag(t: string, ev?: Event): void {
  ev?.stopPropagation();
  t = t.trim();
  if (!t) return;
  const s = new Set(filters.tags);
  s.add(t);
  filters.tags = [...s];
  resetPage();
}

function filterByAuthor(name: string, ev?: Event): void {
  ev?.stopPropagation();
  const a = name?.trim();
  if (!a) return;
  filters.author = a;
  resetPage();
}

function tagsLine(c: Comic): string[] {
  return (c.tags || []).slice(0, 5);
}

function tagsMore(c: Comic): number {
  return Math.max(0, (c.tags || []).length - 5);
}

const syncL2dLabel = computed(() =>
    syncLocalToDb.value.busy
        ? `local→库：${syncLocalToDb.value.complete}/${syncLocalToDb.value.total}`
        : 'local→库'
);

const syncD2lLabel = computed(() =>
    syncDbToLocal.value.busy
        ? `库→local：${syncDbToLocal.value.complete}/${syncDbToLocal.value.total}`
        : '库→local'
);

async function syncLocal2Db(): Promise<void> {
  if (syncLocalToDb.value.busy) return;
  await postJson('/sync/local2db');
}

async function syncDb2Local(): Promise<void> {
  if (syncDbToLocal.value.busy) return;
  await postJson('/sync/db2local');
}

const fetchNum = ref('');
const fetchBusy = ref(false);

async function fetchByNumber(): Promise<void> {
  const n = Math.floor(Number(fetchNum.value));
  if (!n || n < 1) { message.warning('请输入有效 JM 编码'); return; }
  fetchBusy.value = true;
  try {
    const j = await postJson(`/comics/${n}/fetch-meta`);
    if (!j.ok) { message.warning(j.message || '拉取失败'); return; }
    message.success('已更新');
    fetchNum.value = '';
    filters.number = String(n);
    resetPage();
  } finally {
    fetchBusy.value = false;
  }
}

function onCoverLoad(n: number): void { if (n != null) coverLoaded[n] = true; }

function onCoverErr(ev: Event, n: number): void {
  const el = ev?.target as HTMLElement;
  if (el?.style) el.style.opacity = '0.25';
  onCoverLoad(n);
}

function onCoverImg(el: HTMLImageElement | null, n: number, coverUrl?: string): void {
  if (!el || n == null) return;
  if (!String(coverUrl || '').trim()) { onCoverLoad(n); return; }
  if (el.complete && el.naturalWidth > 0) onCoverLoad(n);
}

function coverReady(n: number, coverUrl?: string): boolean {
  return coverLoaded[n] || !String(coverUrl || '').trim();
}

function imgLazy(i: number): 'lazy' | 'eager' {
  return i > 6 ? 'lazy' : 'eager';
}

function coverFetchPriority(i: number): 'high' | 'low' {
  return i < 4 ? 'high' : 'low';
}

function cardToneClass(index: number): string {
  return `tone-${(index % 4) + 1}`;
}

const kindOptions = [
  { label: '全部', value: '' },
  { label: '单集', value: 'single' },
  { label: '多集', value: 'series' },
];

const sortOptions = [
  { label: 'JM 编码', value: 'id' },
  { label: '标题', value: 'name' },
  { label: '浏览', value: 'total_views' },
  { label: '点赞', value: 'likes' },
  { label: '元数据更新时间', value: 'update_time' },
  { label: '元数据录入时间', value: 'create_time' },
];

const orderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
];
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
            <n-input v-model:value="filters.title" clearable placeholder="标题" @clear="clearTitle" @keyup.enter="resetPage">
              <template #prefix><n-icon :component="SearchOutline" /></template>
            </n-input>
            <n-input v-model:value="filters.author" clearable placeholder="作者" @clear="clearAuthor" @keyup.enter="resetPage" />
            <n-input v-model:value="filters.number" clearable placeholder="JM 编码" @clear="clearNumber" @keyup.enter="resetPage" />
            <n-select
                v-model:value="filters.tags"
                multiple
                filterable
                tag
                placeholder="标签"
                clearable
                :options="tagsOptions.map(t => ({ label: t, value: t }))"
                :loading="tagsLoading"
                @search="searchTags"
                @clear="clearTags"
                @update:value="resetPage"
            />
            <n-select v-model:value="filters.kind" placeholder="类型" clearable :options="kindOptions" @clear="clearKind" @update:value="resetPage" />
            <n-checkbox v-model:checked="filters.available" @update:checked="resetPage">可读</n-checkbox>
            <n-checkbox v-model:checked="filters.banned" @update:checked="resetPage">黑名单</n-checkbox>
            <n-checkbox v-model:checked="filters.starred" @update:checked="resetPage">特别关注</n-checkbox>
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
              :on-ban-toggle="onBanToggle"
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
    <div v-if="total > 0" class="jmz-pager-footer">
      <div class="jmz-pager-pagination">
        <n-pagination
            v-model:page="filters.page"
            v-model:page-size="filters.pageSize"
            :page-count="Math.ceil(total / filters.pageSize)"
            :page-sizes="[10, 20, 30, 40, 50]"
            :show-size-picker="true"
            :simple="false"
            :disabled="loading"
            @update:page="onPageChange"
            @update:page-size="onPageChange"
        />
      </div>
      <div v-if="total > 0" class="jmz-pager-info">共 {{ total }} 条</div>
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
  grid-template-columns: repeat(5, 1fr);
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
</style>