import { z } from 'zod'

export interface SafeParseResult<T> {
  ok: boolean
  value?: T
  error?: unknown
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function useZodValidator() {
  const safeParseJson = <T = unknown>(text: string): SafeParseResult<T> => {
    try {
      return { ok: true, value: JSON.parse(text) as T }
    } catch (error) {
      return { ok: false, error }
    }
  }

  const getAllowedFields = (schema: z.ZodSchema): string[] => {
    if (!(schema instanceof z.ZodObject)) return []
    return Object.keys(schema.shape)
  }

  const getRequiredFields = (schema: z.ZodSchema): string[] => {
    if (!(schema instanceof z.ZodObject)) return []
    return Object.keys(schema.shape).filter(
      key => schema.shape[key].isOptional?.() !== true
    )
  }

  const getExtraFields = (value: unknown, schema: z.ZodSchema): string[] => {
    if (!isPlainObject(value)) return []
    const allowed = getAllowedFields(schema)
    if (allowed.length === 0) return []

    return Object.keys(value).filter(field => !allowed.includes(field))
  }

  const getMissingFields = (value: unknown, schema: z.ZodSchema): string[] => {
    if (!isPlainObject(value)) return []
    const required = getRequiredFields(schema)
    if (required.length === 0) return []

    return required.filter(field => value[field] === undefined || value[field] === null)
  }

  const validateSchema = (value: unknown, schema: z.ZodSchema) => {
    return schema.safeParse(value)
  }

  return {
    safeParseJson,
    getAllowedFields,
    getRequiredFields,
    getExtraFields,
    getMissingFields,
    validateSchema
  }
}
