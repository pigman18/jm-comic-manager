<template>
  <div class="jmz-cfg">
    <n-tabs v-model:value="activeGroup" type="segment" animated size="small">
      <n-tab-pane name="basic" tab="基本设置">
        <div class="jmz-cfg-fields">
          <template v-for="f in groups.basic" :key="f.key">
            <div class="jmz-cfg-field">
              <label class="jmz-cfg-label">{{ f.label }}</label>

              <!-- 密码 -->
              <n-input
                v-if="f.type === 'password'"
                v-model:value="model[f.key]"
                type="password"
                show-password-on="click"
                :placeholder="f.placeholder || ''"
                :disabled="saving"
              />

              <!-- 目录 / 文件 -->
              <div v-else-if="f.type === 'dir' || f.type === 'file'" class="jmz-cfg-browse">
                <n-input
                  v-model:value="model[f.key]"
                  :placeholder="f.placeholder || ''"
                  :disabled="saving"
                />
                <n-button size="small" @click="browse(f)" :disabled="saving">浏览</n-button>
              </div>

              <!-- 数字 -->
              <n-input-number
                v-else-if="f.type === 'number'"
                v-model:value="model[f.key]"
                :min="f.min"
                :max="f.max"
                :disabled="saving"
                style="width: 100%"
              />

              <!-- 布尔 -->
              <n-switch
                v-else-if="f.type === 'boolean'"
                v-model:value="model[f.key]"
                :disabled="saving"
              />

              <!-- 字符串数组 -->
              <n-dynamic-tags
                v-else-if="f.type === 'string[]'"
                v-model:value="model[f.key]"
                :disabled="saving"
              />

              <!-- 普通字符串 -->
              <n-input
                v-else
                v-model:value="model[f.key]"
                :placeholder="f.placeholder || ''"
                :disabled="saving"
              />

              <span v-if="f.requiresRestart" class="jmz-cfg-hint">修改后需重启生效</span>
            </div>
          </template>
        </div>
      </n-tab-pane>

      <n-tab-pane name="network" tab="网络设置">
        <div class="jmz-cfg-fields">
          <template v-for="f in groups.network" :key="f.key">
            <div class="jmz-cfg-field">
              <label class="jmz-cfg-label">{{ f.label }}</label>

              <n-input-number
                v-if="f.type === 'number'"
                v-model:value="model[f.key]"
                :min="f.min"
                :max="f.max"
                :disabled="saving"
                style="width: 100%"
              />
              <n-switch
                v-else-if="f.type === 'boolean'"
                v-model:value="model[f.key]"
                :disabled="saving"
              />
              <n-dynamic-tags
                v-else-if="f.type === 'string[]'"
                v-model:value="model[f.key]"
                :disabled="saving"
              />
              <n-input
                v-else
                v-model:value="model[f.key]"
                :placeholder="f.placeholder || ''"
                :disabled="saving"
              />

              <span v-if="f.requiresRestart" class="jmz-cfg-hint">修改后需重启生效</span>
            </div>
          </template>
        </div>
      </n-tab-pane>

      <n-tab-pane name="advanced" tab="高级设置">
        <div class="jmz-cfg-fields">
          <template v-for="f in groups.advanced" :key="f.key">
            <div class="jmz-cfg-field jmz-cfg-field--row">
              <label class="jmz-cfg-label">{{ f.label }}</label>
              <n-switch
                v-if="f.type === 'boolean'"
                v-model:value="model[f.key]"
                :disabled="saving"
              />
              <n-input
                v-else
                v-model:value="model[f.key]"
                :placeholder="f.placeholder || ''"
                :disabled="saving"
              />
            </div>
          </template>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'

export interface ConfigField {
  key: string
  label: string
  type: string
  group: string
  placeholder?: string
  requiresRestart?: boolean
  min?: number
  max?: number
}

const props = defineProps<{
  fields: ConfigField[]
  saving?: boolean
  initialValues?: Record<string, any>
}>()

const emit = defineEmits<{
  'update:model': [values: Record<string, any>]
}>()

const activeGroup = ref<'basic' | 'network' | 'advanced'>('basic')
const model = reactive<Record<string, any>>({})

const groups = computed(() => {
  const out: Record<string, ConfigField[]> = { basic: [], network: [], advanced: [] }
  for (const f of props.fields) {
    if (out[f.group]) out[f.group].push(f)
  }
  return out
})

/** 初始化：用 schema 的默认类型补齐缺失值，避免 n-input-number 收到 undefined */
function hydrate(values?: Record<string, any>) {
  for (const f of props.fields) {
    let v = values?.[f.key]
    if (v === undefined || v === null) {
      if (f.type === 'string[]') v = []
      else if (f.type === 'boolean') v = false
      else if (f.type === 'number') v = null
      else v = ''
    }
    if (f.type === 'string[]' && !Array.isArray(v)) v = []
    model[f.key] = v
  }
}

onMounted(() => hydrate(props.initialValues))
watch(() => props.initialValues, (v) => hydrate(v), { deep: true })
watch(model, () => {
  // 只回传 schema 字段，避免把临时字段带出去
  const out: Record<string, any> = {}
  for (const f of props.fields) out[f.key] = model[f.key]
  emit('update:model', out)
}, { deep: true })

async function browse(f: ConfigField) {
  const api = (window as any).ewvjs?.api
  if (!api) return
  const fn = f.type === 'dir' ? api.browseDir : api.browseFile
  if (typeof fn !== 'function') return
  const picked = await fn(model[f.key] || undefined).catch(() => '')
  if (picked) model[f.key] = picked
}

defineExpose({ getValues: () => {
  const out: Record<string, any> = {}
  for (const f of props.fields) out[f.key] = model[f.key]
  return out
} })
</script>

<style scoped>
.jmz-cfg-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 2px;
}
.jmz-cfg-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.jmz-cfg-field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.jmz-cfg-label {
  font-size: 13px;
  color: #c4c4d6;
  font-weight: 500;
}
.jmz-cfg-browse {
  display: flex;
  gap: 8px;
}
.jmz-cfg-browse .n-input {
  flex: 1;
}
.jmz-cfg-hint {
  font-size: 11px;
  color: #7a7a8a;
}
</style>
