import type { BBBHardwareReport } from '@/types/report'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export interface HardwareSnapshot {
  tier: BBBHardwareReport['tier']
  gpu: BBBHardwareReport['gpu']
  gpu_vendor?: string
  gpu_raw?: string
  os_name?: string
  browser_name?: string
  estimated_vram_gb: BBBHardwareReport['estimated_vram_gb']
  is_mobile: boolean
  timestamp: string
}

const resolveStorage = (storage?: Storage): Storage | null => {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage ?? null
}

export const saveHardwareSnapshot = (
  snapshot: HardwareSnapshot,
  storage?: Storage
): boolean => {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    target.setItem(STORAGE_KEYS.hardwareSnapshot, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

export const loadHardwareSnapshot = (
  storage?: Storage
): HardwareSnapshot | null => {
  const target = resolveStorage(storage)
  if (!target) return null
  try {
    const raw = target.getItem(STORAGE_KEYS.hardwareSnapshot)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HardwareSnapshot
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.tier !== 'string') return null
    if (typeof parsed.gpu !== 'string') return null
    if (typeof parsed.estimated_vram_gb !== 'number') return null
    if (typeof parsed.is_mobile !== 'boolean') return null
    if (typeof parsed.timestamp !== 'string') return null
    if (parsed.gpu_vendor !== undefined && typeof parsed.gpu_vendor !== 'string') return null
    if (parsed.gpu_raw !== undefined && typeof parsed.gpu_raw !== 'string') return null
    if (parsed.os_name !== undefined && typeof parsed.os_name !== 'string') return null
    if (parsed.browser_name !== undefined && typeof parsed.browser_name !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
