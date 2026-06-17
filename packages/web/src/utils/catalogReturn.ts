const KEY = 'jmz.catalogReturnQuery'

export function saveCatalogReturnQuery(query: Record<string, any>) {
  sessionStorage.setItem(KEY, JSON.stringify(query && typeof query === 'object' ? { ...query } : {}))
}

export function peekCatalogReturnQuery(): Record<string, any> {
  const raw = sessionStorage.getItem(KEY)
  if (raw == null) return {}
  try {
    const o = JSON.parse(raw)
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {}
  } catch {
    return {}
  }
}
