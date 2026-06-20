import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postJson } from '@/api'

export const useBanStore = defineStore('ban', () => {
  const allBannedIds = ref<Set<number>>(new Set())

  function isBanned(id: number): boolean {
    return allBannedIds.value.has(id)
  }

  async function checkBans(ids: number[]) {
    if (ids.length === 0) return
    const unknown = ids.filter(id => !allBannedIds.value.has(id))
    if (unknown.length === 0) return
    try {
      const j = await postJson('/bans/check', { ids: unknown })
      if (j.ok && Array.isArray(j.bannedIds)) {
        const s = new Set(allBannedIds.value)
        for (const id of j.bannedIds) s.add(id)
        allBannedIds.value = s
      }
    } catch { /* ignore */ }
  }

  async function toggleBan(comicId: number) {
    try {
      const j = await postJson(`/comics/${comicId}/ban`)
      if (j.ok) {
        const s = new Set(allBannedIds.value)
        if (j.banned) {
          s.add(comicId)
        } else {
          s.delete(comicId)
        }
        allBannedIds.value = s
      }
      return j.banned === true
    } catch { return false }
  }

  function reset() {
    allBannedIds.value = new Set()
  }

  return { allBannedIds, isBanned, checkBans, toggleBan, reset }
})
