import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("scripts/cli.js", () => {
  it("在 Windows 下使用 vite.cmd 启动 Vite", () => {
    const cli = readFileSync(
      resolve(__dirname, "..", "scripts", "cli.js"),
      "utf-8",
    );

    expect(cli).toContain("process.platform");
    expect(cli).toContain("vite.cmd");
    expect(cli).toContain("shell: process.platform === \"win32\"");
  });

  it("支持 --output 指定构建产物名称", () => {
    const cli = readFileSync(
      resolve(__dirname, "..", "scripts", "cli.js"),
      "utf-8",
    );

    expect(cli).toContain("--output");
    expect(cli).toContain("env.QUIZ_OUTPUT");
  });
});
