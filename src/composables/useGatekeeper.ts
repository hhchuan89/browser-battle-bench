import { ref, computed } from 'vue'

export type HardwareTier = 'S' | 'A' | 'B' | 'M' | 'F'

export interface GatekeeperResult {
  tier: HardwareTier
  hasWebGPU: boolean
  gpuName: string
  vramGb: number
  isMobile: boolean
  ollamaAvailable: boolean
  ollamaModels: string[]
}

export function useGatekeeper() {
  const isScanning = ref(false)
  const result = ref<GatekeeperResult | null>(null)
  
  const scan = async () => {
    isScanning.value = true
    
    // 1. WebGPU detection
    const hasWebGPU = 'gpu' in navigator
    
    // 2. GPU info
    let gpuName = 'Unknown'
    let vramGb = 0
    if (hasWebGPU) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter()
        if (adapter) {
          if (typeof adapter.requestAdapterInfo === 'function') {
            const info = await adapter.requestAdapterInfo()
            gpuName = info.deviceName
          }
          // Estimate VRAM (unified memory for Apple Silicon)
          // Default estimate, refine based on device
          const ua = navigator.userAgent
          if (/Mac/.test(ua)) {
            // Try to detect Apple Silicon memory
            vramGb = 24 // Default for M-series
            if (/M1\s*(Pro|Max)?/.test(ua)) vramGb = 16
            else if (/M2\s*Pro/.test(ua) || /M3/.test(ua)) vramGb = 18
            else if (/M2\s*Max/.test(ua) || /M3\s*Pro/.test(ua)) vramGb = 32
            else if (/M3\s*Max/.test(ua)) vramGb = 36
          } else {
            vramGb = 8 // Default for other GPUs
          }
        }
      } catch (e) {
        console.error('WebGPU error:', e)
      }
    }
    
    // 3. Mobile detection
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    
    // 4. Ollama detection
    let ollamaAvailable = false
    let ollamaModels: string[] = []
    try {
      const res = await fetch('http://localhost:11434/api/tags', { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      if (res.ok) {
        ollamaAvailable = true
        const data = await res.json()
        ollamaModels = data.models?.map((m: any) => m.name) || []
      }
    } catch (e) {
      // Ollama not available
    }
    
    // 5. Tier assignment
    let tier: HardwareTier = 'F'
    if (!hasWebGPU) {
      tier = 'F'
    } else if (isMobile) {
      tier = 'M'
    } else if (vramGb >= 16) {
      tier = 'S'
    } else if (vramGb >= 8) {
      tier = 'A'
    } else {
      tier = 'B'
    }
    
    result.value = { tier, hasWebGPU, gpuName, vramGb, isMobile, ollamaAvailable, ollamaModels }
    isScanning.value = false
  }
  
  const tierLabel = computed(() => {
    const labels: Record<HardwareTier, string> = {
      S: 'Legendary (16GB+)',
      A: 'Elite (8-16GB)',
      B: 'Street Fighter (<8GB)',
      M: 'Mobile (<2GB)',
      F: 'No WebGPU'
    }
    return result.value ? labels[result.value.tier] : 'Unknown'
  })
  
  return { isScanning, result, scan, tierLabel }
}
