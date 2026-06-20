import { defineStore } from 'pinia'
import { useJmLiveStore } from './jmLive'
import type { TaskItem } from '@/types'

export const useJmTasksStore = defineStore('jm-tasks', {
  state: () => ({
    tasks: [] as TaskItem[],
    statuses: [] as { status: string; label: string; icon: string; color: string }[],
  }),
  getters: {
    waitingCount(state) {
      return state.tasks.filter(t => t.status === 'waiting').length
    },
    downloadingCount(state) {
      return state.tasks.filter(t => t.status === 'downloading').length
    },
    queueCount(state) {
      return state.tasks.filter(t => t.status === 'waiting' || t.status === 'downloading').length
    },
    downloadBusy(state) {
      return state.tasks.some(t => t.status === 'downloading')
    },
  },
  actions: {
    handleWsMessage(msg: any) {
      const live = useJmLiveStore()
      switch (msg.type) {
        case 'init': {
          if (msg.tasks) this.tasks = msg.tasks
          if (msg.statuses) this.statuses = msg.statuses
          // 同步到 live.zipByKey 用于详情页
          for (const task of this.tasks) {
            this.syncZipByKey(task, live)
          }
          break
        }
        case 'added': {
          if (msg.task) {
            this.tasks = [...this.tasks, msg.task]
            this.syncZipByKey(msg.task, live)
          }
          break
        }
        case 'removed': {
          if (msg.id !== undefined) {
            const task = this.tasks.find(t => t.id === msg.id)
            this.tasks = this.tasks.filter(t => t.id !== msg.id)
            // 从 zipByKey 移除下载状态
            if (task && task.number) {
              const sk = String(task.number)
              if (live.zipByKey[sk]) {
                const copy = { ...live.zipByKey }
                delete copy[sk]
                live.zipByKey = copy
              }
            }
          }
          break
        }
        case 'progress': {
          if (msg.id !== undefined && msg.task) {
            const idx = this.tasks.findIndex(t => t.id === msg.id)
            if (idx !== -1) {
              this.tasks[idx] = { ...this.tasks[idx], ...msg.task }
              this.syncZipByKey(this.tasks[idx], live)
            }
          }
          break
        }
        case 'completed': {
          if (msg.id !== undefined) {
            const idx = this.tasks.findIndex(t => t.id === msg.id)
            if (idx !== -1) {
              this.tasks[idx].status = 'completed'
              this.tasks[idx].progress = 1
              this.tasks[idx].completedDate = Date.now()
              this.syncZipByKey(this.tasks[idx], live)
            }
          }
          break
        }
        case 'error': {
          if (msg.id !== undefined) {
            const idx = this.tasks.findIndex(t => t.id === msg.id)
            if (idx !== -1) {
              this.tasks[idx].status = 'error'
              this.tasks[idx].error = msg.error || String(msg.task?.error || '下载失败')
              this.tasks[idx].stepStatus = null
              this.tasks[idx].step = null
              this.tasks[idx].stepState = null
              this.syncZipByKey(this.tasks[idx], live)
            }
          }
          break
        }
        case 'paused': {
          if (msg.id !== undefined) {
            const idx = this.tasks.findIndex(t => t.id === msg.id)
            if (idx !== -1) {
              this.tasks[idx].status = 'paused'
              this.syncZipByKey(this.tasks[idx], live)
            }
          }
          break
        }
        case 'started': {
          if (msg.id !== undefined) {
            const idx = this.tasks.findIndex(t => t.id === msg.id)
            if (idx !== -1) {
              Object.assign(this.tasks[idx], { status: 'waiting', error: null, progress: 0, speed: 0, downloadedSize: 0, totalSize: 0 }, msg.task || {})
              this.syncZipByKey(this.tasks[idx], live)
            }
          }
          break
        }
      }
    },
    /** 将 task-manager 的下载任务同步到 jmLive 的 zipByKey（详情页用） */
    syncZipByKey(task: TaskItem, live: ReturnType<typeof useJmLiveStore>) {
      if (!task || !task.number) return
      const sk = String(task.number)
      const prev = live.zipByKey[sk] || {}
      let download: any = { step: task.step || prev.download?.step, stepState: task.stepState || prev.download?.stepState }
      const entry: any = { ...prev }
      switch (task.status) {
        case 'waiting':
        case 'paused':
          download = { ...download, status: 'waiting', complete: 0, total: 0 }
          break
        case 'downloading': {
          const c = Number(task.downloadedSize) || 0
          const t = Number(task.totalSize) || 0
          download = { ...download, status: 'running', complete: c, total: t }
          break
        }
        case 'completed':
          download = { ...download, status: 'done', complete: Number(task.totalSize) || 0, total: Number(task.totalSize) || 0 }
          entry.exists = true
          break
        case 'error':
          download = { ...download, status: 'error', error: String(task.error || '下载失败') }
          break
      }
      if (download) {
        entry.download = download
        live.zipByKey = { ...live.zipByKey, [sk]: entry }
      }
    },
  },
})
