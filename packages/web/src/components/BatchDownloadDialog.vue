<template>
  <n-modal v-model:show="model" title="批量下载" preset="card" style="width:90vw;max-width:700px;max-height:85vh" :bordered="false" closable>
    <div v-if="state === 'select'" class="jm-bd-list">
      <div class="jm-bd-head">
        <n-checkbox v-model:checked="allChecked" :indeterminate="someChecked" />全选
        <span class="jm-bd-count">已选 {{ checkedIds.length }} / {{ comics.length }}</span>
      </div>
      <div class="jm-bd-body">
        <div v-for="c in comics" :key="c.id" class="jm-bd-row">
          <n-checkbox v-model:checked="selected[c.id]" />
          <span class="jm-bd-num">JM{{ c.id }}</span>
          <span class="jm-bd-title">{{ c.name || '未知标题' }}</span>
          <span v-if="c.inStore" class="jm-bd-tag jm-bd-tag--store">已收录</span>
          <span v-else-if="c.canRead" class="jm-bd-tag jm-bd-tag--read">可读</span>
        </div>
      </div>
    </div>
    <div v-else class="jm-bd-progress">
      <div class="jm-bd-progress-text">{{ progressDone }} / {{ progressTotal }} 已提交</div>
      <n-progress type="line" :percentage="progressPct" :indicator-placement="'inside'" />
    </div>
    <template #footer>
      <n-space justify="end">
        <template v-if="state === 'select'">
          <n-button @click="model = false">取消</n-button>
          <n-button type="primary" :disabled="checkedIds.length === 0" @click="startDownload">开始下载</n-button>
        </template>
        <template v-else-if="state === 'done'">
          <n-button type="primary" @click="model = false">完成</n-button>
        </template>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { postJson } from '@/api'
import type { Comic } from '@/types'

const model = defineModel<boolean>('show', { required: true })

const props = defineProps<{
  comics: Comic[]
}>()

const state = ref<'select' | 'submitting' | 'done'>('select')
const selected = ref<Record<number, boolean>>({})
const progressDone = ref(0)
const progressTotal = ref(0)

watch(() => props.comics, (comics) => {
  const s: Record<number, boolean> = {}
  for (const c of comics) {
    s[c.id] = !c.canRead
  }
  selected.value = s
}, { immediate: true })

watch(model, (v) => {
  if (v) state.value = 'select'
})

const checkedIds = computed(() => {
  return Object.entries(selected.value)
    .filter(([, v]) => v)
    .map(([k]) => Number(k))
})

const allChecked = computed({
  get: () => props.comics.length > 0 && checkedIds.value.length === props.comics.length,
  set: (v) => {
    const s: Record<number, boolean> = {}
    for (const c of props.comics) s[c.id] = v
    selected.value = s
  },
})
const someChecked = computed(() => checkedIds.value.length > 0 && checkedIds.value.length < props.comics.length)
const progressPct = computed(() => progressTotal.value > 0 ? Math.round(progressDone.value / progressTotal.value * 100) : 0)

async function startDownload() {
  const ids = checkedIds.value
  if (!ids.length) return
  state.value = 'submitting'
  progressDone.value = 0
  progressTotal.value = ids.length
  for (const id of ids) {
    try {
      await postJson(`/comics/${id}/batch-add`, { withMeta: true })
    } catch { /* ignore */ }
    progressDone.value++
  }
  state.value = 'done'
}
</script>

<style scoped>
.jm-bd-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 12px;
  border-bottom: 1px solid #2e2e35;
}
.jm-bd-count {
  font-size: 12px;
  color: #7a7a8a;
  margin-left: auto;
}
.jm-bd-body {
  max-height: 60vh;
  overflow-y: auto;
  margin: 0 -16px;
  padding: 0 16px;
}
.jm-bd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #2a2a30;
}
.jm-bd-row:last-child {
  border-bottom: none;
}
.jm-bd-num {
  font-weight: 700;
  color: #9b9bb4;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.jm-bd-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c4c4d6;
}
.jm-bd-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}
.jm-bd-tag--read {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}
.jm-bd-tag--store {
  background: rgba(37, 99, 235, 0.2);
  color: #3b82f6;
}
.jm-bd-progress {
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.jm-bd-progress-text {
  font-size: 14px;
  color: #c4c4d6;
  text-align: center;
}
</style>
