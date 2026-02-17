export type AnswerType =
  | 'exact'
  | 'number'
  | 'numeric_tolerance'
  | 'contains'
  | 'regex'
  | 'normalized_string';

export interface JudgeEvaluateOptions {
  answerType?: AnswerType;
  tolerance?: number;
}
