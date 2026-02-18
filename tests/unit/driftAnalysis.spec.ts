import { describe, expect, it } from 'vitest'
import { analyzeRunDrift } from '@/lib/drift-analysis'
import type { RunHistoryEntry } from '@/lib/run-history'

const buildEntry = (overrides: Partial<RunHistoryEntry>): RunHistoryEntry => ({
  id: overrides.id || `run-${Math.random()}`,
  mode: overrides.mode || 'gauntlet',
  scenarioId: overrides.scenarioId || 'scenario-a',
  scenarioName: overrides.scenarioName || 'Scenario A',
  completedAt: overrides.completedAt || new Date().toISOString(),
  durationMs: overrides.durationMs ?? 1000,
  passRate: overrides.passRate ?? 80,
  totalRounds: overrides.totalRounds ?? 10,
  passedRounds: overrides.passedRounds ?? 8,
  scorePct: overrides.scorePct,
  startedAt: overrides.startedAt,
  verdict: overrides.verdict,
  notes: overrides.notes,
})

describe('analyzeRunDrift', () => {
  it('returns empty groups when there are not enough repeated runs', () => {
    const summary = analyzeRunDrift([
      buildEntry({ id: 'a1', scenarioId: 'a', completedAt: '2026-02-18T00:00:00.000Z' }),
      buildEntry({ id: 'b1', scenarioId: 'b', completedAt: '2026-02-18T00:05:00.000Z' }),
    ])

    expect(summary.groups).toHaveLength(0)
    expect(summary.unstableGroups).toBe(0)
    expect(summary.overallConsistency).toBe(100)
  })

  it('classifies drift risk based on score spread', () => {
    const summary = analyzeRunDrift([
      buildEntry({ id: 'a1', scenarioId: 'a', scenarioName: 'A', scorePct: 95, passRate: 95, completedAt: '2026-02-18T01:00:00.000Z' }),
      buildEntry({ id: 'a2', scenarioId: 'a', scenarioName: 'A', scorePct: 60, passRate: 60, completedAt: '2026-02-18T02:00:00.000Z' }),
      buildEntry({ id: 'a3', scenarioId: 'a', scenarioName: 'A', scorePct: 55, passRate: 55, completedAt: '2026-02-18T03:00:00.000Z' }),
      buildEntry({ id: 'b1', scenarioId: 'b', scenarioName: 'B', scorePct: 88, passRate: 88, completedAt: '2026-02-18T01:30:00.000Z' }),
      buildEntry({ id: 'b2', scenarioId: 'b', scenarioName: 'B', scorePct: 86, passRate: 86, completedAt: '2026-02-18T02:30:00.000Z' }),
    ])

    expect(summary.groups).toHaveLength(2)
    expect(summary.groups[0].scenarioId).toBe('a')
    expect(summary.groups[0].riskLevel).toBe('HIGH')
    expect(summary.groups[1].riskLevel).toBe('LOW')
    expect(summary.unstableGroups).toBe(1)
  })

  it('supports quick mode entries', () => {
    const summary = analyzeRunDrift([
      buildEntry({ id: 'q1', mode: 'quick', scenarioId: 'quick-1', scenarioName: 'Quick 30s', passRate: 70, completedAt: '2026-02-18T04:00:00.000Z' }),
      buildEntry({ id: 'q2', mode: 'quick', scenarioId: 'quick-1', scenarioName: 'Quick 30s', passRate: 72, completedAt: '2026-02-18T05:00:00.000Z' }),
    ])

    expect(summary.groups).toHaveLength(1)
    expect(summary.groups[0].mode).toBe('quick')
    expect(summary.groups[0].riskLevel).toBe('LOW')
  })
})
