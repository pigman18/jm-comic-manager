import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postJson } from '@/api'

export const useStarStore = defineStore('star', () => {
  const allStarredIds = ref<Set<number>>(new Set())

  function isStarred(id: number): boolean {
    return allStarredIds.value.has(id)
  }

  async function checkStars(ids: number[]) {
    if (ids.length === 0) return
    const unknown = ids.filter(id => !allStarredIds.value.has(id))
    if (unknown.length === 0) return
    try {
      const j = await postJson('/stars/check', { ids: unknown })
      if (j.ok && Array.isArray(j.starredIds)) {
        const s = new Set(allStarredIds.value)
        for (const id of j.starredIds) s.add(id)
        allStarredIds.value = s
      }
    } catch { /* ignore */ }
  }

  async function toggleStar(comicId: number) {
    try {
      const j = await postJson(`/comics/${comicId}/star`)
      if (j.ok) {
        const s = new Set(allStarredIds.value)
        if (j.starred) {
          s.add(comicId)
        } else {
          s.delete(comicId)
        }
        allStarredIds.value = s
      }
      return j.starred === true
    } catch { return false }
  }

  function reset() {
    allStarredIds.value = new Set()
  }

  return { allStarredIds, isStarred, checkStars, toggleStar, reset }
})
