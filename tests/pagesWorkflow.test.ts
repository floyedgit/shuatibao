import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

describe("GitHub Pages workflow", () => {
  it("使用官方 Pages artifact 和 deploy actions 部署 dist", () => {
    const workflow = readFileSync(
      resolve(root, ".github", "workflows", "pages.yml"),
      "utf-8",
    );

    expect(workflow).toContain("actions/upload-pages-artifact@v3");
    expect(workflow).toContain("actions/configure-pages@v5");
    expect(workflow).toContain("actions/deploy-pages@v4");
    expect(workflow).toContain("npm run build:pages");
    expect(workflow).toContain("path: ./dist");
  });

  it("package.json 提供 GitHub Pages 构建脚本", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));

    expect(pkg.scripts["build:pages"]).toBe(
      "node scripts/cli.js build --output index.html",
    );
  });
});
