export interface ReplayHashRawOutput {
  test_id: string
  run: number
  ttft_ms: number | null
  total_time_ms: number | null
  char_timestamps: number[]
}

export interface ReplayHashMaterial {
  test_suite_version: string
  model_id: string
  timing_outputs: ReplayHashRawOutput[]
}

interface CreateReplayHashMaterialInput {
  testSuiteVersion: string
  modelId: string
  rawOutputs: ReplayHashRawOutput[]
}

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const sha256Hex = async (payload: string): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable; cannot generate replay_hash')
  }

  const encoded = new TextEncoder().encode(payload)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
  return toHex(digest)
}

const compareTimingOutputs = (a: ReplayHashRawOutput, b: ReplayHashRawOutput): number => {
  if (a.test_id !== b.test_id) {
    return a.test_id.localeCompare(b.test_id)
  }
  return a.run - b.run
}

const toFiniteNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeCharTimestamps = (input?: number[]): number[] => {
  if (!Array.isArray(input)) return []
  return input
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
}

export const createReplayHashMaterial = (
  input: CreateReplayHashMaterialInput
): ReplayHashMaterial => {
  const normalizedTimingOutputs = input.rawOutputs
    .map((entry) => ({
      test_id: entry.test_id,
      run: Number(entry.run),
      ttft_ms: toFiniteNumberOrNull(entry.ttft_ms),
      total_time_ms: toFiniteNumberOrNull(entry.total_time_ms),
      char_timestamps: normalizeCharTimestamps(entry.char_timestamps),
    }))
    .sort(compareTimingOutputs)

  return {
    test_suite_version: input.testSuiteVersion,
    model_id: input.modelId,
    timing_outputs: normalizedTimingOutputs,
  }
}

export const serializeReplayHashMaterial = (material: ReplayHashMaterial): string =>
  JSON.stringify(material)

export const generateReplayHash = async (
  material: ReplayHashMaterial
): Promise<string> => sha256Hex(serializeReplayHashMaterial(material))

export const generateReplayHashFromRawOutputs = async (
  input: CreateReplayHashMaterialInput
): Promise<{ replayHash: string; material: ReplayHashMaterial }> => {
  const material = createReplayHashMaterial(input)
  const replayHash = await generateReplayHash(material)
  return { replayHash, material }
}
