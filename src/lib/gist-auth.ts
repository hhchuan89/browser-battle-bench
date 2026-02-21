import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from '@/lib/persistence'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { GistAuthState } from '@/lib/settings-store'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

export interface DeviceTokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in?: number
}

export interface DeviceTokenError {
  error: string
  error_description?: string
  error_uri?: string
}

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const DEVICE_TOKEN_URL = 'https://github.com/login/oauth/access_token'

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON response: ${text}`)
  }
}

export const getStoredGistAuth = (): GistAuthState | null =>
  loadJsonFromLocalStorage<GistAuthState | null>(STORAGE_KEYS.gistAuth, null)

export const saveGistAuth = (auth: GistAuthState): boolean =>
  saveJsonToLocalStorage(STORAGE_KEYS.gistAuth, auth)

export const createDeviceCode = async (clientId: string, scope: string[]): Promise<DeviceCodeResponse> => {
  const body = new URLSearchParams({
    client_id: clientId,
    scope: scope.join(' '),
  })

  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Device code request failed (${response.status})`)
  }

  return parseJson<DeviceCodeResponse>(response)
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const pollForDeviceToken = async (
  clientId: string,
  deviceCode: string,
  intervalSeconds: number,
  expiresInSeconds: number,
  onStatus?: (status: string) => void
): Promise<GistAuthState> => {
  const startedAt = Date.now()
  const expiryMs = expiresInSeconds * 1000
  let intervalMs = Math.max(intervalSeconds, 5) * 1000

  while (Date.now() - startedAt < expiryMs) {
    await delay(intervalMs)
    onStatus?.('polling')

    const body = new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    const response = await fetch(DEVICE_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const payload = await parseJson<DeviceTokenResponse | DeviceTokenError>(response)

    if ('access_token' in payload) {
      const createdAt = new Date().toISOString()
      const expiresAt = payload.expires_in
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : undefined
      return {
        accessToken: payload.access_token,
        tokenType: payload.token_type,
        scope: payload.scope,
        createdAt,
        expiresAt,
      }
    }

    if (payload.error === 'authorization_pending') {
      continue
    }

    if (payload.error === 'slow_down') {
      intervalMs += 5000
      continue
    }

    throw new Error(payload.error_description || payload.error)
  }

  throw new Error('Device flow expired before authorization completed.')
}
