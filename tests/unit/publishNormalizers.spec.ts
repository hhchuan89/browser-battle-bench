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
  modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
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

const identity = {
  gladiator_name: 'ArenaChampion',
  github_username: 'hhchuan89',
  device_id: '123e4567-e89b-42d3-a456-426614174000',
}

const hardware = {
  tier: 'S',
  gpu: 'Apple M4',
  gpu_vendor: 'Apple',
  gpu_raw: 'ANGLE (Apple, Apple M4, OpenGL 4.1)',
  os_name: 'macOS',
  browser_name: 'Chrome',
  estimated_vram_gb: 16,
  is_mobile: false,
  timestamp: '2026-02-22T00:00:00.000Z',
} as const

describe('publish normalizers', () => {
  it('requires gladiator identity before building payload', () => {
    expect(() =>
      buildArenaPublishRequest({
        payload: {
          ...basePayload,
          mode: 'arena',
        },
        score: {
          totalScore: 80,
          breakdown: {
            formatCompliance: 80,
            fieldCompleteness: 80,
            responseEfficiency: 80,
            schemaPurity: 80,
            ttft: 80,
          },
          warnings: [],
          errors: [],
        },
        tier: 'A',
        identity: {
          ...identity,
          gladiator_name: ' ',
        },
        hardware,
      })
    ).toThrow('Missing gladiator identity')
  })

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
      identity,
      hardware,
    })

    expect(request.mode).toBe('arena')
    expect(request.score).toBe(88.67)
    expect(request.tier).toBe('A')
    expect(request.gladiator_name).toBe('ArenaChampion')
    expect(request.github_username).toBe('hhchuan89')
    expect(request.device_id).toBe('123e4567-e89b-42d3-a456-426614174000')
    expect(request.canonical_model_id).toBe('llama-3.2-1b-q4f16')
    expect(request.model_family).toBe('llama-3.2')
    expect(request.param_size).toBe('1B')
    expect(request.quantization).toBe('q4f16')
    expect(request.gpu_name).toBe('Apple M4')
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
      identity,
      hardware,
    })

    expect(request.mode).toBe('gauntlet')
    expect(request.score).toBe(91.23)
    expect(request.pass_rate).toBe(90)
    expect(request.total_rounds).toBe(10)
    expect(request.passed_rounds).toBe(9)
    expect(request.run_hash).toBe('hash-123')
    expect(request.replay_hash).toBe('replay-123')
    expect(request.gladiator_name).toBe('ArenaChampion')
    expect(request.device_id).toBe('123e4567-e89b-42d3-a456-426614174000')
    expect(request.canonical_model_id).toBe('llama-3.2-1b-q4f16')
    expect(request.gpu_vendor).toBe('Apple')
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
      identity,
      hardware,
    })

    expect(request.mode).toBe('stress')
    expect(request.score).toBe(83.33)
    expect(request.pass_rate).toBe(83.33)
    expect(request.total_rounds).toBe(30)
    expect(request.passed_rounds).toBe(25)
    expect(request.gladiator_name).toBe('ArenaChampion')
    expect(request.device_id).toBe('123e4567-e89b-42d3-a456-426614174000')
    expect(request.canonical_model_id).toBe('llama-3.2-1b-q4f16')
    expect(request.os_name).toBe('macOS')
    expect(request.report_summary.mode).toBe('stress')
  })
})
