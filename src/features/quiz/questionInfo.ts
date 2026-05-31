import type { Question } from "../../types";

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function getQuestionCategory(question: Question): string | null {
  return normalizeOptionalText(question.category);
}

export function getQuestionExplanation(question: Question): string | null {
  return normalizeOptionalText(question.explanation);
}
