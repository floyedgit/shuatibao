# 党务人才技能选拔赛模拟

本分支是“党务人才技能选拔赛模拟”单文件练习版，面向 iOS 和安卓手机使用。项目基于 [QuarkPixel/quiz-app](https://github.com/QuarkPixel/quiz-app) 改造，保留原项目 MIT License 信息。

定位：内置题库、本地进度、手机优先、打开即用。不需要服务器、账号或应用商店上架。

## 功能

- 首页显示题库统计、错题数量和最近一次模拟考试结果。
- 支持顺序刷题、随机刷题、模拟考试、错题本、题库查看。
- 模拟考试每次随机抽取 25 道题，正向计时，不限制交卷时间。
- 答错题自动加入错题本，错题可重新练习或移出。
- 题库和练习记录只保存在当前浏览器本地。

## 本机运行

当前项目可使用项目内便携 Node：

```powershell
$env:PATH = (Resolve-Path '.\.tools\node-v22.16.0-win-x64').Path + ';' + $env:PATH
npm install
npm run dev
```

然后在电脑浏览器打开终端显示的本地地址。

如果电脑已安装 Node.js LTS，也可以直接使用系统 `node` 和 `npm`。

## 构建单文件 HTML

生成可直接发送给别人使用的 HTML：

```powershell
npm run build:party
```

构建后主要产物为：

```text
dist/shuatibao.html
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

说明：进度只保存在当前手机浏览器。iPhone 和安卓之间不会自动同步。

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

项目已配置 GitHub Pages 自动部署。把代码推送到 GitHub 后：

1. 打开仓库 `floyedgit/shuatibao`；
2. 进入 `Settings` -> `Pages`；
3. `Source` 选择 `GitHub Actions`；
4. 回到 `Actions` 页面，等待 `Deploy to GitHub Pages` 运行完成；
5. 部署地址通常是 `https://floyedgit.github.io/shuatibao/`。

手机访问部署地址后：

- iPhone：用 Safari 打开，分享 -> 添加到主屏幕；
- 安卓：用 Chrome/Edge 打开，菜单 -> 添加到主屏幕或安装应用。

也可以部署到 Cloudflare Pages、Vercel、Netlify 等静态托管平台。部署后用手机访问网址，再添加到主屏幕即可。
