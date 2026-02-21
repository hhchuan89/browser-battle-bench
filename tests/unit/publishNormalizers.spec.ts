import { describe, expect, it } from 'vitest'
import {
  buildArenaPublishRequest,
  buildBattlePublishRequest,
  buildStressPublishRequest,
} from '@/lib/share/publish-normalizers'
import type { ShareResultPayload } from '@/types/share'
import type { BBBReportJson } from '@/types/report'
import type { EnduranceReport } from '@/types/endurance'

const basePayload: ShareResultPayload = {
  mode: 'quick',
  scenarioId: 'scenario-1',
  scenarioName: 'Scenario 1',
  modelId: 'model-a',
  grade: 'A',
  badgeText: 'GLADIATOR',
  scores: {
    obedience: 92,
    intelligence: 80,
    stability: 70,
  },
  hardwareLabel: 'GPU: Test',
  taunt: 'Test taunt',
  runRef: 'run-1',
  shareUrl: 'https://example.com/share',
  challengeUrl: 'https://example.com/challenge',
}

describe('publish normalizers', () => {
  it('builds arena publish request with normalized score', () => {
    const request = buildArenaPublishRequest({
      payload: {
        ...basePayload,
        mode: 'arena',
      },
      score: {
        totalScore: 88.666,
        breakdown: {
          formatCompliance: 90,
          fieldCompleteness: 85,
          responseEfficiency: 80,
          schemaPurity: 70,
          ttft: 60,
        },
        warnings: [],
        errors: [],
      },
      tier: 'A',
    })

    expect(request.mode).toBe('arena')
    expect(request.score).toBe(88.67)
    expect(request.tier).toBe('A')
    expect(request.report_summary.mode).toBe('arena')
  })

  it('builds battle publish request from BBB report contract', () => {
    const report: BBBReportJson = {
      version: '1',
      timestamp: '2026-02-22T00:00:00.000Z',
      app_version: '0.0.1',
      test_suite_version: '1.0.0',
      run_hash: 'hash-123',
      replay_hash: 'replay-123',
      is_mobile: false,
      hardware: {
        tier: 'B',
        gpu: 'GPU Test',
        browser: 'Chrome',
        os: 'macOS',
        estimated_vram_gb: 8,
      },
      models_tested: [
        {
          model_id: 'model-a',
          model_name: 'Model A',
          webllm_version: '0.2.78',
          phases: {
            logic_traps: {
              runs: 10,
              scores: [90],
              median: 90,
              variance: 0,
              details: {
                pass_rate: 90,
                total_rounds: 10,
                passed_rounds: 9,
              },
            },
          },
          total_score: 91.234,
        },
      ],
      ollama_baseline: null,
    }

    const request = buildBattlePublishRequest({
      payload: {
        ...basePayload,
        mode: 'gauntlet',
      },
      report,
    })

    expect(request.mode).toBe('gauntlet')
    expect(request.score).toBe(91.23)
    expect(request.pass_rate).toBe(90)
    expect(request.total_rounds).toBe(10)
    expect(request.passed_rounds).toBe(9)
    expect(request.run_hash).toBe('hash-123')
    expect(request.replay_hash).toBe('replay-123')
  })

  it('builds stress publish request with endurance summary', () => {
    const report: EnduranceReport = {
      scenarioName: 'Stress Test',
      totalTimeMs: 120000,
      peakMemoryMB: 512,
      baselineMemoryMB: 256,
      leakRateMBPerRound: 0.2,
      averageLatencyMs: 1300,
      passRate: 83.333,
      totalRounds: 30,
      passedRounds: 25,
      verdict: 'STABLE',
      timestamp: '2026-02-22T00:00:00.000Z',
    }

    const request = buildStressPublishRequest({
      payload: {
        ...basePayload,
        mode: 'stress',
      },
      report,
      tier: 'S',
    })

    expect(request.mode).toBe('stress')
    expect(request.score).toBe(83.33)
    expect(request.pass_rate).toBe(83.33)
    expect(request.total_rounds).toBe(30)
    expect(request.passed_rounds).toBe(25)
    expect(request.report_summary.mode).toBe('stress')
  })
})
