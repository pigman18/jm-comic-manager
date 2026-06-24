<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-global-style />
    <n-message-provider>
      <n-dialog-provider>
      <div id="jm-app-root">
        <aside class="jmz-sidebar" v-if="!isDetail">
          <div class="jmz-sidebar-head" style="display:none">
            <img src="/icon.ico" class="jmz-app-logo" alt="" />
            <span class="jmz-app-title">JM漫画管理器</span>
          </div>
          <nav class="jmz-sidebar-nav">
            <router-link :to="{ name: 'catalog' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'catalog' }">
              <span class="jmz-nav-icon">📂</span>
              <span>本地管理</span>
            </router-link>
            <router-link :to="{ name: 'search' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'search' }">
              <span class="jmz-nav-icon">🔍</span>
              <span>漫画搜索</span>
            </router-link>
            <router-link :to="{ name: 'week' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'week' }">
              <span class="jmz-nav-icon">📅</span>
              <span>每周必看</span>
            </router-link>
            <router-link :to="{ name: 'category' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'category' }">
              <span class="jmz-nav-icon">🏷️</span>
              <span>分类排行</span>
            </router-link>
            <router-link :to="{ name: 'serial' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'serial' }">
              <span class="jmz-nav-icon">📆</span>
              <span>每日连载</span>
            </router-link>
            <router-link :to="{ name: 'latest' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'latest' }">
              <span class="jmz-nav-icon">🆕</span>
              <span>最新发布</span>
            </router-link>
            <router-link :to="{ name: 'favorites' }" class="jmz-nav-item" :class="{ 'jmz-nav-item--active': route.name === 'favorites' }">
              <span class="jmz-nav-icon">⭐</span>
              <span>收藏列表</span>
            </router-link>
          </nav>
          <div class="jmz-sidebar-foot">
            <UserBar @logout="onUserLogout" />
          </div>
        </aside>
        <div class="jmz-main-area">
          <header class="jmz-app-header">
            <div class="jmz-header-left">
              <n-button text size="small" class="jmz-app-back" v-if="isDetail" @click="backToCatalog">
                <template #icon><n-icon :component="ArrowBack" /></template>
                返回
              </n-button>
              <span class="jmz-header-title">{{ pageTitle }}</span>
              <template v-if="!isDetail && route.name === 'catalog'">
                <div class="jmz-header-sync-group">
                  <n-button size="tiny" quaternary @click="syncApi('local2db')" :disabled="store.syncLocalToDb.busy" :loading="store.syncLocalToDb.busy">
                    <template #icon><n-icon :component="CloudUploadOutline" /></template>
                    <span>local→库</span>
                  </n-button>
                  <n-button size="tiny" quaternary @click="syncApi('db2local')" :disabled="store.syncDbToLocal.busy" :loading="store.syncDbToLocal.busy">
                    <template #icon><n-icon :component="CloudDownloadOutline" /></template>
                    <span>库→local</span>
                  </n-button>
                  <span class="jmz-header-sync-progress" v-if="store.syncLocalToDb.complete > 0 || store.syncDbToLocal.complete > 0">
                    {{ store.syncLocalToDb.complete }}/{{ store.syncLocalToDb.total || store.syncDbToLocal.complete }}/{{ store.syncDbToLocal.total }}
                  </span>
                </div>
              </template>
            </div>
            <div class="jmz-header-right">
              <template v-if="!isDetail">
                <div class="jmz-header-divider" />
                <div class="jmz-header-actions">
                  <n-button text size="small" class="jmz-header-btn" @click="showBatchDownload = true" v-if="currentPageComics.length > 0">
                    <template #icon><n-icon :component="DownloadOutline" /></template>
                    <span>下载全部</span>
                  </n-button>
                  <n-button text size="small" class="jmz-header-btn" @click="harmonyEnabled = !harmonyEnabled">
                    <template #icon><n-icon :component="harmonyEnabled ? EyeOutline : EyeOffOutline" :color="harmonyEnabled ? '#34d399' : undefined" /></template>
                    <span :style="harmonyEnabled ? { color: '#34d399' } : {}">和谐模式</span>
                  </n-button>
                  <n-button text size="small" class="jmz-header-btn" @click="doSign" :loading="signLoading">
                    <template #icon><n-icon :component="CalendarOutline" /></template>
                    <span>每日签到</span>
                  </n-button>
                  <n-button text size="small" class="jmz-header-btn" @click="openTasks">
                    <template #icon><n-icon :component="ListOutline" /></template>
                    <span>下载任务</span>
                    <span v-if="live.queueCount > 0" class="jmz-task-badge">{{ live.queueCount }}</span>
                  </n-button>
                </div>
              </template>
              <template v-else>
                <div class="jmz-header-actions">
                  <n-button text size="small" class="jmz-header-btn" @click="openTasks">
                    <template #icon><n-icon :component="ListOutline" /></template>
                    <span>下载任务</span>
                    <span v-if="live.queueCount > 0" class="jmz-task-badge">{{ live.queueCount }}</span>
                  </n-button>
                </div>
              </template>
            </div>
          </header>
          <main class="jmz-app-main">
            <router-view v-slot="{ Component }">
              <keep-alive :include="['CatalogPage', 'SearchPage', 'WeekPage', 'CategoryPage', 'SerialPage', 'LatestPage', 'FavoritesPage']">
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </main>
        </div>
        <LoginDialog v-model:show="showLoginDialog" @login-success="onLoginSuccess" />
        <TasksDialog v-model:show="showTasks" />
        <BatchDownloadDialog v-model:show="showBatchDownload" :comics="currentPageComics" />
      </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, onMounted, onUnmounted, nextTick } from 'vue'
import { zhCN, dateZhCN, darkTheme, createDiscreteApi } from 'naive-ui'
import { ArrowBack, CloudUploadOutline, CloudDownloadOutline, ListOutline, DownloadOutline, CalendarOutline, EyeOffOutline, EyeOutline } from '@vicons/ionicons5'
import { useRoute, useRouter } from 'vue-router'
import { useJmLiveStore } from '@/stores/jmLive'
import { useJmTasksStore } from '@/stores/jmTasks'
import { useUserStore } from '@/stores/user'
import { API } from '@/constants'
import { postJson } from '@/api'
import type { Comic } from '@/types'
import TasksDialog from '@/components/TasksDialog.vue'
import BatchDownloadDialog from '@/components/BatchDownloadDialog.vue'
import LoginDialog from '@/components/LoginDialog.vue'
import UserBar from '@/components/UserBar.vue'
import { peekCatalogReturnQuery } from '@/utils/catalogReturn'

import sensitiveWordsRaw from '@/assets/sensitive-words.txt?raw'

const _sensitiveWords = [...new Set(
  sensitiveWordsRaw.split('\n').map(s => s.trim()).filter(Boolean)
)].sort((a, b) => b.length - a.length)
const _sensitiveRe = new RegExp(
  _sensitiveWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'gi'
)

const route = useRoute()
const router = useRouter()
const store = useJmLiveStore()
const live = useJmLiveStore()
const tasksStore = useJmTasksStore()
const showTasks = ref(false)
const showLoginDialog = ref(false)
const isDetail = computed(() => route.name === 'detail')
const userStore = useUserStore()
const pageTitle = computed(() => {
  const map: Record<string, string> = {
    catalog: '本地管理',
    search: '漫画搜索',
    week: '每周必看',
    category: '分类排行',
    serial: '每日连载',
    latest: '最新发布',
    favorites: '收藏列表',
    detail: '漫画详情',
    meta: '漫画元数据',
  }
  return map[String(route.name)] || ''
})
provide('jmzOpenTasks', () => { showTasks.value = true })
provide('sendWs', (msg: string) => { try { ws?.send(msg) } catch {} })

const currentPageComics = ref<Comic[]>([])
provide('currentPageComics', currentPageComics)
const showBatchDownload = ref(false)

const harmonyEnabled = ref(localStorage.getItem('harmonyEnabled') === 'true')
provide('harmonyEnabled', harmonyEnabled)
provide('applyHarmony', applyHarmony)
watch(harmonyEnabled, (v) => {
  localStorage.setItem('harmonyEnabled', String(v))
  applyHarmony()
})
watch(currentPageComics, () => {
  if (harmonyEnabled.value) nextTick(applyHarmony)
})
watch(() => route.name, () => {
  if (harmonyEnabled.value) nextTick(applyHarmony)
})

function harmonyText(text: string): string {
  if (!text) return text
  return text.replace(_sensitiveRe, match => '*'.repeat(match.length))
}
function applyHarmony() {
  document.documentElement.classList.toggle('harmonize', harmonyEnabled.value)
  if (harmonyEnabled.value) {
    document.querySelectorAll('.xxx-text').forEach(el => {
      if (!(el instanceof HTMLElement)) return
      if (!el.dataset.orig) el.dataset.orig = el.textContent || ''
      el.textContent = harmonyText(el.dataset.orig)
    })
    document.querySelectorAll('.xxx-img').forEach(el => {
      if (!(el instanceof HTMLImageElement)) return
      if (el.dataset._harmonyPending) return
      if (el.src === el.dataset._harmonySrc) return
      // immediately stop original from loading, so the spinner stays
      const origSrc = el.src
      if (!origSrc || origSrc.startsWith('data:')) {
        // already a data URL or no src, process directly if loaded
        if (el.complete && el.naturalWidth > 0) { tryApplyHarmonyImg(el, origSrc); return }
        el.dataset._harmonyPending = '1'
        el.addEventListener('load', () => {
          delete el.dataset._harmonyPending
          if (!harmonyEnabled.value) return
          tryApplyHarmonyImg(el, el.src)
        }, { once: true })
        return
      }
      el.dataset._harmonyOrig = origSrc
      el.removeAttribute('src')
      el.dataset._harmonyPending = '1'
      const temp = new Image()
      temp.crossOrigin = 'anonymous'
      temp.onload = () => {
        tryApplyHarmonyImg(el, origSrc, temp)
      }
      temp.onerror = () => {
        // fallback: let the original image show
        el.src = origSrc
        delete el.dataset._harmonyPending
        el.addEventListener('load', () => {
          delete el.dataset._harmonyPending
          if (!harmonyEnabled.value) return
          tryApplyHarmonyImg(el, origSrc)
        }, { once: true })
      }
      temp.src = origSrc
    })
  } else {
    document.querySelectorAll('.xxx-text').forEach(el => {
      if (!(el instanceof HTMLElement)) return
      if (el.dataset.orig) el.textContent = el.dataset.orig
    })
    document.querySelectorAll('.xxx-img').forEach(el => {
      if (!(el instanceof HTMLImageElement)) return
      delete el.dataset._harmonyPending
      delete el.dataset.harmonyReady
      if (el.dataset._harmonyOrig) {
        el.src = el.dataset._harmonyOrig
        delete el.dataset._harmonySrc
        delete el.dataset._harmonyOrig
      }
    })
  }
}

function tryApplyHarmonyImg(img: HTMLImageElement, origSrc: string, tempImg?: HTMLImageElement) {
  delete img.dataset._harmonyPending
  try {
    const dw = img.width || 240
    const dh = img.height || 320
    const dataUrl = createHarmonyDataUrl(tempImg || img, dw, dh)
    img.dataset._harmonySrc = dataUrl
    img.src = dataUrl
  } catch {
    if (origSrc) img.src = origSrc
  }
  img.dataset.harmonyReady = '1'
}

function createHarmonyDataUrl(srcImg: HTMLImageElement, outW: number, outH: number): string {
  const BLOCK = 24
  const bw = Math.max(1, Math.ceil(outW / BLOCK))
  const bh = Math.max(1, Math.ceil(outH / BLOCK))
  const tiny = document.createElement('canvas')
  tiny.width = bw; tiny.height = bh
  const tc = tiny.getContext('2d')!
  tc.imageSmoothingEnabled = false
  tc.drawImage(srcImg, 0, 0, bw, bh)
  const td = tc.getImageData(0, 0, bw, bh)

  const d = td.data
  const freq = new Map<number, number>()
  for (let i = 0; i < d.length; i += 4) {
    const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)
    freq.set(key, (freq.get(key) || 0) + 1)
  }
  let bestKey = 0, bestCnt = 0
  for (const [k, c] of freq) { if (c > bestCnt) { bestCnt = c; bestKey = k } }

  const out = document.createElement('canvas')
  out.width = outW; out.height = outH
  const oc = out.getContext('2d')!
  const dr = (bestKey >> 10) & 0x1f, dg = (bestKey >> 5) & 0x1f, db = bestKey & 0x1f
  oc.fillStyle = '#' + [dr << 3, dg << 3, db << 3].map(c => c.toString(16).padStart(2, '0')).join('')
  oc.fillRect(0, 0, outW, outH)
  oc.globalAlpha = 0.7
  oc.imageSmoothingEnabled = false
  oc.drawImage(tiny, 0, 0, outW, outH)
  return out.toDataURL('image/jpeg', 0.85)
}

const signLoading = ref(false)
async function doSign() {
  signLoading.value = true
  try {
    const j = await postJson('/account/sign')
    if (j.ok) message.success(j.msg || '签到成功')
    else message.error(j.message || '签到失败')
  } catch (e: any) {
    message.error(e.message || '签到失败')
  } finally {
    signLoading.value = false
  }
}

function openTasks() { showTasks.value = true }
function backToCatalog() {
  if (route.query.from === 'search') {
    router.push({ name: 'search' })
  } else if (route.query.from === 'week') {
    router.push({ name: 'week' })
  } else if (route.query.from === 'category') {
    router.push({ name: 'category' })
  } else if (route.query.from === 'serial') {
    router.push({ name: 'serial' })
  } else if (route.query.from === 'latest') {
    router.push({ name: 'latest' })
  } else {
    router.push({ name: 'catalog', query: peekCatalogReturnQuery() })
  }
}
async function syncApi(dir: 'local2db' | 'db2local') {
  try { await postJson(`/sync/${dir}`) } catch { /* ignore */ }
}

const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#3b82f6',
    primaryColorPressed: '#1d4ed8',
  },
}

const { message } = createDiscreteApi(['message'], {
  configProviderProps: { theme: darkTheme, themeOverrides },
})

let ws: WebSocket | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = location.host
  const url = `${proto}//${host}${API}/ws`
  ws = new WebSocket(url)

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      // 旧协议（同步等）→ jmLive
      store.ingestWsPayload(msg)
      // task-manager 协议 → jmTasks
      if (msg.type && ['init','added','removed','progress','completed','error','paused','started'].includes(msg.type)) {
        tasksStore.handleWsMessage(msg)
      }
    } catch { /* ignore */ }
  }

  ws.onclose = () => {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
    ws = null
    reconnectTimer = setTimeout(connectWs, 3000)
  }

  ws.onopen = () => {
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = setInterval(() => {
      try { ws?.send(JSON.stringify({ type: 'ping' })) } catch { /* ignore */ }
    }, 15000)
  }
}

function onUserLogout() {
  showLoginDialog.value = true
}

function onLoginSuccess() {
  showLoginDialog.value = false
}

onMounted(async () => {
  connectWs()
  await userStore.checkSession()
  if (!userStore.loggedIn) {
    showLoginDialog.value = true
  }
  if (harmonyEnabled.value) nextTick(applyHarmony)
})

onUnmounted(() => {
  if (pingTimer) clearInterval(pingTimer)
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
})
</script>

<style>
#jm-app-root {
  height: 100vh;
  display: flex;
}

.jmz-sidebar {
  width: 180px;
  flex-shrink: 0;
  background: #16161a;
  border-right: 1px solid rgba(46, 46, 53, 0.6);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 100;
}

.jmz-sidebar-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 44px;
  border-bottom: 1px solid rgba(46, 46, 53, 0.5);
  flex-shrink: 0;
}

.jmz-app-logo {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  flex-shrink: 0;
}
.jmz-app-title {
  font-size: 18px;
  font-weight: 800;
  color: #e0e0e6;
  letter-spacing: -0.02em;
}

.jmz-sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px;
  overflow-y: auto;
}

.jmz-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #9b9bb4;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
}
.jmz-nav-item:hover {
  color: #e0e0e6;
  background: rgba(255, 255, 255, 0.04);
}
.jmz-nav-item--active {
  color: #e0e0e6;
  background: rgba(37, 99, 235, 0.15);
  font-weight: 600;
}

.jmz-nav-icon {
  font-size: 15px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.jmz-sidebar-foot {
  padding: 10px 12px;
  border-top: 1px solid rgba(46, 46, 53, 0.5);
}

.jmz-main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.jmz-app-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 44px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(22, 22, 26, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(46, 46, 53, 0.6);
  gap: 8px;
}

.jmz-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.jmz-header-title {
  font-size: 14px;
  font-weight: 600;
  color: #e8e8f0;
  white-space: nowrap;
}
.jmz-header-divider {
  width: 1px;
  height: 20px;
  background: rgba(46, 46, 53, 0.6);
  flex-shrink: 0;
}
.jmz-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.jmz-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.jmz-header-btn {
  color: #9b9bb4 !important;
  padding: 0 8px !important;
  font-size: 12px !important;
  height: 28px !important;
}
.jmz-header-btn:hover {
  color: #e0e0e6 !important;
}

.jmz-header-sync-group {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(46, 46, 53, 0.35);
  border-radius: 6px;
  padding: 2px;
}
.jmz-header-sync-group .n-button {
  font-size: 11px !important;
  height: 24px !important;
}

.jmz-header-sync-progress {
  font-size: 11px;
  color: #7a7a8a;
  padding: 0 8px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.jmz-app-back {
  color: #9b9bb4 !important;
}
.jmz-app-back:hover {
  color: #c4c4d6 !important;
}

.jmz-task-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  margin-left: 2px;
}

.jmz-app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-harmony-checkbox {
  display: flex;
  align-items: center;
  margin: 0;
}
.jmz-harmony-checkbox .n-checkbox__label {
  font-size: 12px !important;
  color: #9b9bb4 !important;
}

.harmonize img.xxx-img {
  opacity: 0 !important;
}
.harmonize img.xxx-img[data-harmony-ready] {
  opacity: 1 !important;
}

/* === shared card + grid + skeleton === */
.jmz-card {
  width: 100%;
  min-width: 0;
  max-width: none;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: linear-gradient(180deg, #22222a 0%, #1a1a20 100%);
  border: 1px solid #2e2e35;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 12px 28px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  cursor: pointer;
  outline: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.jmz-card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}
.jmz-skel-grid {
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
}
.jmz-skel-card {
  cursor: default;
  pointer-events: none;
}
.jmz-skel-cover {
  aspect-ratio: 3 / 4;
  background: linear-gradient(90deg, #2a2a30 0%, #35353d 50%, #2a2a30 100%);
  background-size: 200% 100%;
  animation: jmz-shimmer 1.1s ease-in-out infinite;
  border-radius: 8px 8px 0 0;
}
.jmz-skel-lines {
  height: 72px;
  margin: 12px 14px 14px;
  border-radius: 8px;
  background: #2a2a30;
}
@keyframes jmz-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.jmz-card.tone-1 { border-left-color: #3b82f6; }
.jmz-card.tone-2 { border-left-color: #8b5cf6; }
.jmz-card.tone-3 { border-left-color: #10b981; }
.jmz-card.tone-4 { border-left-color: #f59e0b; }

@media (max-width: 768px) {
  .jmz-sidebar {
    width: 52px;
  }
  .jmz-sidebar-head .jmz-app-title,
  .jmz-nav-item span:last-child {
    display: none;
  }
  .jmz-nav-item {
    justify-content: center;
    padding: 9px 0;
  }
  .jmz-nav-icon {
    width: auto;
  }
}
</style>
