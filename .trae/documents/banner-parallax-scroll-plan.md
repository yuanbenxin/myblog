# Banner 滚动阻尼视差效果计划

## 分析

### 当前行为
- `#banner-wrapper` 是 `position: absolute`，`top: -30vh`，高度 65vh
- 随页面正常滚动——向下滚动时 banner 跟着向上移出视口
- 最终完全消失，背景区域没有图片覆盖

### 用户需求
1. 向下滚动时，banner 只缓慢移动很小一段距离（阻尼效果）
2. 不能让 banner 完全滚出视口
3. 主页滚动到底部时仍保证 50% 视口高度有图片覆盖

### 可行性：可以实现

## 实现方案

**核心思路**：在 `#banner-wrapper` 内部加一层 `#banner-content` 包裹图片，通过 JavaScript 对 `#banner-content` 施加 `translateY` 实现视差。`#banner-wrapper` 的 `overflow: hidden` 会裁剪超出部分，`#banner-content` 设为比 wrapper 更高，保证移动后不露空。

### 为什么用内层 div 而非直接操作 `#banner-wrapper`
- `#banner-wrapper` 有 `transition duration-700`（用于页面切换动画）
- 如果对其直接设 `transform`，每次滚动帧都会触发 700ms 过渡，导致卡顿
- 用内层 `#banner-content`（无 transition）施加 parallax，外层保持不变

### 高度计算
- `#banner-wrapper`：65vh，`overflow: hidden`
- `#banner-content`：`top: -15vh`，`height: calc(100% + 30vh)` = 95vh
  - 上下各多出 15vh，为视差移动留出空间
  - offset=0 时：content 覆盖 -15vh 到 80vh，wrapper(0~65vh) 完全覆盖
  - offset=15vh 时：content 覆盖 0 到 95vh，wrapper(0~65vh) 完全覆盖
- 图片用 `object-cover h-full`，自动填充 95vh，略微缩小（展示更多画面）

### 阻尼公式
```javascript
const maxOffset = isHome ? innerHeight * 0.15 : innerHeight * 0.10;
const scrollDistance = innerHeight * 1.5;  // 1.5个视窗高度内完成动画
const progress = Math.min(scrollY / scrollDistance, 1);
const offset = maxOffset * (1 - Math.pow(1 - progress, 3));  // ease-out cubic
```

- 滚动 0：offset=0
- 滚动 0.75 视窗：offset≈87.5% maxOffset
- 滚动 1.5 视窗：offset=maxOffset（封顶）
- 超过 1.5 视窗：保持 maxOffset

### 主页 50% 覆盖验证
- 主页 banner 可见区域：0~65vh
- 最大偏移 15vh 后：可见区域 15~65vh = 50vh = 50% 视窗 ✓

## 具体改动

### 1. `src/layouts/MainGridLayout.astro`（L55-68）

在 `#banner-wrapper` 内加一层 `#banner-content` 包裹图片 div：

```astro
{siteConfig.banner.enable && <div id="banner-wrapper" class={`absolute z-10 w-full transition duration-700 overflow-hidden`} style={`top: -${BANNER_HEIGHT_EXTEND}vh`}>
    <div id="banner-content" class="absolute -top-[15vh] h-[calc(100%+30vh)] w-full">
        <div class="absolute inset-0 opacity-100 dark:opacity-0 ...">
            <ImageWrapper id="banner-light" ... />
        </div>
        {siteConfig.banner.srcDark && <div class="absolute inset-0 opacity-0 dark:opacity-100 ...">
            <ImageWrapper id="banner-dark" ... />
        </div>}
    </div>
    <div class="banner-fade absolute bottom-0 left-0 right-0 pointer-events-none"></div>
</div>}
```

注意：`banner-fade` 保持在 `#banner-content` 外面（直接在 `#banner-wrapper` 下），不随视差移动。

### 2. `src/layouts/Layout.astro`（JavaScript）

在 `scrollFunction` 中添加 parallax 更新，并在 `init()` 和 Swup hooks 中调用：

```javascript
function updateBannerParallax() {
    const bannerContent = document.getElementById('banner-content');
    if (!bannerContent) return;

    const scrollY = window.scrollY;
    const isHome = document.body.classList.contains('lg:is-home') && window.innerWidth >= 1024;
    const maxOffset = isHome
        ? window.innerHeight * 0.15
        : window.innerHeight * 0.10;
    const scrollDistance = window.innerHeight * 1.5;
    const progress = Math.min(scrollY / scrollDistance, 1);
    const offset = maxOffset * (1 - Math.pow(1 - progress, 3));

    bannerContent.style.transform = `translateY(${offset}px)`;
}
```

调用点：
- `init()` 函数中调用一次（页面加载时）
- `scrollFunction()` 中每次滚动调用
- Swup `content:replace` hook 中调用（页面切换后重置）

## 副发现

CSS 中 `.enable-banner.is-home` 选择器使用 `is-home` 类，但 body 实际添加的是 `lg:is-home` 类（L149, L418）。两者不匹配，导致主页专属的 CSS 规则可能未生效。此问题不在本计划范围内，但可能影响主页 banner 高度/位移。

## 验证步骤

1. `pnpm dev` 启动
2. 主页向下滚动：banner 缓慢下移，15vh 后停止
3. 滚动到底部：主页仍有约 50% 视窗高度有图片覆盖
4. 非主页向下滚动：banner 缓慢下移，10vh 后停止
5. 页面切换后：parallax 重置为 0
6. 页面加载入场动画（700ms scale+fade）不受影响