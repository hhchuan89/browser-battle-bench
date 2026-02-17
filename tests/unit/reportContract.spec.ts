import { describe, expect, it, vi } from 'vitest'
import { createBBBReportBundle, serializeBBBReportBundle } from '@/lib/report-contract'
import { createRunHashMaterial, generateRunHash } from '@/lib/run-hash'

vi.mock('@/lib/model-fingerprint', () => ({
  getModelFingerprint: vi.fn().mockResolvedValue('mockfingerprint1234'),
}))

describe('report-contract', () => {
  it('creates bbb-report and bbb-raw-outputs with run_hash', async () => {
    const rawOutputs = [
      {
        test_id: 'case_1',
        run: 1,
        model_id: 'model-a',
        output: '{"answer":"A"}',
      },
      {
        test_id: 'case_2',
        run: 2,
        model_id: 'model-a',
        output: '{"answer":"B"}',
      },
    ]

    const bundle = await createBBBReportBundle({
      modelId: 'model-a',
      modelName: 'Model A',
      rawOutputs,
      totalScore: 88.5,
      phases: {
        logic_traps: {
          runs: 2,
          scores: [100, 80],
          median: 90,
          variance: 100,
        },
      },
      testSuiteVersion: '1.0.0',
      isMobile: false,
      hardware: {
        tier: 'S',
        gpu: 'Apple GPU',
        browser: 'Chrome',
        os: 'macOS',
        estimated_vram_gb: 16,
      },
    })

    expect(bundle.report.version).toBe('3.4')
    expect(bundle.report.test_suite_version).toBe('1.0.0')
    expect(bundle.report.run_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(bundle.report.models_tested).toHaveLength(1)
    expect(bundle.rawOutputs.raw_outputs).toHaveLength(2)

    const expectedMaterial = createRunHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: rawOutputs.map((entry) => ({
        test_id: entry.test_id,
        run: entry.run,
        output: entry.output,
      })),
    })

    const expectedHash = await generateRunHash(expectedMaterial)
    expect(bundle.report.run_hash).toBe(expectedHash)
  })

  it('serializes bundle as pretty JSON strings', async () => {
    const bundle = await createBBBReportBundle({
      modelId: 'model-b',
      rawOutputs: [
        { test_id: 'case_1', run: 1, model_id: 'model-b', output: 'ok' },
      ],
      totalScore: 50,
      phases: {
        logic_traps: {
          runs: 1,
          scores: [50],
          median: 50,
          variance: 0,
        },
      },
      isMobile: false,
    })

    const serialized = serializeBBBReportBundle(bundle)
    expect(() => JSON.parse(serialized.reportJson)).not.toThrow()
    expect(() => JSON.parse(serialized.rawOutputsJson)).not.toThrow()
  })
})
