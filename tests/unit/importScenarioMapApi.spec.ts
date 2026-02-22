import { describe, expect, it } from 'vitest'
import { getSupportedScenarioMap, resolveImportScenario } from '../../api/_lib/import-scenario-map.js'

const baseReport = {
  test_suite_version: 'v1',
  run_hash: 'a'.repeat(64),
  replay_hash: 'b'.repeat(64),
  models_tested: [
    {
      model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
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

describe('api import scenario map', () => {
  it('contains only supported quick/gauntlet scenario ids', () => {
    const map = getSupportedScenarioMap()
    expect(Object.keys(map).sort()).toEqual([
      'logic-traps-grouped',
      'logic-traps-l1',
      'quick-battle-30s',
    ])
  })

  it('resolves quick scenario correctly', () => {
    const result = resolveImportScenario(baseReport)
    expect(result.mode).toBe('quick')
    expect(result.scenario_id).toBe('quick-battle-30s')
  })

  it('resolves gauntlet grouped scenario correctly', () => {
    const result = resolveImportScenario({
      ...baseReport,
      models_tested: [
        {
          ...baseReport.models_tested[0],
          phases: {
            logic_traps: {
              details: {
                scenario_id: 'logic-traps-grouped',
                scenario_name: 'Logic Traps - Grouped',
              },
            },
          },
        },
      ],
    })
    expect(result.mode).toBe('gauntlet')
    expect(result.scenario_id).toBe('logic-traps-grouped')
  })

  it('rejects unsupported scenario id', () => {
    expect(() =>
      resolveImportScenario({
        ...baseReport,
        models_tested: [
          {
            ...baseReport.models_tested[0],
            phases: {
              logic_traps: {
                details: {
                  scenario_id: 'arena-product-review',
                },
              },
            },
          },
        ],
      })
    ).toThrow(/unsupported scenario_id/i)
  })
})
