<template>
  <n-modal
    :show="show"
    :mask-closable="!loggingIn"
    :closeable="!loggingIn"
    @update:show="onClose"
    preset="card"
    :style="{ maxWidth: '400px', width: '90%' }"
    title="登录 JM 账户"
    :bordered="false"
    :segmented="false"
  >
    <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="form.username" placeholder="请输入用户名" :disabled="loggingIn" />
      </n-form-item>
      <n-form-item label="密码" path="password">
        <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="请输入密码" :disabled="loggingIn" @keyup.enter="handleLogin" />
      </n-form-item>
      <n-alert v-if="errorMsg" type="error" :show-icon="true" closable style="margin-bottom:12px" @close="errorMsg = ''">
        {{ errorMsg }}
      </n-alert>
      <n-button type="primary" block :loading="loggingIn" :disabled="loggingIn" @click="handleLogin">
        登录
      </n-button>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  show: boolean
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'login-success': []
}>()

const userStore = useUserStore()
const formRef = ref<any>(null)
const loggingIn = ref(false)
const errorMsg = ref('')
const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function onClose(v: boolean) {
  if (!loggingIn.value) {
    emit('update:show', v)
  }
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loggingIn.value = true
  errorMsg.value = ''
  const ok = await userStore.login(form.username, form.password)
  loggingIn.value = false
  if (ok) {
    emit('update:show', false)
    emit('login-success')
  } else {
    errorMsg.value = userStore.loginError || '登录失败'
  }
}

watch(() => props.show, (v) => {
  if (v) {
    errorMsg.value = ''
    form.username = userStore.storedUsername || ''
    form.password = userStore.storedPassword || ''
    if (userStore.configHasCredentials && !userStore.loggedIn) {
      nextTick(handleLogin)
    }
  }
})
</script>
