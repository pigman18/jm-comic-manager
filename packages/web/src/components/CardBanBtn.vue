<template>
  <button
    class="jmz-card-ban-btn"
    :title="banned ? '移出黑名单' : '加入黑名单'"
    @click.stop="handleClick"
  >
    <n-icon v-if="!banned" :component="BanOutline" size="16" />
    <n-icon v-else :component="CheckmarkCircleOutline" size="16" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BanOutline, CheckmarkCircleOutline } from '@vicons/ionicons5'
import { useBanStore } from '@/stores/ban'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic; onToggle?: () => void }>()
const banStore = useBanStore()

const banned = computed(() => banStore.isBanned(props.comic.id))

async function handleClick() {
  await banStore.toggleBan(props.comic.id)
  props.onToggle?.()
}
</script>

<style scoped>
.jmz-card-ban-btn {
  position: absolute;
  top: 44px;
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
.jmz-card-ban-btn:hover {
  background: rgba(239, 68, 68, 0.85);
  color: #fff;
}
</style>
