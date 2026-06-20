import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postJson } from '@/api'

export const useReadStore = defineStore('reads', () => {
  const allReadIds = ref<Set<number>>(new Set())

  function isRead(id: number): boolean {
    return allReadIds.value.has(id)
  }

  async function checkReads(ids: number[]) {
    if (ids.length === 0) return
    const unknown = ids.filter(id => !allReadIds.value.has(id))
    if (unknown.length === 0) return
    try {
      const j = await postJson('/reads/check', { ids: unknown })
      if (j.ok && Array.isArray(j.readIds)) {
        const s = new Set(allReadIds.value)
        for (const id of j.readIds) s.add(id)
        allReadIds.value = s
      }
    } catch { /* ignore */ }
  }

  async function markRead(comicId: number, episodeId?: number) {
    const id = episodeId ?? comicId
    try {
      await postJson(`/comics/${comicId}/read`, { episodeId: id })
      const s = new Set(allReadIds.value)
      s.add(id)
      allReadIds.value = s
    } catch { /* ignore */ }
  }

  function reset() {
    allReadIds.value = new Set()
  }

  return { allReadIds, isRead, checkReads, markRead, reset }
})
