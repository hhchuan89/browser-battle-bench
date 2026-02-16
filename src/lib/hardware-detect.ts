// Hardware detection utilities
export async function detectWebGPU(): Promise<{ available: boolean; name: string; vendor: string }> {
  if (!('gpu' in navigator)) {
    return { available: false, name: 'Unknown', vendor: 'Unknown' }
  }
  
  try {
    const adapter = await (navigator as any).gpu.requestAdapter()
    if (!adapter) {
      return { available: false, name: 'Unknown', vendor: 'Unknown' }
    }
    
    const info = adapter.requestAdapterInfo()
    return { 
      available: true, 
      name: info.deviceName || 'Unknown GPU',
      vendor: info.vendor || 'Unknown'
    }
  } catch (e) {
    console.error('WebGPU detection error:', e)
    return { available: false, name: 'Unknown', vendor: 'Unknown' }
  }
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function getDeviceMemory(): number {
  // @ts-ignore - deviceMemory is not in standard types
  return (navigator as any).deviceMemory || 8
}
