/**
 * Endurance Scenarios - Stress test definitions
 */

import type { EnduranceScenario } from '../types/endurance';

const JSON_EXTRACTION_PROMPT = `Extract the answer from this text and respond with valid JSON only:

Text: "The capital of France is Paris. Paris is known as the City of Light."

Respond with JSON in this exact format:
{
  "reasoning": "The text states that the capital of France is Paris",
  "answer": "Paris"
}`;

const LOGIC_TRAP_PROMPT = `Solve this logic puzzle and respond with valid JSON only:

"All cats are mammals. All mammals are animals. Is every cat an animal?"

Respond with JSON in this exact format:
{
  "reasoning": "Since all cats are mammals and all mammals are animals, cats must be animals by transitivity",
  "answer": "YES"
}`;

export const enduranceScenarios: EnduranceScenario[] = [
  {
    id: 'memory-leak-100',
    name: 'Memory Leak Detection (100 Rounds)',
    type: 'sequential',
    rounds: 100,
    prompt: JSON_EXTRACTION_PROMPT,
    expectedAnswer: 'PARIS',
    description: 'Sequential inference stress test to detect memory leaks over 100 rounds'
  },
  {
    id: 'concurrent-4x',
    name: 'Concurrency Stress (4x Parallel)',
    type: 'concurrent',
    rounds: 25,
    concurrency: 4,
    prompt: JSON_EXTRACTION_PROMPT,
    expectedAnswer: 'PARIS',
    description: '4 parallel inferences per round to test WebGPU scheduling'
  },
  {
    id: 'mixed-stress',
    name: 'Mixed Stress Test',
    type: 'mixed',
    rounds: 50,
    concurrency: 2,
    prompt: LOGIC_TRAP_PROMPT,
    expectedAnswer: 'YES',
    description: '50 rounds with 2 concurrent requests per round'
  },
  {
    id: 'quick-smoke',
    name: 'Quick Smoke Test (10 Rounds)',
    type: 'sequential',
    rounds: 10,
    prompt: JSON_EXTRACTION_PROMPT,
    expectedAnswer: 'PARIS',
    description: 'Fast 10-round test for quick validation'
  }
];

export function getScenarioById(id: string): EnduranceScenario | undefined {
  return enduranceScenarios.find(s => s.id === id);
}
