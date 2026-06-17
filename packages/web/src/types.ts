export interface Comic {
  id: number
  name: string
  author?: string[]
  cover?: string
  images?: string[]
  tags?: string[]
  kind?: string
  displayKindLabel?: string
  total_views?: string
  likes?: string
  addtime?: string
  description?: string
  canRead?: boolean
  inStore?: boolean
  series?: ComicSeries[]
}

export interface ComicSeries {
  id: string
  name: string
  sort: string
}

export interface ComicEpisode {
  number: number
  title?: string
}

export interface ZipStatus {
  exists?: boolean
  download?: DownloadStatus
}

export interface DownloadStatus {
  status?: 'waiting' | 'start' | 'running' | 'done' | 'error'
  step?: string
  stepState?: string
  complete?: number
  total?: number
  error?: string
}

export interface TaskItem {
  id: number
  number: number
  name?: string
  url?: string
  status: string
  progress: number
  speed: number
  downloadedSize: number
  totalSize: number
  labels?: string[]
  dir?: string
  error?: string
  step?: string | null
  stepState?: string | null
  stepStatus?: { label: string; icon: string; color: string } | null
  coverBase64?: string
  displayTitle?: string
  episodeNumber?: number
  addedDate: number
  completedDate?: number
}
