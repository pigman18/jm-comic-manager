<template>
  <div v-if="userStore.loggedIn" class="jmz-sbar-user">
    <div class="jmz-sbar-top">
      <img v-if="memberInfo.photo && !memberInfo.photo.startsWith('nopic')" class="jmz-sbar-avatar" :src="avatarUrl" alt="" />
      <div v-else class="jmz-sbar-avatar jmz-sbar-avatar--letter">{{ memberInfo.username.charAt(0).toUpperCase() }}</div>
      <div class="jmz-sbar-info">
        <div class="jmz-sbar-name">{{ memberInfo.username }}</div>
        <div class="jmz-sbar-level">{{ memberInfo.level_name }}</div>
      </div>
    </div>
    <div class="jmz-sbar-exp">
      <div class="jmz-sbar-exp-track">
        <div class="jmz-sbar-exp-fill" :style="{ width: Math.min(memberInfo.expPercent || 0, 100) + '%' }"></div>
      </div>
      <div class="jmz-sbar-exp-labels">
        <span>Lv.{{ memberInfo.level }}</span>
        <span>{{ memberInfo.coin }} <span class="jmz-sbar-coin-icon">J</span></span>
      </div>
    </div>
    <button class="jmz-sbar-logout" @click="handleLogout">登出</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const emit = defineEmits<{
  logout: []
}>()

const userStore = useUserStore()

const memberInfo = computed(() => userStore.memberInfo)

const avatarUrl = computed(() => {
  if (!memberInfo.value?.photo || memberInfo.value.photo.startsWith('nopic')) return ''
  const originUrl = `https://www.cdngwc.cc/media/users/orig/${memberInfo.value.photo}`
  return `/file/www.cdngwc.cc/media/users/orig/${memberInfo.value.photo}?originUrl=${encodeURIComponent(originUrl)}`
})

async function handleLogout() {
  await userStore.logout()
  emit('logout')
}
</script>

<style scoped>
.jmz-sbar-user {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.jmz-sbar-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.jmz-sbar-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.jmz-sbar-avatar--letter {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
}
.jmz-sbar-info {
  flex: 1;
  min-width: 0;
}
.jmz-sbar-name {
  font-size: 13px;
  font-weight: 700;
  color: #e0e0e6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jmz-sbar-level {
  font-size: 10px;
  color: #6b9fff;
  font-weight: 600;
  margin-top: 1px;
}
.jmz-sbar-exp {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.jmz-sbar-exp-track {
  height: 4px;
  background: #2a2a30;
  border-radius: 999px;
  overflow: hidden;
}
.jmz-sbar-exp-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 999px;
  transition: width 0.3s ease;
}
.jmz-sbar-exp-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #7a7a8a;
}
.jmz-sbar-coin-icon {
  font-weight: 800;
  color: #f59e0b;
}
.jmz-sbar-logout {
  margin-top: 4px;
  width: 100%;
  padding: 5px 0;
  border: 1px solid #2e2e35;
  border-radius: 6px;
  background: transparent;
  color: #9b9bb4;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.jmz-sbar-logout:hover {
  background: #2e2e3566;
  color: #e0e0e6;
  border-color: #3d3d4a;
}
</style>
