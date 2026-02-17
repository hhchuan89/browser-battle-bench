export interface RunHashRawOutput {
  test_id: string
  run: number
  output: string
}

export interface RunHashMaterial {
  test_suite_version: string
  test_case_ids: string[]
  model_id: string
  raw_outputs: RunHashRawOutput[]
}

interface CreateRunHashMaterialInput {
  testSuiteVersion: string
  modelId: string
  rawOutputs: RunHashRawOutput[]
}

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const sha256Hex = async (payload: string): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable; cannot generate run_hash')
  }

  const encoded = new TextEncoder().encode(payload)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
  return toHex(digest)
}

const compareRawOutputs = (a: RunHashRawOutput, b: RunHashRawOutput): number => {
  if (a.test_id !== b.test_id) {
    return a.test_id.localeCompare(b.test_id)
  }
  return a.run - b.run
}

export const createRunHashMaterial = (
  input: CreateRunHashMaterialInput
): RunHashMaterial => {
  const normalizedRawOutputs = input.rawOutputs
    .map((entry) => ({
      test_id: entry.test_id,
      run: Number(entry.run),
      output: String(entry.output ?? ''),
    }))
    .sort(compareRawOutputs)

  const testCaseIds = Array.from(
    new Set(normalizedRawOutputs.map((entry) => entry.test_id))
  ).sort((a, b) => a.localeCompare(b))

  return {
    test_suite_version: input.testSuiteVersion,
    test_case_ids: testCaseIds,
    model_id: input.modelId,
    raw_outputs: normalizedRawOutputs,
  }
}

export const serializeRunHashMaterial = (material: RunHashMaterial): string =>
  JSON.stringify(material)

export const generateRunHash = async (material: RunHashMaterial): Promise<string> =>
  sha256Hex(serializeRunHashMaterial(material))

export const generateRunHashFromRawOutputs = async (
  input: CreateRunHashMaterialInput
): Promise<{ runHash: string; material: RunHashMaterial }> => {
  const material = createRunHashMaterial(input)
  const runHash = await generateRunHash(material)
  return { runHash, material }
}
