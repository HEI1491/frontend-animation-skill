# 动效可访问性：降级后信息不能丢

动效可访问性不是「加个 media query」就完事。**降级后信息不能丢**：状态变化仍要清晰，焦点仍要可达，数据仍要被读出。装饰动效可以关，状态动效只能弱化不能消失。

这份文档把可访问性拆成 7 节：reduced-motion 策略、光敏性、焦点与键盘、语义播报、性能作为可访问性、测试清单、标准引用。

---

## 1. prefers-reduced-motion

用户在系统设置里开启「减弱动态效果」（macOS）或「显示动画」关闭（Windows），浏览器会发出 `prefers-reduced-motion: reduce` 媒体查询。这是用户明确表达「我要少动效」的信号，不是建议。

### 1.1 三种降级策略

不是一刀切关掉所有动画。按动效类型选三种策略之一。

| 策略 | 含义 | 适用场景 | 示例 |
|------|------|---------|------|
| **mute** | 完全关掉，无替代 | 装饰类动效（背景脉动、光晕、装饰粒子） | 装饰层 `display: none` 或 `animation: none` |
| **reduce** | 缩短时长与位移，保留状态变化 | 状态类动效（hover、toggle、进场） | 时长改 1ms，位移归零，保留 opacity 变化 |
| **replace** | 用更弱的效果替代 | 转场类动效（路由切换、模态进出） | 改为 ≤120ms 的 opacity 交叉淡入 |

**默认组合**：装饰类 mute，状态类 reduce，转场类 replace（交叉淡入 ≤120ms）。

为什么这样分：
- 装饰类无关信息，关掉无损失。
- 状态类承载信息（开/关、激活），完全关掉会让用户看不出状态切换；缩短时长 + 保留 opacity 变化，用户仍能感知「变了」。
- 转场类需要用户知道「页面变了」，120ms 的交叉淡入足够传达切换，又不构成需要被理解的动画（WCAG 2.2.2 的「5 秒规则」与可理解性原则的折中点）。

### 1.2 CSS 写法

把降级规则写在 token 层，所有用 token 的组件自动降级。见 references/tokens.md 的 reduced-motion 块。这里给出完整版本，含三种策略的 CSS 实现。

```css
/* token 层：所有时长与位移归零，但保留 opacity 变化 */
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
    /* opacity 不归零：保留状态变化 */
  }
}

/* 装饰层：mute 策略，直接关 */
@media (prefers-reduced-motion: reduce) {
  [data-motion="decorative"] {
    animation: none !important;
    transition: none !important;
    display: none !important; /* 装饰层直接消失，无替代 */
  }
}

/* 转场层：replace 策略，改为 120ms 交叉淡入 */
@media (prefers-reduced-motion: reduce) {
  [data-motion="transition"] {
    transition: opacity 120ms linear !important;
    /* 强制使用线性曲线与 120ms，覆盖原本的位移与缩放 */
  }
  [data-motion="transition"] {
    transform: none !important; /* 移除位移 */
  }
}
```

为什么用 1ms 而不是 0ms：0ms 会导致某些浏览器跳过 `transitionend` 事件触发，破坏依赖该事件的 JS 逻辑。1ms 既能瞬间完成，又保留事件触发。

### 1.3 React 写法

用 `useReducedMotion()` hook（来自 `motion/react`）。如果项目用 framer-motion 旧包，从 `framer-motion` 导入同名 hook。

```tsx
import { useReducedMotion } from 'motion/react';
import { duration, ease, distance } from '@/lib/motion-tokens';

export function Card() {
  const reduce = useReducedMotion();
  
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: distance.md }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduce
        ? { duration: 0.12, ease: 'linear' }  // replace 策略：120ms 线性淡入
        : { duration: duration.base, ease: ease.enter }
      }
    />
  );
}
```

### 1.4 原生 JS hook（SSR 安全）

不用 motion 的项目，自建 hook。SSR 安全：初始值 `false`，避免服务端渲染时假设用户偏好；`useEffect` 里订阅 `change` 事件，用户中途改设置时实时响应。

```tsx
import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mql.matches);
    
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  
  return reduce;
}
```

为什么初始值 `false`：服务端渲染时无法访问 `window.matchMedia`，假设 `true` 会导致服务端 HTML 与客户端首屏不一致（hydration mismatch）。React 会报 hydration 警告。初始 `false`，客户端 mount 后再修正，首帧可能有轻微闪烁但无警告。

### 1.5 反面案例：把 `* { animation: none }` 当万能解

```css
/* 错误：一刀切关掉所有动画 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

**后果**：
1. **状态变化变成瞬间闪现**：toggle 开关从「开」瞬间变「关」，用户看不出过程，以为没切换成功，又点一次，回到原状态。
2. **加载指示器静止假死**：loading spinner 不转了，用户以为页面卡死，刷新页面，请求中断，数据丢失。
3. **模态进场无过渡**：弹窗瞬间出现，无入场反馈，用户怀疑是不是自己点错了。

**正确做法**：loading 指示器在 reduced-motion 下仍需存在，改为低幅度脉动或静态进度文案。

```css
/* 错误版的修正 */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    /* 改为静态进度文案 */
  }
  .spinner::after {
    content: 'Loading...';
    animation: pulse 1.2s linear infinite; /* 低幅度脉动，1.2s 周期不构成光敏性风险 */
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
}
```

为什么 1.2s 周期安全：WCAG 2.3.1 限制是每秒 3 次以上闪烁，1.2s 周期 = 0.83 次/秒，远低于阈值。

---

## 2. 闪烁与光敏性

光敏性癫痫用户对闪烁敏感。WCAG 2.3.1（A级）规定阈值。

### 2.1 WCAG 2.3.1 阈值

**核心规则**：
- 一秒内一般闪烁不超过 3 次。
- 红色闪烁不超过 3 次（红色对光敏性更敏感）。
- 大面积闪烁另受 ≤0.006 球面度的立体角限制。

完整条文：https://www.w3.org/WAI/WCAG22/Understanding/Three-Flashes-or-Below-Threshold.html

### 2.2 计算方式

闪烁频率 = 每秒明暗交替次数。一个完整周期 = 1 次明 + 1 次暗。

例：`animation: blink 0.2s steps(2) infinite`，每 0.1s 切换一次明暗 = 10 次/秒。远超 3 次阈值，违规。

例：`animation: pulse 1.2s ease-in-out infinite`，每 0.6s 一次明暗 = 1.67 次/秒。安全。

### 2.3 检测方法

录屏逐帧数峰值：
1. 用浏览器 DevTools 的 `Rendering` 面板，勾选 `FPS meter`，开启动画。
2. 录屏 1 秒，逐帧检查亮度变化（明暗反转次数）。
3. 如果反相次数 ≥6（即 3 个完整周期），违规。
4. 大面积闪烁（覆盖视野 >30% 的元素）额外检测球面度：`面积 / 距离² > 0.006` 即违规。计算公式：`立体角 = 元素面积 / (观看距离 × 观看距离)`。

### 2.4 高风险场景

- 频闪灯光效果（霓虹、夜店主题）。
- 快速反转的黑白（高对比条纹滚动）。
- 高对比条纹滚动（zebra pattern animation）。
- 大面积高饱和色循环（红、橙、黄循环切换）。
- 视频背景含闪烁内容（不归你管，但要避免在 UI 里再叠加闪烁）。

### 2.5 替代方案

不要用闪烁传达信息，改用：
- 降低对比度差：明暗差异 <30%，视觉上仍是「呼吸」而非「闪」。
- 拉长周期到 >1s：`animation-duration: 1.2s` 或更长。
- 改为渐变色相缓慢移动：`@keyframes hue { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }`，duration 20s。
- 提供「关闭装饰」开关：UI 上放一个明显的按钮，用户主动关闭装饰层。

```css
/* 错误：高对比快速闪烁 */
@keyframes alert {
  0%, 100% { background: white; }
  50% { background: black; }
}
.alert {
  animation: alert 0.2s infinite; /* 5 次/秒，违规 */
}

/* 正确：拉长周期 + 降对比 */
@keyframes alert {
  0%, 100% { background: hsl(0, 80%, 95%); }
  50% { background: hsl(0, 80%, 90%); }
}
.alert {
  animation: alert 1.5s ease-in-out infinite; /* 0.67 次/秒，安全 */
}
```

---

## 3. 焦点与键盘

动画不得干扰键盘导航。焦点是屏幕阅读器与键盘用户的导航锚点，动画期间焦点不能丢、不能乱、不能被正在消失的元素吸走。

### 3.1 退出动画期间的焦点处理

`AnimatePresence` 退出动画期间，正在消失的元素必须：
- `pointer-events: none`：鼠标点击穿透，不抢交互。
- `aria-hidden="true"`：屏幕阅读器跳过，不再播报。
- `inert`（如支持）：完全禁用，包括焦点。

否则，键盘用户 Tab 键会落在正在消失的元素上，焦点跟着元素一起淡出，下一秒焦点丢失，用户不知道自己在哪。

```tsx
import { motion, AnimatePresence } from 'motion/react';

export function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.156, ease: [0.4, 0, 1, 1] }}
          aria-hidden="true"  /* 退出期间对辅助技术隐藏 */
          style={{ pointerEvents: 'none' }}  /* 退出期间鼠标穿透 */
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 3.2 模态焦点管理（完整代码）

模态进入动画开始前把焦点移入，退出动画结束后还给触发元素。处理 Escape 关闭与 focus trap 边界。

```tsx
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Modal({ open, onClose, triggerRef, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!open) return;
    
    // 进入：记录当前焦点，把焦点移入模态
    previousFocusRef.current = document.activeElement as HTMLElement;
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    firstFocusable?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        // focus trap：Tab 到最后一个时回到第一个
        const focusables = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables) return;
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      // 退出动画结束后还给触发元素
      // 这里简化处理：假设退出动画是 156ms
      const timer = setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 156);
      return () => clearTimeout(timer);
    }
  }, [open]);
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 3.3 焦点环

`outline` 不参与 opacity/transform 动画。用 `:focus-visible` 区分鼠标点击与键盘聚焦。

```css
/* 错误：去掉所有 outline */
*:focus {
  outline: none; /* 键盘用户失去焦点指示 */
}

/* 正确：仅对鼠标点击隐藏，键盘聚焦保留 */
*:focus {
  outline: none;
}
*:focus-visible {
  outline: 2px solid hsl(220, 90%, 50%);
  outline-offset: 2px;
  /* 焦点环不参与 opacity/transform 动画，确保始终可见 */
}

/* 焦点环不参与动画 */
.animated-element:focus-visible {
  transition: transform var(--dur-fast) var(--ease-both);
  /* outline 不在 transition 列表里，不会被打断 */
}
```

### 3.4 禁忌

- 动效期间不得改变 tab 顺序：不要在动画中动态修改 `tabindex`，让用户 Tab 时元素位置跳来跳去。
- 不得用 `tabindex="-1"` 隐藏仍在场的元素：`tabindex="-1"` 让元素从 tab 序列移除但保留可聚焦（用 JS focus），用户 Tab 时跳过。如果元素仍在场且可交互，不应设 `-1`，应该让用户能 Tab 到。

---

## 4. 语义与播报

屏幕阅读器用户依赖 `aria-live` 区域播报状态变化。动画不能干扰播报，更不能让屏幕阅读器逐帧读数字。

### 4.1 数字滚动

容器 `aria-live="off"`，最终值通过 `aria-live="polite"` 的隐藏节点播报一次。禁止让屏幕阅读器逐帧读数字。

```tsx
import { useEffect, useRef, useState } from 'react';

export function CountUp({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const finalRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        // 动画结束，触发一次性播报
        setDisplay(target);
        if (finalRef.current) {
          finalRef.current.textContent = `已更新至 ${target}`;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  
  return (
    <>
      {/* 可视数字：屏幕阅读器跳过逐帧读取 */}
      <span aria-hidden="true" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {display.toLocaleString()}
      </span>
      {/* 隐藏节点：动画结束后播报一次最终值 */}
      <span ref={finalRef} aria-live="polite" className="sr-only" />
    </>
  );
}
```

为什么 `aria-live="off"` 不写：默认就是 off，省略即可。可视频觉数字 `aria-hidden="true"`，让屏幕阅读器跳过；最终值节点 `aria-live="polite"`，不打断用户当前播报，等用户停顿后播报。

### 4.2 骨架屏

加载期间 `aria-busy="true"`，加载完成后移除并 `aria-live="polite"` 播报「已加载 N 项」。

```tsx
import { motion, AnimatePresence } from 'motion/react';

export function List({ items, loading }: { items: Item[]; loading: boolean }) {
  return (
    <div aria-busy={loading}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            aria-hidden="true"
          >
            {/* 骨架屏视觉，不播报 */}
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
          >
            {items.map(item => <Row key={item.id} {...item} />)}
            {/* 加载完成播报 */}
            <span aria-live="polite" className="sr-only">
              已加载 {items.length} 项
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 4.3 装饰动效层

装饰动效层必须 `aria-hidden="true"` + `pointer-events: none`。

```tsx
function DecorativeBackground() {
  return (
    <motion.div
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
      animate={{ opacity: [0.4, 0.6, 0.4] }}
      transition={{ duration: 4, repeat: Infinity }}
    >
      {/* 装饰背景 */}
    </motion.div>
  );
}
```

### 4.4 自动播放的轮播/视频

WCAG 2.2.2（A级）规定：移动、闪烁、滚动内容超过 5 秒需可暂停、停止或隐藏。自动播放的轮播或视频必须提供暂停控件。

完整条文：https://www.w3.org/WAI/WCAG22/Understanding/Pause-Stop-Hide.html

```tsx
function Carousel() {
  const [playing, setPlaying] = useState(true);
  
  return (
    <div>
      <div className="slides" aria-live="off">
        {/* 轮播内容 */}
      </div>
      <button onClick={() => setPlaying(p => !p)} aria-label={playing ? '暂停轮播' : '继续轮播'}>
        {playing ? '⏸' : '▶'}
      </button>
    </div>
  );
}
```

为什么 `aria-live="off"`：轮播自动切换时，每张 slide 的内容不应被自动播报，否则屏幕阅读器用户会被打断。用户主动操作（点击暂停按钮）时，按钮的 `aria-label` 变化由屏幕阅读器播报。

---

## 5. 性能作为可访问性

低端设备与省电模式下，动画卡顿会让所有用户（不仅是辅助技术用户）体验崩盘。性能是可访问性的一部分。

### 5.1 低端设备与省电模式检测

三选一，优先级从高到低：

1. **`navigator.connection?.saveData`**（NetworkInformation 只读属性，非 Baseline）：用户在浏览器设置里开启了「省流模式」。
2. **`matchMedia('(prefers-reduced-data: reduce)')`**（Experimental，尚无浏览器支持，只能渐进增强）：MDN 标注 Limited availability，官方提示「尚无任何用户代理支持」。不能作为唯一手段。
3. **帧率探测**：连续两帧 >50ms 就降级。

```tsx
import { useEffect, useState } from 'react';

export function useLowEndDevice(): boolean {
  const [lowEnd, setLowEnd] = useState(false);
  
  useEffect(() => {
    // 策略 1：saveData（非 Baseline，但 Chrome 系支持）
    const conn = (navigator as any).connection;
    if (conn?.saveData) {
      setLowEnd(true);
      return;
    }
    
    // 策略 2：prefers-reduced-data（Experimental，几乎无浏览器支持，仅渐进增强）
    if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
      setLowEnd(true);
      return;
    }
    
    // 策略 3：帧率探测（最可靠）
    let lastTime = performance.now();
    let slowFrames = 0;
    let raf = 0;
    const check = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      if (delta > 50) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames >= 2) {
        setLowEnd(true);
        cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);
  
  return lowEnd;
}
```

为什么阈值 50ms：60fps 要求每帧 16.67ms，30fps 是 33ms。50ms 表示帧率掉到 20fps 以下，用户能感知明显卡顿。连续两帧而非单帧：避免偶发 GC pause 误判。

### 5.2 后台标签页暂停

`document.visibilitychange` + `IntersectionObserver`，元素离开视口或页面进入后台时暂停动画，节省 CPU 与电量。

```tsx
import { useEffect } from 'react';

export function usePauseWhenInactive(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    let observer: IntersectionObserver | null = null;
    let animations: Animation[] = [];
    
    const pause = () => {
      animations = el.getAnimations();
      animations.forEach(a => a.pause());
    };
    const resume = () => {
      animations.forEach(a => a.play());
      animations = [];
    };
    
    // 策略 1：页面进入后台
    const handleVisibility = () => {
      if (document.hidden) pause();
      else if (isIntersecting) resume();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // 策略 2：元素离开视口
    let isIntersecting = true;
    observer = new IntersectionObserver((entries) => {
      isIntersecting = entries[0].isIntersecting;
      if (!isIntersecting) pause();
      else if (!document.hidden) resume();
    });
    observer.observe(el);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      observer?.disconnect();
    };
  }, [ref]);
}
```

### 5.3 长任务预算

单帧脚本预算 8ms（60fps 留 8ms 给脚本，剩下给渲染与合成）。动画期间不做布局读取（强制同步布局）。

```tsx
// 错误：动画期间读布局
function animateBox(el: HTMLElement) {
  const box = el.getBoundingClientRect(); // 触发布局
  el.style.transform = `translateX(${box.left + 10}px)`;
}

// 正确：动画前读布局，动画期间只写 transform
function animateBox(el: HTMLElement) {
  const startLeft = el.getBoundingClientRect().left; // 动画开始前读一次
  let current = startLeft;
  function tick() {
    current += 2;
    el.style.transform = `translateX(${current - startLeft}px)`; // 只写 transform
    if (current < startLeft + 100) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

为什么 8ms：60fps 一帧总预算 16.67ms。其中渲染（paint + composite）约 6ms，脚本理论上只剩 10ms。留 2ms 缓冲，单帧脚本预算 8ms。超过则掉帧。

---

## 6. 测试清单

10 条可勾选。每条都做一遍，动效可访问性才算合格。

- [ ] DevTools `Rendering` 面板勾选 `prefers-reduced-motion: reduce`，刷新页面，验证所有动效降级，状态变化仍清晰，无瞬间闪现。
- [ ] Windows 设置「设置 → 辅助功能 → 视觉效果 → 显示动画」关闭，重启浏览器，验证降级生效。
- [ ] macOS「系统设置 → 辅助功能 → 显示 → 减弱动态效果」开启，验证降级生效。
- [ ] 键盘走查：Tab 键遍历页面所有交互元素，焦点环始终可见，不被动画遮挡，不被正在退出的元素吸走。
- [ ] VoiceOver（macOS）走查：开启 VoiceOver，验证数字滚动播报一次最终值，不逐帧读；骨架屏加载完成后播报「已加载 N 项」。
- [ ] NVDA（Windows）走查：同上，验证 aria-live 区域播报正确。
- [ ] CPU 4x 降速：DevTools `Performance` 面板勾选 `CPU: 4x slowdown`，运行动画，验证帧率不低于 30fps，无掉帧卡顿。
- [ ] Lighthouse 跑一次，检查 Performance 与 Accessibility 分数 ≥90，无 `prefers-reduced-motion` 缺失警告。
- [ ] 录屏逐帧检查闪烁：1 秒内明暗反转次数 ≤6（即 ≤3 次完整闪烁），不违反 WCAG 2.3.1。
- [ ] 自动播放内容验证有暂停控件：轮播、视频、跑马灯，必须有按钮可暂停（WCAG 2.2.2）。

---

## 7. 标准引用

### WCAG 2.2 条款

| 条款 | 级别 | 标题 | 链接 |
|------|------|------|------|
| 2.3.1 | A | Three Flashes or Below Threshold（三闪或低于阈值） | https://www.w3.org/WAI/WCAG22/Understanding/Three-Flashes-or-Below-Threshold.html |
| 2.2.2 | A | Pause, Stop, Hide（暂停、停止、隐藏） | https://www.w3.org/WAI/WCAG22/Understanding/Pause-Stop-Hide.html |
| 1.4.13 | AA | Content on Hover or Focus（悬停或聚焦时的内容） | https://www.w3.org/WAI/WCAG22/Understanding/Content-on-Hover-or-Focus.html |
| 2.3.3 | AAA | Animation from Interactions（交互触发的动画） | https://www.w3.org/WAI/WCAG22/Understanding/Animation-from-Interactions.html |

### MDN 与 caniuse

| 资源 | 链接 | 说明 |
|------|------|------|
| `prefers-reduced-motion` | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | MDN 已 Baseline，全浏览器支持 |
| `prefers-reduced-data` | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-data | MDN 标注 Experimental / Limited availability，官方提示「尚无任何用户代理支持」，只能渐进增强 |
| `navigator.connection.saveData` | https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData | NetworkInformation 只读属性，非 Baseline |
| CSS scroll-timeline | https://caniuse.com/css-scroll-timeline | 支持度未全量，必须有降级方案 |

### 条款适用说明

**2.3.1（A级，必须）**：不得有每秒 3 次以上的闪烁。红色闪烁不超过 3 次。大面积闪烁另受 ≤0.006 球面度限制。本 skill §2 全部围绕此条款。

**2.2.2（A级，必须）**：移动、闪烁、滚动内容超过 5 秒需可暂停、停止或隐藏。自动播放的轮播、视频、跑马灯必须提供暂停控件。本 skill §4.4 围绕此条款。

**1.4.13（AA，必须）**：悬停或聚焦触发的弹出内容须可关闭（不移动指针就能关闭）、可悬停（指针移到弹窗内不消失）、可持续（指针在触发元素与弹窗间移动时不消失）。Tooltip 与 hover menu 必须满足三条件。

**2.3.3（AAA，加分）**：交互触发的动效需可关闭，除非动效本身是本质功能。这是 AAA 级，不强制，但建议实现 `prefers-reduced-motion` 降级以满足。
