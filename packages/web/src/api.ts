import { API } from './constants'

export function buildQuery(obj: Record<string, any>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x != null && String(x).trim() !== '') u.append(k, String(x).trim())
      }
    } else u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

async function parseJson(r: Response) {
  let j: any = {}
  try { j = await r.json() } catch { j = {} }
  if (!r.ok) {
    j.ok = false
    j.message = j.message || `HTTP ${r.status}`
  }
  return j
}

export async function getJson(pathWithQuery: string, opts?: { signal?: AbortSignal }) {
  const init = opts?.signal ? { signal: opts.signal } : {}
  return parseJson(await fetch(`${API}${pathWithQuery}`, init))
}

export async function postJson(path: string, body: any = {}) {
  return parseJson(await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

export async function putJson(path: string, body: any = {}) {
  return parseJson(await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

export async function delJson(path: string) {
  return parseJson(await fetch(`${API}${path}`, { method: 'DELETE' }))
}
