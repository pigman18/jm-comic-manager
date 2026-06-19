<template>
  <button
    class="jmz-card-fav-btn"
    :class="{ 'jmz-card-fav-btn--active': active }"
    :disabled="busy"
    :title="active ? '取消收藏' : '收藏'"
    @click.stop="toggle"
  >
    <n-icon :component="active ? Heart : HeartOutline" size="16" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Heart, HeartOutline } from '@vicons/ionicons5'
import { postJson } from '@/api'
import { useMessage } from 'naive-ui'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic; favorited?: boolean }>()
const message = useMessage()

const active = ref(props.favorited === true)
const busy = ref(false)

async function toggle() {
  busy.value = true
  try {
    const j = await postJson(`/favorites/comics/${props.comic.id}/toggle`, { favorite: !active.value })
    if (!j.ok) throw new Error(j.message || '操作失败')
    active.value = j.favorite
    message.success(active.value ? '已收藏' : '已取消收藏')
  } catch (e: any) {
    message.error(e.message || '操作失败')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.jmz-card-fav-btn {
  position: absolute;
  bottom: 44px;
  left: 8px;
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
.jmz-card-fav-btn:hover {
  background: rgba(239, 68, 68, 0.75);
  color: #fff;
}
.jmz-card-fav-btn--active {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
}
.jmz-card-fav-btn--active:hover {
  background: rgba(239, 68, 68, 0.35);
  color: #ef4444;
}
.jmz-card-fav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>