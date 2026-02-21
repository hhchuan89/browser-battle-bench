import type { LocationQuery } from 'vue-router'

export type ChallengeMode = 'arena' | 'quick' | 'gauntlet' | 'stress'

export interface BuildChallengeUrlInput {
  origin: string
  mode: ChallengeMode
  scenarioId?: string
  modelId?: string
  runRef?: string | null
}

export interface ParsedChallengeParams {
  challenge: boolean
  mode: ChallengeMode
  scenarioId?: string
  modelId?: string
  runRef?: string
}

const ALLOWED_MODES: ChallengeMode[] = ['arena', 'quick', 'gauntlet', 'stress']
const MAX_VALUE_LENGTH = 120

const normalizeQueryValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null
  }
  return typeof value === 'string' ? value : null
}

const sanitizeValue = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_VALUE_LENGTH) return undefined
  return trimmed
}

export const buildChallengeUrl = (input: BuildChallengeUrlInput): string => {
  const url = new URL(`/${input.mode}`, input.origin)
  url.searchParams.set('challenge', '1')
  url.searchParams.set('mode', input.mode)

  const scenario = sanitizeValue(input.scenarioId)
  const model = sanitizeValue(input.modelId)
  const run = sanitizeValue(input.runRef ?? undefined)

  if (scenario) url.searchParams.set('scenario', scenario)
  if (model) url.searchParams.set('model', model)
  if (run) url.searchParams.set('run', run)
  url.searchParams.set('v', '1')

  return url.toString()
}

export const parseChallengeParams = (
  query: LocationQuery
): ParsedChallengeParams | null => {
  const challenge = normalizeQueryValue(query.challenge)
  if (challenge !== '1') return null

  const modeValue = normalizeQueryValue(query.mode)
  if (!modeValue || !ALLOWED_MODES.includes(modeValue as ChallengeMode)) {
    return null
  }

  const scenarioId = sanitizeValue(normalizeQueryValue(query.scenario))
  const modelId = sanitizeValue(normalizeQueryValue(query.model))
  const runRef = sanitizeValue(normalizeQueryValue(query.run))

  return {
    challenge: true,
    mode: modeValue as ChallengeMode,
    scenarioId,
    modelId,
    runRef,
  }
}

