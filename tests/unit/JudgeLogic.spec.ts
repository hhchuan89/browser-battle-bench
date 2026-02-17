import { describe, expect, it } from 'vitest'
import { JudgeLogic } from '@/services/warden/JudgeLogic'

const buildJsonAnswer = (answer: unknown, reasoning = 'ok') =>
  JSON.stringify({ reasoning, answer })

describe('JudgeLogic', () => {
  const judge = new JudgeLogic()

  it('keeps backward-compatible exact matching (case-insensitive)', () => {
    const result = judge.evaluate(buildJsonAnswer('a'), 'A')
    expect(result.pass).toBe(true)
  })

  it('supports number extraction comparisons', () => {
    const result = judge.evaluate(buildJsonAnswer('120 km'), '120', {
      answerType: 'number',
    })
    expect(result.pass).toBe(true)
  })

  it('supports numeric tolerance comparisons', () => {
    const pass = judge.evaluate(buildJsonAnswer('3.141'), '3.14', {
      answerType: 'numeric_tolerance',
      tolerance: 0.01,
    })
    const fail = judge.evaluate(buildJsonAnswer('3.20'), '3.14', {
      answerType: 'numeric_tolerance',
      tolerance: 0.01,
    })

    expect(pass.pass).toBe(true)
    expect(fail.pass).toBe(false)
  })

  it('supports contains comparisons', () => {
    const result = judge.evaluate(
      buildJsonAnswer('The correct answer is Paris'),
      'paris',
      { answerType: 'contains' }
    )
    expect(result.pass).toBe(true)
  })

  it('supports regex comparisons', () => {
    const pass = judge.evaluate(buildJsonAnswer('B'), '/^[Bb]$/', {
      answerType: 'regex',
    })
    const fail = judge.evaluate(buildJsonAnswer('B'), '[', {
      answerType: 'regex',
    })

    expect(pass.pass).toBe(true)
    expect(fail.pass).toBe(false)
    expect(fail.reason).toContain('Invalid regex pattern')
  })

  it('supports normalized string comparisons', () => {
    const result = judge.evaluate(
      buildJsonAnswer('The Eiffel Tower!'),
      'eiffel tower',
      { answerType: 'normalized_string' }
    )
    expect(result.pass).toBe(true)
  })

  it('fails when no JSON object is present', () => {
    const result = judge.evaluate('not json', 'A')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('No valid JSON object found')
  })

  it('fails when JSON is missing answer field', () => {
    const raw = JSON.stringify({ reasoning: 'exists but answer missing' })
    const result = judge.evaluate(raw, 'A')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('missing required "answer" field')
  })
})
