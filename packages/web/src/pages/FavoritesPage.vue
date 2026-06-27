<template>
  <div class="jmz-page jmz-fav-page">
    <div class="jmz-fav-header">
      <section class="jmz-panel jmz-panel--pad jmz-fav-bar">
        <div class="jmz-fav-toolbar">
          <div class="jmz-fav-tabs">
            <button
              class="jmz-fav-tab"
              :class="{ 'jmz-fav-tab--active': !folderId }"
              @click="onFolderClick('')"
            >全部</button>
            <button
              v-for="f in folderList"
              :key="f.FID"
              class="jmz-fav-tab"
              :class="{ 'jmz-fav-tab--active': folderId === f.FID }"
              @click="onFolderClick(f.FID)"
            >{{ f.name }}</button>
          </div>
          <div class="jmz-fav-actions">
            <button v-if="folderId" class="jmz-fav-action-btn" :disabled="folderBusy" title="删除收藏夹" @click="onClickDelete">
              <span v-if="folderBusy" class="jmz-fav-action-spin" /><span v-else>−</span>
            </button>
            <button class="jmz-fav-action-btn" :disabled="folderBusy" title="新建收藏夹" @click="showCreateFolder = true">
              <span v-if="folderBusy" class="jmz-fav-action-spin" /><span v-else>+</span>
            </button>
          </div>
        </div>
        <div v-if="loading" class="jmz-cat-bar-track"><div class="jmz-cat-bar-fill" /></div>
        <div v-if="loading" class="jmz-cat-bar-indicator">加载中...</div>
      </section>
    </div>

    <div class="jmz-fav-main" ref="mainScrollRef">
      <n-empty v-if="!loading && !list.length" description="暂无收藏" />
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
              <span style="margin-left:auto;display:flex;align-items:center;gap:4px">
                <button class="jmz-card-move-btn" @click.stop="openMoveDialog(c)">
                  <n-icon :component="FolderOpenOutline" size="14" />
                  移动
                </button>
                <CardFavBtn :comic="c" :favorited="true" />
              </span>
            </template>
          </ComicCard>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="jmz-pager-footer">
      <div class="jmz-pager-pagination">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pageCount"
          :page-slot="5"
          size="small"
          :disabled="loading"
          @update:page="onPageChange"
        />
      </div>
      <div v-if="total > 0" class="jmz-pager-info">共 {{ total }} 条</div>
    </div>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" />
  <n-modal v-model:show="showCreateFolder" title="新建收藏夹" preset="card" style="width:400px" :bordered="false" closable>
    <n-input v-model:value="newFolderName" placeholder="收藏夹名称" clearable @keyup.enter="onCreateFolder" />
    <template #footer>
      <n-space justify="end">
        <n-button @click="showCreateFolder = false">取消</n-button>
        <n-button :loading="folderBusy" :disabled="folderBusy" type="primary" @click="onCreateFolder">创建</n-button>
      </n-space>
    </template>
  </n-modal>
  <n-modal v-model:show="showDeleteFolder" title="删除收藏夹" preset="card" style="width:400px" :bordered="false" closable>
    <n-text depth="3">请先将该收藏夹内的漫画移出或删除，再删除收藏夹</n-text>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showDeleteFolder = false">取消</n-button>
        <n-button :loading="folderBusy" :disabled="folderBusy" type="error" @click="onDeleteFolder">删除</n-button>
      </n-space>
    </template>
  </n-modal>
  <n-modal v-model:show="showMoveDialog" title="移动到收藏夹" preset="card" style="width:400px" :bordered="false" closable>
    <n-select v-model:value="moveTargetId" :options="allFolderOptions" placeholder="选择目标收藏夹" />
    <template #footer>
      <n-space justify="end">
        <n-button @click="showMoveDialog = false">取消</n-button>
        <n-button type="primary" :disabled="!moveTargetId" @click="onMoveConfirm">移动</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, computed, nextTick, watch, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson, postJson } from '@/api'
import type { Comic } from '@/types'
import CardFavBtn from '@/components/CardFavBtn.vue'
import ComicCard from '@/components/ComicCard.vue'
import MetaPageDialog from '@/components/MetaPageDialog.vue'
import { FolderOpenOutline } from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const fetching = ref<Record<number, boolean>>({})
const list = shallowRef<Comic[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })

const cachedList = shallowRef<Comic[]>([])
const cachedTotal = ref(0)
const cachedPage = ref(1)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
function metaOpen(id: number) { metaDialogNum.value = id; metaDialogShow.value = true }
function filterByAuthor(name: string, ev?: Event) { ev?.stopPropagation?.(); const a = String(name || '').trim(); if (!a) return; router.push({ name: 'catalog', query: { author: a, page: '1' } }) }

function onClickDelete() {
  const f = folderList.value.find(x => x.FID === folderId.value)
  if (!f) return
  deleteFolderName.value = f.name
  showDeleteFolder.value = true
}

const coverLoaded = reactive<Record<number, boolean>>({})
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const folderId = ref('')
const folderList = ref<{FID: string; name: string}[]>([])
const showCreateFolder = ref(false)
const newFolderName = ref('')
const showDeleteFolder = ref(false)
const deleteFolderName = ref('')
const folderBusy = ref(false)
const showMoveDialog = ref(false)
const moveComicId = ref(0)
const moveTargetId = ref('')
const allFolderOptions = computed(() =>
  folderList.value.filter(f => f.FID !== folderId.value).map(f => ({ label: f.name, value: f.FID }))
)

let _loaded = false

watch(() => route.query, (q) => {
  if (route.name !== 'favorites' || _loaded) return
  const p = parseInt(String(q.page || ''), 10)
  if (Number.isFinite(p) && p > 0) {
    currentPage.value = p
  }
  const f = String(q.folder_id || '')
  if (f) folderId.value = f
  _loaded = true
  loadFavorites()
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
    cachedTotal.value = total.value
    cachedPage.value = currentPage.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

let _firstActivation = true

onActivated(() => {
  const q = route.query
  const hasParams = !!(q.page || q.folder_id)

  if (hasParams) {
    if (_firstActivation) { _firstActivation = false; return }
    cachedList.value = []
    cachedTotal.value = 0
    cachedPage.value = 1
    loadFavorites()
    return
  }

  if (_firstActivation) {
    _firstActivation = false
    if (!cachedList.value.length) loadFavorites()
    return
  }

  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    total.value = cachedTotal.value
    currentPage.value = cachedPage.value
    syncUrl()
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else {
    loadFavorites()
  }
})

function syncUrl() {
  const q: Record<string, string> = { page: String(currentPage.value) }
  if (folderId.value) q.folder_id = folderId.value
  try { router.replace({ name: 'favorites', query: q }) } catch {}
}

async function loadFavorites() {
  loading.value = true
  list.value = []
  coverLoaded.value = {}
  try {
    const q = `page=${currentPage.value}${folderId.value ? `&folder_id=${folderId.value}` : ''}`
    const j = await getJson(`/favorites/comics?${q}`)
    if (!j.ok) throw new Error(j.message || '获取收藏失败')
    list.value = j.list || []
    total.value = j.total || 0
    folderList.value = j.folders || []
  } catch (e: any) {
    message.error(e.message || '获取收藏列表失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  currentPage.value = p
  cachedList.value = []
  syncUrl()
  nextTick(() => {
    if (mainScrollRef.value) mainScrollRef.value.scrollTop = 0
  })
  loadFavorites()
}

function onFolderClick(fid: string) {
  if (fid === folderId.value) return
  folderId.value = fid
  cachedList.value = []
  currentPage.value = 1
  syncUrl()
  loadFavorites()
}

async function onCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) { message.warning('请输入收藏夹名称'); return }
  folderBusy.value = true
  try {
    const j = await postJson('/favorites/folder', { action: 'add', folder_name: name })
    if (!j.ok) throw new Error(j.message || '创建失败')
    message.success('已创建')
    showCreateFolder.value = false
    newFolderName.value = ''
    loadFavorites()
  } catch (e: any) { message.error(e.message || '创建收藏夹失败') }
  finally { folderBusy.value = false }
}

function openMoveDialog(c: any) {
  moveComicId.value = c.id
  moveTargetId.value = ''
  showMoveDialog.value = true
}

async function onMoveConfirm() {
  if (!moveTargetId.value || moveTargetId.value === folderId.value) { message.warning('请选择不同的收藏夹'); return }
  if (!moveComicId.value) return
  try {
    const j = await postJson('/favorites/comics/move', {
      album_id: moveComicId.value,
      source_folder_id: folderId.value || undefined,
      target_folder_id: moveTargetId.value,
    })
    if (!j.ok) throw new Error(j.message || '移动失败')
    message.success('已移动')
    showMoveDialog.value = false
    loadFavorites()
  } catch (e: any) { message.error(e.message || '移动收藏失败') }
}

async function onDeleteFolder() {
  folderBusy.value = true
  try {
    const j = await postJson('/favorites/folder', { action: 'del', folder_id: folderId.value })
    if (!j.ok) throw new Error(j.message || '删除失败')
    message.success('已删除')
    showDeleteFolder.value = false
    folderId.value = ''
    cachedList.value = []
    currentPage.value = 1
    syncUrl()
    loadFavorites()
  } catch (e: any) { message.error(e.message || '删除收藏夹失败') }
  finally { folderBusy.value = false }
}
</script>

<style scoped>
.jmz-fav-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-fav-header {
  flex-shrink: 0;
  margin: 12px;
}

.jmz-fav-bar {
  position: relative;
}
.jmz-fav-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.jmz-fav-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.jmz-fav-tab {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(46, 46, 53, 0.7);
  background: transparent;
  color: #9b9bb4;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.jmz-fav-tab:hover {
  background: rgba(46, 46, 53, 0.8);
  color: #c4c4d6;
}
.jmz-fav-tab--active {
  background: #1a5cdb;
  color: #fff;
  border-color: #1a5cdb;
}
.jmz-fav-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.jmz-fav-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(46, 46, 53, 0.7);
  background: transparent;
  color: #9b9bb4;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.jmz-fav-action-btn:hover {
  background: rgba(46, 46, 53, 0.8);
  color: #e0e0e6;
}
.jmz-fav-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.jmz-fav-action-spin {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #7a7a8a;
  border-top-color: transparent;
  border-radius: 50%;
  animation: jmz-fav-spin 0.6s linear infinite;
}
@keyframes jmz-fav-spin {
  to { transform: rotate(360deg); }
}
.jmz-card-move-row {
  border-top: 1px solid #2a2a30;
  margin-top: 4px;
  padding-top: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
.jmz-card-move-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: #7a7a8a;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.jmz-card-move-btn:hover {
  color: #e0e0e6;
  background: rgba(46, 46, 53, 0.5);
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

.jmz-fav-main {
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
}
.jmz-author-link { color: inherit; }
.jmz-author-sep { color: inherit; text-decoration: none; white-space: pre; }
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