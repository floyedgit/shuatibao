import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

describe("PWA assets", () => {
  it("manifest 使用刷题宝应用信息和 standalone 启动方式", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, "public", "manifest.webmanifest"), "utf-8"),
    );

    expect(manifest.name).toBe("刷题宝");
    expect(manifest.short_name).toBe("刷题宝");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe(".");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("HTML 入口声明 manifest、iOS 图标和移动端主题色", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf-8");

    expect(html).toContain('<title>刷题宝</title>');
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="theme-color"');
  });

  it("service worker 缓存应用壳资源", () => {
    const sw = readFileSync(resolve(root, "public", "sw.js"), "utf-8");

    expect(sw).toContain("shuatibao-shell");
    expect(sw).toContain("manifest.webmanifest");
    expect(sw).toContain("navigationPreload");
  });

  it("入口脚本注册 service worker", () => {
    const main = readFileSync(resolve(root, "src", "main.ts"), "utf-8");

    expect(main).toContain("serviceWorker");
    expect(main).toContain("register('/sw.js')");
  });
});
