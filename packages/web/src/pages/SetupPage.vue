<template>
  <div class="jmz-setup">
    <div class="jmz-setup-card">
      <div class="jmz-setup-head">
        <h1 class="jmz-setup-title">JM漫画管理器</h1>
        <p class="jmz-setup-sub">首次使用，请完成基础配置</p>
      </div>

      <div v-if="loading" class="jmz-setup-loading">
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

        <n-alert v-if="errorMsg" type="error" :show-icon="true" closable style="margin-top:14px" @close="errorMsg = ''">
          {{ errorMsg }}
        </n-alert>

        <div class="jmz-setup-foot">
          <n-button type="primary" size="large" :loading="saving" :disabled="saving" @click="handleSave">
            保存并进入
          </n-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getJson, postJson } from '@/api'
import ConfigForm, { type ConfigField } from '@/components/ConfigForm.vue'

const router = useRouter()
const formRef = ref<any>(null)
const fields = ref<ConfigField[]>([])
const values = ref<Record<string, any>>({})
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
let latest: Record<string, any> = {}

function onModel(v: Record<string, any>) {
  latest = v
}

async function load() {
  loading.value = true
  try {
    const j = await getJson('/config')
    if (j.ok) {
      fields.value = j.fields || []
      values.value = j.values || {}
      latest = { ...values.value }
    } else {
      errorMsg.value = j.message || '读取配置失败'
    }
  } catch (e: any) {
    errorMsg.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  errorMsg.value = ''
  // 必填校验：数据目录
  const dataDir = String(latest.dataDir || '').trim()
  if (!dataDir) {
    errorMsg.value = '请选择数据目录'
    return
  }

  saving.value = true
  try {
    const j = await postJson('/config', { values: latest, setupCompleted: true })
    if (!j.ok) {
      errorMsg.value = j.message || '保存失败'
      return
    }
    // 端口/数据目录变更需要重启后端才能生效：提示用户重启应用
    const restartKeys = ['dataDir', 'port', 'host', 'proxy', 'debug']
    const needRestart = (j.saved || []).some((k: string) => restartKeys.includes(k))
    if (needRestart) {
      const api = (window as any).ewvjs?.api
      if (api?.restartApp) {
        await api.restartApp()
        return
      }
    }
    router.replace({ name: 'catalog' })
  } catch (e: any) {
    errorMsg.value = String(e?.message || e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.jmz-setup {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 0%, #1c1c26 0%, #121216 60%);
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
}
.jmz-setup-card {
  width: 100%;
  max-width: 560px;
  background: linear-gradient(180deg, #22222a 0%, #1a1a20 100%);
  border: 1px solid #2e2e35;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}
.jmz-setup-head {
  margin-bottom: 20px;
  text-align: center;
}
.jmz-setup-title {
  font-size: 22px;
  font-weight: 800;
  color: #e8e8f0;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}
.jmz-setup-sub {
  font-size: 13px;
  color: #9b9bb4;
  margin: 0;
}
.jmz-setup-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}
.jmz-setup-foot {
  margin-top: 22px;
  display: flex;
  justify-content: center;
}
.jmz-setup-foot .n-button {
  min-width: 180px;
}
</style>
