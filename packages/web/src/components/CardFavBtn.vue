<template>
  <button
    class="jmz-card-fav-btn"
    :class="{ 'jmz-card-fav-btn--active': active }"
    :disabled="busy"
    :title="active ? '取消收藏' : '收藏'"
    @click.stop="openDialog"
  >
    <n-icon :component="active ? Flag : FlagOutline" size="15" />
    <span>{{ active ? '已收藏' : '收藏' }}</span>
  </button>
  <n-modal v-model:show="showDialog" title="收藏到" preset="card" style="width:400px" :bordered="false" closable>
    <n-select v-if="!loadingFolders" v-model:value="selectedFolder" :options="folderOptions" placeholder="选择收藏夹（默认全部）" clearable />
    <n-spin v-else size="small" style="display:flex;justify-content:center;padding:20px 0" />
    <template #footer>
      <n-space justify="end">
        <n-button @click="showDialog = false">取消</n-button>
        <n-button :loading="busy" :disabled="busy" type="primary" @click="confirm">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Flag, FlagOutline } from '@vicons/ionicons5'
import { getJson, postJson } from '@/api'
import { useMessage } from 'naive-ui'
import type { Comic } from '@/types'

const props = defineProps<{ comic: Comic; favorited?: boolean }>()
const message = useMessage()

const active = ref(props.favorited === true)
const busy = ref(false)
const showDialog = ref(false)
const folders = ref<{FID: string; name: string}[]>([])
const selectedFolder = ref('')
const loadingFolders = ref(false)

const folderOptions = computed(() => {
  const opts: {label: string; value: string}[] = [{ label: '全部', value: '' }]
  for (const f of folders.value) {
    opts.push({ label: f.name, value: f.FID })
  }
  return opts
})

async function openDialog() {
  if (active.value) {
    busy.value = true
    try {
      const j = await postJson(`/favorites/comics/${props.comic.id}/toggle`, { favorite: false })
      if (!j.ok) throw new Error(j.message || '操作失败')
      active.value = false
      message.success('已取消收藏')
    } catch (e: any) { message.error(e.message || '操作失败') }
    finally { busy.value = false }
    return
  }
  selectedFolder.value = ''
  loadingFolders.value = true
  showDialog.value = true
  try {
    const j = await getJson('/favorites/folders')
    if (!j.ok) throw new Error(j.message || '获取收藏夹失败')
    folders.value = j.folders || []
  } catch (e: any) { message.error(e.message || '获取收藏夹失败') }
  finally { loadingFolders.value = false }
}

async function confirm() {
  busy.value = true
  try {
    const j = await postJson(`/favorites/comics/${props.comic.id}/toggle`, { favorite: true, folder_id: selectedFolder.value || undefined })
    if (!j.ok) throw new Error(j.message || '操作失败')
    active.value = true
    message.success('已收藏')
    showDialog.value = false
  } catch (e: any) { message.error(e.message || '操作失败') }
  finally { busy.value = false }
}
</script>

<style scoped>
.jmz-card-fav-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: #7a7a8a;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.jmz-card-fav-btn:hover {
  color: #e0e0e6;
  background: rgba(46, 46, 53, 0.5);
}
.jmz-card-fav-btn--active {
  color: #ef4444;
}
.jmz-card-fav-btn--active:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}
.jmz-card-fav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>