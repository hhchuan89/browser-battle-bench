import { computed, ref } from 'vue'
import { saveHardwareSnapshot } from '@/lib/hardware-snapshot'
import { detectHardwareProfile } from '@/lib/hardware-detect'

export type HardwareTier = 'S' | 'A' | 'B' | 'M' | 'F'

export interface GatekeeperResult {
  tier: HardwareTier
  hasWebGPU: boolean
  gpuName: string
  gpuVendor: string
  gpuRaw: string
  vramGb: number
  isMobile: boolean
  browserName: string
  osName: string
  ollamaAvailable: boolean
  ollamaModels: string[]
  gpuStatus: 'webgpu' | 'webgl' | 'unknown'
  ollamaStatus: 'connected' | 'unreachable' | 'skipped-remote-https'
  ollamaHint?: string
}

const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

const shouldProbeOllama = (): boolean => {
  if (typeof window === 'undefined' || !window.location) return true
  const { protocol, hostname } = window.location
  if (protocol === 'https:' && !isLoopbackHost(hostname)) {
    return false
  }
  return true
}

const assignTier = (input: {
  hasWebGPU: boolean
  isMobile: boolean
  vramGb: number
}): HardwareTier => {
  if (!input.hasWebGPU) return 'F'
  if (input.isMobile) return 'M'
  if (input.vramGb >= 16) return 'S'
  if (input.vramGb >= 8) return 'A'
  return 'B'
}

export function useGatekeeper() {
  const isScanning = ref(false)
  const result = ref<GatekeeperResult | null>(null)

  const scan = async () => {
    isScanning.value = true

    const profile = await detectHardwareProfile()

    let ollamaAvailable = false
    let ollamaModels: string[] = []
    let ollamaStatus: GatekeeperResult['ollamaStatus'] = 'unreachable'
    let ollamaHint: string | undefined

    if (shouldProbeOllama()) {
      try {
        const res = await fetch('http://localhost:11434/api/tags', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })
        if (res.ok) {
          ollamaAvailable = true
          const data = await res.json()
          ollamaModels = Array.isArray(data.models)
            ? data.models
                .map((model: unknown) =>
                  typeof model === 'object' &&
                  model &&
                  'name' in model &&
                  typeof (model as { name?: unknown }).name === 'string'
                    ? (model as { name: string }).name
                    : null
                )
                .filter((name: string | null): name is string => !!name)
            : []
          ollamaStatus = 'connected'
        }
      } catch {
        // leave default unreachable
      }
    } else {
      ollamaStatus = 'skipped-remote-https'
      ollamaHint =
        'Hosted HTTPS pages cannot reliably probe local Ollama. Run BBB on localhost for direct detection.'
    }

    const tier = assignTier({
      hasWebGPU: profile.hasWebGPU,
      isMobile: profile.isMobile,
      vramGb: profile.vramGb,
    })

    result.value = {
      tier,
      hasWebGPU: profile.hasWebGPU,
      gpuName: profile.gpuName,
      gpuVendor: profile.gpuVendor,
      gpuRaw: profile.gpuRaw,
      vramGb: profile.vramGb,
      isMobile: profile.isMobile,
      browserName: profile.browserName,
      osName: profile.osName,
      ollamaAvailable,
      ollamaModels,
      gpuStatus: profile.gpuStatus,
      ollamaStatus,
      ollamaHint,
    }

    saveHardwareSnapshot({
      tier,
      gpu: profile.gpuName,
      gpu_vendor: profile.gpuVendor,
      gpu_raw: profile.gpuRaw,
      os_name: profile.osName,
      browser_name: profile.browserName,
      estimated_vram_gb: profile.vramGb,
      is_mobile: profile.isMobile,
      timestamp: new Date().toISOString(),
    })

    isScanning.value = false
  }

  const tierLabel = computed(() => {
    const labels: Record<HardwareTier, string> = {
      S: 'Legendary (16GB+)',
      A: 'Elite (8-16GB)',
      B: 'Street Fighter (<8GB)',
      M: 'Mobile',
      F: 'No WebGPU',
    }
    return result.value ? labels[result.value.tier] : 'Unknown'
  })

  return { isScanning, result, scan, tierLabel }
}
