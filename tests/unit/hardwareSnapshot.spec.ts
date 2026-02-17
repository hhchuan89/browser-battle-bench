import { describe, expect, it } from 'vitest'
import { loadHardwareSnapshot, saveHardwareSnapshot } from '@/lib/hardware-snapshot'

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
    }
  } as Storage
}

describe('hardware-snapshot', () => {
  it('saves and loads a snapshot from provided storage', () => {
    const storage = createMemoryStorage()
    const saved = saveHardwareSnapshot({
      tier: 'S',
      gpu: 'Test GPU',
      estimated_vram_gb: 16,
      is_mobile: false,
      timestamp: '2026-02-18T00:00:00.000Z',
    }, storage)

    expect(saved).toBe(true)
    expect(loadHardwareSnapshot(storage)).toEqual({
      tier: 'S',
      gpu: 'Test GPU',
      estimated_vram_gb: 16,
      is_mobile: false,
      timestamp: '2026-02-18T00:00:00.000Z',
    })
  })

  it('returns null for invalid payloads', () => {
    const storage = createMemoryStorage()
    storage.setItem('bbb:hardwareSnapshot', '{"tier":123}')
    expect(loadHardwareSnapshot(storage)).toBeNull()
  })
})
