export interface CanonicalModelInfo {
  canonical_model_id: string
  model_family: string
  param_size: string
  quantization: string
}

const trim = (value: string): string => value.trim()

const toCanonicalToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

const KNOWN_MODELS: Record<string, CanonicalModelInfo> = {
  'llama-3.2-1b-instruct-q4f16_1-mlc': {
    canonical_model_id: 'llama-3.2-1b-q4f16',
    model_family: 'llama-3.2',
    param_size: '1B',
    quantization: 'q4f16',
  },
  'llama-3.2-3b-instruct-q4f16_1-mlc': {
    canonical_model_id: 'llama-3.2-3b-q4f16',
    model_family: 'llama-3.2',
    param_size: '3B',
    quantization: 'q4f16',
  },
  'llama-3.1-8b-instruct-q4f16_1-mlc': {
    canonical_model_id: 'llama-3.1-8b-q4f16',
    model_family: 'llama-3.1',
    param_size: '8B',
    quantization: 'q4f16',
  },
}

const parseFamily = (normalizedModelId: string): string => {
  const familyMatch = normalizedModelId.match(/^([a-z]+-[0-9]+(?:\.[0-9]+)?)/)
  return familyMatch?.[1] || 'unknown'
}

const parseParamSize = (normalizedModelId: string): string => {
  const paramMatch = normalizedModelId.match(/(?:^|[-_])([0-9]+(?:\.[0-9]+)?)([bm])(?:[-_]|$)/)
  if (!paramMatch) return 'unknown'
  const amount = paramMatch[1]
  const unit = paramMatch[2].toUpperCase()
  return `${amount}${unit}`
}

const parseQuantization = (normalizedModelId: string): string => {
  const quantMatch = normalizedModelId.match(/(q[0-9]+(?:f[0-9]+)?)/)
  return quantMatch?.[1] || 'unknown'
}

const buildCanonicalId = (normalizedModelId: string, info: Omit<CanonicalModelInfo, 'canonical_model_id'>): string => {
  const familyToken = toCanonicalToken(info.model_family)
  const sizeToken = toCanonicalToken(info.param_size)
  const quantToken = toCanonicalToken(info.quantization)

  if (familyToken !== 'unknown' && sizeToken !== 'unknown' && quantToken !== 'unknown') {
    return `${familyToken}-${sizeToken}-${quantToken}`
  }

  const simplified = normalizedModelId
    .replace(/-instruct/g, '')
    .replace(/-chat/g, '')
    .replace(/-mlc/g, '')
    .replace(/_1/g, '')
    .replace(/_mlc/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return simplified || 'unknown-model'
}

export const normalizeModelId = (modelId: string): CanonicalModelInfo => {
  const raw = trim(modelId)
  const normalizedModelId = toCanonicalToken(raw)
  const known = KNOWN_MODELS[normalizedModelId]
  if (known) return known

  const model_family = parseFamily(normalizedModelId)
  const param_size = parseParamSize(normalizedModelId)
  const quantization = parseQuantization(normalizedModelId)

  return {
    canonical_model_id: buildCanonicalId(normalizedModelId, {
      model_family,
      param_size,
      quantization,
    }),
    model_family,
    param_size,
    quantization,
  }
}
