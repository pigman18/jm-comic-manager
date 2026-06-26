<template>
  <div class="jmz-page jmz-serial-page">
    <div class="jmz-serial-header">
      <section class="jmz-panel jmz-panel--pad">
        <div class="jmt-cmt-form">
          <div class="jmt-cmt-input-wrap">
            <n-input v-model:value="commentText" type="textarea"
              placeholder="发表闲聊评论"
              :disabled="postingComment"
              :autosize="{ minRows: 2, maxRows: 4 }" />
            <n-popover trigger="click" placement="bottom-end">
              <template #trigger>
                <n-button quaternary size="tiny" class="jmt-cmt-emoji-btn">
                  <template #icon><n-icon :component="HappyOutline" size="18" /></template>
                </n-button>
              </template>
              <div class="jmt-cmt-emoji-grid">
                <img v-for="e in emojis" :key="e" :src="emojiImageUrl(e)"
                  :alt="e" class="jmt-cmt-emoji-item" @click="insertEmoji(e)" />
              </div>
            </n-popover>
          </div>
          <div class="jmt-cmt-form-actions">
            <n-button size="tiny" type="primary"
              :disabled="!commentText.trim()"
              :loading="postingComment"
              @click="postComment">发表</n-button>
          </div>
        </div>
      </section>
      <section class="jmz-panel jmz-panel--pad jmz-forum-bar">
        <div class="jmz-forum-modes">
          <button
            v-for="m in modeOptions"
            :key="m.value"
            class="jmz-forum-mode-btn"
            :class="{ 'jmz-forum-mode-btn--active': m.value === activeMode }"
            :disabled="loading"
            @click="onModeClick(m.value)"
          >{{ m.label }}</button>
        </div>
        <div v-if="loading" class="jmz-cat-bar-track"><div class="jmz-cat-bar-fill" /></div>
      </section>
      <div v-if="pages > 0 && list.length > 0" class="jmz-forum-pager">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pages"
          :show-size-picker="false"
          :disabled="loading"
          @update:page="doPage"
          size="small"
        />
      </div>
    </div>

    <div class="jmz-serial-main" ref="mainScrollRef">
      <div v-if="loading" class="jmz-forum-spin">
        <n-spin size="large" />
      </div>
      <template v-else-if="list.length">
        <div v-for="c in list" :key="c.CID" class="jmz-forum-card">
          <img :src="avatarUrl(c.photo)" alt="" class="jmz-forum-avatar" />
          <div class="jmz-forum-body">
            <div class="jmz-forum-top">
              <span class="jmz-forum-user">{{ c.nickname || c.username }}</span>
              <n-tag v-if="c.spoiler === '1'" size="tiny" type="warning" bordered>含剧透</n-tag>
              <span class="jmz-forum-time">{{ c.addtime }}</span>
            </div>
            <div v-if="c.expinfo?.level_name" class="jmz-forum-level">{{ c.expinfo.level_name }}</div>
            <div class="jmz-forum-content" v-html="c.content"></div>
            <div class="jmz-forum-actions">
              <span class="jmz-forum-action-btn" role="button" tabindex="0" @click="startReply(c)" @keyup.enter="startReply(c)">回复</span>
              <span class="jmz-forum-likes">👍 {{ c.likes || 0 }}</span>
              <span v-if="c.AID && c.AID !== '0'" class="jmz-forum-aid" role="link" tabindex="0" @click="openMeta(Number(c.AID))" @keyup.enter="openMeta(Number(c.AID))">JM{{ c.AID }}</span>
            </div>
            <div v-if="replyingTo === c.CID" class="jmt-cmt-reply-box">
              <div class="jmt-cmt-reply-indicator">
                <span class="jmt-cmt-reply-label">回复 @{{ c.nickname || c.username }}</span>
              </div>
              <div class="jmt-cmt-reply-input-wrap">
                <n-input v-model:value="replyText" type="textarea"
                  placeholder="输入回复内容"
                  :disabled="postingReply"
                  :autosize="{ minRows: 2, maxRows: 4 }" />
                <n-popover trigger="click" placement="bottom-end">
                  <template #trigger>
                    <n-button quaternary size="tiny" class="jmt-cmt-emoji-btn">
                      <template #icon><n-icon :component="HappyOutline" size="18" /></template>
                    </n-button>
                  </template>
                  <div class="jmt-cmt-emoji-grid">
                    <img v-for="e in emojis" :key="e" :src="emojiImageUrl(e)"
                      :alt="e" class="jmt-cmt-emoji-item" @click="replyText += e" />
                  </div>
                </n-popover>
              </div>
              <div class="jmt-cmt-reply-actions">
                <n-button size="tiny" quaternary @click="replyingTo = null">取消</n-button>
                <n-button size="tiny" type="primary"
                  :disabled="!replyText.trim()"
                  :loading="postingReply"
                  @click="postReply(c.CID)">回复</n-button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <n-empty v-else description="暂无内容" />
    </div>
  </div>
  <MetaPageDialog v-model:show="metaDialogShow" :num="metaDialogNum" />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onActivated, inject, type Ref } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getJson, postJson } from '@/api'
import type { Comic } from '@/types'
import MetaPageDialog from '@/components/MetaPageDialog.vue'
import { HappyOutline } from '@vicons/ionicons5'

interface ModeOption { label: string; value: string }

const PAGE_SIZE = 10

const router = useRouter()
const route = useRoute()

const modeOptions: ModeOption[] = [
  { label: '全部', value: 'all' },
  { label: '漫画', value: 'manhua' },
  { label: '闲聊', value: 'chat' },
  { label: '我的', value: 'mine' },
]

const loading = ref(false)
const list = ref<any[]>([])
const activeMode = ref('all')
const currentPage = ref(1)
const total = ref(0)

const currentPageComics = inject<Ref<Comic[]>>('currentPageComics')!
const emptyComics = ref<Comic[]>([])
watch(list, () => { currentPageComics.value = emptyComics.value }, { immediate: true })

const cachedList = ref<any[]>([])
const cachedMode = ref('all')
const cachedPage = ref(1)
const cachedTotal = ref(0)
const scrollTop = ref(0)
const mainScrollRef = ref<HTMLElement | null>(null)
const metaDialogNum = ref(0)
const metaDialogShow = ref(false)
const message = useMessage()

const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const commentText = ref('')
const postingComment = ref(false)
const replyingTo = ref<string | null>(null)
const replyText = ref('')
const postingReply = ref(false)

const emojis = [
  '😀','😂','🤣','😊','😍','🤔','😜','😎',
  '👍','🔥','💯','⭐','🎉','❤️','😢','😡',
  '🥺','😱','🤗','😈','👻','🎃','💀','👽',
  '👋','✌️','🤞','👌','🤙','💪','🙏','💅',
  '🐱','🐶','🐼','🐸','🐷','🌹','🌸','🌺',
  '🍕','🍔','🌮','🍩','🎂','🍺','☕','🎵',
  '✨','💥','💫','🌈','⚡','🎶','🎈','🎊',
]

function emojiImageUrl(e: string): string {
  const code = e.codePointAt(0)
  if (!code) return ''
  return `https://cdn.jsdelivr.net/emojione/assets/3.1/png/32/${code.toString(16)}.png`
}

function insertEmoji(e: string) {
  commentText.value += e
}

async function postComment() {
  const text = commentText.value.trim()
  if (!text) return
  postingComment.value = true
  try {
    const j = await postJson(`/comment`, { comment: text, aid: '' })
    if (j.ok) {
      message.success(j.msg || j.message || '评论成功')
      commentText.value = ''
      loadData()
    } else {
      message.error(j.message || '评论失败')
    }
  } catch (e: any) {
    message.error(String(e?.message || e))
  } finally {
    postingComment.value = false
  }
}

let _syncingUrl = false

watch(() => route.query, (q) => {
  if (route.name !== 'forum' || _syncingUrl) return
  const mode = String(q.mode || '')
  if (mode && modeOptions.some(m => m.value === mode)) {
    activeMode.value = mode
    if (!cachedList.value.length) loadData()
  }
}, { immediate: true })

onBeforeRouteLeave((_to, _from, next) => {
  if (list.value.length) {
    cachedList.value = [...list.value]
    cachedMode.value = activeMode.value
    cachedPage.value = currentPage.value
    cachedTotal.value = total.value
    scrollTop.value = mainScrollRef.value?.scrollTop || 0
  }
  next()
})

let _firstActivation = true

onActivated(() => {
  const q = route.query
  const mode = String(q.mode || '')

  if (mode && modeOptions.some(m => m.value === mode)) {
    if (_firstActivation) { _firstActivation = false; return }
    activeMode.value = mode
    cachedList.value = []
    syncUrl()
    loadData()
    return
  }

  if (_firstActivation) {
    _firstActivation = false
    if (!cachedList.value.length) loadData()
    return
  }

  if (cachedList.value.length > 0) {
    list.value = cachedList.value
    activeMode.value = cachedMode.value
    currentPage.value = cachedPage.value
    total.value = cachedTotal.value
    syncUrl()
    nextTick(() => {
      if (mainScrollRef.value) mainScrollRef.value.scrollTop = scrollTop.value
    })
  } else {
    loadData()
  }
})

function syncUrl() {
  _syncingUrl = true
  router.replace({ name: 'forum', query: { mode: activeMode.value } }).catch(() => {}).finally(() => { _syncingUrl = false })
}

async function loadData() {
  loading.value = true
  list.value = []
  try {
    const url = activeMode.value === 'mine'
      ? `/forum?my=1&page=${currentPage.value}`
      : `/forum/list?mode=${activeMode.value}&page=${currentPage.value}`
    const j = await getJson(url)
    if (j.ok) {
      list.value = j.list || []
      total.value = j.total || 0
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function doPage(p: number) {
  currentPage.value = p
  loadData()
}

function onModeClick(mode: string) {
  if (mode === activeMode.value) return
  activeMode.value = mode
  currentPage.value = 1
  cachedList.value = []
  syncUrl()
  loadData()
}

function startReply(c: any) {
  if (replyingTo.value === c.CID) {
    replyingTo.value = null
    replyText.value = ''
    return
  }
  replyingTo.value = c.CID
  replyText.value = ''
}

async function postReply(cid: string) {
  const text = replyText.value.trim()
  if (!text) return
  postingReply.value = true
  try {
    const j = await postJson(`/comment`, { comment: text, aid: '', comment_id: cid })
    if (j.ok) {
      message.success(j.msg || j.message || '回复成功')
      replyText.value = ''
      replyingTo.value = null
      loadData()
    } else {
      message.error(j.message || '回复失败')
    }
  } catch (e: any) {
    message.error(String(e?.message || e))
  } finally {
    postingReply.value = false
  }
}

function openMeta(id: number) {
  metaDialogNum.value = id
  metaDialogShow.value = true
}

function avatarUrl(photo: string) {
  if (!photo || photo.startsWith('nopic')) {
    return '/file/www.cdngwc.cc/media/users/nopic-null.gif?originUrl=https%3A%2F%2Fwww.cdngwc.cc%2Fmedia%2Fusers%2Fnopic-null.gif'
  }
  return `/file/www.cdngwc.cc/media/users/orig/${photo}?originUrl=${encodeURIComponent('https://www.cdngwc.cc/media/users/orig/' + photo)}`
}
</script>

<style scoped>
.jmz-serial-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jmz-serial-header {
  flex-shrink: 0;
  margin: 12px;
}

.jmz-serial-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
}

.jmz-forum-bar {
  position: relative;
}

.jmz-forum-pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.jmz-forum-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.jmz-forum-mode-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(46, 46, 53, 0.7);
  background: transparent;
  color: #9b9bb4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.jmz-forum-mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.jmz-forum-mode-btn:hover {
  background: rgba(46, 46, 53, 0.8);
  color: #c4c4d6;
}
.jmz-forum-mode-btn--active {
  background: #1a5cdb;
  color: #fff;
}

.jmz-forum-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.jmz-forum-card {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: #1e1e22;
  border-radius: 8px;
  border: 1px solid #2e2e35;
  margin-bottom: 10px;
}

.jmz-forum-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #2a2a30;
}

.jmz-forum-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jmz-forum-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.jmz-forum-user {
  font-size: 13px;
  font-weight: 700;
  color: #e0e0e6;
}

.jmz-forum-time {
  margin-left: auto;
  font-size: 11px;
  color: #7a7a8a;
}

.jmz-forum-level {
  font-size: 11px;
  color: #6b9fff;
}

.jmz-forum-content {
  font-size: 13px;
  color: #c4c4d6;
  line-height: 1.5;
}

.jmz-forum-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.jmz-forum-likes {
  font-size: 12px;
  color: #7a7a8a;
}

.jmz-forum-action-btn {
  font-size: 12px;
  color: #7a7a8a;
  cursor: pointer;
  user-select: none;
}
.jmz-forum-action-btn:hover {
  color: #3b82f6;
}

.jmz-forum-aid {
  font-size: 12px;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 600;
  margin-left: auto;
}
.jmz-forum-aid:hover {
  text-decoration: underline;
}

.jmt-cmt-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.jmt-cmt-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
.jmt-cmt-reply-box {
  margin-top: 8px;
  padding: 8px;
  background: #25252b;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.jmt-cmt-reply-input-wrap {
  position: relative;
}
.jmt-cmt-reply-indicator {
  font-size: 12px;
  color: #9b9bb4;
}
.jmt-cmt-reply-label {
  font-weight: 600;
}
.jmt-cmt-reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
.jmt-cmt-input-wrap {
  position: relative;
}
.jmt-cmt-emoji-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
}
.jmt-cmt-emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
  width: 260px;
  padding: 6px;
  background: #1e1e22;
  border: 1px solid #2e2e35;
  border-radius: 6px;
}
.jmt-cmt-emoji-item {
  cursor: pointer;
  width: 28px;
  height: 28px;
  text-align: center;
  padding: 2px;
  border-radius: 4px;
  object-fit: contain;
}
.jmt-cmt-emoji-item:hover {
  background: #2e2e35;
}
</style>
