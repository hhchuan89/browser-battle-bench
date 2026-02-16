import { z } from 'zod';

export const BattleResponseSchema = z.object({
  reasoning: z.string(),
  answer: z.string(),
});

export type BattleResponse = z.infer<typeof BattleResponseSchema>;
