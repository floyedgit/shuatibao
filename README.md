# 刷题宝 PWA 手机版

“刷题宝”是一个面向 iOS 和安卓手机使用的本地题库刷题工具。项目基于 [QuarkPixel/quiz-app](https://github.com/QuarkPixel/quiz-app) 改造，保留原项目 MIT License 信息。

第一版定位：个人自用、本地题库、本地进度、手机优先。不需要服务器、账号或应用商店上架。

## 功能

- 支持判断题、单选题、多选题，保留填空题能力。
- 支持导入 JSON 题库。
- 支持本地保存做题进度。
- 支持答案预览、活动池、题型筛选和学习设置。
- 支持 `category` 分类和 `explanation` 答案解析。
- 支持 PWA：可在 iOS Safari 和安卓 Chrome/Edge 添加到主屏幕。

## 本机运行

当前项目可使用项目内便携 Node：

```powershell
$env:PATH = (Resolve-Path '.\.tools\node-v22.16.0-win-x64').Path + ';' + $env:PATH
npm install
npm run dev
```

然后在电脑浏览器打开终端显示的本地地址。

如果电脑已安装 Node.js LTS，也可以直接使用系统 `node` 和 `npm`。

## 构建

Library 模式，浏览器内导入题库：

```powershell
npm run build
```

构建后主要产物为：

```text
dist/shuatibao.html
```

Bundled 模式，把题库打包成单文件：

```powershell
node scripts/cli.js build --bundled assets/questions.example.json
```

构建后产物为：

```text
dist/bundled-<hash>.html
```

## 手机使用

iPhone：

1. 用 Safari 打开部署后的网址；
2. 点击分享按钮；
3. 选择“添加到主屏幕”；
4. 从桌面图标进入刷题宝。

安卓：

1. 用 Chrome 或 Edge 打开部署后的网址；
2. 选择“添加到主屏幕”或“安装应用”；
3. 从桌面图标进入刷题宝。

说明：第一版进度只保存在当前手机浏览器。iPhone 和安卓之间不会自动同步。

## 题库格式

题库是 JSON 数组，每个元素是一道题。

```json
{
  "id": "safety_single_1",
  "type": "single",
  "category": "安全生产",
  "question": "现场作业前应先落实哪项工作？",
  "options": [
    { "text": "风险辨识和安全交底" },
    { "text": "直接开工" }
  ],
  "answer": [0],
  "explanation": "作业前应开展风险辨识，明确安全措施并完成交底。"
}
```

字段说明：

- `id`：唯一编号，不得重复，不得以 `^` 开头。
- `type`：`judgment`、`single`、`multiple`、`blank`。
- `category`：可选分类。
- `question`：题干。
- `options`：选择题选项。
- `answer`：答案。选择题用从 0 开始的索引数组；判断题用 `true`/`false`。
- `explanation`：可选解析，答题后展示。

示例题库见 `assets/questions.example.json`。

## 测试

```powershell
npm test
```

## 部署

项目是静态网页，可以部署到 GitHub Pages、Cloudflare Pages、Vercel、Netlify 等静态托管平台。部署后用手机访问网址，再添加到主屏幕即可。
