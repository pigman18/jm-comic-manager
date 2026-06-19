<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)">
    <n-card style="width:640px;height:600px;display:flex;flex-direction:column" content-style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column" :bordered="false" role="dialog" closable @close="close">
      <template #header>
        <div class="jmt-meta-dlg-header">
          <span>{{ dlgTitle }}</span>
          <n-button text size="small" @click="jumpPage">
            <template #icon><n-icon :component="OpenOutline" /></template>
            单独打开
          </n-button>
        </div>
      </template>
      <MetaPage :num="String(num)" :dialog="true" @close="close" @title-changed="onTitleChanged" />
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { OpenOutline } from '@vicons/ionicons5'
import MetaPage from '@/pages/MetaPage.vue'

const props = defineProps<{
  show: boolean
  num: number
}>()
const emit = defineEmits<{
  'update:show': [v: boolean]
}>()

const router = useRouter()
const dlgTitle = ref('漫画元数据')

function onTitleChanged(title: string) { dlgTitle.value = title }
function close() { emit('update:show', false) }
function jumpPage() { close(); window.open(router.resolve({ name: 'meta', params: { num: props.num } }).href, '_blank') }
</script>

<style scoped>
.jmt-meta-dlg-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.jmt-meta-dlg-header > span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 700;
}
</style>
