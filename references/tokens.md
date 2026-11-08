# 动效 Token：设计系统的唯一真相源

一个设计系统只需要 **4 条曲线和 7 个时长**。散落的硬编码是动效廉价感的根因：每个组件各自定义 0.37s、0.42s 这类「感觉」出来的数字，最终让整个系统失去一致性。Token 化是唯一解法：把时长、曲线、位移幅度抽成命名常量，强制全站共享同一套物理规则，从源头杜绝硬编码。

改时长只需改一处 token，不需要 grep 全局；改曲线立刻影响全部组件，不会留下遗漏；新增组件查映射表即可，不用纠结「这个动画该多长」。

## 1. CSS 变量

全站通用规则：**显式属性，永不 `all`**。
```css
/* 正确 */
transition: transform var(--dur-fast) var(--ease-both), opacity var(--dur-fast) var(--ease-both);

/* 错误 */
transition: all var(--dur-fast) var(--ease-both);
```

原因：`all` 会意外触发 `z-index`、`box-shadow` 等属性的过渡，导致布局抖动与性能下降。

### 完整 token 定义（src/styles/motion.css）

```css
:root {
  /* 时长 */
  --dur-instant: 120ms;                       /* 按下/抬起的最短反馈 */
  --dur-fast: 160ms;                          /* hover、颜色、图标 */
  --dur-base: 240ms;                          /* 组件进场基准 */
  --dur-exit: calc(var(--dur-base) * 0.65);   /* 156ms：出场 = 进场 × 0.65 */
  --dur-slow: 320ms;                          /* 展开/收起、布局重排 */
  --dur-slower: 400ms;                        /* 页面转场、大位移 */
  --dur-page: 400ms;

  /* 缓动 */
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);  /* 进场：快起慢停 */
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);      /* 出场：慢起快走 */
  --ease-both: cubic-bezier(0.4, 0, 0.2, 1);    /* 双向切换 */
  --ease-progress: linear;                      /* 仅进度条与无限循环 */

  /* 位移幅度 */
  --dist-micro: 4px;
  --dist-sm: 8px;
  --dist-md: 16px;
  --dist-lg: 48px;

  /* 透明度起点 */
  --opacity-micro: 0.9;
  --opacity-enter: 0.6;

  /* 缩放区间 */
  --scale-min: 0.96;
  --scale-max: 1.04;

  /* stagger */
  --stagger-step: 40ms;
}
```

#### 为什么 `--dur-exit` 用 calc 而不是写死

改基准只改一处。假设重新调整 `--dur-base` 到 280ms，出场时长自动变为 182ms（280 × 0.65），无需手动同步。写死 156ms 会导致改基准后出入场时长比例失调。

### 辅助功能降级

**警告**：这段只压时长与位移，**不要**把 opacity 变化也归零——归零后状态切换会变成「瞬间闪现」，用户看不出发生了什么；正确做法见 references/accessibility.md。

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-instant: 1ms;
    --dur-fast: 1ms;
    --dur-base: 1ms;
    --dur-exit: 1ms;
    --dur-slow: 1ms;
    --dur-slower: 1ms;
    --dur-page: 1ms;
    --dist-micro: 0px;
    --dist-sm: 0px;
    --dist-md: 0px;
    --dist-lg: 0px;
  }
}
```

原理：用 1ms（而非 0ms）是因为 0ms 会导致某些浏览器跳过 `transitionend` 事件触发，破坏依赖该事件的 JS 逻辑。

## 2. TypeScript 常量

与 `src/styles/motion.css` 一一对应。改这里必须同步改 CSS。

### 完整 token 定义（src/lib/motion-tokens.ts）

```typescript
// 与 src/styles/motion.css 一一对应。改这里必须同步改 CSS。
export type Bezier = [number, number, number, number];

export const duration = {
  instant: 0.12,
  fast: 0.16,
  base: 0.24,
  exit: 0.156, // base × 0.65
  slow: 0.32,
  slower: 0.4,
  page: 0.4,
} as const;

export const ease: Record<'enter' | 'exit' | 'both', Bezier> = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  both: [0.4, 0, 0.2, 1],
};

export const distance = { micro: 4, sm: 8, md: 16, lg: 48 } as const;

export const opacity = { micro: 0.9, enter: 0.6 } as const;

export const scale = { min: 0.96, max: 1.04 } as const;

export const stagger = { step: 0.04, max: 0.5 } as const;

export const spring = {
  snappy: { type: 'spring' as const, stiffness: 400, damping: 35, mass: 0.8 },
  soft: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

export const transition = {
  enter: { duration: duration.base, ease: ease.enter },
  exit: { duration: duration.exit, ease: ease.exit },
  toggle: { duration: duration.base, ease: ease.both },
  hover: { duration: duration.fast, ease: ease.both },
  tap: { duration: duration.instant, ease: ease.both },
};
```

**注意**：`ease` 用可变元组 `Bezier`（不要 `as const`），否则 Framer Motion 的 `Easing` 类型不接受 readonly 数组。

### 用法

```typescript
import { duration, ease, distance, transition } from '@/lib/motion-tokens';

// Framer Motion
<motion.div
  initial={{ opacity: 0, y: distance.md }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: duration.base, ease: ease.enter }}
/>

// GSAP
gsap.to(el, { opacity: 1, duration: duration.fast, ease: `cubic-bezier(${ease.both.join(',')})` });

// Web Animations API
el.animate([{ opacity: 0 }, { opacity: 1 }], {
  duration: duration.base * 1000, // 转毫秒
  easing: `cubic-bezier(${ease.enter.join(',')})`,
});
```

## 3. Tailwind 接入

### Tailwind v3

在 `tailwind.config.ts` 的 `theme.extend` 里注册自定义值：

```typescript
import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      transitionDuration: {
        instant: '120ms',
        fast: '160ms',
        base: '240ms',
        exit: '156ms',
        slow: '320ms',
        slower: '400ms',
        page: '400ms',
      },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        both: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
} satisfies Config;
```

用法（**禁止用 `transition-all`**）：
```html
<div class="transition-[transform,opacity] duration-base ease-enter hover:scale-105">
  Hover me
</div>
```

### Tailwind v4

在 `@theme` 块里定义 CSS 变量，Tailwind 会自动生成对应工具类：

```css
@import "tailwindcss";

@theme {
  /* duration-fast / duration-base / duration-slow / ... */
  --transition-duration-fast: 160ms;
  --transition-duration-base: 240ms;
  --transition-duration-exit: 156ms;
  --transition-duration-slow: 320ms;
  --transition-duration-slower: 400ms;
  --transition-duration-instant: 120ms;
  --transition-duration-page: 400ms;

  /* ease-enter / ease-exit / ease-both */
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-both: cubic-bezier(0.4, 0, 0.2, 1);
}
```

命名空间规则：
- `--transition-duration-<name>` 生成 `duration-<name>` 工具类（优先级最高）
- `--duration-<name>` 生成 `duration-<name>` 工具类（备用方案）
- `--ease-<name>` 生成 `ease-<name>` 工具类

用法与 v3 相同（**禁止用 `transition-all`**）：
```html
<div class="transition-[transform,opacity] duration-base ease-enter">
  Content
</div>
```

**为什么不用 `transition-all`**：会意外触发 `z-index`、`box-shadow` 等属性，导致布局抖动与 GPU 过载。

## 4. 语义映射表

| 场景           | 时长            | 曲线          | 典型用法                          |
|----------------|-----------------|---------------|-----------------------------------|
| Hover          | `--dur-fast`    | `--ease-both` | 按钮颜色、图标旋转                |
| Press          | `--dur-instant` | `--ease-both` | 按下反馈、开关拨动                |
| Toggle         | `--dur-base`    | `--ease-both` | 展开/收起、显示/隐藏切换          |
| 进场           | `--dur-base`    | `--ease-enter`| 弹窗、抽屉、下拉菜单出现          |
| 进场（大位移） | `--dur-slow`    | `--ease-enter`| 全屏模态、侧边栏滑入              |
| 出场           | `--dur-exit`    | `--ease-exit` | 关闭弹窗、提示消失                |
| 页面转场       | `--dur-page`    | `--ease-both` | 路由切换、SPA 页面过渡            |
| Stagger        | `--stagger-step`| 与主动画一致  | 列表项依次进场（每项延迟 +40ms）  |
| 布局重排       | `--dur-slow`    | `--ease-both` | 表格排序、网格重新排列            |
| 进度条         | 自定义          | `--ease-progress` | 加载条、音频波形                |

### 组合示例

**按钮 hover**：
```css
.button {
  transition: background-color var(--dur-fast) var(--ease-both),
              transform var(--dur-fast) var(--ease-both);
}
.button:hover {
  background-color: hsl(220, 90%, 50%);
  transform: translateY(-2px);
}
```

**弹窗进场**：
```css
@keyframes modal-enter {
  from {
    opacity: var(--opacity-enter);
    transform: translateY(var(--dist-md)) scale(var(--scale-min));
  }
}
.modal {
  animation: modal-enter var(--dur-base) var(--ease-enter);
}
```

**列表 stagger**（Framer Motion）：
```tsx
import { stagger } from '@/lib/motion-tokens';

<motion.ul>
  {items.map((item, i) => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, x: -distance.sm }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: duration.base,
        ease: ease.enter,
        delay: i * stagger.step,
      }}
    >
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

## 5. 反模式

### ❌ 使用 `transition: all`

```css
/* 错误 */
.card {
  transition: all 0.3s ease;
}
```

**为什么错**：会意外触发 `z-index`、`box-shadow`、`border-color` 等非必要属性的过渡，导致 GPU 过载与布局抖动。某些浏览器会对 `all` 创建数十个独立的过渡轨道，即使你只改了 `transform`。

**正确写法**：
```css
.card {
  transition: transform var(--dur-fast) var(--ease-both),
              opacity var(--dur-fast) var(--ease-both);
}
```

### ❌ 每个组件自定义时长数字

```css
/* 错误 */
.button { transition: transform 0.37s; }
.modal { animation: fade-in 0.42s; }
.tooltip { transition: opacity 0.28s; }
```

**为什么错**：0.37s、0.42s、0.28s 这类数字是「感觉」出来的，没有系统性。三个月后你会忘记为什么选这个值，新成员会再加一个 0.35s，最终导致全站有几十种时长。

**正确写法**：
```css
.button { transition: transform var(--dur-fast) var(--ease-both); }
.modal { animation: fade-in var(--dur-base) var(--ease-enter); }
.tooltip { transition: opacity var(--dur-fast) var(--ease-both); }
```

### ❌ 把 ease 写成字符串全站复用

```typescript
// 错误
const EASE = 'ease-in-out';

gsap.to(el1, { opacity: 1, ease: EASE });
gsap.to(el2, { x: 100, ease: EASE });
```

**为什么错**：`ease-in-out` 是浏览器默认值，等于宣告「没设计过」。更糟的是，字符串无法被类型检查，拼写错误（`ease-inout`）会在运行时静默失败。

**正确写法**：
```typescript
import { ease } from '@/lib/motion-tokens';

gsap.to(el1, { opacity: 1, ease: `cubic-bezier(${ease.enter.join(',')})` });
gsap.to(el2, { x: 100, ease: `cubic-bezier(${ease.both.join(',')})` });
```

### ❌ CSS 与 TS 混用单位导致 1000 倍误差

```css
/* CSS */
:root { --dur-base: 0.24s; }
```

```typescript
// TS
export const duration = { base: 240 }; // 意图是毫秒，但忘记写 ms

// 使用时
el.animate([...], { duration: duration.base }); // 实际是 240 毫秒
gsap.to(el, { opacity: 1, duration: duration.base }); // GSAP 认为是 240 秒！
```

**为什么错**：Web Animations API 要求毫秒，GSAP 要求秒，CSS 两者都支持。混用单位会导致动画要么瞬间结束（1000 倍太快），要么卡死（1000 倍太慢）。真实事故：某团队把 CSS 的 `0.24s` 直接复制到 TS，导致 Framer Motion 动画时长变成 0.00024 秒。

**正确写法**：统一单位并注释：
```typescript
// 单位：秒（GSAP / Framer Motion）
export const duration = { base: 0.24 } as const;

// 或者：单位：毫秒（Web Animations API）
export const duration = { base: 240 } as const;
```

在文件顶部注释清楚单位，并在使用时显式转换：
```typescript
// 若 duration.base = 0.24（秒）
el.animate([...], { duration: duration.base * 1000 }); // Web Animations API 转毫秒
gsap.to(el, { opacity: 1, duration: duration.base }); // GSAP 用秒
```

### ❌ 在 CSS 变量里写百分比透明度

```css
/* 错误 */
:root {
  --opacity-enter: 60%; /* CSS 不支持 % 作为 opacity 值 */
}
```

**为什么错**：`opacity` 属性只接受 0–1 的数字，不接受百分比。`opacity: 60%` 会被浏览器忽略，元素保持完全不透明。

**正确写法**：
```css
:root {
  --opacity-enter: 0.6;
}
```

### ❌ 在响应式断点里重新定义 token

```css
/* 错误 */
:root {
  --dur-base: 240ms;
}
@media (min-width: 768px) {
  :root {
    --dur-base: 320ms; /* 平板上变慢？ */
  }
}
```

**为什么错**：动效时长不应该随屏幕尺寸改变。人类对时间的感知与设备无关：240ms 的动画在手机和桌面上都是 240ms。改变时长会导致同一组件在不同设备上「手感」不一致，破坏肌肉记忆。

**例外**：位移幅度可以响应式调整：
```css
:root {
  --dist-lg: 48px;
}
@media (min-width: 768px) {
  :root {
    --dist-lg: 64px; /* 大屏幕上滑动距离更长是合理的 */
  }
}
```

## 6. 迁移清单

把现有项目的硬编码动效收编到 token 系统，分 5 步：

### 步骤 1：清点所有硬编码的时长与曲线

```bash
# 搜索 CSS 文件里的时长（秒与毫秒）
grep -rE '\b[0-9]+\.?[0-9]*(s|ms)\b' src/**/*.css > /tmp/durations.txt

# 搜索 cubic-bezier
grep -rE 'cubic-bezier\(' src/ >> /tmp/durations.txt

# 搜索 JS/TS 里的 duration / ease 字段
grep -rE '(duration|ease):\s*[0-9]' src/**/*.{ts,tsx,js,jsx} >> /tmp/durations.txt

# 手动检查 /tmp/durations.txt
```

### 步骤 2：四舍五入到最近的 token

建立映射表（例子）：
| 原值      | 最近 token       | 理由                              |
|-----------|------------------|-----------------------------------|
| 0.3s      | `--dur-base`     | 300ms ≈ 240ms，误差在容忍范围     |
| 150ms     | `--dur-fast`     | 150ms ≈ 160ms                     |
| 0.5s      | `--dur-slower`   | 500ms ≈ 400ms，或创建新 token     |
| ease-out  | `--ease-enter`   | ease-out 族适合进场               |
| ease-in   | `--ease-exit`    | ease-in 族适合出场                |

**规则**：误差 >20% 时，考虑是否需要新增 token（如 `--dur-ultra-slow: 600ms`），而不是强行四舍五入。

### 步骤 3：批量替换

```bash
# 用 sed 替换（macOS 用 -i ''，Linux 用 -i）
find src -name "*.css" -exec sed -i 's/0\.3s/var(--dur-base)/g' {} +
find src -name "*.css" -exec sed -i 's/150ms/var(--dur-fast)/g' {} +
find src -name "*.css" -exec sed -i 's/cubic-bezier(0\.25, 0\.1, 0\.25, 1)/var(--ease-enter)/g' {} +
```

对于 TS/JS，手动替换更安全（避免误伤注释或字符串字面量）：
```typescript
// 替换前
gsap.to(el, { opacity: 1, duration: 0.3, ease: 'power2.out' });

// 替换后
import { duration, ease } from '@/lib/motion-tokens';
gsap.to(el, { opacity: 1, duration: duration.base, ease: `cubic-bezier(${ease.enter.join(',')})` });
```

### 步骤 4：删除未使用的自定义曲线

搜索项目里定义的 cubic-bezier，逐个检查是否可以用 token 替代：
```bash
grep -rn 'cubic-bezier' src/ | grep -v 'var(--ease'
```

若某个曲线只用了一次，且与现有 token 相近（控制点差异 <0.1），直接替换。若用了多次且差异显著，考虑把它升级为新 token。

### 步骤 5：在 PR 描述里列出被改动的时长

模板：
```markdown
## 动效 token 迁移

| 文件                     | 原值      | 新值              | 影响组件      |
|--------------------------|-----------|-------------------|---------------|
| Button.module.css        | 0.3s      | var(--dur-base)   | 所有按钮      |
| Modal.tsx                | 200ms     | duration.base     | 弹窗进场      |
| Tooltip.css              | ease-out  | var(--ease-enter) | 提示框        |

**视觉差异**：无（误差在 ±20ms 以内，肉眼不可辨）。
**性能影响**：无。
**破坏性变更**：无。
```

附上前后对比视频（录屏 5 秒即可），让审查者确认「改了但看起来没变」。

---

## 附录：快速参考

### CSS 变量速查

```css
/* 时长 */
--dur-instant    120ms    按下/抬起
--dur-fast       160ms    hover、颜色
--dur-base       240ms    进场基准
--dur-exit       156ms    出场
--dur-slow       320ms    布局重排
--dur-slower     400ms    大位移
--dur-page       400ms    页面转场

/* 曲线 */
--ease-enter     cubic-bezier(0.16, 1, 0.3, 1)     进场
--ease-exit      cubic-bezier(0.4, 0, 1, 1)        出场
--ease-both      cubic-bezier(0.4, 0, 0.2, 1)      双向
--ease-progress  linear                             进度条
```

### TS 常量速查

```typescript
duration.instant  0.12
duration.fast     0.16
duration.base     0.24
duration.exit     0.156
duration.slow     0.32
duration.slower   0.4

ease.enter  [0.16, 1, 0.3, 1]
ease.exit   [0.4, 0, 1, 1]
ease.both   [0.4, 0, 0.2, 1]

distance.micro  4
distance.sm     8
distance.md     16
distance.lg     48
```
