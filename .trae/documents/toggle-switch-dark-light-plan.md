# 深浅色切换按钮改为开关式切换

## 概述

将当前的三态循环按钮（浅色/深色/自动）替换为 iOS 风格的滑动开关，只有两态：浅色（关）和深色（开）。初次进入时跟随系统主题，用户可手动切换。

## 当前状态分析

- **组件**：`src/components/LightDarkSwitch.svelte`，在 `src/components/Navbar.astro` L54 以 `client:only="svelte"` 引入
- **当前交互**：点击按钮在 浅色→深色→自动 三态间循环；悬停弹出面板可选择具体模式
- **主题存储**：`localStorage.getItem('theme')`，值为 `"light"` / `"dark"` / `"auto"`
- **默认主题**：`DEFAULT_THEME = AUTO_MODE`（`src/constants/constants.ts` L6）
- **主题初始化**：`src/layouts/Layout.astro` L113-139 的内联脚本在页面渲染前读取 localStorage 并应用 `dark` 类
- **setting-utils.ts**：`setTheme()` 存储+应用主题，`getStoredTheme()` 读取存储的主题，`applyThemeToDocument()` 切换 `dark` 类

## 改动方案

### 修改文件：`src/components/LightDarkSwitch.svelte`

完全重写组件，改为 iOS 风格滑动开关。

**逻辑变化**：
- 移除三态循环（`seq` 数组、`toggleScheme`、`showPanel`、`hidePanel`）
- 移除悬浮面板（`#light-dark-panel`）
- `onMount`：通过 `document.documentElement.classList.contains('dark')` 判断当前是否深色模式，设置开关初始位置（兼容 AUTO 模式下由系统偏好决定的状态）
- 点击开关：深色→浅色调用 `setTheme(LIGHT_MODE)`，浅色→深色调用 `setTheme(DARK_MODE)`
- 保留对系统主题变化的监听：仅当用户未手动切换过（即 theme 仍为 AUTO）时，跟随系统变化

**UI 变化**：
- 滑动开关：药丸形轨道（宽 56px，高 28px），圆形滑块在左侧（浅色）和右侧（深色）间滑动
- 轨道左侧显示太阳图标，右侧显示月亮图标
- 使用 Tailwind 过渡动画（`transition` + `duration-200`）
- 深色模式时轨道背景为深色，浅色模式时为浅色

**新组件结构**：
```svelte
<script lang="ts">
import { DARK_MODE, LIGHT_MODE, AUTO_MODE } from "@constants/constants.ts";
import Icon from "@iconify/svelte";
import { applyThemeToDocument, getStoredTheme, setTheme } from "@utils/setting-utils.ts";
import { onMount } from "svelte";

let isDark = $state(false);

onMount(() => {
    // 根据当前文档的 dark 类判断初始状态（兼容 AUTO 模式）
    isDark = document.documentElement.classList.contains('dark');

    // 监听系统主题变化，仅当主题为 AUTO 时跟随
    const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
        if (getStoredTheme() === AUTO_MODE) {
            isDark = document.documentElement.classList.contains('dark');
        }
    };
    darkModePreference.addEventListener("change", onChange);
    return () => darkModePreference.removeEventListener("change", onChange);
});

function toggle() {
    isDark = !isDark;
    setTheme(isDark ? DARK_MODE : LIGHT_MODE);
}
</script>

<button onclick={toggle} aria-label="Toggle dark mode"
    class="relative h-7 w-[3.5rem] rounded-full transition-colors duration-200
           bg-black/10 dark:bg-white/20 flex items-center px-0.5">
    <!-- 太阳图标 -->
    <Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[0.875rem] absolute left-1 text-black/40 dark:text-transparent transition" />
    <!-- 月亮图标 -->
    <Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[0.875rem] absolute right-1 text-transparent dark:text-white/60 transition" />
    <!-- 滑块 -->
    <div class="h-6 w-6 rounded-full bg-white dark:bg-[oklch(0.30_0.02_var(--hue))] shadow-md transition-transform duration-200 translate-x-0 dark:translate-x-[1.5rem]"></div>
</button>
```

### 不需要修改的文件

- `src/components/Navbar.astro`：引入方式 `client:only="svelte"` 不变
- `src/utils/setting-utils.ts`：`setTheme`、`getStoredTheme`、`applyThemeToDocument` 不变
- `src/constants/constants.ts`：`AUTO_MODE`、`LIGHT_MODE`、`DARK_MODE` 不变
- `src/layouts/Layout.astro`：主题初始化脚本不变

## 验证步骤

1. `pnpm dev` 启动开发服务器
2. 首次访问（清除 localStorage）：开关位置跟随系统主题
3. 点击开关：浅色↔深色切换，有滑动动画
4. 刷新页面：开关位置保持上次手动选择
5. 切换系统主题（在未手动操作过的情况下）：开关跟随系统变化
6. 手动切换后，再切换系统主题：不再跟随