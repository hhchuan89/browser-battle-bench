export interface HardwareDetectResult {
  hasWebGPU: boolean
  gpuName: string
  gpuVendor: string
  gpuRaw: string
  vramGb: number
  isMobile: boolean
  browserName: string
  osName: string
  gpuStatus: 'webgpu' | 'webgl' | 'unknown'
}

interface WebGpuAdapterInfoLike {
  device?: string
  deviceName?: string
  vendor?: string
}

const detectBrowserName = (ua: string): string => {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return 'Unknown Browser'
}

const detectOsName = (ua: string): string => {
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown OS'
}

const isMobileDevice = (ua: string): boolean =>
  /Android|iPhone|iPad|iPod/i.test(ua)

const estimateVramGb = (ua: string): number => {
  if (/Mac/i.test(ua)) {
    if (/M3\s*Max/i.test(ua)) return 36
    if (/M2\s*Max|M3\s*Pro/i.test(ua)) return 32
    if (/M2\s*Pro|M3/i.test(ua)) return 18
    if (/M1\s*(Pro|Max)/i.test(ua)) return 16
    return 12
  }
  return 8
}

const parseWebglRenderer = (rawRenderer: string): { name: string; vendor: string } => {
  const trimmed = rawRenderer.trim()
  const angleMatch = trimmed.match(/ANGLE \(([^,]+),\s*([^,]+),/)
  if (angleMatch) {
    return {
      vendor: angleMatch[1].trim(),
      name: angleMatch[2].trim(),
    }
  }

  const parts = trimmed.split(/[\s,/]+/).filter(Boolean)
  const vendor = parts[0] || 'Unknown'
  return {
    vendor,
    name: trimmed,
  }
}

const detectWebglRenderer = (): string | null => {
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return null

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as
      | { UNMASKED_RENDERER_WEBGL: number }
      | null

    if (!debugInfo) return null
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    return typeof renderer === 'string' && renderer.trim() ? renderer.trim() : null
  } catch {
    return null
  }
}

const readWebGpuInfo = async (): Promise<{
  hasWebGPU: boolean
  name: string
  vendor: string
  status: HardwareDetectResult['gpuStatus']
}> => {
  if (typeof navigator === 'undefined') {
    return {
      hasWebGPU: false,
      name: 'Unknown',
      vendor: 'Unknown',
      status: 'unknown',
    }
  }

  if (!('gpu' in navigator)) {
    return {
      hasWebGPU: false,
      name: 'Unknown',
      vendor: 'Unknown',
      status: 'unknown',
    }
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter()
    if (!adapter) {
      return {
        hasWebGPU: true,
        name: 'Unknown',
        vendor: 'Unknown',
        status: 'unknown',
      }
    }

    if (typeof adapter.requestAdapterInfo === 'function') {
      const info = (await adapter.requestAdapterInfo()) as WebGpuAdapterInfoLike
      const name = info.deviceName || info.device || 'Unknown'
      return {
        hasWebGPU: true,
        name,
        vendor: info.vendor || 'Unknown',
        status: name && name !== 'Unknown' ? 'webgpu' : 'unknown',
      }
    }

    return {
      hasWebGPU: true,
      name: 'Unknown',
      vendor: 'Unknown',
      status: 'unknown',
    }
  } catch {
    return {
      hasWebGPU: true,
      name: 'Unknown',
      vendor: 'Unknown',
      status: 'unknown',
    }
  }
}

export const detectHardwareProfile = async (): Promise<HardwareDetectResult> => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const browserName = detectBrowserName(ua)
  const osName = detectOsName(ua)
  const isMobile = isMobileDevice(ua)
  const vramGb = estimateVramGb(ua)

  const webGpu = await readWebGpuInfo()
  const webglRaw = detectWebglRenderer() || ''
  const webglParsed = webglRaw ? parseWebglRenderer(webglRaw) : null

  const gpuName =
    webglParsed?.name ||
    (webGpu.name && webGpu.name !== 'Unknown' ? webGpu.name : 'Unknown')
  const gpuVendor =
    webglParsed?.vendor ||
    (webGpu.vendor && webGpu.vendor !== 'Unknown' ? webGpu.vendor : 'Unknown')

  return {
    hasWebGPU: webGpu.hasWebGPU,
    gpuName,
    gpuVendor,
    gpuRaw: webglRaw || webGpu.name || 'Unknown',
    vramGb,
    isMobile,
    browserName,
    osName,
    gpuStatus:
      webglParsed
        ? 'webgl'
        : webGpu.status === 'webgpu'
          ? 'webgpu'
          : 'unknown',
  }
}
