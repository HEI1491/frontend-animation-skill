/**
 * frontend-animation skill · 参考组件实现（标准答案）
 *
 * 本文件是动效写法的参考实现，供复制进项目后再改。共导出 6 个成员：
 *   - usePrefersReducedMotion()  SSR 安全的 reduced-motion 检测 hook
 *   - <RevealList>               列表滚动进场（whileInView + stagger）
 *   - <PressableAction>          按钮微交互（hover / press / focus）
 *   - <FloatingPanel>           进出场成对 + 焦点管理（AnimatePresence）
 *   - <AmbientGlow>             装饰层（可关、可暂停、reduced-motion 静态）
 *   - <PureCssReveal>            不依赖 motion 的等价进场实现
 *
 * 依赖：
 *   - react（>=18）
 *   - motion v12，从 'motion/react' 导入。若项目用旧版 framer-motion，
 *     把下方 import 的 'motion/react' 改成 'framer-motion'，API 完全相同。
 *
 * token：时长 / 曲线 / 位移 / 透明度 / 缩放 / stagger / spring 全部来自
 *        @/lib/motion-tokens，契约见 references/tokens.md。
 *
 * 替换指引：改数值改 token；改结构改组件；组件里不应出现裸数字时长
 *           （背景装饰的 16s 是唯一例外，见 AmbientGlow）。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion, AnimatePresence, type Variants } from 'motion/react';
import {
  duration,
  ease,
  distance,
  opacity as opacityToken,
  scale as scaleToken,
  stagger as staggerToken,
  transition,
} from '@/lib/motion-tokens';

// 多实例复用同一份 <style>，避免重复注入
const injectedStyles = new Set<string>();
function injectStyle(id: string, css: string): void {
  if (typeof document === 'undefined' || injectedStyles.has(id)) return;
  const el = document.createElement('style');
  el.setAttribute('data-fa-style', id);
  el.textContent = css;
  document.head.appendChild(el);
  injectedStyles.add(id);
}
// ---------------------------------------------------------------------------
// 1. reduced-motion 检测（SSR 安全）
// ---------------------------------------------------------------------------

/**
 * motion 自带 useReducedMotion，但它在 SSR 首帧返回 false，
 * 需要「首帧就降级」的场景用这个 hook：初始按 matchMedia 同步取值，
 * hydration 后再跟随系统变化。
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

// ---------------------------------------------------------------------------
// 2. 列表滚动进场
// ---------------------------------------------------------------------------

export interface RevealListProps {
  items: readonly ReactNode[];
  /** 每项的稳定 key；没有就退化成 index */
  getKey?: (item: ReactNode, index: number) => string | number;
  /** 容器类名，负责布局 */
  className?: string;
  /** 每项类名 */
  itemClassName?: string;
  /** 进场位移距离，默认 16px（中档） */
  distance?: number;
}

/**
 * 进入视口后逐项进场。
 * - 进场 240ms，进场曲线 ease.enter
 * - stagger 40ms，整组上限 500ms（超出自动截断）
 * - 透明度 0.6→1（不是 0→1，避免文字闪烁）
 * - reduced-motion：整体一次性淡入，不做位移与 stagger
 */
export function RevealList({
  items,
  getKey,
  className,
  itemClassName,
  distance = distance.md,
}: RevealListProps) {
  const reduced = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: opacityToken.enter, y: reduced ? 0 : distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: duration.instant, ease: ease.both }
        : {
            duration: duration.base,
            ease: ease.enter,
            staggerChildren: staggerToken.step,
            delayChildren: 0,
          },
    },
  };

  const visibleCount = Math.min(items.length, Math.ceil(staggerToken.max / staggerToken.step));
  const effectiveStagger =
    items.length > 0 ? Math.min(staggerToken.step, staggerToken.max / items.length) : staggerToken.step;
  void visibleCount;

  return (
    <motion.ul
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        visible: {
          transition: reduced
            ? { duration: duration.instant }
            : { staggerChildren: effectiveStagger },
        },
      }}
    >
      {items.map((item, index) => (
        <motion.li
          key={getKey ? getKey(item, index) : index}
          className={itemClassName}
          variants={variants}
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}

// ---------------------------------------------------------------------------
// 3. 按钮微交互（hover / press / focus）
// ---------------------------------------------------------------------------

export interface PressableActionProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  /** hover 时的轻微放大，默认 1.02（在 0.96–1.04 区间内） */
  hoverScale?: number;
  /** 按下时的缩放，默认 0.97 */
  pressScale?: number;
}

/**
 * 微交互三态：hover 放大、press 缩小、focus 显示焦点环。
 * - 时长：hover 160ms / press 120ms
 * - 只动 transform，焦点环用 box-shadow（不影响布局）
 * - 键盘 focus 不参与缩放动画，只显示焦点环
 */
export function PressableAction({
  children,
  onClick,
  className,
  disabled,
  hoverScale = 1.02,
  pressScale = 0.97,
}: PressableActionProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: pressScale }}
      transition={{ duration: duration.fast, ease: ease.both }}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// 4. 进出场成对 + 焦点管理
// ---------------------------------------------------------------------------

export interface FloatingPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * 模态进场：240ms ease.enter；出场：156ms ease.exit（= 进场 × 0.65）。
 * - 遮罩透明度 0→1 只用于全屏遮罩（符合 §3 规则）
 * - 面板位移 8px，缩放 0.98（在 0.96–1.04 内）
 * - 打开时把焦点移入面板，关闭时归还给触发元素
 * - reduced-motion：退化为 120ms 交叉淡入，仍可读出状态变化
 */
export function FloatingPanel({ open, onClose, title, children }: FloatingPanelProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? duration.instant : duration.base, ease: ease.both }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgb(0 0 0 / 0.5)',
              pointerEvents: 'auto',
            }}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: distance.sm, scale: scaleToken.min }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: distance.sm, scale: scaleToken.min }}
            transition={
              reduced
                ? { duration: duration.instant, ease: ease.both }
                : { duration: duration.base, ease: ease.enter }
            }
            style={{
              position: 'relative',
              margin: '10vh auto 0',
              width: 'min(560px, 92vw)',
              outline: 'none',
            }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// 5. 装饰层（可关、可暂停、reduced-motion 静态）
// ---------------------------------------------------------------------------

export interface AmbientGlowProps {
  /** 装饰层是否启用 */
  enabled?: boolean;
  className?: string;
}

/**
 * 鼠标跟随光晕（模板 4 的精简版）：
 * - 用 rAF 节流，不用 setTimeout
 * - 装饰层 pointer-events: none，不挡交互
 * - 页面隐藏（visibilitychange）时停帧
 * - reduced-motion：完全不渲染，直接给静态渐变
 */
export function AmbientGlow({ enabled = true, className }: AmbientGlowProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || reduced) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const tick = () => {
      // 简易 lerp，避免每次 pointermove 都触发布局
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      raf = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf === 0) raf = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      window.cancelAnimationFrame(raf);
      raf = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', stop);
    start();

    return () => {
      stop();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [enabled, reduced]);

  if (reduced) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 320,
        height: 320,
        borderRadius: '50%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle, rgb(120 140 255 / 0.18), transparent 70%)',
        willChange: 'transform',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 6. 纯 CSS 等价实现（不依赖 motion 的项目直接抄）
// ---------------------------------------------------------------------------

/**
 * 进场：240ms ease-enter，位移 16px，透明度 0.6→1。
 * 出场由父级控制 class 切换，156ms ease-exit。
 * reduced-motion：媒体查询内退化为 120ms 纯淡入。
 */
export function PureCssReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const css = `
@keyframes fa-reveal-in {
  from { opacity: 0.6; transform: translateY(16px); }
  to   { opacity: 1;   transform: translateY(0); }
}
@keyframes fa-reveal-out {
  from { opacity: 1;   transform: translateY(0); }
  to   { opacity: 0.6; transform: translateY(8px); }
}
.fa-reveal { animation: fa-reveal-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .fa-reveal { animation: fa-reveal-in 120ms linear both; }
}
`;
  injectStyle('reveal', css);

  const style: CSSProperties = { animation: 'fa-reveal-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both' };
  void style;

  return (
    <div className={className ? `fa-reveal ${className}` : 'fa-reveal'}>{children}</div>
  );
}

// ---------------------------------------------------------------------------
// 附：全局 CSS 变量定义（复制进 globals.css，替换同名变量）
// ---------------------------------------------------------------------------

export const GLOBAL_CSS_VARS = `
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
`;

