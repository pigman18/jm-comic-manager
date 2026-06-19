<template>
  <button
    class="jmz-card-dl-btn"
    :disabled="fetching"
    title="下载"
    @click.stop="handleClick"
  >
    <n-icon :component="DownloadOutline" size="18" />
  </button>
  <n-modal
    v-model:show="modalShow"
    title="选择下载章节"
    preset="card"
    style="width:500px;max-height:80vh"
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
          <n-checkbox v-model:checked="allChecked" :indeterminate="epSomeChecked" />全选
        </div>
        <div v-for="ep in dlInfo.series" :key="ep.id" class="jmt-ep-row">
          <n-checkbox v-model:checked="dlChecked[ep.id]" />
          <span class="jmt-ep-num">JM{{ ep.id }}</span>
          <span class="jmt-ep-title">{{ ep.name }}</span>
          <span v-if="ep.done" style="margin-left:auto;flex-shrink:0"><n-tag type="success" size="small">已完成</n-tag></span>
        </div>
      </div>
      <n-checkbox v-model:checked="dlWithMeta" style="margin-top:10px">附带作品信息</n-checkbox>
    </template>
    <template #footer>
      <n-space justify="end">
        <n-button @click="modalShow = false">取消</n-button>
        <n-button type="primary" @click="doAddDownload">添加下载</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { DownloadOutline } from '@vicons/ionicons5'
import { postJson } from '@/api'
import { useMessage } from 'naive-ui'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic }>()
const message = useMessage()

const fetching = ref(false)
const modalShow = ref(false)
const dlInfo = ref<any>(null)
const dlChecked = reactive<Record<string, boolean>>({})
const dlWithMeta = ref(true)

const epAllChecked = computed(() => {
  const eps = dlInfo.value?.series
  return eps ? eps.every((e: any) => dlChecked[e.id]) : false
})
const epSomeChecked = computed(() => {
  const eps = dlInfo.value?.series
  return eps ? eps.some((e: any) => dlChecked[e.id]) && !epAllChecked.value : false
})
const allChecked = computed({
  get: () => epAllChecked.value,
  set: (val: boolean) => {
    const eps = dlInfo.value?.series
    if (!eps) return
    for (const ep of eps) dlChecked[ep.id] = val
  },
})

async function handleClick() {
  const c = props.comic
  fetching.value = true
  try {
    const j = await postJson(`/comics/${c.id}/fetch-meta`)
    if (!j.ok) { message.warning(j.message || '获取信息失败'); return }
    const isMulti = j.series && j.series.length > 1
    if (c.canRead && !isMulti) {
      message.warning(`#${c.id} 已可读，无需重复下载`)
      return
    }
    if (!isMulti) {
      const r = await postJson(`/comics/${c.id}/batch-add`, { withMeta: true })
      if (!r.ok) { message.warning(r.message || '添加失败'); return }
      message.success(`已添加下载: #${c.id}`)
      return
    }
    dlInfo.value = j
    for (const key of Object.keys(dlChecked)) delete dlChecked[key]
    for (const ep of j.series) dlChecked[ep.id] = !ep.done
    dlWithMeta.value = true
    modalShow.value = true
  } catch (e: any) { message.error(String(e?.message || e)) }
  finally { fetching.value = false }
}

async function doAddDownload() {
  const info = dlInfo.value
  if (!info) return
  const eps = info.series.filter((e: any) => dlChecked[e.id])
  if (!eps.length) { message.warning('请选择要下载的章节'); return }
  modalShow.value = false
  for (const ep of eps) {
    const r = await postJson(`/comics/${info.id}/download`, {
      episodeNumber: Number(ep.id),
      downloadLabel: '',
      coverUrl: info.cover,
      title: info.name,
      episodeTitle: ep.name,
      tags: info.tags,
      withMeta: dlWithMeta.value,
    })
    if (!r.ok) { message.warning(`JM${ep.id} 添加失败: ${r.message || ''}`); continue }
  }
  message.success(`已添加 ${eps.length} 个下载`)
}
</script>

<style scoped>
.jmz-card-dl-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
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
.jmz-card-dl-btn:hover {
  background: rgba(59, 130, 246, 0.85);
  color: #fff;
}
.jmz-card-dl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.jmz-card-dl-btn:disabled:hover {
  background: rgba(0, 0, 0, 0.55);
  color: #c4c4d6;
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
.jmt-ep-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  font-size: 13px;
  border-bottom: 1px solid #2a2a30;
  overflow: hidden;
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
