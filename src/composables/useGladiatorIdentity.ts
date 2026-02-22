import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export interface GladiatorIdentity {
  gladiator_name: string
  github_username: string | null
  device_id: string
}

export interface GladiatorIdentityDraft {
  gladiatorName: string
  githubUsername?: string | null
}

const resolveStorage = (storage?: Storage): Storage | null => {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage ?? null
}

const normalizeGithubUsername = (value?: string | null): string | null => {
  if (!value) return null
  const stripped = value.trim().replace(/^@+/, '')
  if (!stripped) return null
  const normalized = stripped.slice(0, 39)
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(normalized)) {
    return null
  }
  return normalized
}

const randomDeviceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const hex = '0123456789abcdef'
  const pick = (): string => hex[Math.floor(Math.random() * hex.length)]
  const section = (length: number): string =>
    Array.from({ length })
      .map(() => pick())
      .join('')

  return `${section(8)}-${section(4)}-4${section(3)}-a${section(3)}-${section(12)}`
}

const readRaw = (storage?: Storage): GladiatorIdentity | null => {
  const target = resolveStorage(storage)
  if (!target) return null

  try {
    const rawIdentity = target.getItem(STORAGE_KEYS.gladiatorIdentity)
    if (!rawIdentity) return null
    const parsed = JSON.parse(rawIdentity) as Partial<GladiatorIdentity>

    if (typeof parsed.gladiator_name !== 'string') return null
    if (!parsed.gladiator_name.trim()) return null
    if (typeof parsed.device_id !== 'string' || !parsed.device_id.trim()) return null

    return {
      gladiator_name: parsed.gladiator_name.trim(),
      github_username:
        typeof parsed.github_username === 'string' ? normalizeGithubUsername(parsed.github_username) : null,
      device_id: parsed.device_id.trim(),
    }
  } catch {
    return null
  }
}

export const getOrCreateDeviceId = (storage?: Storage): string => {
  const target = resolveStorage(storage)
  if (!target) return randomDeviceId()

  const existing = target.getItem(STORAGE_KEYS.deviceId)
  if (existing && existing.trim()) return existing.trim()

  const created = randomDeviceId()
  try {
    target.setItem(STORAGE_KEYS.deviceId, created)
  } catch {
    // ignore storage errors, still return generated ID
  }
  return created
}

export const loadGladiatorIdentity = (storage?: Storage): GladiatorIdentity => {
  const existing = readRaw(storage)
  if (existing) return existing

  return {
    gladiator_name: '',
    github_username: null,
    device_id: getOrCreateDeviceId(storage),
  }
}

export const saveGladiatorIdentity = (
  input: GladiatorIdentityDraft,
  storage?: Storage
): GladiatorIdentity => {
  const target = resolveStorage(storage)
  const next: GladiatorIdentity = {
    gladiator_name: input.gladiatorName.trim(),
    github_username: normalizeGithubUsername(input.githubUsername),
    device_id: getOrCreateDeviceId(storage),
  }

  if (!target) return next

  try {
    target.setItem(STORAGE_KEYS.gladiatorIdentity, JSON.stringify(next))
  } catch {
    // ignore localStorage write failures
  }

  return next
}

export const useGladiatorIdentity = (storage?: Storage) => {
  const identity = ref<GladiatorIdentity>(loadGladiatorIdentity(storage))

  const hasGladiatorName = computed(() => identity.value.gladiator_name.trim().length > 0)

  const reload = (): GladiatorIdentity => {
    identity.value = loadGladiatorIdentity(storage)
    return identity.value
  }

  const save = (input: GladiatorIdentityDraft): GladiatorIdentity => {
    identity.value = saveGladiatorIdentity(input, storage)
    return identity.value
  }

  return {
    identity,
    hasGladiatorName,
    reload,
    save,
  }
}
