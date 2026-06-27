<template>
  <button
    class="jmz-card-star-btn"
    :title="starred ? '取消特别关注' : '特别关注'"
    @click.stop="handleClick"
  >
    <span v-if="!starred" style="font-size:16px;line-height:1">☆</span>
    <span v-else style="font-size:16px;line-height:1">⭐</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStarStore } from '@/stores/star'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic; onToggle?: () => void }>()
const starStore = useStarStore()

const starred = computed(() => starStore.isStarred(props.comic.id))

async function handleClick() {
  await starStore.toggleStar(props.comic.id)
  props.onToggle?.()
}
</script>

<style scoped>
.jmz-card-star-btn {
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
.jmz-card-star-btn:hover {
  background: rgba(250, 204, 21, 0.75);
  color: #fff;
}
</style>
