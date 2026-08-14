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

The author avatar is fetched through the Netlify proxy (which extracts it from the model page). You can also pin a custom logo with `logo`, accepting an absolute URL or a site-relative path:

```markdown
::huggingface{repo="t5-large"}
::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" desc="A custom description here"}
::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" logo="https://example.com/logo.png"}
::huggingface{repo="Qwen/Qwen2.5-7B-Instruct" logo="/images/qwen-logo.png"}
```

## ModelScope Model Cards

You can add dynamic cards for ModelScope models. The ModelScope API is not CORS-enabled, so requests are routed through the site's own Netlify Function (see `netlify/functions/card-proxy.mjs`).

::modelscope{repo="Qwen/Qwen2.5-7B-Instruct"}

The repo must be in the `owner/model` format. Pass `desc` to override the API description.

```markdown
::modelscope{repo="Qwen/Qwen2.5-7B"}
::modelscope{repo="Qwen/Qwen2.5-7B-Instruct" desc="A custom description here"}
```

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