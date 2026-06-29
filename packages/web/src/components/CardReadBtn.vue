<template>
  <button
    class="jmz-card-read-btn"
    :disabled="fetching"
    title="阅读"
    @click.stop="handleClick"
  >
    <n-icon v-if="!fetching" :component="EyeOutline" size="18" />
    <n-spin v-else size="small" style="transform:scale(.55);transform-origin:center" />
  </button>
  <n-modal
    v-model:show="modalShow"
    title="选择阅读章节"
    preset="card"
    style="width:500px"
    :bordered="false"
    closable
  >
    <template v-if="dlInfo">
      <div class="jmz-dl-head">
        <img :src="dlInfo.cover" class="jmz-dl-cover" />
        <div class="jmz-dl-meta">
          <div class="jmz-dl-title">JM{{ dlInfo.id }} {{ dlInfo.name }}</div>
        </div>
      </div>
      <div class="jmt-ep-list">
        <div class="jmt-ep-head">
          <n-checkbox v-model:checked="showReadable" size="small">可读</n-checkbox>
          <n-input v-model:value="filterText" placeholder="筛选章节" size="tiny" clearable class="jmt-ep-filter" />
        </div>
        <div v-for="ep in filteredSeries" :key="ep.id" class="jmt-ep-row">
          <span class="jmt-ep-num">JM{{ ep.id }}</span>
          <span class="jmt-ep-title" :class="{ 'jmz-read-ep-name--done': isRead(ep.id) }">{{ ep.name }}</span>
          <span v-if="isRead(ep.id)" class="jmz-read-tag">已读</span>
          <span v-if="!ep.done" class="jmz-read-need-dl">请先下载</span>
          <n-button v-if="ep.done" size="tiny" type="success" @click="readEpisode(ep)">阅读</n-button>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { EyeOutline } from '@vicons/ionicons5'
import { getJson, postJson } from '@/api'
import { useMessage } from 'naive-ui'
import { useZipReader } from '@/composables/useZipReader'
import { useReadStore } from '@/stores/reads'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic; fetchRemote?: boolean }>()
const fetchRemote = props.fetchRemote !== false
const message = useMessage()
const { openComic } = useZipReader()
const readStore = useReadStore()

const fetching = ref(false)
const modalShow = ref(false)
const dlInfo = ref<any>(null)
const filterText = ref('')
const showReadable = ref(false)

const filteredSeries = computed(() => {
  let eps = dlInfo.value?.series || []
  if (showReadable.value) {
    eps = eps.filter((e: any) => e.done)
  }
  if (filterText.value) {
    const q = filterText.value.toLowerCase()
    eps = eps.filter((e: any) =>
      String(e.name).toLowerCase().includes(q) || String(e.id).includes(q)
    )
  }
  return eps
})

function isRead(epId: string): boolean {
  return readStore.isRead(Number(epId))
}

function markRead(epId: string) {
  readStore.markRead(props.comic.id, Number(epId))
}

async function handleClick() {
  const c = props.comic
  fetching.value = true
  try {
    const j = fetchRemote ? await postJson(`/comics/${c.id}/fetch-meta`) : await getJson(`/comics/${c.id}`)
    if (!j.ok) { message.warning(j.msg || j.message || '获取信息失败'); return }
    const series = j.comic?.series || j.series || []
    if (series.length <= 1) {
      if (!c.canRead) { message.warning('请先下载后再阅读'); return }
      readStore.markRead(c.id)
      openComic(c.id, String(c.id), c.name || `JM${c.id}`)
      return
    }
    dlInfo.value = j.comic || j
    filterText.value = ''
    showReadable.value = false
    await readStore.checkReads(series.map((e: any) => Number(e.id)))
    modalShow.value = true
  } catch (e: any) { message.error(String(e?.message || e)) }
  finally { fetching.value = false }
}

function readEpisode(ep: any) {
  readStore.markRead(props.comic.id, Number(ep.id))
  openComic(Number(ep.id), String(ep.id), ep.name || `JM${ep.id}`)
}
</script>

<style scoped>
.jmz-card-read-btn {
  position: absolute;
  bottom: 8px;
  right: 44px;
  z-index: 4;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #c4c4d6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.jmz-card-read-btn:hover {
  background: rgba(16, 185, 129, 0.85);
  color: #fff;
}
.jmz-card-read-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.jmz-card-read-btn:disabled:hover {
  background: rgba(0, 0, 0, 0.55);
  color: #c4c4d6;
}

.jmz-read-ep-name--done {
  color: #6a6a7a;
}
.jmz-read-tag {
  font-size: 11px;
  color: #10b981;
  font-weight: 700;
  flex-shrink: 0;
}
.jmz-read-need-dl {
  font-size: 11px;
  color: #6a6a7a;
  flex-shrink: 0;
}

.jmz-dl-head {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-start;
}
.jmz-dl-cover {
  width: 80px;
  height: 106px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
.jmz-dl-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.jmz-dl-title {
  font-size: 16px;
  font-weight: 700;
  color: #e0e0e6;
}

.jmt-ep-list {
  margin-top: 10px;
  border: 1px solid #2e2e35;
  border-radius: 6px;
  background: #1e1e22;
  max-height: 180px;
  overflow-y: auto;
}
.jmt-ep-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #2e2e35;
  background: #1a1a20;
  position: sticky;
  top: 0;
  z-index: 1;
}
.jmt-ep-filter {
  flex: 1;
  min-width: 0;
}
.jmt-ep-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  font-size: 13px;
  border-bottom: 1px solid #2a2a30;
  overflow: hidden;
  cursor: default;
}
.jmt-ep-row:last-child {
  border-bottom: none;
}
.jmt-ep-num {
  font-weight: 700;
  color: #9b9bb4;
  font-variant-numeric: tabular-nums;
}
.jmt-ep-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c4c4d6;
}

</style>
