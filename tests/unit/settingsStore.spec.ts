import { describe, expect, it } from 'vitest'
import {
  getDefaultModelId,
  getGistAuth,
  getGistLeaderboardSources,
  getSelectedModelId,
  setGistAuth,
  setGistLeaderboardSources,
  setSelectedModelId,
} from '@/lib/settings-store'
import { STORAGE_KEYS } from '@/lib/storage-keys'

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('settings-store', () => {
  it('returns default model when storage is empty', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    expect(getSelectedModelId()).toBe(getDefaultModelId())
  })

  it('persists selected model ID', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const ok = setSelectedModelId('Llama-3.2-3B-Instruct-q4f16_1-MLC')
    expect(ok).toBe(true)
    expect(getSelectedModelId()).toBe('Llama-3.2-3B-Instruct-q4f16_1-MLC')
    expect(storage.getItem(STORAGE_KEYS.selectedModel)).toBe(
      '"Llama-3.2-3B-Instruct-q4f16_1-MLC"'
    )
  })

  it('persists gist auth and sources', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const ok = setGistAuth({
      accessToken: 'token',
      tokenType: 'bearer',
      scope: 'gist',
      createdAt: '2026-02-21T00:00:00Z',
    })
    expect(ok).toBe(true)
    expect(getGistAuth()?.accessToken).toBe('token')

    const sourcesOk = setGistLeaderboardSources([{ id: 'abc123' }])
    expect(sourcesOk).toBe(true)
    expect(getGistLeaderboardSources()).toEqual([{ id: 'abc123' }])
  })
})
