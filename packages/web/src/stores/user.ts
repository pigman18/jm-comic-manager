import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { postJson, getJson } from '@/api'

export const useUserStore = defineStore('user', () => {
  const memberInfo = ref<any>(null)
  const loggingIn = ref(false)
  const loginError = ref('')
  const sessionChecked = ref(false)
  const storedUsername = ref('')
  const storedPassword = ref('')

  const loggedIn = computed(() => !!memberInfo.value)
  const configHasCredentials = computed(() => !!storedUsername.value && !!storedPassword.value)

  async function checkSession() {
    try {
      const j = await getJson('/settings')
      if (j.ok) {
        if (j.bundleConfig?.memberInfo) {
          memberInfo.value = j.bundleConfig.memberInfo
        }
        if (j.bundleConfig?.username) {
          storedUsername.value = j.bundleConfig.username
        }
        if (j.bundleConfig?.password) {
          storedPassword.value = j.bundleConfig.password
        }
      }
    } catch { /* ignore */ }
    sessionChecked.value = true
  }

  async function login(username: string, password: string): Promise<boolean> {
    loggingIn.value = true
    loginError.value = ''
    try {
      const j = await postJson('/login', { username, password })
      if (!j.ok) {
        loginError.value = j.message || '登录失败'
        return false
      }
      memberInfo.value = j.memberInfo
      if (username) storedUsername.value = username
      if (password) storedPassword.value = password
      loginError.value = ''
      return true
    } catch (e: any) {
      loginError.value = String(e?.message || e)
      return false
    } finally {
      loggingIn.value = false
    }
  }

  async function logout() {
    try {
      await postJson('/logout')
    } catch { /* ignore */ }
    memberInfo.value = null
    storedUsername.value = ''
    storedPassword.value = ''
  }

  return { memberInfo, loggedIn, loggingIn, loginError, sessionChecked, storedUsername, storedPassword, configHasCredentials, checkSession, login, logout }
})
