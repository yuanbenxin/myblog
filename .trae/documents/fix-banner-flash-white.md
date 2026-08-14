# 修复白天→黑夜模式 banner 闪白问题

## 分析

### 根因
`MainGridLayout.astro` L57 和 L63：
- Light banner: `transition-opacity delay-90 duration-150`（90ms 开始，240ms 结束）
- Dark banner: `transition-opacity delay-200 duration-150`（200ms 开始，350ms 结束）

白天→黑夜时，light banner 在 90ms 开始淡出，dark banner 在 200ms 才开始淡入。90-200ms 区间内 light 正在变透明但 dark 仍为 0%，导致 banner 经过一个全白状态。

黑夜→白天不闪白，因为 light 在 90ms 就开始淡入，而 dark 在 200ms 才淡出，期间 dark 仍 100% 可见。

## 改动

`src/layouts/MainGridLayout.astro` L63：
将 `delay-200` 改为 `delay-90`，使两个 banner 同时开始交叉淡入淡出。

## 验证
1. 白天→黑夜：无闪白，平滑交叉淡入
2. 黑夜→白天：行为不变，仍流畅
