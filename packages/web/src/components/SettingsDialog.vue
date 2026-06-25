<template>
  <n-modal
    :show="show"
    @update:show="emit('update:show', $event)"
    preset="card"
    :style="{ maxWidth: '420px', width: '90%' }"
    title="设置"
    :bordered="false"
    :segmented="false"
  >
    <div class="jmz-settings-body">
      <div class="jmz-settings-row">
        <span class="jmz-settings-label">和谐模式</span>
        <n-switch v-model:value="localHarmony" />
      </div>
    </div>
    <template #footer>
      <div class="jmz-settings-footer">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="handleSave" :loading="saving">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getJson, putJson } from '@/api'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  'update:show': [v: boolean]
  'harmony-changed': [v: boolean]
}>()

const localHarmony = ref(false)
const saving = ref(false)

async function loadConfig() {
  const j = await getJson('/settings')
  if (j.ok && j.bundleConfig) {
    localHarmony.value = !!j.bundleConfig.harmony
  }
}

watch(() => props.show, (v) => { if (v) loadConfig() })

async function handleSave() {
  saving.value = true
  try {
    const j = await putJson('/settings', { bundleConfig: { harmony: localHarmony.value } })
    if (j.ok) {
      emit('harmony-changed', localHarmony.value)
      emit('update:show', false)
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.jmz-settings-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.jmz-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.jmz-settings-label {
  font-size: 14px;
  color: #c4c4d6;
}
.jmz-settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
