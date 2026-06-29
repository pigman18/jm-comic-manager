<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)">
    <n-card style="width:640px;height:680px;display:flex;flex-direction:column" content-style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column" :bordered="false" role="dialog" closable @close="close">
      <template #header>
        <span style="position:relative;display:inline-block;padding-left:26px;min-height:20px;line-height:1.4">
          <n-icon v-if="fetchRemote === false" :component="ServerOutline" size="20" style="color:#63e2b7;position:absolute;left:0;top:3px" />
          <n-icon v-else :component="CloudOutline" size="20" style="color:#f0b429;position:absolute;left:0;top:3px" />
          <span class="xxx-text">{{ dlgTitle }}</span>
        </span>
      </template>
      <OnlineMetaPage v-if="fetchRemote" :num="String(num)" :dialog="true" @close="close" @title-changed="onTitleChanged" />
      <MetaPage v-else :num="String(num)" :dialog="true" :fetch-remote="false" @close="close" @title-changed="onTitleChanged" />
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CloudOutline, ServerOutline } from '@vicons/ionicons5'
import MetaPage from '@/pages/MetaPage.vue'
import OnlineMetaPage from '@/pages/OnlineMetaPage.vue'

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
