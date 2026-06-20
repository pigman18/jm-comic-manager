<template>
  <button
    class="jmz-card-meta-btn"
    :disabled="fetching"
    title="拉取元数据"
    @click.stop="handleClick"
  >
    <n-icon :component="RefreshOutline" size="16" :class="{ 'jmz-spin': fetching }" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RefreshOutline } from '@vicons/ionicons5'
import { postJson } from '@/api'
import { useMessage } from 'naive-ui'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic }>()
const message = useMessage()

const fetching = ref(false)

async function handleClick() {
  const c = props.comic
  fetching.value = true
  try {
    const j = await postJson(`/comics/${c.id}/fetch-meta`)
    if (!j.ok) {
      message.warning(j.message || '拉取失败')
      return
    }
    message.success(`#${c.id} 元数据已更新`)
  } catch (e: any) {
    message.error(String(e?.message || e))
  } finally {
    fetching.value = false
  }
}
</script>

<style scoped>
.jmz-card-meta-btn {
  position: absolute;
  top: 8px;
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
.jmz-card-meta-btn:hover {
  background: rgba(16, 185, 129, 0.85);
  color: #fff;
}
.jmz-card-meta-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.jmz-card-meta-btn:disabled:hover {
  background: rgba(0, 0, 0, 0.55);
  color: #c4c4d6;
}
.jmz-spin {
  animation: jmz-meta-spin 0.8s linear infinite;
}
@keyframes jmz-meta-spin {
  to { transform: rotate(360deg); }
}
</style>
