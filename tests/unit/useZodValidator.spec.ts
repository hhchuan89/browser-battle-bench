import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { useZodValidator } from '@/composables/useZodValidator'

describe('useZodValidator', () => {
  const schema = z.object({
    foo: z.string(),
    bar: z.number().optional(),
  })

  it('parses JSON safely', () => {
    const { safeParseJson } = useZodValidator()

    const ok = safeParseJson('{"foo":"ok"}')
    const bad = safeParseJson('{"foo":')

    expect(ok.ok).toBe(true)
    expect(ok.value).toEqual({ foo: 'ok' })
    expect(bad.ok).toBe(false)
  })

  it('detects required and missing fields', () => {
    const { getRequiredFields, getMissingFields } = useZodValidator()

    expect(getRequiredFields(schema)).toEqual(['foo'])
    expect(getMissingFields({ bar: 1 }, schema)).toEqual(['foo'])
  })

  it('detects extra fields', () => {
    const { getExtraFields } = useZodValidator()

    expect(getExtraFields({ foo: 'ok', extra: true }, schema)).toEqual(['extra'])
    expect(getExtraFields({ foo: 'ok' }, schema)).toEqual([])
  })
})
