import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyImportHashes } from '../../api/_lib/import-hash-verify.js'
import type { ImportRawOutputsFile } from '../../api/_lib/import-contracts.js'

const hashHex = (payload: string): string =>
  createHash('sha256').update(payload).digest('hex')

const buildValidArtifacts = () => {
  const rawOutputs: ImportRawOutputsFile = {
    raw_outputs: [
      {
        test_id: 'quick-002',
        run: 2,
        output: '{"answer":"B"}',
        ttft_ms: 140,
        total_time_ms: 420,
        char_timestamps: [10, 22, 44],
      },
      {
        test_id: 'quick-001',
        run: 1,
        output: '{"answer":"B"}',
        ttft_ms: 120,
        total_time_ms: 360,
        char_timestamps: [8, 16, 24],
      },
      {
        test_id: 'quick-003',
        run: 3,
        output: '{"answer":"C"}',
        ttft_ms: 160,
        total_time_ms: 510,
        char_timestamps: [12, 24, 36],
      },
    ],
  }

  const modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
  const testSuiteVersion = 'v1'

  const sorted = [...rawOutputs.raw_outputs].sort((a, b) =>
    a.test_id === b.test_id ? a.run - b.run : a.test_id.localeCompare(b.test_id)
  )

  const runMaterial = {
    test_suite_version: testSuiteVersion,
    test_case_ids: Array.from(new Set(sorted.map((entry) => entry.test_id))).sort((a, b) =>
      a.localeCompare(b)
    ),
    model_id: modelId,
    raw_outputs: sorted.map((entry) => ({
      test_id: entry.test_id,
      run: Number(entry.run),
      output: String(entry.output || ''),
    })),
  }

  const replayMaterial = {
    test_suite_version: testSuiteVersion,
    model_id: modelId,
    timing_outputs: sorted.map((entry) => ({
      test_id: entry.test_id,
      run: Number(entry.run),
      ttft_ms: entry.ttft_ms ?? null,
      total_time_ms: entry.total_time_ms ?? null,
      char_timestamps: entry.char_timestamps ?? [],
    })),
  }

  const bbbReport = {
    test_suite_version: testSuiteVersion,
    run_hash: hashHex(JSON.stringify(runMaterial)),
    replay_hash: hashHex(JSON.stringify(replayMaterial)),
    models_tested: [
      {
        model_id: modelId,
        phases: {
          logic_traps: {
            details: {
              scenario_id: 'quick-battle-30s',
              scenario_name: 'Quick Battle 30s',
            },
          },
        },
      },
    ],
  }

  return {
    bbbReport,
    rawOutputs,
  }
}

describe('api import hash verification', () => {
  it('passes when run_hash and replay_hash match recomputed values', () => {
    const artifacts = buildValidArtifacts()
    const result = verifyImportHashes({
      bbb_report: artifacts.bbbReport,
      bbb_raw_outputs: artifacts.rawOutputs,
    })

    expect(result.run_hash).toBe(artifacts.bbbReport.run_hash)
    expect(result.replay_hash).toBe(artifacts.bbbReport.replay_hash)
    expect(result.computed_run_hash).toBe(artifacts.bbbReport.run_hash)
    expect(result.computed_replay_hash).toBe(artifacts.bbbReport.replay_hash)
  })

  it('rejects tampered outputs with hash mismatch', () => {
    const artifacts = buildValidArtifacts()
    const tampered = {
      ...artifacts.rawOutputs,
      raw_outputs: artifacts.rawOutputs.raw_outputs.map((entry) =>
        entry.test_id === 'quick-002'
          ? { ...entry, output: '{"answer":"A"}' }
          : entry
      ),
    }

    expect(() =>
      verifyImportHashes({
        bbb_report: artifacts.bbbReport,
        bbb_raw_outputs: tampered,
      })
    ).toThrow(/run_hash mismatch/i)
  })
})
