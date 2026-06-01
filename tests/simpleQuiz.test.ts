import { describe, expect, it } from "vitest";
import type { Question } from "../src/types";
import {
  countQuestionTypes,
  createDefaultSimpleState,
  formatElapsed,
  gradeExam,
  pickExamQuestions,
  recordWrongAnswer,
  removeWrongQuestion,
} from "../src/features/simpleQuiz";

function makeQuestion(id: string, type: "single" | "multiple" = "single"): Question {
  return {
    id,
    type,
    question: `题目 ${id}`,
    options: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }],
    answer: type === "single" ? [0] : [0, 2],
  };
}

describe("simpleQuiz question helpers", () => {
  it("counts single and multiple questions for the home page", () => {
    const questions = [
      makeQuestion("s1", "single"),
      makeQuestion("m1", "multiple"),
      makeQuestion("s2", "single"),
    ];

    expect(countQuestionTypes(questions)).toEqual({
      total: 3,
      single: 2,
      multiple: 1,
    });
  });

  it("picks 25 unique exam questions when enough questions exist", () => {
    const questions = Array.from({ length: 40 }, (_, i) => makeQuestion(`q${i}`));
    let seed = 0;
    const picked = pickExamQuestions(questions, 25, () => ((seed += 7) % 40) / 40);

    expect(picked).toHaveLength(25);
    expect(new Set(picked.map((q) => q.id)).size).toBe(25);
  });

  it("uses all available questions when the bank has fewer than the exam count", () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`));

    expect(pickExamQuestions(questions, 25, () => 0.5)).toHaveLength(10);
  });
});

describe("simpleQuiz exam and state helpers", () => {
  it("grades exam answers and returns wrong question ids", () => {
    const questions = [makeQuestion("s1", "single"), makeQuestion("m1", "multiple")];

    const result = gradeExam(questions, {
      s1: [0],
      m1: [2, 0],
    }, 125000);

    expect(result.correct).toBe(2);
    expect(result.total).toBe(2);
    expect(result.score).toBe(100);
    expect(result.elapsedMs).toBe(125000);
    expect(result.wrongIds).toEqual([]);
  });

  it("records wrong ids without duplicates and allows removal", () => {
    let state = createDefaultSimpleState();
    state = recordWrongAnswer(state, "q1");
    state = recordWrongAnswer(state, "q1");
    state = recordWrongAnswer(state, "q2");
    state = removeWrongQuestion(state, "q1");

    expect(state.wrongIds).toEqual(["q2"]);
  });

  it("formats elapsed time as minutes and seconds", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(65000)).toBe("01:05");
    expect(formatElapsed(3661000)).toBe("61:01");
  });
});
