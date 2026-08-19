---
title: Markdown Extended Features
published: 2024-05-01
updated: 2024-11-29
description: 'Read more about Markdown features in Fuwari'
image: ''
tags: [Demo, Example, Markdown, Fuwari]
category: Examples
draft: true 
---

## GitHub Repository Cards
You can add dynamic cards that link to GitHub repositories, on page load, the repository information is pulled from the GitHub API. 

::github{repo="Sukina-Lab/Paper2Gal"}

Create a GitHub repository card with the code `::github{repo="<owner>/<repo>"}`.

```markdown
::github{repo="saicaca/fuwari"}
```

## Hugging Face Model Cards

You can add dynamic cards for Hugging Face models. On page load, the model info is pulled from the Hugging Face API through the domestic mirror `hf-mirror.com`.

::huggingface{repo="google-bert/bert-base-uncased"}

::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" desc="通义千问 2.5 系列指令微调模型（7B 参数）"}

Both `owner/model` and single-segment ids (e.g. `t5-large`) are supported. Since the Hugging Face API does not expose a description, the description row shows the framework and pipeline task as badges by default — pass `desc` to override it.

The author avatar is fetched at build time (from the model page) by `scripts/fetch-card-data.mjs`, which the GitHub Pages workflow runs before building. Locally, run `pnpm fetch:cards` to refresh the data. You can also pin a custom logo with `logo`, accepting an absolute URL or a site-relative path:

```markdown
::huggingface{repo="t5-large"}
::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" desc="A custom description here"}
::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" logo="https://example.com/logo.png"}
::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" logo="/images/qwen-logo.png"}
```

## ModelScope Model Cards

You can add cards for ModelScope models. The ModelScope API is not CORS-enabled, so model info (including the organization avatar) is fetched at build time by `scripts/fetch-card-data.mjs` and inlined into the page — the GitHub Pages workflow runs it automatically before building, or run `pnpm fetch:cards` locally.

::modelscope{repo="Qwen/Qwen2.5-7B-Instruct"}

The repo must be in the `owner/model` format. Pass `desc` to override the API description.

```markdown
::modelscope{repo="Qwen/Qwen2.5-7B"}
::modelscope{repo="Qwen/Qwen2.5-7B-Instruct" desc="A custom description here"}
```

## File Cards

You can embed a downloadable file card in a post. Reference a file either from the `public` directory with a path starting with `/`, or from the `src` directory with a path without a leading `/` (mirroring the theme's image path handling).

::file["/files/demo.pdf", "演示 PDF 文档"]

::file{path="/files/demo.docx" name="演示 Word 文档"}

::file{content/posts/notes/Drafts/the_manipulated_man.md, "src 目录下的文件"}

The card shows the file name, size and a format-colored icon (PDF = red, Word = blue with a "W", Excel = green, PowerPoint = orange, …). Clicking the card (or the download button on the right) downloads the file. The card lifts up on hover.

```markdown
::file["/files/note.pdf"]
::file["/files/note.pdf", "自定义显示名称"]
::file{path="/files/note.docx" name="属性写法"}
::file{"/files/note.docx", "花括号写法"}
:file{"/files/note.docx"}
:file{/files/note.docx}

# src 目录下的文件（路径不以 / 开头）
::file{content/posts/notes/Drafts/the_manipulated_man.md}
:file{content/posts/notes/Drafts/the_manipulated_man.md}
```

The first argument is the file path, the optional second argument overrides the displayed name (defaults to the file name). Paths starting with `/` resolve relative to the `public` directory (e.g. `/files/note.pdf` → `public/files/note.pdf`); paths without a leading `/` resolve relative to the `src` directory (e.g. `notes/note.pdf` → `src/notes/note.pdf`), matching the theme's image handling. Files under `src/` are copied into the build output under the `/download/` prefix so the download link keeps working after deployment.

Both square-bracket labels (`["path", "name"]`) and brace labels (`{"path", "name"}`) are accepted, with either one or two colons; quotes around the arguments are optional.

## Admonitions

Following types of admonitions are supported: `note` `tip` `important` `warning` `caution`

:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::

:::important
Crucial information necessary for users to succeed.
:::

:::warning
Critical content demanding immediate user attention due to potential risks.
:::

:::caution
Negative potential consequences of an action.
:::

### Basic Syntax

```markdown
:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::
```

### Custom Titles

The title of the admonition can be customized.

:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::

```markdown
:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::
```

### GitHub Syntax

> [!TIP]
> [The GitHub syntax](https://github.com/orgs/community/discussions/16925) is also supported.

```
> [!NOTE]
> The GitHub syntax is also supported.

> [!TIP]
> The GitHub syntax is also supported.
```

### Spoiler

You can add spoilers to your text. The text also supports **Markdown** syntax.

The content :spoiler[is hidden **ayyy**]!

```markdown
The content :spoiler[is hidden **ayyy**]!

```