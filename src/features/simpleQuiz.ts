import type { Question } from "../types";

export const APP_TITLE = "党务人才技能选拔赛模拟";
export const EXAM_QUESTION_COUNT = 25;

export interface SimpleState {
  sequentialIndex: number;
  wrongIds: string[];
  lastExam: ExamResult | null;
}

export interface QuestionTypeCounts {
  total: number;
  single: number;
  multiple: number;
}

export interface ExamResult {
  total: number;
  correct: number;
  score: number;
  elapsedMs: number;
  wrongIds: string[];
  finishedAt: string;
}

export type AnswerMap = Record<string, number[]>;

export function createDefaultSimpleState(): SimpleState {
  return {
    sequentialIndex: 0,
    wrongIds: [],
    lastExam: null,
  };
}

export function countQuestionTypes(questions: Question[]): QuestionTypeCounts {
  return {
    total: questions.length,
    single: questions.filter((q) => q.type === "single").length,
    multiple: questions.filter((q) => q.type === "multiple").length,
  };
}

export function pickExamQuestions(
  questions: Question[],
  count = EXAM_QUESTION_COUNT,
  random: () => number = Math.random,
): Question[] {
  const pool = [...questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function normalizeAnswer(answer: number[]): number[] {
  return [...answer].sort((a, b) => a - b);
}

export function isAnswerCorrect(question: Question, selected: number[]): boolean {
  if (!Array.isArray(question.answer)) return false;
  const expected = normalizeAnswer(question.answer as number[]);
  const actual = normalizeAnswer(selected);
  return (
    expected.length === actual.length &&
    expected.every((value, index) => value === actual[index])
  );
}

export function gradeExam(
  questions: Question[],
  answers: AnswerMap,
  elapsedMs: number,
): ExamResult {
  let correct = 0;
  const wrongIds: string[] = [];

  for (const question of questions) {
    if (isAnswerCorrect(question, answers[question.id] ?? [])) {
      correct += 1;
    } else {
      wrongIds.push(question.id);
    }
  }

  return {
    total: questions.length,
    correct,
    score: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
    elapsedMs,
    wrongIds,
    finishedAt: new Date().toISOString(),
  };
}

export function recordWrongAnswer(state: SimpleState, questionId: string): SimpleState {
  if (state.wrongIds.includes(questionId)) return state;
  return {
    ...state,
    wrongIds: [...state.wrongIds, questionId],
  };
}

export function recordWrongAnswers(
  state: SimpleState,
  questionIds: string[],
): SimpleState {
  return questionIds.reduce(recordWrongAnswer, state);
}

export function removeWrongQuestion(state: SimpleState, questionId: string): SimpleState {
  return {
    ...state,
    wrongIds: state.wrongIds.filter((id) => id !== questionId),
  };
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function answerLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export function formatQuestionAnswer(question: Question): string {
  if (!Array.isArray(question.answer)) return String(question.answer);
  return (question.answer as number[]).map(answerLabel).join("");
}
