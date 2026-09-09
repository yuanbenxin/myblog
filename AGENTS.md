# AGENTS.md — fuwari 博客

基于 **Astro + fuwari** 的主题博客，Svelte/Tailwind、Pagefind 搜索、MathJax/KaTeX、Expressive Code、PhotoSwipe（见 [package.json](package.json)）。

## 常用命令

- `pnpm dev` / `pnpm start`：本地开发
- `pnpm build`：构建（`astro build && pagefind --site dist`，产物在 `dist/`）
- `pnpm preview`：预览构建产物
- `pnpm check`：`astro check`；`pnpm type-check`：`tsc --noEmit`
- `pnpm new-post -- <文件名>`：在 `src/content/posts/` 生成带 front-matter 的新文章（[scripts/new-post.js](scripts/new-post.js)）
- `pnpm format` / `pnpm lint`：Biome（作用于 `src`）
- 包管理器：pnpm（版本由 package.json `packageManager` 字段指定）

## 内容与配置

- 站点/导航/头像/许可等集中配置在 [src/config.ts](src/config.ts)；类型在 `src/types/config.ts`。
- 文章在 `src/content/posts/`，集合约束见 [src/content/config.ts](src/content/config.ts)（posts 强校验 front-matter；spec 为宽松集合）。
- front-matter 关键字段：`title`、`published`、`updated`、`draft`、`description`、`image`、`tags`、`category`、`lang`。
- 支持自定义指令：`::github{}`、`::huggingface{}`、`::modelscope{}` 卡片，以及 `:::note/tip/important/caution/warning` 提示块。

## 构建与部署

- `pnpm build` 前必须先运行 `pnpm fetch:cards`（脚本 [scripts/fetch-card-data.mjs](scripts/fetch-card-data.mjs)），
  它扫描 `src/content` 下所有 markdown 的 `::modelscope` / `::huggingface` 指令，
  从 ModelScope API 与 HF 页面预取数据写入 `src/data/card-data.json`（已 gitignore，不入库）。
- 卡片插件 `src/plugins/rehype-component-github-card.mjs` 构建时读取 `card-data.json`
  内联渲染 ModelScope/HuggingFace 卡片（无运行时请求）；仅 GitHub 指标在浏览器实时获取。
- 新增/修改 markdown 指令后需重新跑 `pnpm fetch:cards` 再构建，否则卡片显示占位数据。
- 部署：`.github/workflows/deploy.yml`，push 到 `main` 自动构建并部署 GitHub Pages；
  build 步骤通过环境变量覆盖 PWA 源与 base：`SITE=https://yuanbenxin.github.io/myblog`、`BASE=/myblog/`。
- [astro.config.mjs](astro.config.mjs) 支持 `SITE`/`BASE` 环境变量（`BASE` 用于子路径部署，本地默认 "/"）。

## Markdown 管线

构建管线含多个自定义插件（`src/plugins/`）：reading-time、excerpt、admonition、file-card、
github-card、base-url 重写、lazy images 等。修改 markdown 渲染行为优先检查此处而非 astro 默认配置。