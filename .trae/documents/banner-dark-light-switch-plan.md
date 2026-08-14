# Banner 深色/浅色模式切换计划

## 概述

当前 banner 配置只有一个 `src` 字段，无论深色/浅色模式都使用同一张图片。需要支持根据主题模式切换不同 banner 图片。

## 当前状态分析

- **配置类型** (`src/types/config.ts`): `Banner` 类型只有 `src: string` 字段
- **配置值** (`src/config.ts`): `banner.src = "assets/images/banner_light.png"`
- **渲染位置** (`src/layouts/MainGridLayout.astro` L55-60): 使用 `ImageWrapper` 组件渲染 `siteConfig.banner.src`
- **主题切换机制**:
  - `LightDarkSwitch.svelte` 调用 `setTheme()` 切换主题
  - `setTheme()` 通过 `document.documentElement.classList.toggle('dark')` 控制 Tailwind 的 `dark:` 变体
  - 主题值存储在 `localStorage.getItem('theme')` 中
- **Banner 动画** (`src/layouts/Layout.astro` L352-362): `showBanner()` 函数通过 `document.getElementById('banner')` 移除 `opacity-0` 和 `scale-105` 类

## 改动方案

### 1. 修改配置类型 (`src/types/config.ts`)

在 `banner` 类型中添加可选的 `srcDark` 字段：

```typescript
banner: {
    enable: boolean;
    src: string;
    srcDark?: string;  // 新增：深色模式下的 banner 图片路径
    position?: "top" | "center" | "bottom";
    credit: {
        enable: boolean;
        text: string;
        url?: string;
    };
};
```

### 2. 修改配置值 (`src/config.ts`)

添加 `srcDark` 字段：

```typescript
banner: {
    enable: true,
    src: "assets/images/banner_light.png",
    srcDark: "assets/images/banner_dark.png",  // 新增
    position: "center",
    credit: {
        enable: false,
        text: "",
        url: "",
    },
},
```

### 3. 修改渲染逻辑 (`src/layouts/MainGridLayout.astro`)

将单个 banner 图片改为渲染两个图片，通过 Tailwind 的 `dark:` 变体控制显隐：

```astro
{siteConfig.banner.enable && <div id="banner-wrapper" ...>
    <!-- 浅色模式 banner -->
    <ImageWrapper id="banner-light" alt="Banner image of the blog" 
                  class:list={["object-cover h-full transition duration-700 opacity-0 scale-105 dark:hidden"]}
                  src={siteConfig.banner.src} position={siteConfig.banner.position}>
    </ImageWrapper>
    <!-- 深色模式 banner -->
    {siteConfig.banner.srcDark && <ImageWrapper id="banner-dark" alt="Banner image of the blog" 
                  class:list={["object-cover h-full transition duration-700 opacity-0 scale-105 hidden dark:block"]}
                  src={siteConfig.banner.srcDark} position={siteConfig.banner.position}>
    </ImageWrapper>}
</div>}
```

### 4. 修改 Banner 动画逻辑 (`src/layouts/Layout.astro`)

更新 `showBanner()` 函数，同时处理浅色和深色两个 banner 图片的动画：

```typescript
function showBanner() {
    if (!siteConfig.banner.enable) return;
    
    const banners = ['banner-light', 'banner-dark'];
    banners.forEach(id => {
        const banner = document.getElementById(id);
        if (banner) {
            banner.classList.remove('opacity-0', 'scale-105');
        }
    });
}
```

### 5. 用户需要添加图片

用户需要准备一张深色模式的 banner 图片，放置在 `src/assets/images/banner_dark.png`。

## 验证步骤

1. `pnpm dev` 启动开发服务器
2. 在浅色模式下查看 banner 是否显示 `banner_light.png`
3. 切换到深色模式，确认 banner 切换为 `banner_dark.png`
4. 确认 banner 入场动画在两种模式下正常工作
5. 页面刷新后，主题状态保持，banner 图片正确显示对应模式的图片