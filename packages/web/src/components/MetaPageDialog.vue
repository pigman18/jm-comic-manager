<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)">
    <n-card style="width:640px;height:680px;display:flex;flex-direction:column" content-style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column" :bordered="false" role="dialog" closable @close="close">
      <template #header>
        <span class="xxx-text">{{ dlgTitle }}</span>
      </template>
      <MetaPage :num="String(num)" :dialog="true" :fetch-remote="fetchRemote" @close="close" @title-changed="onTitleChanged" />
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MetaPage from '@/pages/MetaPage.vue'

const props = withDefaults(defineProps<{
  show: boolean
  num: number
  fetchRemote?: boolean
}>(), {
  fetchRemote: true
})
const emit = defineEmits<{
  'update:show': [v: boolean]
}>()

const dlgTitle = ref('漫画元数据')

function onTitleChanged(title: string) { dlgTitle.value = title }
function close() { emit('update:show', false) }
</script>

<style scoped>
</style>
