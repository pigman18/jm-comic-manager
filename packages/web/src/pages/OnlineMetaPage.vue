<template>
  <MetaPage :num="num" :dialog="dialog" :fetch-remote="true" :disable-default-chip="true" @close="emit('close')" @title-changed="emit('title-changed', $event)" @work-click="onWorkClick" @author-click="onAuthorClick" @tag-click="onTagClick">
    <template #info-suffix>
      <n-button v-if="inStore === false" size="tiny" type="primary" @click="addToStore">加入库</n-button>
    </template>
  </MetaPage>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { CloudOutline } from '@vicons/ionicons5'
import { getJson, postJson } from '@/api'
import MetaPage from './MetaPage.vue'

const props = withDefaults(defineProps<{
  num?: string
  dialog?: boolean
}>(), {})
const emit = defineEmits<{
  close: []
  'title-changed': [title: string]
}>()

const route = useRoute()
const router = useRouter()
const message = useMessage()

const inStore = ref<boolean | undefined>(undefined)
const albumNum = computed(() => Math.floor(Number(props.num || route.params.num)))

watch(albumNum, async (n) => {
  if (!Number.isFinite(n) || n < 1) { inStore.value = undefined; return }
  try {
    const j = await getJson(`/comics/${n}`)
    inStore.value = j.ok && !!j.comic
  } catch {
    inStore.value = false
  }
}, { immediate: true })

async function addToStore() {
  try {
    const j = await postJson(`/comics/${albumNum.value}/fetch-meta`)
    if (j.ok) {
      inStore.value = true
      message.success('已加入库')
    } else {
      message.error(j.message || '加入失败')
    }
  } catch (e: any) {
    message.error(String(e?.message || e))
  }
}

function onWorkClick(w: string) {
  if (props.dialog) emit('close')
  router.push({ name: 'search', query: { keyword: w, page: '1' } })
}

function onAuthorClick(a: string) {
  if (props.dialog) emit('close')
  router.push({ name: 'search', query: { keyword: a, page: '1' } })
}

function onTagClick(t: string) {
  if (props.dialog) emit('close')
  router.push({ name: 'search', query: { keyword: t, page: '1' } })
}
</script>
