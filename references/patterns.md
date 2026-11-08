# 前端动效模板库

**默认环境**：React 18/19 + TypeScript + `motion` v12（从 `motion/react` 导入）。

- 纯 JS 项目可去掉类型标注。
- 旧版 `framer-motion` 项目将 `motion/react` 改为 `framer-motion`，API 不变。
- Next.js App Router 下的文件需在顶部加 `"use client"`。
- 每个模板顶部标注所需依赖包，禁止隐式引入。

---

## 模板索引

| 编号 | 名称 | 依赖 | 规范条款 |
|------|------|------|----------|
| 1 | 列表滚动进场 | `motion` | 进场 240–400ms, stagger ≤500ms, 位移中 16px, 透明度进场 0.6→1 |
| 2 | 路由转场与共享元素 | `motion` | 出场 = 进场 × 0.65, 缩放仅 0.96–1.04 |
| 3 | 手势拖拽 + 释放回弹 | `motion` | spring snappy, 位移大 >120px, 速度阈值 >800px/s |
| 4 | 鼠标跟随光晕 | 无（原生 JS + CSS） | 节流用 rAF, 装饰层 pointer-events: none |
| 5 | 数字滚动计数 | `motion` | 进场 240–400ms, tabular-nums 防抖 |
| 6 | CSS 3D 卡片翻转 | 无（纯 CSS + React） | 时长 320ms, 曲线 both |
| 7 | 无限循环装饰背景 | 无（原生 JS + Canvas） | visibilitychange 停帧, 可暂停, DPR 缩放 |
| 8 | 骨架屏 → 真实内容 | `motion` | 最短展示 300ms, shimmer 1.2s linear, 交叉淡入 |
| 9 | 按钮磁吸 + 弹性反馈 | `motion` | 位移微 4px, 缩放按下 0.97, pointer: fine 检测 |
| 10 | Lottie 集成 | `@lottiefiles/dotlottie-react`, `react` (lazy/Suspense) | 懒加载, IntersectionObserver, 体积 >100KB 评审 |

---

## 共享 token 契约

所有模板必须从这里取数，不得硬编码时长、曲线、位移。

```ts
// @/lib/motion-tokens.ts
export type Bezier = [number, number, number, number];

export const duration = {
  instant: 0.12,
  fast: 0.16,
  base: 0.24,
  exit: 0.156,
  slow: 0.32,
  slower: 0.4,
  page: 0.4,
} as const;

export const ease: Record<'enter' | 'exit' | 'both', Bezier> = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  both: [0.4, 0, 0.2, 1],
};

export const distance = {
  micro: 4,
  sm: 8,
  md: 16,
  lg: 48,
} as const;

export const opacity = {
  micro: 0.9,
  enter: 0.6,
} as const;

export const scale = {
  min: 0.96,
  max: 1.04,
} as const;

export const stagger = {
  step: 0.04,
  max: 0.5,
} as const;

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

**CSS 变量同名映射**：

```css
:root {
  --dur-instant: 120ms;
  --dur-fast: 160ms;
  --dur-base: 240ms;
  --dur-exit: 156ms;
  --dur-slow: 320ms;
  --dur-slower: 400ms;
  --dur-page: 400ms;

  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-both: cubic-bezier(0.4, 0, 0.2, 1);

  --dist-micro: 4px;
  --dist-sm: 8px;
  --dist-md: 16px;
  --dist-lg: 48px;

  --stagger-step: 40ms;
}
```

**规范总结**：
- 进场 240–400ms；出场 = 进场 × 0.65（约 156ms）。
- stagger 单步 30–50ms，整组 ≤500ms。
- 位移：微 4–8px / 中 12–24px / 大 32–64px。
- 透明度：微 0.9→1、进场 0.6→1。
- 缩放仅 0.96–1.04。

---

## 1. 列表滚动进场（whileInView + stagger）

### 适用场景
首屏以下的内容区块、卡片网格、特性列表、评价墙。

### 完整代码

**依赖**：`motion`（`npm install motion`）

```tsx
// components/RevealList.tsx
import { motion, useReducedMotion } from 'motion/react';
import { duration, ease, distance, opacity } from '@/lib/motion-tokens';
import type { ReactNode } from 'react';

interface RevealListProps {
  children: ReactNode[];
  className?: string;
  maxStaggeredItems?: number;
}

export function RevealList({
  children,
  className = '',
  maxStaggeredItems = 12,
}: RevealListProps) {
  const prefersReducedMotion = useReducedMotion();

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.04,
        delayChildren: 0,
      },
    },
  };

  const item = {
    hidden: { y: distance.md, opacity: opacity.enter },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: duration.base,
        ease: ease.enter,
      },
    },
  };

  const itemInstant = {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
  };

  return (
    <motion.ul
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={container}
    >
      {children.map((child, index) => (
        <motion.li
          key={index}
          variants={index < maxStaggeredItems ? item : itemInstant}
        >
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

**使用示例**：

```tsx
<RevealList className="grid grid-cols-3 gap-4">
  {products.map((product) => (
    <ProductCard key={product.id} {...product} />
  ))}
</RevealList>
```

### 常见坑
- `viewport={{ once: true }}` 必须加，否则向上滚动再向下滚动时会重复触发，造成抖动。
- 不要给每个子项单独加 `whileInView`，会导致各自独立触发、节奏散乱。
- `staggerChildren` 和 `delayChildren` 的单位是秒（0.04 = 40ms），不是毫秒。
- 超过 12 项时若全部 stagger，总时长会超过 500ms（12 × 40ms = 480ms），第 13 项开始应直接显示。
- SSR 环境下 `initial="hidden"` 与客户端 `animate="visible"` 的 hydration 差异可能导致首屏闪烁，可在服务端渲染时设置 `initial={false}` 或用 `useEffect` 延迟启动动画。

### reduced-motion 分支
`useReducedMotion()` 返回 `true` 时，`staggerChildren: 0` 使所有子项同时出现，保留淡入但去除错时感。

---

## 2. 路由转场（AnimatePresence + layoutId 共享元素）

### 适用场景
列表 → 详情页、Tab 切换指示器、Modal 展开/收起、卡片放大查看。

### 完整代码

**依赖**：`motion`（`npm install motion`）

```tsx
// components/ProductCard.tsx
import { motion } from 'motion/react';
import { duration, ease, scale } from '@/lib/motion-tokens';

interface ProductCardProps {
  id: string;
  title: string;
  image: string;
  onClick: () => void;
}

export function ProductCard({ id, title, image, onClick }: ProductCardProps) {
  return (
    <motion.div
      layoutId={`card-${id}`}
      onClick={onClick}
      className="cursor-pointer overflow-hidden rounded-lg bg-white shadow"
      whileHover={{ scale: scale.max }}
      transition={{ duration: duration.fast, ease: ease.both }}
    >
      <motion.img
        layoutId={`card-image-${id}`}
        src={image}
        alt={title}
        className="w-full h-48 object-cover"
      />
      <motion.div layoutId={`card-title-${id}`} className="p-4">
        <h3 className="text-lg font-semibold">{title}</h3>
      </motion.div>
    </motion.div>
  );
}
```

```tsx
// components/ProductDetail.tsx
import { motion } from 'motion/react';
import { duration, ease, scale } from '@/lib/motion-tokens';

interface ProductDetailProps {
  id: string;
  title: string;
  image: string;
  description: string;
  onClose: () => void;
}

export function ProductDetail({
  id,
  title,
  image,
  description,
  onClose,
}: ProductDetailProps) {
  return (
    <motion.div
      layoutId={`card-${id}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.exit, ease: ease.exit }}
        className="absolute inset-0 bg-black/60"
      />
      <motion.div
        className="relative max-w-2xl w-full bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.img
          layoutId={`card-image-${id}`}
          src={image}
          alt={title}
          className="w-full h-64 object-cover"
        />
        <motion.div layoutId={`card-title-${id}`} className="p-6">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, ease: ease.enter, delay: 0.1 }}
          className="px-6 pb-6 text-gray-700"
        >
          {description}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
```

```tsx
// app/ProductView.tsx
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetail } from '@/components/ProductDetail';

export function ProductView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const products = [
    { id: '1', title: 'Product A', image: '/a.jpg', description: 'Details...' },
    { id: '2', title: 'Product B', image: '/b.jpg', description: 'Details...' },
  ];

  const selected = products.find((p) => p.id === selectedId);

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            onClick={() => setSelectedId(product.id)}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {selected && (
          <ProductDetail
            key={selected.id}
            {...selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
```

### Next.js App Router 替换方案（实验性）

```tsx
// app/template.tsx（实验性：View Transitions API）
'use client';

import { useEffect } from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!document.startViewTransition) {
      return;
    }
    // View Transitions API 已启用，通过 CSS view-transition-name 声明共享元素
  }, []);

  return children;
}
```

```css
/* app/globals.css */
@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(card),
  ::view-transition-new(card) {
    animation-duration: 240ms;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* 在需要共享的元素上 */
.product-card {
  view-transition-name: card;
}
```

**注意**：View Transitions API 在 2024 年仍是实验性特性，需检测支持性并提供降级。

### 常见坑
- `mode="wait"` 让退出动画完成后才开始进入动画，更稳定；`mode="popLayout"` 适合元素重叠的场景。
- 共享元素两侧尺寸差异过大（如卡片 200×300 → 全屏 1200×800）时会产生拉伸失真，需给内容层（图片、文字）单独加动画而非依赖 `layoutId`。
- `layoutId` 必须全局唯一，同一页面出现重复 `layoutId` 会导致动画错乱。
- 退出时 `scale` 不要超过 `scale.min`（0.96），否则显得过于夸张。

### reduced-motion 分支
动画本身由 `motion` 库响应 `prefers-reduced-motion`，共享元素会变为交叉淡入淡出，不会产生形变。

---

## 3. 手势拖拽 + 释放回弹（drag + spring）

### 适用场景
卡片滑动删除、底部抽屉、图片浏览器、可拖拽排序列表。

### 完整代码

**依赖**：`motion`（`npm install motion`）

```tsx
// components/SwipeCard.tsx
import { motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useState, useRef } from 'react';
import { spring, distance } from '@/lib/motion-tokens';

interface SwipeCardProps {
  id: string;
  children: React.ReactNode;
  onRemove: (id: string) => void;
  onKeep: (id: string) => void;
}

export function SwipeCard({ id, children, onRemove, onKeep }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 120;
    const velocityThreshold = 800;

    if (
      Math.abs(info.offset.x) > threshold ||
      Math.abs(info.velocity.x) > velocityThreshold
    ) {
      setExitX(info.offset.x > 0 ? 300 : -300);
      setTimeout(() => {
        onRemove(id);
      }, 200);
    } else {
      onKeep(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setExitX(-300);
      setTimeout(() => onRemove(id), 200);
    } else if (e.key === 'ArrowRight') {
      setExitX(300);
      setTimeout(() => onRemove(id), 200);
    }
  };

  if (prefersReducedMotion) {
    return (
      <div
        ref={cardRef}
        className="touch-pan-y select-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label="滑动或按左右方向键移除卡片"
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX, opacity: exitX !== 0 ? 0 : 1 }}
      transition={spring.snappy}
      className="touch-pan-y select-none cursor-grab active:cursor-grabbing"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label="拖拽或按左右方向键移除卡片"
    >
      {children}
    </motion.div>
  );
}
```

**使用示例**：

```tsx
import { useState } from 'react';
import { SwipeCard } from '@/components/SwipeCard';

export function SwipeDemo() {
  const [cards, setCards] = useState([
    { id: '1', content: 'Card 1' },
    { id: '2', content: 'Card 2' },
    { id: '3', content: 'Card 3' },
  ]);

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <SwipeCard
          key={card.id}
          id={card.id}
          onRemove={(id) => setCards((prev) => prev.filter((c) => c.id !== id))}
          onKeep={() => {}}
        >
          <div className="p-6 bg-white rounded-lg shadow">{card.content}</div>
        </SwipeCard>
      ))}
    </div>
  );
}
```

### 常见坑
- `dragElastic` 过大（如 0.5）会显得廉价和失控，建议 0.1–0.15。
- 拖拽时会触发页面滚动，需在容器上加 `touch-action: pan-y`（CSS 类 `touch-pan-y`）禁用横向滚动。
- 不要在 `onDrag` 回调里用 `setState` 做实时计算，会导致每帧重渲染；用 `onDragEnd` 或 `useMotionValue` 监听。
- `dragConstraints` 用 `ref` 时，必须等容器挂载后才生效，初次渲染可能无效。
- 必须提供键盘等价操作（方向键）以满足可访问性要求。

### reduced-motion 分支
`useReducedMotion()` 返回 `true` 时，渲染为静态 `div`，仅保留键盘操作，不启用拖拽动画。

---

## 4. 鼠标跟随光晕 / 轻视差（含节流与 pointer-events: none）

### 适用场景
Hero 区背景光、卡片高光、磁吸式光标跟随、装饰性粒子层。

### 完整代码

**依赖**：无（原生 JS + CSS）

```tsx
// components/PointerGlow.tsx
'use client';

import { useEffect, useRef } from 'react';

interface PointerGlowProps {
  className?: string;
  children: React.ReactNode;
}

export function PointerGlow({ className = '', children }: PointerGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isPointerFine = useRef(false);

  useEffect(() => {
    isPointerFine.current = window.matchMedia('(pointer: fine)').matches;
    if (!isPointerFine.current) return;

    const container = containerRef.current;
    if (!container) return;

    let mouseX = 0;
    let mouseY = 0;
    let isInside = false;

    const updatePosition = () => {
      if (isInside) {
        container.style.setProperty('--mx', `${mouseX}px`);
        container.style.setProperty('--my', `${mouseY}px`);
        container.style.setProperty('--glow-opacity', '1');
      }
      rafRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isInside = true;

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }
    };

    const handlePointerLeave = () => {
      isInside = false;
      container.style.setProperty('--glow-opacity', '0');
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), rgba(59, 130, 246, 0.15), transparent 40%)`,
          opacity: 'var(--glow-opacity, 0)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
```

**使用示例**：

```tsx
<PointerGlow className="min-h-screen flex items-center justify-center bg-gray-900">
  <h1 className="text-6xl font-bold text-white">Move your cursor</h1>
</PointerGlow>
```

### 常见坑
- 直接用 `style.left = e.clientX` 会掉帧，必须用 `requestAnimationFrame` 合并更新。
- 装饰层忘记加 `pointer-events: none` 会阻挡下层按钮的点击事件。
- 在滚动容器内使用时，需减去 `getBoundingClientRect().left/top`，否则位置偏移。
- 触摸设备上不应启用（`matchMedia('(pointer: fine)')` 检测精细指针）。
- 离开窗口（`pointerleave`）时必须取消 `requestAnimationFrame`，否则内存泄漏。

### reduced-motion 分支
`prefers-reduced-motion` 用户下，光晕层淡入淡出的 `transition-opacity` 已足够温和，无需额外禁用；若要完全关闭，可在 CSS 中加：

```css
@media (prefers-reduced-motion: reduce) {
  .pointer-glow-layer {
    display: none;
  }
}
```

---

## 5. 数字滚动计数（tabular-nums 防抖）

### 适用场景
数据看板、价格变化、统计数字、倒计时、进度百分比。

### 完整代码

**依赖**：`motion`（`npm install motion`）

```tsx
// components/AnimatedNumber.tsx
import { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate, useReducedMotion } from 'motion/react';
import { duration } from '@/lib/motion-tokens';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

const defaultFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function AnimatedNumber({
  value,
  format = (n) => defaultFormat.format(n),
  className = '',
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const displayValue = useTransform(rounded, format);
  const spanRef = useRef<HTMLSpanElement>(null);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      if (spanRef.current) {
        spanRef.current.textContent = format(value);
      }
      return;
    }

    if (controlsRef.current) {
      controlsRef.current.stop();
    }

    controlsRef.current = animate(motionValue, value, {
      duration: duration.slower,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (latest) => {
        if (spanRef.current) {
          spanRef.current.textContent = format(Math.round(latest));
        }
      },
    });

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [value, format, motionValue, prefersReducedMotion]);

  useEffect(() => {
    const span = spanRef.current;
    if (!span) return;

    span.setAttribute('aria-live', 'off');

    const timer = setTimeout(() => {
      span.setAttribute('aria-live', 'polite');
      span.textContent = format(value);
      setTimeout(() => {
        span.setAttribute('aria-live', 'off');
      }, 100);
    }, (prefersReducedMotion ? 0 : duration.slower * 1000) + 50);

    return () => clearTimeout(timer);
  }, [value, format, prefersReducedMotion]);

  return (
    <span
      ref={spanRef}
      className={`font-variant-numeric-tabular ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {format(value)}
    </span>
  );
}
```

**使用示例**：

```tsx
import { useState } from 'react';
import { AnimatedNumber } from '@/components/AnimatedNumber';

export function Dashboard() {
  const [count, setCount] = useState(1234);

  return (
    <div>
      <h2 className="text-4xl font-bold">
        <AnimatedNumber value={count} />
      </h2>
      <button onClick={() => setCount((c) => c + 567)}>Increment</button>
    </div>
  );
}
```

### 常见坑
- 从 0 到 10000 的动画若用 1.2s 会超出规范（应 ≤400ms），应按位数分档或固定用 `duration.slower`。
- 每帧执行 `Intl.NumberFormat` 会卡顿，需在组件外缓存格式化器实例（`new Intl.NumberFormat(...)` 只调用一次）。
- 数字宽度跳动（7 比 1 宽）会导致布局抖动，必须用 `font-variant-numeric: tabular-nums` 或 CSS `font-feature-settings: "tnum"`。
- 组件卸载时动画未停止会导致内存泄漏，必须在 `useEffect` 清理函数里调用 `controls.stop()`。
- 屏幕阅读器会重复播报中间值，需设置 `aria-live="off"` 并在动画结束后播报一次终值。

### reduced-motion 分支
`useReducedMotion()` 返回 `true` 时，直接显示终值，不执行 `animate()`。

---

## 6. CSS 3D 卡片翻转（preserve-3d + backface-visibility）

### 适用场景
价格卡正反面、闪卡学习应用、设置项展开、产品特性对比。

### 完整代码

**依赖**：无（纯 CSS + React）

```tsx
// components/FlipCard.tsx
'use client';

import { useState } from 'react';
import './FlipCard.css';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export function FlipCard({ front, back, className = '' }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleToggle = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flip-card-container ${className}`}>
      <div
        className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={isFlipped}
        aria-label="翻转卡片"
      >
        <div className="flip-card-front">{front}</div>
        <div className="flip-card-back">{back}</div>
      </div>
    </div>
  );
}
```

```css
/* components/FlipCard.css */
.flip-card-container {
  perspective: 1000px;
  width: 100%;
  height: 100%;
}

.flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform var(--dur-slow, 320ms) var(--ease-both, cubic-bezier(0.4, 0, 0.2, 1));
  transform-style: preserve-3d;
  cursor: pointer;
}

.flip-card:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

.flip-card.is-flipped {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .flip-card {
    transition: opacity var(--dur-base, 240ms) var(--ease-both, cubic-bezier(0.4, 0, 0.2, 1));
    transform: none !important;
  }

  .flip-card-front,
  .flip-card-back {
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    transition: opacity var(--dur-base, 240ms) var(--ease-both, cubic-bezier(0.4, 0, 0.2, 1));
  }

  .flip-card:not(.is-flipped) .flip-card-back {
    opacity: 0;
    pointer-events: none;
  }

  .flip-card.is-flipped .flip-card-front {
    opacity: 0;
    pointer-events: none;
  }
}
```

**使用示例**：

```tsx
<FlipCard
  front={
    <div className="p-6 bg-blue-500 text-white rounded-lg h-64 flex items-center justify-center">
      <h3 className="text-2xl font-bold">Front Side</h3>
    </div>
  }
  back={
    <div className="p-6 bg-green-500 text-white rounded-lg h-64 flex items-center justify-center">
      <p>Back Side Content</p>
    </div>
  }
  className="w-80 h-64"
/>
```

### 常见坑
- `backface-visibility: hidden` 必须配合 `transform-style: preserve-3d` 才生效，缺一不可。
- Safari 需要 `-webkit-backface-visibility: hidden` 前缀，否则背面可见。
- 两面都要设置 `position: absolute` 且容器需固定高度，否则背面会撑开容器导致布局崩溃。
- 内容可点击时（如按钮），背面在翻转前必须加 `pointer-events: none`，否则会误触。
- `perspective` 必须设置在父容器上，而非 `.flip-card` 自身。

### reduced-motion 分支
`prefers-reduced-motion: reduce` 时，禁用 3D 翻转（`transform: none`），改为交叉淡入淡出（`opacity` 过渡），背面设置 `opacity: 0` + `pointer-events: none`。

---

## 7. 无限循环装饰背景（可暂停、visibilitychange 停帧）

### 适用场景
网格动画、噪点纹理、缓慢漂移的光斑、粒子背景、跑马灯。

### 完整代码

**依赖**：无（原生 JS + Canvas）

```tsx
// components/AmbientBackground.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface AmbientBackgroundProps {
  className?: string;
}

export function AmbientBackground({ className = '' }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    let time = 0;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
      });
    }

    const render = () => {
      if (!isVisible || prefersReducedMotion.current) {
        rafRef.current = null;
        return;
      }

      ctx.fillStyle = 'rgba(17, 24, 39, 0.05)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > rect.width) p.vx *= -1;
        if (p.y < 0 || p.y > rect.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(time * 0.002 + p.x) * 0.2})`;
        ctx.fill();
      });

      time += 16;
      rafRef.current = requestAnimationFrame(render);
    };

    if (prefersReducedMotion.current) {
      ctx.fillStyle = 'rgba(17, 24, 39, 1)';
      ctx.fillRect(0, 0, rect.width, rect.height);
      particles.slice(0, 10).forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fill();
      });
    } else {
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isVisible]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
```

**使用示例**：

```tsx
<AmbientBackground className="min-h-screen flex items-center justify-center">
  <h1 className="relative z-10 text-4xl font-bold text-white">Ambient Background</h1>
</AmbientBackground>
```

### 常见坑
- `document.visibilitychange` 后 `requestAnimationFrame` 会被节流但不会完全停止，必须手动 `cancelAnimationFrame`。
- Canvas 模糊是因为未缩放 DPR，必须 `canvas.width = cssWidth * devicePixelRatio` 并 `ctx.scale(dpr, dpr)`。
- `IntersectionObserver` 与 `visibilitychange` 必须同时使用：前者检测元素进出视口，后者检测标签页切换。
- 装饰动画必须提供「关闭」选项（用户偏好或按钮），不可强制播放。
- 不要在这里引入 Three.js（体积过大且对装饰层过度工程化）。

### reduced-motion 分支
`prefers-reduced-motion: reduce` 时，只渲染静态帧（绘制一次后不进入 `requestAnimationFrame` 循环），粒子数量减少到 10 个且透明度固定。

---

## 8. 骨架屏 → 真实内容替换过渡

### 适用场景
首屏数据加载、列表懒加载、图片延迟显示、分页切换。

### 完整代码

**依赖**：`motion`（`npm install motion`）

```tsx
// components/SkeletonSwap.tsx
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { duration, ease } from '@/lib/motion-tokens';

interface SkeletonSwapProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  minDisplayTime?: number;
}

export function SkeletonSwap({
  isLoading,
  skeleton,
  children,
  minDisplayTime = 300,
}: SkeletonSwapProps) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      setLoadStartTime(Date.now());
    } else if (loadStartTime !== null) {
      const elapsed = Date.now() - loadStartTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        setShowSkeleton(false);
      }, remaining);
    }
  }, [isLoading, loadStartTime, minDisplayTime]);

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.exit, ease: ease.exit }}
          role="status"
          aria-busy="true"
          aria-label="加载中"
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duration.base, ease: ease.enter }}
          aria-busy="false"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

```tsx
// components/Skeleton.tsx
import './Skeleton.css';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
```

```css
/* components/Skeleton.css */
.skeleton {
  background: linear-gradient(
    90deg,
    #e5e7eb 0%,
    #f3f4f6 50%,
    #e5e7eb 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton {
    animation: skeleton-shimmer 1.2s linear infinite;
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    background: #e5e7eb;
  }
}
```

**使用示例**：

```tsx
import { SkeletonSwap } from '@/components/SkeletonSwap';
import { Skeleton } from '@/components/Skeleton';

export function ProductList() {
  const { data, isLoading } = useQuery('products', fetchProducts);

  return (
    <SkeletonSwap
      isLoading={isLoading}
      skeleton={
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <div className="space-y-4">
        {data?.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </SkeletonSwap>
  );
}
```

### 常见坑
- 骨架屏尺寸必须与真实内容一致，否则替换时会产生二次跳动（CLS）。
- 数据返回过快（< 100ms）时骨架屏会闪一下，需设置最短展示时间（建议 300ms）。
- shimmer 动画必须用 `linear` 时序函数且只改变 `background-position`，不要用 `transform` 或 `opacity`（会触发重排）。
- shimmer 时长 1.2s 是规范允许的「无限循环装饰」例外，但不要更快（显得焦躁）。
- `role="status"` + `aria-busy` 必须加，屏幕阅读器需要知道内容正在加载。

### reduced-motion 分支
`prefers-reduced-motion: reduce` 时，骨架层不播放 shimmer 动画（`animation: none`），只显示静态灰块。交叉淡入的 `opacity` 过渡保留（240ms 不算剧烈）。

---

## 9. 按钮磁吸 / 弹性按下反馈

### 适用场景
主 CTA 按钮、图标按钮、交互式卡片、可点击的装饰元素。

### 完整代码

**依赖**：`motion`（`npm install motion`）

```tsx
// components/MagneticButton.tsx
'use client';

import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { useRef, useEffect, useState } from 'react';
import { distance, duration, ease, scale } from '@/lib/motion-tokens';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MagneticButton({ children, className = '', onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);
  const [isPointerFine, setIsPointerFine] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setIsPointerFine(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerFine || prefersReducedMotion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = (e.clientX - centerX) * 0.2;
    const offsetY = (e.clientY - centerY) * 0.2;

    const maxOffset = distance.micro;

    x.set(Math.max(-maxOffset, Math.min(maxOffset, offsetX)));
    y.set(Math.max(-maxOffset, Math.min(maxOffset, offsetY)));
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (prefersReducedMotion || !isPointerFine) {
    return (
      <motion.button
        ref={ref}
        className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: duration.instant, ease: ease.both }}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: duration.instant, ease: ease.both }}
    >
      {children}
    </motion.button>
  );
}
```

**使用示例**：

```tsx
<MagneticButton
  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
  onClick={() => console.log('Clicked')}
>
  Hover me
</MagneticButton>
```

### 常见坑
- 磁吸位移必须 ≤4px（`distance.micro`），否则会导致点击热区偏移、用户误以为按钮移开了。
- 用 `transform` 而非 `left/top` 移动按钮，`transform` 不改变布局和热区。
- 按钮内文字也跟着动会导致难读，只动整体容器。
- 在 `<a>` 标签上误用会干扰拖拽选择文本的手势。
- 必须保留 `:focus-visible` 聚焦环，磁吸不能替代键盘可访问性。

### reduced-motion 分支
`useReducedMotion()` 或非精细指针设备时，禁用磁吸效果，只保留 `whileTap` 按下缩放反馈（0.97）。

---

## 10. Lottie 集成（dotLottie、lazy、体积告警）

### 适用场景
设计师交付的矢量动效、空状态插画、成功/失败反馈、加载动画、品牌标识动画。

### 完整代码

**依赖**：`@lottiefiles/dotlottie-react`、`react`（lazy/Suspense）

```tsx
// components/LazyLottie.tsx
'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { DotLottieReact as DotLottieReactType } from '@lottiefiles/dotlottie-react';

const DotLottieReact = lazy(() =>
  import('@lottiefiles/dotlottie-react').then((mod) => ({ default: mod.DotLottieReact }))
);

interface LazyLottieProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

export function LazyLottie({
  src,
  loop = false,
  autoplay = false,
  className = '',
  fallback = <div className={`bg-gray-100 ${className}`} aria-label="加载动画中" />,
}: LazyLottieProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dotLottieRef = useRef<any>(null);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion && dotLottieRef.current) {
      dotLottieRef.current.pause?.();
      dotLottieRef.current.setFrame?.(0);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!dotLottieRef.current) return;

    if (isVisible && !prefersReducedMotion) {
      dotLottieRef.current.play?.();
    } else {
      dotLottieRef.current.pause?.();
    }
  }, [isVisible, prefersReducedMotion]);

  return (
    <div ref={containerRef} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          <DotLottieReact
            src={src}
            loop={loop && !prefersReducedMotion}
            autoplay={autoplay && !prefersReducedMotion}
            dotLottieRefCallback={(dotLottie) => {
              dotLottieRef.current = dotLottie;
              if (prefersReducedMotion) {
                dotLottie?.pause?.();
                dotLottie?.setFrame?.(0);
              }
            }}
            className="w-full h-full"
          />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
```

**使用示例**：

```tsx
<LazyLottie
  src="/animations/success.lottie"
  loop
  autoplay
  className="w-64 h-64"
  fallback={<div className="w-64 h-64 bg-gray-100 animate-pulse" />}
/>
```

### 体积告警规则与最佳实践

1. **体积阈值**：
   - < 50KB：安全，可直接使用。
   - 50–100KB：建议懒加载 + `IntersectionObserver`。
   - 100–300KB：必须单独评审，确认必要性。
   - \> 300KB：首屏禁止，仅用于用户主动触发的场景（如点击播放）。

2. **小图标不用 Lottie**：
   - 尺寸 < 48px 且路径数 < 20 的图标，优先用 SVG + CSS `animation`。
   - Lottie 运行时体积（~30KB gzip）对简单图标是过度工程化。

3. **优化建议**：
   - 用 `.lottie`（dotLottie 格式）替代 `.json`，体积减少 30–70%。
   - 移除不必要的图层、隐藏对象、未使用的资源。
   - 简化路径、减少关键帧数量。

### 常见坑
- Lottie 运行时体积约 30KB（gzip），默认不遵循 `prefers-reduced-motion`，需手动检测并 `pause()`。
- `.json`（传统 Lottie）与 `.lottie`（dotLottie）的渲染器不同，后者性能更好且支持多动画。
- 未 `pause()` 的隐藏动画仍在运行，会持续耗电和占用主线程。
- SSR 环境下 WASM 加载可能失败，需降级到静态图（用 `<img>` 作为 fallback）。
- `dotLottieRefCallback` 返回的实例提供了 `play()`、`pause()`、`stop()`、`setFrame(n)` 等方法，具体 API 以官方文档为准：[dotLottie Web 文档](https://developers.lottiefiles.com/docs/dotlottie-players/dotlottie-web/)、[React 包 README](https://github.com/LottieFiles/dotlottie-web/tree/main/packages/react)。

### reduced-motion 分支
`prefers-reduced-motion: reduce` 时，通过 `dotLottieRefCallback` 获取实例并调用 `pause()` + `setFrame(0)`，停留在首帧；同时禁用 `loop` 和 `autoplay`。

---

## 附录：全局 CSS 变量定义

将以下代码放入全局样式文件（如 `app/globals.css` 或 `styles/motion.css`）：

```css
/* styles/motion.css */
:root {
  /* Duration */
  --dur-instant: 120ms;
  --dur-fast: 160ms;
  --dur-base: 240ms;
  --dur-exit: 156ms;
  --dur-slow: 320ms;
  --dur-slower: 400ms;
  --dur-page: 400ms;

  /* Easing */
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-both: cubic-bezier(0.4, 0, 0.2, 1);

  /* Distance */
  --dist-micro: 4px;
  --dist-sm: 8px;
  --dist-md: 16px;
  --dist-lg: 48px;

  /* Stagger */
  --stagger-step: 40ms;
}
```

---

**文件结束**
