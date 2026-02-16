/**
 * Easy Schemas for BBB Battle Arena
 * Simple JSON schemas for quick benchmarking
 */

export interface SchemaDefinition {
  id: string
  name: string
  difficulty: 'easy' | 'medium' | 'hard'
  prompt: string
  systemPrompt: string
  schema: object
}

export const easySchemas: SchemaDefinition[] = [
  {
    id: 'schema_001',
    name: 'product_review',
    difficulty: 'easy',
    prompt: 'Generate a product review for a wireless mouse.',
    systemPrompt: 'You must respond with valid JSON only. No explanation, no markdown, no extra fields.',
    schema: {
      type: 'object',
      properties: {
        product_name: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        pros: { type: 'array', items: { type: 'string' }, minItems: 2 },
        cons: { type: 'array', items: { type: 'string' }, minItems: 1 },
        verdict: { enum: ['recommended', 'not_recommended', 'neutral'] }
      },
      required: ['product_name', 'rating', 'pros', 'cons', 'verdict'],
      additionalProperties: false
    }
  },
  {
    id: 'schema_002',
    name: 'weather_report',
    difficulty: 'easy',
    prompt: 'Generate a weather report for a city.',
    systemPrompt: 'You must respond with valid JSON only. No explanation, no markdown, no extra fields.',
    schema: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        temperature: { type: 'number' },
        condition: { enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'] },
        humidity: { type: 'integer', minimum: 0, maximum: 100 },
        wind_speed: { type: 'number' }
      },
      required: ['city', 'temperature', 'condition', 'humidity', 'wind_speed'],
      additionalProperties: false
    }
  },
  {
    id: 'schema_003',
    name: 'book_info',
    difficulty: 'easy',
    prompt: 'Generate information about a book.',
    systemPrompt: 'You must respond with valid JSON only. No explanation, no markdown, no extra fields.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
        year: { type: 'integer' },
        genre: { type: 'string' },
        pages: { type: 'integer', minimum: 1 }
      },
      required: ['title', 'author', 'year', 'genre', 'pages'],
      additionalProperties: false
    }
  },
  {
    id: 'schema_004',
    name: 'contact_card',
    difficulty: 'easy',
    prompt: 'Generate a contact card for a person.',
    systemPrompt: 'You must respond with valid JSON only. No explanation, no markdown, no extra fields.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        company: { type: 'string' },
        role: { type: 'string' }
      },
      required: ['name', 'email', 'phone'],
      additionalProperties: false
    }
  },
  {
    id: 'schema_005',
    name: 'recipe',
    difficulty: 'easy',
    prompt: 'Generate a simple recipe for pasta.',
    systemPrompt: 'You must respond with valid JSON only. No explanation, no markdown, no extra fields.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        prep_time_minutes: { type: 'integer', minimum: 0 },
        cook_time_minutes: { type: 'integer', minimum: 0 },
        servings: { type: 'integer', minimum: 1 },
        ingredients: { type: 'array', items: { type: 'string' }, minItems: 3 },
        difficulty: { enum: ['easy', 'medium', 'hard'] }
      },
      required: ['name', 'prep_time_minutes', 'cook_time_minutes', 'servings', 'ingredients', 'difficulty'],
      additionalProperties: false
    }
  }
]

export default easySchemas
