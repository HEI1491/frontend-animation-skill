# 缓动曲线：质感的唯一决定因素

曲线决定「质感」而不只是「快慢」。同一时长下，曲线的差异比时长本身更大：240ms 配合 ease-out 感觉轻快，配合 ease-in 感觉笨重，配合 linear 感觉机械。曲线是物理直觉的数学表达：进场要「有冲劲」（快起慢停），出场要「不拖沓」（慢起快走），切换要「可打断」（对称曲线）。

全站只需要 **3 条基准曲线** + 1 条特殊用途曲线（linear）。超出这个数量说明设计系统失控了。

## 1. 三条基准曲线

| 用途   | 曲线                            | 直觉         | 为什么                                                                 |
|--------|---------------------------------|--------------|------------------------------------------------------------------------|
| 进场   | `cubic-bezier(0.16, 1, 0.3, 1)` | 快起慢停     | 物体进入视野时要立刻「到位」让人察觉，尾巴拖长才显得有余韵、不生硬     |
| 出场   | `cubic-bezier(0.4, 0, 1, 1)`    | 慢起快走     | 离开不需要被看清，加速走掉才不拖沓；起步慢是为了给打断留反应时间       |
| 双向   | `cubic-bezier(0.4, 0, 0.2, 1)`  | 对称         | 状态切换可能被打断（hover 移走、开关拨回），对称曲线反向播放时不突兀   |

### 控制点含义

`cubic-bezier(P1x, P1y, P2x, P2y)`：
- **P1** 控制起步速度：P1y 越大，起步越快。
- **P2** 控制收尾速度：P2y 越小，收尾越慢（拖长）。
- **x 轴**是时间进度（0 = 开始，1 = 结束），**y 轴**是数值进度（0 = 起始值，1 = 目标值）。
- y 可以 **>1** 或 **<0**，产生「过冲」或「回弹」效果。

示例：`cubic-bezier(0.16, 1, 0.3, 1)` 的 P1y = 1 意味着在时间进度 16% 时，数值进度已达 100%，之后进入缓冲阶段——这就是「快起慢停」的数学表达。

## 2. 浏览器内置关键字对照

| 关键字        | 等价值                             | 评价                                       |
|---------------|------------------------------------|--------------------------------------------|
| `ease`        | `cubic-bezier(0.25, 0.1, 0.25, 1)` | 与 `ease-in-out` 差别小到肉眼难辨，用它等于宣告「没设计过」 |
| `ease-in`     | `cubic-bezier(0.42, 0, 1, 1)`      | 起步慢，适合出场；但不如我们的 `--ease-exit` 精确     |
| `ease-out`    | `cubic-bezier(0, 0, 0.58, 1)`      | 快起慢停，适合进场；但我们的 `--ease-enter` 起步更快   |
| `ease-in-out` | `cubic-bezier(0.42, 0, 0.58, 1)`   | 对称但过于平缓，不如我们的 `--ease-both` 有力         |
| `linear`      | 匀速                               | 仅用于进度条、无限循环、跑马灯；位移动画用 linear 会显得机械 |

### 结论

`ease` 与 `ease-in-out` 的差别小到肉眼难辨，用它们等于宣告「没设计过」。只有 `ease-out` 这一族值得保留（快起慢停），且我们的 `--ease-enter` 已经是它的强化版（起步从 0% 提升到 16%，冲击感更强）。

## 3. 可视化对照

### 交互式对比

保存为 HTML 文件后在浏览器打开，会看到两条方块以不同曲线移动：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Easing 对比</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 2rem;
      background: hsl(220, 20%, 10%);
      color: hsl(220, 20%, 90%);
      font-family: system-ui;
      padding: 2rem;
    }
    .track {
      width: 600px;
      height: 60px;
      background: hsl(220, 20%, 15%);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }
    .box {
      width: 60px;
      height: 60px;
      position: absolute;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }
    .enter { background: hsl(150, 70%, 50%); }
    .exit { background: hsl(30, 90%, 60%); }
    .both { background: hsl(260, 70%, 60%); }
    .linear { background: hsl(0, 70%, 60%); }
    @keyframes slide-enter {
      from { left: 0; }
      to { left: calc(100% - 60px); }
    }
    @keyframes slide-exit {
      from { left: 0; }
      to { left: calc(100% - 60px); }
    }
    @keyframes slide-both {
      from { left: 0; }
      to { left: calc(100% - 60px); }
    }
    @keyframes slide-linear {
      from { left: 0; }
      to { left: calc(100% - 60px); }
    }
    .track:hover .enter { animation: slide-enter 1s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
    .track:hover .exit { animation: slide-exit 1s cubic-bezier(0.4, 0, 1, 1) infinite; }
    .track:hover .both { animation: slide-both 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .track:hover .linear { animation: slide-linear 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .track:hover .box { animation-duration: 1ms !important; }
    }
  </style>
</head>
<body>
  <h1>Hover 轨道查看曲线差异（1 秒循环）</h1>
  <div class="track"><div class="box enter">enter</div></div>
  <div class="track"><div class="box exit">exit</div></div>
  <div class="track"><div class="box both">both</div></div>
  <div class="track"><div class="box linear">linear</div></div>
  <p style="max-width: 600px; text-align: center; opacity: 0.7;">
    enter 快起慢停（冲上去再缓缓停住）<br>
    exit 慢起快走（悠悠起步然后加速离开）<br>
    both 对称（两头慢中间快）<br>
    linear 匀速（机械感，仅用于进度条）
  </p>
</body>
</html>
```

### ASCII 图解：ease-out 族的形状

```
数值进度 (y)
^
1 |           ___---
  |       ___/
  |    __/
  | __/
0 |/________________> 时间进度 (x)
  0                 1

「快起慢停」：曲线前半段陡峭（斜率大 = 速度快），
后半段平缓（斜率小 = 速度慢），最后接近水平渐进到目标值。
```

对比 ease-in（慢起快走）：
```
数值进度 (y)
^
1 |               __/
  |            __/
  |         __/
  |     ___/
0 |____/___________> 时间进度 (x)
  0                 1

前半段几乎水平（起步慢），后半段陡峭（加速冲刺）。
```

## 4. spring 与 linear() 近似

### 何时用 spring

**适用场景**：
- 手势拖拽释放（用户松手后元素弹回原位）
- 可打断的布局动画（元素位置在动画过程中被重新计算）
- 按下反馈（按钮被按下时的回弹效果）

**理由**：spring 是 **时间无关** 的物理模拟——它不关心「多久结束」，只关心「当前速度与目标距离」。中途改变目标位置时，速度连续过渡，不会产生突变。

### 何时不用 spring

**禁用场景**：
- 进出场动画（需要精确控制结束时间以配合 stagger）
- 定时序列动画（需要多个动画在特定时刻对齐）
- 页面转场（需要与路由生命周期精确同步）

**理由**：spring 的结束时间不确定（取决于 stiffness / damping / mass），无法与 stagger 的固定延迟对齐。强行用 spring 做序列动画会导致「前一个还没停，后一个已经开始」。

### spring 转 CSS linear() 近似

CSS 原生不支持 spring，但可以用 `linear()` 采样 spring 曲线来近似。以下函数把 damped spring 转换为 CSS `linear()` 字符串：

```typescript
/**
 * 把 spring 物理模拟采样成 CSS linear() 字符串
 * 
 * @param stiffness 刚度（值越大弹得越快）
 * @param damping   阻尼（值越大收敛越快，过小会振荡）
 * @param mass      质量（默认 1，值越大惯性越大）
 * @param steps     采样点数（默认 24，值越大越精确但字符串越长）
 * @returns CSS linear() 字符串，如 "linear(0, 0.329, 0.666, ..., 1)"
 * 
 * 注意：这是近似，最终以真机手感为准。高刷新率屏幕（120Hz）可能需要增加 steps。
 */
export function springToLinear(
  stiffness: number,
  damping: number,
  mass = 1,
  steps = 24
): string {
  const DT = 1 / 240; // 时间步长（240fps 模拟精度）
  const MAX_SECONDS = 4; // 最大模拟时长（防止死循环）
  
  // 半隐式欧拉积分模拟 spring
  let x = 0; // 当前位移（目标是 1）
  let v = 0; // 当前速度
  const frames: number[] = [0];
  const maxFrames = Math.round(MAX_SECONDS / DT);
  
  for (let i = 0; i < maxFrames; i++) {
    // 胡克定律 + 阻尼力
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * DT;
    x += v * DT;
    frames.push(x);
    
    // 收敛判定：距离目标 <0.01% 且速度 <0.1%
    if (Math.abs(1 - x) < 1e-4 && Math.abs(v) < 1e-3) break;
  }
  
  // 归一化到 [0, 1]
  const total = frames[frames.length - 1];
  const samples: number[] = [];
  
  for (let i = 0; i <= steps; i++) {
    // 线性插值采样
    const at = ((frames.length - 1) * i) / steps;
    const lo = Math.floor(at);
    const hi = Math.min(lo + 1, frames.length - 1);
    const f = at - lo;
    const raw = frames[lo] * (1 - f) + frames[hi] * f;
    samples.push(raw / total);
  }
  
  // 修正首尾（浮点误差）
  samples[0] = 0;
  samples[samples.length - 1] = 1;
  
  // 格式化为 CSS 字符串
  const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
  return `linear(${samples.map(fmt).join(', ')})`;
}
```

### 预设 spring 的 linear() 近似值

以下数值由上述函数实际计算得出，可直接用于 CSS：

**spring.snappy**（stiffness: 400, damping: 35, mass: 0.8）：
```css
.snappy-spring {
  animation: slide 0.583s linear(0, 0.127, 0.329, 0.517, 0.666, 0.774, 0.85, 0.901, 0.936, 0.958, 0.973, 0.983, 0.989, 0.993, 0.996, 0.997, 0.998, 0.999, 0.999, 1, 1, 1, 1, 1, 1);
}
```
特征：settle 时间 583ms，无过冲（peak = 1.0000），适合按钮按下反馈。

**spring.soft**（stiffness: 300, damping: 30, mass: 1）：
```css
.soft-spring {
  animation: slide 0.654s linear(0, 0.101, 0.283, 0.47, 0.631, 0.756, 0.846, 0.907, 0.948, 0.972, 0.987, 0.995, 0.999, 1.001, 1.002, 1.002, 1.001, 1.001, 1.001, 1.001, 1, 1, 1, 1, 1);
}
```
特征：settle 时间 654ms，轻微过冲（peak = 1.0018 即 +0.18%），适合拖拽释放回弹。

**用法示例**（TypeScript）：
```typescript
import { springToLinear } from '@/lib/motion-utils';

// 生成 CSS 字符串
const snapSpring = springToLinear(400, 35, 0.8);
console.log(snapSpring);
// 输出：linear(0, 0.127, 0.329, ...)

// 或直接在 CSS-in-JS 里用
const style = {
  animation: `slide 0.583s ${snapSpring}`,
};
```

### 注意事项

1. **这是近似**，不是完美物理模拟。在低端设备或掉帧时，`linear()` 的表现会比真实 spring 更稳定（因为它是预烘焙的曲线）。
2. **高刷新率屏幕**（120Hz / 144Hz）可能需要增加 `steps` 到 36–48 以避免阶梯感。
3. **过冲幅度** >5% 时要慎重——CSS 的 `transform` 过冲会导致元素超出容器边界，可能触发滚动条或遮挡其他元素。

## 5. 选型速查

| 场景           | 曲线          | 时长 token       | 示例代码                                      |
|----------------|---------------|------------------|-----------------------------------------------|
| Hover          | `--ease-both` | `--dur-fast`     | `transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1);` |
| Press          | `--ease-both` | `--dur-instant`  | `transition: transform 120ms cubic-bezier(0.4, 0, 0.2, 1);` |
| Toggle         | `--ease-both` | `--dur-base`     | `transition: opacity 240ms cubic-bezier(0.4, 0, 0.2, 1);`   |
| 进场           | `--ease-enter`| `--dur-base`     | `animation: fade-in 240ms cubic-bezier(0.16, 1, 0.3, 1);`   |
| 出场           | `--ease-exit` | `--dur-exit`     | `animation: fade-out 156ms cubic-bezier(0.4, 0, 1, 1);`     |
| 页面转场       | `--ease-both` | `--dur-page`     | `animation: slide 400ms cubic-bezier(0.4, 0, 0.2, 1);`      |
| 拖拽释放       | spring.soft   | 自动收敛         | `springToLinear(300, 30)` → CSS linear()      |
| 按钮按下反馈   | spring.snappy | 自动收敛         | `springToLinear(400, 35, 0.8)` → CSS linear() |
| 进度条         | `linear`      | 自定义（通常 1–3s） | `transition: width 2s linear;`              |
| 跑马灯         | `linear`      | 自定义（通常 10–30s）| `animation: marquee 20s linear infinite;`   |

### 组合示例：弹窗进场

```css
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal {
  animation: modal-enter var(--dur-base) var(--ease-enter);
  /* 展开：240ms cubic-bezier(0.16, 1, 0.3, 1) */
}
```

### 组合示例：列表项依次进场（stagger）

```typescript
import { duration, ease, stagger } from '@/lib/motion-tokens';

items.forEach((item, i) => {
  item.style.animation = `fade-in ${duration.base}s cubic-bezier(${ease.enter.join(',')})`;
  item.style.animationDelay = `${i * stagger.step}s`;
});
```

## 6. 禁止清单

以下是全站禁止的曲线用法，违反者在 code review 时会被打回：

### ❌ 全站 ease-in-out

```css
/* 禁止 */
* { transition: all 0.3s ease-in-out; }
```

**为什么禁止**：`ease-in-out` 是浏览器默认值，没有设计意图。它既不适合进场（起步太慢），也不适合出场（收尾太慢），更不适合 hover（对称但无力）。用它等于放弃设计。

**正确做法**：明确场景，选对曲线：
```css
.button { transition: transform var(--dur-fast) var(--ease-both); }
.modal { animation: enter var(--dur-base) var(--ease-enter); }
```

### ❌ linear 用于位移

```css
/* 禁止 */
.card {
  transition: transform 0.3s linear;
}
```

**为什么禁止**：匀速位移违反物理直觉——现实世界没有物体做匀速运动（都有加速/减速）。linear 位移会让 UI 显得机械、廉价，像 PowerPoint 2003。

**例外**：进度条、无限循环动画、跑马灯可以用 linear，因为它们不模拟物理运动。

### ❌ ease-in 用于进场

```css
/* 禁止 */
.modal {
  animation: fade-in 0.3s ease-in;
}
```

**为什么禁止**：`ease-in` 起步慢，会让人以为「点了没反应」。进场动画的核心是「立刻让人察觉」，必须用 ease-out 族（快起慢停）。

**正确做法**：
```css
.modal {
  animation: fade-in var(--dur-base) var(--ease-enter);
}
```

### ❌ 把 spring 用于需要精确定时的序列

```typescript
// 禁止
items.forEach((item, i) => {
  gsap.to(item, {
    opacity: 1,
    ease: 'elastic.out(1, 0.5)', // spring 类曲线
    delay: i * 0.1, // 试图用 stagger 对齐
  });
});
```

**为什么禁止**：spring 的结束时间不确定（取决于振荡次数），无法与 stagger 的固定延迟对齐。结果是「前一个还在抖，后一个已经开始」，节奏混乱。

**正确做法**：序列动画用固定时长的 cubic-bezier：
```typescript
items.forEach((item, i) => {
  gsap.to(item, {
    opacity: 1,
    duration: duration.base,
    ease: `cubic-bezier(${ease.enter.join(',')})`,
    delay: i * stagger.step,
  });
});
```

### ❌ 自定义 cubic-bezier 的 x 超出 [0,1]

```css
/* 禁止 */
.wrong {
  transition: transform 0.3s cubic-bezier(0.5, 0, 1.5, 1);
  /*                                             ^^^ x2 > 1 */
}
```

**为什么禁止**：CSS 要求 cubic-bezier 的 x 坐标（P1x 和 P2x）必须在 [0, 1] 区间内，超出会被判为无效值，浏览器回退到 `ease`。P1y 和 P2y 可以超出（产生过冲），但 x 不行。

**正确做法**：检查控制点：
```css
.correct {
  /* P1x=0.5, P1y=0, P2x=1, P2y=1.2（y 可以 >1） */
  transition: transform 0.3s cubic-bezier(0.5, 0, 1, 1.2);
}
```

### ❌ 把浏览器关键字当成 token

```typescript
// 禁止
export const ease = {
  enter: 'ease-out', // 字符串无法被类型检查
  exit: 'ease-in',
};
```

**为什么禁止**：
1. 字符串拼写错误（`ease-inout`）会在运行时静默失败。
2. `ease-out` 等关键字的数值不受控，未来浏览器可能修改默认值。
3. 无法跨框架复用（Framer Motion 不接受字符串 ease）。

**正确做法**：用数值数组：
```typescript
export const ease: Record<'enter' | 'exit' | 'both', Bezier> = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  both: [0.4, 0, 0.2, 1],
};
```

## 7. 参考资源

- **easings.net**：https://easings.net  
  可视化所有常见曲线，并提供多种语言的代码片段（CSS / JS / Swift / Kotlin）。

- **MDN: easing-function**：https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function  
  CSS 缓动函数的完整规范，包括 `cubic-bezier()`、`steps()`、`linear()` 的语法与浏览器兼容性。

- **MDN: linear()**：https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear  
  CSS `linear()` 函数的详细文档，支持分段线性插值，用于近似复杂曲线（如 spring）。浏览器支持：Baseline Widely available，2023 年 12 月起全平台支持。

- **Cubic Bezier Generator**：https://cubic-bezier.com  
  交互式工具，拖动控制点实时预览曲线并生成 CSS 代码。

- **Understanding Easing (Framer Motion)**：https://www.framer.com/motion/transition/#easing  
  Framer Motion 的曲线系统文档，解释为什么数组格式比字符串更精确。

---

## 附录：曲线速查

### CSS 变量（复制到项目）

```css
:root {
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-both: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-progress: linear;
}
```

### TS 常量（复制到项目）

```typescript
export type Bezier = [number, number, number, number];

export const ease: Record<'enter' | 'exit' | 'both', Bezier> = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  both: [0.4, 0, 0.2, 1],
};
```

### 一句话记忆

- **进场**：快起慢停，让人立刻察觉。
- **出场**：慢起快走，不拖沓地离开。
- **双向**：对称曲线，可打断不突兀。
- **linear**：仅用于进度条，位移禁用。
