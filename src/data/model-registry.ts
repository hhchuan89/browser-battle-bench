export interface CanonicalModelInfo {
  canonical_model_id: string
  model_family: string
  param_size: string
  quantization: string
}

const toCanonicalToken = (value: string): string =>
  value
    .trim()
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

const parseFamily = (token: string): string => {
  const matched = token.match(/^([a-z]+-[0-9]+(?:\.[0-9]+)?)/)
  return matched?.[1] || 'unknown'
}

const parseParamSize = (token: string): string => {
  const matched = token.match(/(?:^|[-_])([0-9]+(?:\.[0-9]+)?)([bm])(?:[-_]|$)/)
  if (!matched) return 'unknown'
  return `${matched[1]}${matched[2].toUpperCase()}`
}

const parseQuantization = (token: string): string => {
  const matched = token.match(/(q[0-9]+(?:f[0-9]+)?)/)
  return matched?.[1] || 'unknown'
}

const deriveCanonicalModelId = (token: string, info: Omit<CanonicalModelInfo, 'canonical_model_id'>): string => {
  if (
    info.model_family !== 'unknown' &&
    info.param_size !== 'unknown' &&
    info.quantization !== 'unknown'
  ) {
    return `${info.model_family}-${info.param_size.toLowerCase()}-${info.quantization}`
  }

  return token
    .replace(/-instruct/g, '')
    .replace(/-chat/g, '')
    .replace(/-mlc/g, '')
    .replace(/_1/g, '')
    .replace(/_mlc/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown-model'
}

export const canonicalizeModelId = (modelId: string): CanonicalModelInfo => {
  const token = toCanonicalToken(modelId)
  const known = KNOWN_MODELS[token]
  if (known) return known

  const parsed = {
    model_family: parseFamily(token),
    param_size: parseParamSize(token),
    quantization: parseQuantization(token),
  }

  return {
    canonical_model_id: deriveCanonicalModelId(token, parsed),
    ...parsed,
  }
}
