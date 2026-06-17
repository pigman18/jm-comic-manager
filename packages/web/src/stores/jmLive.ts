import { defineStore } from 'pinia'
import { useJmTasksStore } from './jmTasks'

const PHASE: Record<string, string> = {
  FETCH_COMIC: 'fetch_comic',
  SYNC_LOCAL_TO_DB: 'sync_local_to_db',
  SYNC_DB_TO_LOCAL: 'sync_db_to_local',
}
const STATE = {
  WAITING: 'waiting',
  START: 'start',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
}

function emptySyncSlot() {
  return { busy: false, complete: 0, total: 0 }
}

function pickNum(v: any, fallback?: number): number {
  return v != null && Number.isFinite(Number(v)) ? Number(v) : fallback ?? 0
}

export interface SyncSlot {
  busy: boolean
  complete: number
  total: number
}

export const useJmLiveStore = defineStore('jm-live', {
  state: () => ({
    lastPayload: null as any,
    zipByKey: {} as Record<string, any>,
    syncLocalToDb: emptySyncSlot() as SyncSlot,
    syncDbToLocal: emptySyncSlot() as SyncSlot,
  }),
  getters: {
    queueCount() {
      return useJmTasksStore().queueCount
    },
    downloadBusy() {
      return useJmTasksStore().downloadBusy
    },
  },
  actions: {
    ingestWsPayload(raw: any) {
      this.lastPayload = raw
      if (!raw || typeof raw !== 'object') return
      if (raw.phase === PHASE.SYNC_LOCAL_TO_DB) { this.applySyncSlot('syncLocalToDb', raw); return }
      if (raw.phase === PHASE.SYNC_DB_TO_LOCAL) { this.applySyncSlot('syncDbToLocal', raw); return }
      // 旧 FETCH_COMIC 进度由 taskManager 接管，此处忽略
    },
    applySyncSlot(key: 'syncLocalToDb' | 'syncDbToLocal', raw: any) {
      const complete = pickNum(raw.complete, 0)
      const total = pickNum(raw.total, 0)
      const st = raw.state
      if (st === STATE.SUCCESS || st === STATE.ERROR) { this[key] = { busy: false, complete, total }; return }
      this[key] = { busy: true, complete, total }
    },
    clearZipByKey() { this.zipByKey = {} },
  },
})
