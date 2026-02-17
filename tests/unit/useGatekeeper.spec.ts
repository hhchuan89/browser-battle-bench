import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGatekeeper } from '@/composables/useGatekeeper'

const originalNavigator = globalThis.navigator
const originalFetch = globalThis.fetch
const originalAbortSignal = globalThis.AbortSignal

const setNavigator = (value: any) => {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
  })
}

const restoreGlobals = () => {
  if (originalNavigator === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as any).navigator
  } else {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    })
  }

  if (originalFetch === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as any).fetch
  } else {
    globalThis.fetch = originalFetch
  }

  if (originalAbortSignal === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as any).AbortSignal
  } else {
    globalThis.AbortSignal = originalAbortSignal
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  if (!globalThis.AbortSignal || typeof (globalThis.AbortSignal as any).timeout !== 'function') {
    globalThis.AbortSignal = {
      ...(globalThis.AbortSignal as any),
      timeout: () => new AbortController().signal,
    } as any
  }
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('ollama unavailable')) as any
})

afterEach(() => {
  restoreGlobals()
})

describe('useGatekeeper', () => {
  it('returns tier F when WebGPU is unavailable', async () => {
    setNavigator({ userAgent: 'Mozilla/5.0 (Macintosh)' })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.hasWebGPU).toBe(false)
    expect(result.value?.tier).toBe('F')
    expect(result.value?.vramGb).toBe(0)
    expect(result.value?.gpuName).toBe('Unknown')
  })

  it('detects Apple Silicon UA and assigns tier S with GPU info', async () => {
    setNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; M1 Pro)',
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({
          requestAdapterInfo: vi.fn().mockResolvedValue({ deviceName: 'Apple GPU' }),
        }),
      },
    })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.hasWebGPU).toBe(true)
    expect(result.value?.gpuName).toBe('Apple GPU')
    expect(result.value?.vramGb).toBe(16)
    expect(result.value?.tier).toBe('S')
  })

  it('overrides to mobile tier when UA is mobile', async () => {
    setNavigator({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue(null),
      },
    })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.hasWebGPU).toBe(true)
    expect(result.value?.isMobile).toBe(true)
    expect(result.value?.tier).toBe('M')
  })

  it('captures Ollama availability and model list', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3:8b' }, { name: 'mistral:7b' }],
      }),
    }) as any

    setNavigator({ userAgent: 'Mozilla/5.0 (Macintosh)' })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.ollamaAvailable).toBe(true)
    expect(result.value?.ollamaModels).toEqual(['llama3:8b', 'mistral:7b'])
  })
})
