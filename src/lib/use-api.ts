'use client'

import { useCallback, useEffect, useState } from 'react'

const cache = new Map<string, Promise<unknown>>()

export function api<T>(path: string, cached = false): Promise<T> {
  if (cached && cache.has(path)) return cache.get(path) as Promise<T>
  const request = fetch(path).then(async (res) => {
    if (res.status === 401) {
      window.location.assign('/api/auth/logout')
      return new Promise<T>(() => undefined)
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
    return body as T
  })
  if (cached) {
    cache.set(path, request)
    request.catch(() => cache.delete(path))
  }
  return request
}

interface State<T> {
  data?: T
  error?: string
  loading: boolean
}

/** Fetches a JSON endpoint; pass null to skip. Keeps stale data while reloading. */
export function useApi<T>(path: string | null, cached = false) {
  const [state, setState] = useState<State<T>>({ loading: path !== null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (path === null) return
    let active = true
    setState((s) => ({ ...s, loading: true, error: undefined }))
    api<T>(path, cached && attempt === 0)
      .then((data) => active && setState({ data, loading: false }))
      .catch((error: Error) => active && setState({ loading: false, error: error.message }))
    return () => {
      active = false
    }
  }, [path, cached, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
