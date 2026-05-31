import { describe, expect, it } from "vitest";
import { getQuestionCategory, getQuestionExplanation } from "../src/features/quiz/questionInfo";
import type { Question } from "../src/types";

const baseQuestion: Question = {
  id: "safety_1",
  type: "judgment",
  question: "作业前应开展风险辨识。",
  answer: true,
};

describe("questionInfo", () => {
  it("返回非空分类文本", () => {
    expect(
      getQuestionCategory({ ...baseQuestion, category: "安全生产" }),
    ).toBe("安全生产");
  });

  it("分类为空白时不展示", () => {
    expect(getQuestionCategory({ ...baseQuestion, category: "   " })).toBeNull();
  });

  it("返回非空解析文本", () => {
    expect(
      getQuestionExplanation({
        ...baseQuestion,
        explanation: "应先辨识风险，再落实管控措施。",
      }),
    ).toBe("应先辨识风险，再落实管控措施。");
  });

  it("解析为空白时不展示", () => {
    expect(
      getQuestionExplanation({ ...baseQuestion, explanation: "\n  \t" }),
    ).toBeNull();
  });
});
