# AGENTS.md

## 构建与部署

- `pnpm build` 前必须先运行 `pnpm fetch:cards`（脚本：`scripts/fetch-card-data.mjs`），
  它会扫描 `src/content` 下所有 markdown 中的 `::modelscope` / `::huggingface` 指令，
  从 ModelScope API 与 HF 页面预取数据并写入 `src/data/card-data.json`
  （该文件已 gitignore，不入库）。
- `.github/workflows/deploy.yml` 的 build 步骤前已自动运行 `pnpm fetch:cards`，
  本地开发/构建需手动执行。
- 卡片插件 `src/plugins/rehype-component-github-card.mjs` 在构建时读取
  `card-data.json` 并内联渲染 ModelScope 与 HuggingFace 卡片
  （头像、指标、badges，均无运行时请求）；仅 GitHub 的指标仍在
  浏览器运行时实时获取（api.github.com 允许 CORS）。
- 新增或修改 markdown 中的 `::modelscope` / `::huggingface` 指令后，
  需重新运行 `pnpm fetch:cards` 再构建，否则对应卡片显示占位数据。

## 其他

- 包管理器：pnpm（版本由 package.json `packageManager` 字段指定）。
- 代码风格：Biome（`pnpm lint` / `pnpm format`，作用于 `src`）。