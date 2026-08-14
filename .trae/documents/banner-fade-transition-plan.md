# Banner 深色/浅色模式切换淡入淡出效果计划

## 概述

当前 banner 主题切换使用 `dark:hidden` / `hidden dark:block`（CSS `display` 控制），无法产生过渡动画。需要改为基于 `opacity` 的淡入淡出效果，过渡时间与页面其他组件一致。

## 当前状态分析

- **当前问题**：`banner-light` 使用 `dark:hidden`，`banner-dark` 使用 `hidden dark:block`。`display` 属性无法用 CSS `transition` 做动画，所以切换时是生硬的闪现。
- **过渡时间参考**：
  - `<html>` 和 `<body>` 使用 `transition`（Tailwind 默认 150ms）
  - `#top-row` 使用 `transition-all duration-300`
  - Banner 相关元素（wrapper、images、main-grid）使用 `transition duration-700`
  - 现有 banner 入场动画也使用 `duration-700`
- **当前 banner 渲染结构**（`MainGridLayout.astro` L55-64）：两个 ImageWrapper 在 `#banner-wrapper` 内，通过 `hidden`/`dark:block` 控制显隐
- **入场动画**（`Layout.astro` L352-362）：`showBanner()` 移除 `opacity-0` 和 `scale-105` 类

## 改动方案

### 核心思路

将 `display` 控制改为 `opacity` 控制，用 CSS 规则（而非 Tailwind 类）来管理主题相关的显隐，避免与 `showBanner()` 的 `opacity-0` 类移除逻辑冲突。

### 1. 修改 `src/layouts/MainGridLayout.astro` - Banner 渲染

**改动点**：
- 移除 `banner-light` 上的 `dark:hidden`，改为 `dark:opacity-0`
- 移除 `banner-dark` 上的 `hidden dark:block`，改为 `opacity-0 dark:opacity-100`
- 两个 ImageWrapper 都加上 `absolute inset-0` 使其重叠（否则 block 元素会垂直排列）

```astro
{siteConfig.banner.enable && <div id="banner-wrapper" class={`absolute z-10 w-full transition duration-700 overflow-hidden relative`} style={`top: -${BANNER_HEIGHT_EXTEND}vh`}>
    <ImageWrapper id="banner-light" alt="Banner image of the blog" class:list={["object-cover h-full transition duration-700 opacity-0 scale-105 absolute inset-0 dark:opacity-0"]}
                  src={siteConfig.banner.src} position={siteConfig.banner.position}
    >
    </ImageWrapper>
    {siteConfig.banner.srcDark && <ImageWrapper id="banner-dark" alt="Banner image of the blog" class:list={["object-cover h-full transition duration-700 opacity-0 scale-105 absolute inset-0 dark:opacity-100"]}
                  src={siteConfig.banner.srcDark} position={siteConfig.banner.position}
    >
    </ImageWrapper>}
</div>}
```

**关键原理**：
- `showBanner()` 会移除两个元素的 `opacity-0` 和 `scale-105` 类（入场动画）
- `banner-light` 上的 `dark:opacity-0` 不会被移除，在深色模式下将其淡出
- `banner-dark` 上的 `dark:opacity-100` 不会被移除，在深色模式下将其淡入
- `opacity-0` 在 light 模式下让 `banner-dark` 保持隐藏（因为 `showBanner()` 移除了 `opacity-0` 类，所以需要额外处理...）

### 2. 修正：改用 CSS 规则确保 light 模式下 dark banner 隐藏

上述方案中 `banner-dark` 的 `opacity-0` 会被 `showBanner()` 移除，导致 light 模式下 dark banner 可见。需要在 `<style>` 中添加 CSS 规则确保隐藏：

在 `src/layouts/Layout.astro` 的 `<style>` 块中添加：

```css
/* Light mode: dark banner 隐藏 */
#banner-dark {
    opacity: 0;
}
/* Dark mode: light banner 隐藏，dark banner 显示 */
:root.dark #banner-light {
    opacity: 0;
}
:root.dark #banner-dark {
    opacity: 1;
}
```

这些 CSS 规则与 `transition duration-700` 结合，会在 `dark` 类切换时自动触发 700ms 的 opacity 过渡动画。

### 3. 总结改动文件

| 文件 | 改动 |
|------|------|
| `src/layouts/MainGridLayout.astro` | 修改 banner 渲染：`dark:hidden` → `dark:opacity-0`，`hidden dark:block` → `opacity-0 dark:opacity-100`，添加 `absolute inset-0` 和 `relative` |
| `src/layouts/Layout.astro` | 在 `<style>` 中添加 CSS 规则控制主题相关 banner 显隐 |

### 4. 无需改动的部分

- `showBanner()` 函数：已同时处理 `banner-light` 和 `banner-dark`，无需修改
- `src/types/config.ts` 和 `src/config.ts`：之前已添加 `srcDark` 字段
- `LightDarkSwitch.svelte`：主题切换逻辑不变

## 验证步骤

1. `pnpm dev` 启动
2. 页面加载时 banner 入场动画正常（opacity 0→1，scale 1.05→1）
3. 切换到深色模式：light banner 淡出，dark banner 淡入，时长约 700ms
4. 切换到浅色模式：dark banner 淡出，light banner 淡入，时长约 700ms
5. 刷新页面后主题保持，banner 显示正确