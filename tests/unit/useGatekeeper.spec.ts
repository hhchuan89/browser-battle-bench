import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGatekeeper } from '@/composables/useGatekeeper'
import { detectHardwareProfile } from '@/lib/hardware-detect'

vi.mock('@/lib/hardware-detect', () => ({
  detectHardwareProfile: vi.fn(),
}))

vi.mock('@/lib/hardware-snapshot', () => ({
  saveHardwareSnapshot: vi.fn(),
}))

const detectHardwareProfileMock = vi.mocked(detectHardwareProfile)

const originalFetch = globalThis.fetch
const originalAbortSignal = globalThis.AbortSignal
const originalWindow = (globalThis as { window?: Window }).window

const restoreWindow = () => {
  if (originalWindow === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { window?: Window }).window
    return
  }
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  detectHardwareProfileMock.mockResolvedValue({
    hasWebGPU: true,
    gpuName: 'Apple M4',
    gpuVendor: 'Apple',
    gpuRaw: 'ANGLE (Apple, Apple M4, OpenGL 4.1)',
    vramGb: 16,
    isMobile: false,
    browserName: 'Chrome',
    osName: 'macOS',
    gpuStatus: 'webgpu',
  })
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('ollama unavailable')) as any
  if (!globalThis.AbortSignal || typeof (globalThis.AbortSignal as any).timeout !== 'function') {
    globalThis.AbortSignal = {
      ...(globalThis.AbortSignal as any),
      timeout: () => new AbortController().signal,
    } as any
  }
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        protocol: 'http:',
        hostname: 'localhost',
      },
    },
    configurable: true,
  })
})

afterEach(() => {
  if (originalFetch === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { fetch?: typeof fetch }).fetch
  } else {
    globalThis.fetch = originalFetch
  }

  if (originalAbortSignal === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { AbortSignal?: typeof AbortSignal }).AbortSignal
  } else {
    globalThis.AbortSignal = originalAbortSignal
  }

  restoreWindow()
})

describe('useGatekeeper', () => {
  it('assigns tier S for strong desktop profile', async () => {
    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.tier).toBe('S')
    expect(result.value?.gpuName).toBe('Apple M4')
    expect(result.value?.gpuVendor).toBe('Apple')
    expect(result.value?.browserName).toBe('Chrome')
    expect(result.value?.osName).toBe('macOS')
  })

  it('assigns tier F when WebGPU is unavailable', async () => {
    detectHardwareProfileMock.mockResolvedValueOnce({
      hasWebGPU: false,
      gpuName: 'Unknown',
      gpuVendor: 'Unknown',
      gpuRaw: 'Unknown',
      vramGb: 8,
      isMobile: false,
      browserName: 'Chrome',
      osName: 'macOS',
      gpuStatus: 'unknown',
    })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.tier).toBe('F')
    expect(result.value?.hasWebGPU).toBe(false)
  })

  it('assigns tier M for mobile profile even with WebGPU', async () => {
    detectHardwareProfileMock.mockResolvedValueOnce({
      hasWebGPU: true,
      gpuName: 'Apple A17',
      gpuVendor: 'Apple',
      gpuRaw: 'ANGLE (Apple, Apple A17, OpenGL 4.1)',
      vramGb: 6,
      isMobile: true,
      browserName: 'Safari',
      osName: 'iOS',
      gpuStatus: 'webgl',
    })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.tier).toBe('M')
    expect(result.value?.gpuStatus).toBe('webgl')
  })

  it('captures Ollama availability and model list on localhost', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3:8b' }, { name: 'qwen2.5:7b' }],
      }),
    }) as any

    const { scan, result } = useGatekeeper()
    await scan()

    expect(result.value?.ollamaAvailable).toBe(true)
    expect(result.value?.ollamaModels).toEqual(['llama3:8b', 'qwen2.5:7b'])
    expect(result.value?.ollamaStatus).toBe('connected')
  })

  it('skips Ollama probe on secure non-loopback origins', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as any

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          protocol: 'https:',
          hostname: 'browserbattlebench.vercel.app',
        },
      },
      configurable: true,
    })

    const { scan, result } = useGatekeeper()
    await scan()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.value?.ollamaStatus).toBe('skipped-remote-https')
    expect(result.value?.ollamaAvailable).toBe(false)
  })
})
