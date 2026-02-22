import { describe, expect, it } from 'vitest'
import { scoreImportedRun } from '../../api/_lib/import-score.js'

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

describe('api import scoring', () => {
  it('scores quick import to 100 when all answers are correct', () => {
    const result = scoreImportedRun({
      bbb_report: baseReport,
      bbb_raw_outputs: {
        raw_outputs: [
          { test_id: 'quick-001', run: 1, output: '{"answer":"B"}' },
          { test_id: 'quick-002', run: 2, output: '{"answer":"B"}' },
          { test_id: 'quick-003', run: 3, output: '{"answer":"C"}' },
        ],
      },
    })

    expect(result.score.mode).toBe('quick')
    expect(result.score.total_rounds).toBe(3)
    expect(result.score.passed_rounds).toBe(3)
    expect(result.score.pass_rate).toBe(100)
    expect(result.score.score).toBe(100)
    expect(result.score.grade).toBe('S')
    expect(result.diagnostics.missing_test_ids).toHaveLength(0)
  })

  it('scores gauntlet import from answer key and reports missing ids', () => {
    const result = scoreImportedRun({
      bbb_report: {
        ...baseReport,
        models_tested: [
          {
            ...baseReport.models_tested[0],
            phases: {
              logic_traps: {
                details: {
                  scenario_id: 'logic-traps-l1',
                  scenario_name: 'Logic Traps Level 1',
                },
              },
            },
          },
        ],
      },
      bbb_raw_outputs: {
        raw_outputs: [
          { test_id: 'ctrl-001', run: 1, output: '{"answer":"A"}' },
          { test_id: 'trap-001', run: 2, output: '{"answer":"A"}' },
          { test_id: 'ctrl-002', run: 3, output: '{"answer":"B"}' },
          { test_id: 'trap-002', run: 4, output: '{"answer":"D"}' },
        ],
      },
    })

    expect(result.score.mode).toBe('gauntlet')
    expect(result.score.total_rounds).toBe(10)
    expect(result.score.passed_rounds).toBe(2)
    expect(result.score.pass_rate).toBe(20)
    expect(result.score.grade).toBe('F')
    expect(result.diagnostics.expected_tests).toBe(10)
    expect(result.diagnostics.observed_outputs).toBe(4)
    expect(result.diagnostics.missing_test_ids).toHaveLength(6)
  })
})
