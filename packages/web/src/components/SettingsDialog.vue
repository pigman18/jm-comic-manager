<template>
  <n-modal
    :show="show"
    @update:show="emit('update:show', $event)"
    preset="card"
    :style="{ maxWidth: '620px', width: '92%' }"
    title="设置"
    :bordered="false"
    :segmented="false"
  >
    <div v-if="loading" class="jmz-settings-loading">
      <n-spin size="medium" />
    </div>

    <template v-else>
      <ConfigForm
        ref="formRef"
        :fields="fields"
        :initial-values="values"
        :saving="saving"
        @update:model="onModel"
      />

      <div class="jmz-settings-extra">
        <div class="jmz-settings-row">
          <span class="jmz-settings-label">和谐模式</span>
          <n-switch v-model:value="localHarmony" />
        </div>
      </div>

      <n-alert v-if="errorMsg" type="error" :show-icon="true" closable style="margin-top:12px" @close="errorMsg = ''">
        {{ errorMsg }}
      </n-alert>
    </template>

    <template #footer>
      <div class="jmz-settings-footer">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="handleSave" :loading="saving" :disabled="loading">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getJson, postJson, putJson } from '@/api'
import ConfigForm, { type ConfigField } from '@/components/ConfigForm.vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  'update:show': [v: boolean]
  'harmony-changed': [v: boolean]
}>()

const formRef = ref<any>(null)
const fields = ref<ConfigField[]>([])
const values = ref<Record<string, any>>({})
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const localHarmony = ref(false)
let latest: Record<string, any> = {}

function onModel(v: Record<string, any>) {
  latest = v
}

async function loadConfig() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [cfg, settings] = await Promise.all([
      getJson('/config'),
      getJson('/settings'),
    ])
    if (cfg.ok) {
      fields.value = cfg.fields || []
      values.value = cfg.values || {}
      latest = { ...values.value }
    } else {
      errorMsg.value = cfg.message || '读取配置失败'
    }
    if (settings.ok && settings.bundleConfig) {
      localHarmony.value = !!settings.bundleConfig.harmony
    }
  } catch (e: any) {
    errorMsg.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (v) => { if (v) loadConfig() })

async function handleSave() {
  saving.value = true
  errorMsg.value = ''
  try {
    const j = await postJson('/config', { values: latest })
    if (!j.ok) {
      errorMsg.value = j.message || '保存失败'
      return
    }
    await putJson('/settings', { bundleConfig: { harmony: localHarmony.value } })
    emit('harmony-changed', localHarmony.value)
    emit('update:show', false)
  } catch (e: any) {
    errorMsg.value = String(e?.message || e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.jmz-settings-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
.jmz-settings-extra {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #2e2e35;
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
