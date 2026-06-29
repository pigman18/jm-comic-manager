<template>
  <n-modal v-model:show="model" class="jmt-task-modal" title="下载任务" preset="card" style="width:95vw;max-width:1100px;height:92vh" :bordered="false" closable>
    <TaskManager
      :tasks="taskManagerTasks"
      row-key="id"
      @add="handleAdd"
      @remove="handleRemove"
      @start="handleStart"
      @pause="handlePause"
    >
      <template #cell-name="{ task }">
        <div class="jmt-name-cell">
          <img v-if="task.coverBase64" class="jmt-name-thumb xxx-img" width="28" height="28" :src="task.coverBase64" alt="" />
          <div class="jmt-name-lines">
            <span v-if="task.status === 'completed'" class="jmt-name-text jmt-name-link" @click.stop="readComic(task)">{{ harmonyEnabled ? harmonyText(task.name || `JM${task.number}`) : (task.name || `JM${task.number}`) }}</span>
            <span v-else class="jmt-name-text">{{ harmonyEnabled ? harmonyText(task.name || `JM${task.number}`) : (task.name || `JM${task.number}`) }}</span>
          </div>
        </div>
      </template>
      <template #cell-status="{ task, statusLabel, statusType }">
        <div class="jmt-status-cell">
          <n-tag :type="statusType" size="small">{{ statusLabel }}</n-tag>
          <span v-if="task.status !== 'completed' && task.stepStatus" class="jmt-step-sub" :style="task.stepStatus.color ? { color: task.stepStatus.color } : {}">{{ task.stepStatus.label }}</span>
          <span v-if="task.status === 'error' && task.error" class="jmt-step-sub jmt-error-msg">{{ task.error }}</span>
        </div>
      </template>
      <template #cell-progress="{ task, pct, formatSize }">
        <div class="jmt-progress-cell">
          <div class="jmt-bar-track"><div class="jmt-bar-fill" :style="{ width: Math.min(pct, 100) + '%' }" /><span class="jmt-pct-text">{{ pct }}%</span></div>
          <div class="jmt-size-text">{{ formatSize(task.downloadedSize) }} / {{ formatSize(task.totalSize) }}</div>
        </div>
      </template>
      <template #add-form="{ submit, close }">
        <n-form label-placement="top">
          <n-radio-group v-model:value="mode" class="jmt-mode-radio">
            <n-radio-button value="query">查询添加</n-radio-button>
            <n-radio-button value="batch">批量添加</n-radio-button>
          </n-radio-group>

          <template v-if="mode === 'query'">
            <n-form-item label="JM 编码" required>
              <n-input v-model:value="addNumber" placeholder="输入 JM 编码" :disabled="addLoading" @keyup.enter="fetchInfo" />
            </n-form-item>
            <n-button @click="fetchInfo" :loading="addLoading" :disabled="!addNumber.trim()">查询</n-button>
            <template v-if="fetchedInfo">
              <div class="jmt-add-preview">
                <img v-if="fetchedInfo.cover" class="jmt-add-cover" :src="fetchedInfo.cover" alt="" />
                <div class="jmt-add-detail">
                  <div class="jmt-add-title">
                    <span v-if="fetchedInfo.allDone" class="jmt-name-link" @click="readNumber(fetchedInfo.id)">JM{{ fetchedInfo.id }} {{ fetchedInfo.name }}</span>
                    <span v-else>JM{{ fetchedInfo.id }} {{ fetchedInfo.name }}</span>
                  </div>
                  <n-tag v-if="fetchedInfo.allDone" type="success" size="small">已完成</n-tag>
                  <div v-else-if="fetchedInfo.series.length > 1" class="jmt-add-ep-label">{{ fetchedInfo.series.length }} 话</div>
                  <div v-else class="jmt-add-ep-label">单集漫画</div>
                </div>
              </div>
              <div v-if="fetchedInfo.series.length > 1" class="jmt-ep-list">
                <div class="jmt-ep-head">
                  <n-checkbox v-model:checked="allChecked" :indeterminate="epSomeChecked" />全选
                </div>
                <div v-for="ep in fetchedInfo.series" :key="ep.id" class="jmt-ep-row">
                  <n-checkbox v-model:checked="epChecked[ep.id]" />
                  <span class="jmt-ep-num">JM{{ ep.id }}</span>
                  <span v-if="ep.done" class="jmt-ep-title jmt-name-link" @click="readNumber(Number(ep.id))">{{ ep.name }}</span>
                  <span v-else class="jmt-ep-title">{{ ep.name }}</span>
                  <span v-if="ep.done" style="margin-left:auto;flex-shrink:0;display:flex"><n-tag type="success" size="small">已完成</n-tag></span>
                </div>
              </div>
              <n-checkbox v-model:checked="withMeta" style="margin-top:10px">附带作品信息</n-checkbox>
            </template>
          </template>

          <template v-else>
            <n-form-item label="JM 编码（每行一个，支持标题行）">
              <n-input v-model:value="batchText" type="textarea" placeholder="501488&#10;五：玩10把街霸6，25分钟吃了77个指令投&#10;501489&#10;501490" :rows="6" />
            </n-form-item>
            <n-space>
              <n-button @click="pickFile">选择文件</n-button>
              <input ref="fileInput" type="file" accept=".txt,text/plain" style="display:none" @change="onFilePicked" />
              <span v-if="batchCount" class="jmt-batch-count">共解析到 {{ batchCount }} 个 JM 编码</span>
            </n-space>
            <n-checkbox v-model:checked="withMetaBatch" style="margin-top:10px">附带作品信息</n-checkbox>
          </template>
        </n-form>
      </template>
      <template #add-footer="{ submit, close }">
        <n-space justify="end">
          <n-button @click="close" :disabled="batchAddLoading">取消</n-button>
          <n-button type="primary" :loading="batchAddLoading" :disabled="!canSubmitAdd" @click="submit(getAddPayload())">添加</n-button>
        </n-space>
      </template>
    </TaskManager>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick, inject, provide, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { TaskManager } from '@pigman17/task-manager'
import type { TaskItem as TmTaskItem } from '@pigman17/task-manager'
import '@pigman17/task-manager/style.css'
import { useJmTasksStore } from '@/stores/jmTasks'
import type { StatusDef } from '@/types'
import { postJson } from '@/api'
import { useZipReader } from '@/composables/useZipReader'

const router = useRouter()
const model = defineModel<boolean>('show', { required: true })
const tasksStore = useJmTasksStore()
const sendWs = inject<(msg: string) => void>('sendWs', () => {})

const statusesRef = ref<StatusDef[]>(tasksStore.statuses)
watch(() => tasksStore.statuses, (s) => { statusesRef.value = s }, { immediate: true })
provide('statuses', statusesRef)

const { openComic } = useZipReader()

const harmonyEnabled = inject<Ref<boolean>>('harmonyEnabled', ref(false))
const harmonyText = inject<(text: string) => string>('harmonyText', (s: string) => s)
const applyHarmony = inject<() => void>('applyHarmony', () => {})

watch(model, (show) => {
  if (show && harmonyEnabled.value) {
    nextTick(() => applyHarmony())
  }
})

const taskManagerTasks = computed<TmTaskItem[]>(() => {
  void tasksStore._taskVersion
  return tasksStore.tasks.map(t => ({
    id: t.id,
    name: t.name || t.displayTitle || `JM${t.number}`,
    url: String(t.number),
    status: t.status as TmTaskItem['status'],
    progress: t.progress,
    speed: t.speed,
    downloadedSize: t.downloadedSize,
    totalSize: t.totalSize,
    labels: t.labels,
    error: t.error,
    addedDate: t.addedDate,
    completedDate: t.completedDate,
    ...(t.coverBase64 ? { coverBase64: t.coverBase64 } : {}),
    ...(t.stepStatus ? { stepStatus: t.stepStatus } : {}),
    ...(t.number ? { number: t.number } : {}),
  })) as unknown as TmTaskItem[]
})

// --- 模式切换 ---
const mode = ref<'query' | 'batch'>('query')

// --- 查询添加 ---
const addNumber = ref('')
const addLoading = ref(false)

interface SeriesInfo {
  id: string
  name: string
  done?: boolean
}
interface FetchedInfo {
  id: number
  name: string
  cover: string
  series: SeriesInfo[]
  allDone?: boolean
  tags?: string[]
}

const fetchedInfo = ref<FetchedInfo | null>(null)
const epChecked = reactive<Record<string, boolean>>({})
const withMeta = ref(true)

const epAllChecked = computed(() => {
  const eps = fetchedInfo.value?.series
  return eps ? eps.every(e => epChecked[e.id]) : false
})
const epSomeChecked = computed(() => {
  const eps = fetchedInfo.value?.series
  return eps ? eps.some(e => epChecked[e.id]) && !epAllChecked.value : false
})

function toggleAllEp(val: boolean) {
  const eps = fetchedInfo.value?.series
  if (!eps) return
  for (const ep of eps) epChecked[ep.id] = val
}

const allChecked = computed({
  get: () => epAllChecked.value,
  set: toggleAllEp,
})

async function fetchInfo() {
  const num = addNumber.value.trim()
  if (!num) return
  addLoading.value = true
  fetchedInfo.value = null
  try {
    const j = await postJson(`/comics/${num}/fetch-meta`)
    if (!j.ok) throw new Error(j.msg || j.message || '查询失败')
    fetchedInfo.value = j
    for (const ep of j.series) if (!ep.done) epChecked[ep.id] = true
  } catch {
    fetchedInfo.value = null
  } finally {
    addLoading.value = false
  }
}

function getQueryPayload() {
  const info = fetchedInfo.value!
  const eps = info.series.length > 1
    ? info.series.filter(e => epChecked[e.id])
    : info.allDone ? []
    : [{ id: String(info.id), name: '' }]
  return { type: 'query', number: info.id, episodes: eps, cover: info.cover, title: info.name, tags: info.tags, withMeta: withMeta.value }
}

// --- 批量添加 ---
const batchText = ref('')
const fileInput = ref<HTMLInputElement>()
const withMetaBatch = ref(true)
const batchAddLoading = ref(false)

function pickFile() {
  fileInput.value?.click()
}

function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    batchText.value = (reader.result as string) || ''
  }
  reader.readAsText(file)
  input.value = '' // allow re-picking same file
}

function extractNumbers(text: string): number[] {
  const nums: number[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // 提取行中的数字
    const digits = trimmed.replace(/\D/g, '')
    if (!digits) continue
    const n = Number(digits)
    if (Number.isFinite(n) && n > 0) nums.push(n)
  }
  return nums
}

const batchNumbers = computed(() => extractNumbers(batchText.value))
const batchCount = computed(() => batchNumbers.value.length)

function getBatchPayload() {
  return { type: 'batch', numbers: batchNumbers.value, withMeta: withMetaBatch.value }
}

// --- 通用 ---
const canSubmitAdd = computed(() => {
  if (batchAddLoading.value) return false
  if (mode.value === 'query') {
    const info = fetchedInfo.value
    if (!info) return false
    if (info.series.length > 1) return Object.values(epChecked).some(Boolean)
    return !info.allDone
  }
  return batchNumbers.value.length > 0
})

function getAddPayload() {
  return mode.value === 'query' ? getQueryPayload() : getBatchPayload()
}

async function handleAdd(payload: any) {
  if (payload.type === 'query') {
    const { number, episodes, cover, title, tags, withMeta } = payload
    for (const ep of episodes) {
      await postJson(`/comics/${number}/download`, {
        episodeNumber: Number(ep.id),
        downloadLabel: '',
        coverUrl: cover,
        title,
        episodeTitle: ep.name,
        tags,
        withMeta,
      })
    }
    fetchedInfo.value = null
    addNumber.value = ''
  } else {
    const { numbers, withMeta } = payload
    batchAddLoading.value = true
    try {
      await Promise.all(numbers.map(num => postJson(`/comics/${num}/batch-add`, { withMeta })))
      batchText.value = ''
    } finally {
      batchAddLoading.value = false
    }
  }
}

function handleRemove(ids: number[], deleteFiles: boolean) {
  ids.forEach(id => sendWs(JSON.stringify({ type: 'remove', id, deleteFiles })))
}

function handleStart(ids: number[]) {
  ids.forEach(id => sendWs(JSON.stringify({ type: 'start', id })))
}

function handlePause(ids: number[]) {
  ids.forEach(id => sendWs(JSON.stringify({ type: 'pause', id })))
}

async function readComic(task: any) {
  const n = task.number
  if (!n) return
  openComic(n, String(n), task.name || `JM${n}`)
}
function readNumber(n: number) {
  if (!n) return
  openComic(n, String(n), `JM${n}`)
}
</script>

<style scoped>
.jmt-mode-radio {
  margin-bottom: 12px;
}
.jmt-name-cell {
  display: flex;
  gap: 6px;
  overflow: hidden;
  align-items: center;
}
.jmt-name-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
  background: #2a2a30;
}
.jmt-name-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  white-space: normal;
}
.jmt-name-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.75rem;
  line-height: 1.25;
  word-break: break-all;
  white-space: normal;
}
.jmt-name-link {
  cursor: pointer;
  color: #6b9fff;
  transition: color 0.15s;
}
.jmt-name-link:hover {
  color: #8bb4ff;
  text-decoration: underline;
}
.jmt-status-cell {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
}
.jmt-step-sub {
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jmt-error-msg {
  color: #d03050;
}
.jmt-progress-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  justify-content: center;
}
.jmt-bar-track {
  position: relative;
  height: 16px;
  background: var(--border-color, #2e2e35);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.jmt-bar-fill {
  position: absolute;
  inset: 0;
  width: 0;
  background: var(--primary-color, #3b82f6);
  border-radius: 4px;
  transition: width 0.3s ease;
  z-index: 0;
}
.jmt-pct-text {
  position: relative;
  z-index: 1;
  font-size: 0.65rem;
  white-space: nowrap;
  color: #e0e0e6;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 0 3px rgba(0,0,0,0.7);
}
.jmt-size-text {
  font-size: 0.6rem;
  color: #5a5a68;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.jmt-add-preview {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding: 10px;
  background: #1e1e22;
  border-radius: 6px;
  border: 1px solid #2e2e35;
}
.jmt-add-cover {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 4px;
  background: #2a2a30;
  flex-shrink: 0;
}
.jmt-add-detail {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
}
.jmt-add-title {
  font-weight: 600;
  font-size: 14px;
  color: #e0e0e6;
  margin-bottom: 4px;
}
.jmt-add-ep-label {
  font-size: 12px;
  color: #7a7a8a;
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
.jmt-batch-count {
  font-size: 12px;
  color: #7a7a8a;
  align-self: center;
}
</style>

<style>
.jmt-task-modal .n-card-content {
  display: contents;
}
</style>
