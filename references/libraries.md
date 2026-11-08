# 前端动效库速查 · libraries.md

> **定位**：速查 + 版本陷阱，不是 API 手册。目标：30 秒内知道装什么、import 什么、最小写法、踩过什么坑。体积数字统一标注「量级参考，实测用 bundlephobia」。
> **更新时间**：2026-11-07 / 核实版本：motion 14.x、GSAP 3.15.x、R3F 9.x、@lottiefiles/dotlottie-react 0.21.x

---

## TL;DR 选型表

| 需求 | 库 | 最小安装 |
|---|---|---|
| hover / toggle / 进出场（React） | motion | `npm i motion` |
| 复杂时间轴 / 滚动联动 | GSAP + ScrollTrigger | `npm i gsap` |
| 3D / 粒子 / shader（React） | three.js + R3F + drei | `npm i three @react-three/fiber @react-three/drei` |
| 设计师矢量动画 | @lottiefiles/dotlottie-react | `npm i @lottiefiles/dotlottie-react` |
| 页面/路由转场（渐进增强） | View Transitions API | 无需安装，浏览器原生 |
| JS 精确播放控制（无库） | Web Animations API | 无需安装，浏览器原生 |
| 图表动效 | Recharts / ECharts 内置 | 按项目已有图表库 |

---

## 1. motion（原 framer-motion）

### 何时用
- 组件进出场、`AnimatePresence` 管理列表增删、模态出现消失
- 布局变化（`layout` 属性自动 FLIP，无需手算坐标）
- 手势交互：drag、tap、hover，需要 spring 物理感的场景

### 何时不用
- 项目已有 GSAP，简单进场用 CSS transition 即可，不重复引库
- 纯 CSS hover 能做的（颜色、边框、阴影）不需要 motion
- SSR-only 页面没有任何交互动效，引入只增加 bundle

### 安装与导入

**v12+ 新项目（包名已改为 `motion`）：**

```bash
npm i motion
```

```tsx
// React 客户端组件
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

// React Server Components（RSC）—— 减少客户端 JS
import * as motion from "motion/react-client";

// 原生 JS（无框架）
import { animate, scroll } from "motion";
```

**旧项目（package.json 里有 `framer-motion`）：**

```tsx
// 检测到 framer-motion：沿用旧导入，不要改
// v11 及以上 API 与 motion v12 基本一致
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

> 规则：项目 `package.json` 有 `framer-motion` → 沿用旧包名与导入，不擅自升级。升级需要用户明确要求后单独操作。

### 最小可运行片段

```tsx
"use client"; // Next.js App Router 必须加

import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

const ENTER = { opacity: 0, y: 16 };
const VISIBLE = { opacity: 1, y: 0 };
const EXIT = { opacity: 0, y: -8 };
const TRANSITION = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };

export function Card({ id, children }: { id: string; children: React.ReactNode }) {
  const shouldReduce = useReducedMotion();

  return (
    // layout 放最外层运动元素上
    <motion.div layout transition={shouldReduce ? { duration: 0 } : TRANSITION}>
      {children}
    </motion.div>
  );
}

export function ListDemo() {
  const [items, setItems] = useState(["A", "B", "C"]);
  const shouldReduce = useReducedMotion();

  return (
    <>
      <button onClick={() => setItems((p) => p.slice(0, -1))}>删除</button>
      <ul>
        {/* AnimatePresence 的直接子元素必须有稳定 key */}
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item}
              initial={shouldReduce ? false : ENTER}
              animate={VISIBLE}
              exit={shouldReduce ? {} : EXIT}
              transition={shouldReduce ? { duration: 0 } : TRANSITION}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {item}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
```

### 版本陷阱

| 症状 | 触发条件 | 处理 |
|---|---|---|
| `Module not found: 'framer-motion'` 或导入路径报错 | 装了新包 `motion`，但代码仍 `import from 'framer-motion'` | 新项目统一用 `motion/react`；旧项目保留旧路径不动 |
| `exit` 动画不播放 | `exit` 写在非 `AnimatePresence` 直接子元素上，或 `AnimatePresence` 外面 | `exit` 只对 `AnimatePresence` 的直接子元素生效，必须包裹 |
| 布局动画抖动 / 不生效 | `layout` 属性没有放到最外层运动元素上，或父子都加了 `layout` 但中间有非 motion 容器 | `layout` 加在坐标会变化的最外层元素，检查中间层级 |
| Next.js App Router 报 `document is not defined` | 在 RSC 里直接用 `motion/react`（含客户端 API） | 加 `"use client"` 或换用 `motion/react-client` |
| 首帧跳闪/跳过入场 | `AnimatePresence` 上加了 `initial={false}` | `initial={false}` 会跳过已挂载元素的首帧动画，只在「不想要初始动画」时才加 |
| `useReducedMotion` 返回 null | SSR 阶段无法读取 media query | SSR 阶段返回 null 视为 false，客户端 hydrate 后才同步；可用 `null` 作为不播放判断 |

### 体积与加载策略

量级参考：min+gzip 约 30–50KB 级（实测用 bundlephobia：https://bundlephobia.com/package/motion）。

按需减包体：

```tsx
import { LazyMotion, domAnimation, m } from "motion/react";

// 用 m 替代 motion，只加载 domAnimation 功能集（约 18KB gzip 级）
function App() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ x: 0 }} />
    </LazyMotion>
  );
}
```

### reduced-motion 支持

原生支持：`useReducedMotion()` hook 读取 `prefers-reduced-motion`，返回 `boolean | null`。检测到时将 `initial/animate/exit/transition` 换成无动画版本（见上方片段）。

### 官方链接

- 文档：https://motion.dev/docs/react
- React 安装：https://motion.dev/docs/react-installation

---

## 2. GSAP

### 何时用
- 复杂时间轴：多元素分步编排，需要精确 delay / stagger / 暂停 / 反向
- 滚动联动：ScrollTrigger 的 pin / scrub / snap 超过 CSS scroll-driven 能力
- SVG 路径变形（MorphSVG）、文字拆分动画（SplitText）

### 何时不用
- 项目已有 motion：进出场、布局动画用 motion 即可，不并存
- 简单 hover / toggle：CSS transition 足够，引 GSAP 是杀鸡用牛刀
- 只需要单个元素的一次性入场：WAAPI 或 CSS animation 更轻

### 安装与导入

```bash
npm i gsap
# React 集成
npm i @gsap/react
```

```js
// 核心
import gsap from "gsap";

// 插件（自 v3.13 起全部免费）
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Draggable } from "gsap/Draggable";

// 必须注册
gsap.registerPlugin(ScrollTrigger, SplitText, Flip, MorphSVGPlugin);

// React
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
```

> **v3.13 前的项目注意**：SplitText、MorphSVG、Flip、InertiaPlugin 等 Club 插件在 v3.12 及更早需要会员账号才能安装。若项目锁在 `"gsap": "^3.12.x"`，这些插件可能装不上，必须先确认版本再引入。

### 最小可运行片段（React + ScrollTrigger）

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function ScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // useGSAP 会在组件卸载时自动清理所有在其内部创建的 tween / ScrollTrigger
  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".panel",
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.1,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
              end: "bottom 20%",
              scrub: false,
              pin: false,
              // 图片加载完后刷新坐标
              onRefresh: () => ScrollTrigger.refresh(),
            },
          }
        );
      }, containerRef);

      // 如果没用 useGSAP，手动清理：return () => ctx.revert()
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef}>
      <div className="panel">第一段</div>
      <div className="panel">第二段</div>
      <div className="panel">第三段</div>
    </div>
  );
}
```

### 版本陷阱

| 症状 | 触发条件 | 处理 |
|---|---|---|
| React StrictMode 下动画执行两次 / tween 叠加 | StrictMode 会 mount → unmount → mount，effect 执行两次 | 用 `useGSAP()` 或 `gsap.context()`，它们在第二次 mount 前先 revert |
| ScrollTrigger 位置偏移 / 触发点算错 | 页面内有图片/字体未加载时 GSAP 就计算了布局高度 | 在 `onLoad` 或 `imagesLoaded` 后调 `ScrollTrigger.refresh()` |
| SSR 报 `window is not defined` | 服务端直接 `import gsap` 触发 DOM 检测 | Next.js 中组件加 `"use client"`，或动态导入：`const gsap = (await import("gsap")).default` |
| `matchMedia` 里的动画在断点切换后没还原 | 在 `matchMedia` 回调外部创建了动画 | 所有动画必须在 `ScrollTrigger.matchMedia` / `gsap.matchMedia()` 回调内创建，断点切换时会自动 revert |
| Club 插件（SplitText / MorphSVG）安装报 401 / 403 | 项目锁 v3.12 及更早，需要会员 token | 升级到 v3.13+（当前最新 3.15.x），或删除 `.npmrc` 里的 Club registry 配置 |

### 体积与加载策略

量级参考（min+gzip）：核心约 25KB 级，ScrollTrigger 约 15KB 级，合计约 40KB 级。实测：https://bundlephobia.com/package/gsap

GSAP 本身不做路由级懒加载；但 ScrollTrigger 在无滚动需求时不注册即可。

### reduced-motion 支持

不原生支持，需手写：

```ts
import gsap from "gsap";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 全局禁用或缩短
if (prefersReduced) {
  gsap.globalTimeline.timeScale(10); // 极速播完，视觉上相当于无动画
}

// 或逐处判断
if (!prefersReduced) {
  gsap.from(".hero", { opacity: 0, y: 32, duration: 0.5 });
}
```

### 官方链接

- 文档：https://gsap.com/docs/v3/
- 注册插件：https://gsap.com/docs/v3/GSAP/gsap.registerPlugin()
- ScrollTrigger：https://gsap.com/docs/v3/Plugins/ScrollTrigger/

---

## 3. three.js + React Three Fiber + drei

### 何时用
- 真正的 3D 场景：物体、相机、光照、阴影
- WebGL 粒子系统、shader 效果、流体背景
- 产品 3D 展示、骨骼动画（glTF）

### 何时不用
- CSS 能模拟的伪 3D（`perspective` + `rotateY`）：不需要 WebGL
- 简单背景波浪 / 网格：canvas 2D + rAF 更轻
- 移动端低端设备占比高的场景：WebGL 上下文数量有限，GPU 内存紧张

### 分层说明

| 层 | 包 | 职责 |
|---|---|---|
| 渲染核心 | `three` | WebGL renderer、geometry、material、scene graph |
| React 封装 | `@react-three/fiber`（R3F） | 声明式 JSX，管理 render loop、resize、context |
| Helpers | `@react-three/drei` | 常用工具：`OrbitControls`、`Environment`、`Text`、`useGLTF` 等 |

### 安装与导入

```bash
npm i three @react-three/fiber @react-three/drei
npm i -D @types/three
```

> **版本对应（以 WebFetch 核实的 npm 版本为准）**：
> - `@react-three/fiber` 当前稳定版 **v9.x**（发布说明显示 v9.8.0 对 React 19.3 基本兼容，但未完全支持所有新 API）。
> - `@react-three/drei` 当前版本 **v10.x**（npm 显示 10.7.x）。
> - 先确认项目 React 版本再选 R3F 版本；React 18 使用 R3F v8 更稳妥。

### React 写法片段（R3F）

```tsx
"use client"; // Next.js App Router

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function RotatingBox() {
  const meshRef = useRef<Mesh>(null);

  // useFrame 里不能 setState，直接改 ref
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#5b8af5" />
    </mesh>
  );
}

export function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}          // 高分屏最大 2x，防 GPU 过载
      frameloop="always"    // "demand" 仅在状态变化时渲染，节省 GPU
      style={{ height: "100vh" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <RotatingBox />
      <OrbitControls enableZoom={false} />
      <Environment preset="city" />
    </Canvas>
  );
}
```

### 非 React 写法片段

```js
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x5b8af5 })
);
scene.add(mesh);
camera.position.z = 3;

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => {
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
});
```

### 懒加载（必须）

```tsx
// Next.js（SSR 关闭，否则报错）
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./Scene"), { ssr: false });

// Vite / React Router
import { lazy, Suspense } from "react";
const Scene = lazy(() => import("./Scene"));

function Page() {
  return (
    <Suspense fallback={<div className="scene-placeholder" />}>
      <Scene />
    </Suspense>
  );
}
```

### 无 WebGL 降级

```ts
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      (canvas.getContext as (id: string) => unknown)("experimental-webgl")
    );
  } catch {
    return false;
  }
}

// 使用
if (hasWebGL()) {
  // 渲染 3D 组件
} else {
  // 渲染静态图片或 CSS 渐变背景
}
```

### 版本陷阱

| 症状 | 触发条件 | 处理 |
|---|---|---|
| SSR 报 `WebGLRenderingContext is not defined` | `next/dynamic` 忘写 `{ ssr: false }`，服务端执行 WebGL API | 所有 three.js / R3F 组件必须 `dynamic` 加 `ssr: false` |
| 移动端白屏 / 上下文丢失 | GPU 内存耗尽或多个 Canvas 耗尽 WebGL 上下文 | 监听 `renderer.domElement.addEventListener('webglcontextlost', cb)`；同页面 Canvas 不超过 2 个 |
| `addons` 路径找不到（如 OrbitControls） | 不同版本 three.js 的 addons 路径不同（旧版 `three/examples/jsm/...`，新版 `three/addons/...`） | 用 R3F + drei，不直接 import three.js addons；非 React 场景查当前版本文档确认路径 |
| `drei` 的 `Environment` 加载失败 / 黑屏 | 缺少 `.hdr` 文件或 CDN 不可达 | 用 `preset` 属性而非自定义路径；或 `<Environment background={false} />` 作为降级 |
| 每帧在 `useFrame` 里 `setState` 导致无限重渲染 | 错误地把物理状态放进 React state | `useFrame` 里只改 ref（`meshRef.current.rotation.y`），不调 `setState` |
| 高分屏帧率卡 | `dpr` 未限制，4K 屏实际渲染面积极大 | `dpr={[1, 2]}` 限制最大 2x |

### 体积与加载策略

量级参考：`three` 本体 min+gzip 约 150–200KB+ 级；R3F + drei 叠加后总体积数百 KB 级。实测用 bundlephobia：https://bundlephobia.com/package/three

**必须**路由级懒加载，不进入页面时不加载。

### reduced-motion 支持

不原生支持，需手动暂停：

```tsx
import { useFrame } from "@react-three/fiber";

function AnimatedMesh() {
  const meshRef = useRef<Mesh>(null);
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useFrame((_state, delta) => {
    if (prefersReduced || !meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.8;
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### 官方链接

- three.js：https://threejs.org/docs/
- React Three Fiber：https://r3f.docs.pmnd.rs/
- drei：https://drei.docs.pmnd.rs/

---

## 4. Lottie / dotLottie

### 何时用
- 设计师用 After Effects 或 Lottie 工具导出的矢量动画
- 需要帧级控制（进度条联动、交互触发特定帧）
- 品牌标志演绎、空状态插画、加载反馈

### 何时不用
- 小图标（<48px、简单路径变化）：改用 SVG + CSS，不要引 Lottie 运行时
- 纯 CSS 能实现的旋转/渐变：Lottie WASM 运行时体积不值得
- 首屏关键路径：首屏非必需动画应懒加载，避免阻塞 FCP

### 三种包的区别

| 包 | 渲染方式 | 文件格式 | 体积 | 适用场景 |
|---|---|---|---|---|
| `lottie-web` | Canvas / SVG / HTML | `.json` | 约 40–60KB gzip 级 | 最通用，非 React 项目 |
| `lottie-react` | Canvas / SVG（封装 lottie-web） | `.json` | 略大于 lottie-web | React 快速集成 |
| `@lottiefiles/dotlottie-react` | Canvas（WASM 渲染） | `.lottie`（压缩）/ `.json` | WASM 运行时约 200–300KB 级 | 优先选用，文件体积更小 |

> 规则：优先 `@lottiefiles/dotlottie-react` + `.lottie` 格式，`.lottie` 比 `.json` 压缩更高效，传输体积更小。

### 安装与导入

```bash
npm i @lottiefiles/dotlottie-react
```

```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
```

### 最小可运行片段

以下 API 已通过 GitHub README 核实（包版本 0.21.x）：

```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { useRef, useEffect, useState } from "react";

export function LottieDemo() {
  const dotLottieRef = useRef<DotLottie | null>(null);
  const [prefersReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    // reduced-motion：暂停动画，停在第一帧
    if (prefersReduced && dotLottieRef.current) {
      dotLottieRef.current.pause();
    }
  }, [prefersReduced]);

  // 可见性暂停（页面切入后台时）
  useEffect(() => {
    const handleVisibility = () => {
      if (!dotLottieRef.current) return;
      if (document.hidden) {
        dotLottieRef.current.pause();
      } else if (!prefersReduced) {
        dotLottieRef.current.play();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [prefersReduced]);

  return (
    <DotLottieReact
      src="/animations/hero.lottie"
      loop={!prefersReduced}
      autoplay={!prefersReduced}
      dotLottieRefCallback={(instance) => {
        dotLottieRef.current = instance;
      }}
      style={{ width: 240, height: 240 }}
    />
  );
}
```

> **核实过的 props**（来源：官方 README）：`src`、`loop`、`autoplay`、`data`、`speed`、`mode`（`"forward"` / `"reverse"` / `"bounce"` / `"reverse-bounce"`）、`dotLottieRefCallback`、`backgroundColor`、`segment`、`renderConfig`、`playOnHover`、`useFrameInterpolation`、`marker`、`animationId`。
>
> **核实过的实例方法**：`play()`、`pause()`、`stop()`、`setFrame(n)`，以及 `addEventListener(event, cb)`（事件：`play` / `pause` / `complete` / `frame`）。
>
> `setSpeed()` / `setLoop()` / `isPlaying` 在核实的 README 中未列出——以官方文档为准：https://docs.lottiefiles.com/dotlottie-web/

### 版本陷阱

| 症状 | 触发条件 | 处理 |
|---|---|---|
| WASM 加载失败 / 动画不显示 | CDN / 静态资源服务器未正确配置 `.wasm` MIME type | 确保服务器对 `.wasm` 返回 `application/wasm`；Next.js 一般自动处理 |
| 动画文件 >100KB 还在首屏加载 | 大动画作为关键资源加载 | 懒加载：`dynamic(() => import('./LottieDemo'), { ssr: false })`；或用 IntersectionObserver 延迟渲染 |
| `.json` 文件比预期大 | 使用 `lottie-web` + `.json` 而非 `.lottie` | 转换为 `.lottie` 格式，体积更小 |
| reduced-motion 下动画仍在播 | dotLottie 默认不检测 `prefers-reduced-motion` | 手动检测并调 `.pause()`（见上方片段） |

### 体积与加载策略

- `@lottiefiles/dotlottie-react` WASM 运行时：量级约 200–300KB 级（实测 bundlephobia）
- 首屏非必需时必须懒加载
- 动画资源文件 >100KB 时需单独评审是否值得引入
- 量级参考，实测用：https://bundlephobia.com/package/@lottiefiles/dotlottie-react

### reduced-motion 支持

**不原生支持**。必须手动：
1. 检测 `prefers-reduced-motion`
2. `loop={false}` + `autoplay={false}`
3. 通过 `dotLottieRefCallback` 拿到实例后立即 `.pause()`，显示静态首帧

见上方完整片段。

### 官方链接

- LottieFiles：https://lottiefiles.com/
- dotLottie Web 文档：https://docs.lottiefiles.com/dotlottie-web/
- lottie-web（Airbnb 原版）：https://github.com/airbnb/lottie-web

---

## 5. View Transitions API

### 何时用
- 路由切换时共享元素从列表卡片变为详情页头图（hero 转场）
- SPA 内视图切换需要平滑过渡，CSS 或 motion 做不出跨 DOM 连续感
- 渐进增强：不支持时直接切换，支持时有动画

### 何时不用
- 需要同时播放多个转场（API 一次只有一个转场，不支持并发）
- 转场期间必须允许用户交互（转场期间页面不可交互）
- 需要兼容所有浏览器（Firefox 144+ 才支持，以 caniuse 数据为准，见下方链接）

### 同文档 vs 跨文档

```js
// 同文档转场：JS 驱动
document.startViewTransition(() => {
  // 在此回调内更新 DOM
  updateDOM();
});

// 跨文档（MPA 导航）转场：CSS 驱动，无需 JS
/* 在每个页面的 CSS 里加： */
/* @view-transition { navigation: auto; } */
```

### 在 React 中的用法

```tsx
"use client";

import { flushSync } from "react-dom";
import { useState } from "react";

interface Item { id: string; title: string; img: string; }

export function CardToDetail({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);

  function open(item: Item) {
    if (!document.startViewTransition) {
      setSelected(item); // 降级：直接切换
      return;
    }
    document.startViewTransition(() => {
      // flushSync 确保 React 在转场捕帧期间同步更新 DOM
      flushSync(() => setSelected(item));
    });
  }

  if (selected) {
    return (
      <div>
        {/* view-transition-name 必须全页面唯一 */}
        <img
          src={selected.img}
          style={{ viewTransitionName: `hero-${selected.id}` }}
          alt={selected.title}
        />
        <button onClick={() => setSelected(null)}>返回</button>
      </div>
    );
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => open(item)}>
          <img
            src={item.img}
            style={{ viewTransitionName: `hero-${item.id}` }}
            alt={item.title}
          />
          <span>{item.title}</span>
        </li>
      ))}
    </ul>
  );
}
```

> Next.js App Router 的 `experimental: { viewTransition: true }` 仍为实验特性，以官方文档为准：https://nextjs.org/docs

### 版本陷阱

| 症状 | 触发条件 | 处理 |
|---|---|---|
| `view-transition-name` 冲突 / 转场不播放 | 同页面有两个元素设置了相同的 `view-transition-name` | `view-transition-name` 全页面必须唯一；动态列表用 `hero-${id}` 形式 |
| React 状态更新不在转场帧内 | `setState` 是异步批量更新，在 `startViewTransition` 回调执行后才 flush | 在回调内用 `flushSync(() => setState(...))` 强制同步 |
| Firefox 不支持 | Firefox 143 及更早默认禁用 | 必须用 `if (document.startViewTransition)` 做降级（见片段） |
| 转场期间点击没反应 | View Transition 活跃期间页面不可交互 | 转场时长保持 300–400ms 以内；不在转场期间弹出 toast 等 |

### 降级（渐进增强）

```ts
function withViewTransition(updateFn: () => void) {
  if (!document.startViewTransition) {
    updateFn(); // 不支持时直接切换
    return;
  }
  document.startViewTransition(updateFn);
}
```

### 浏览器支持

Chrome 111+、Edge 111+、Safari 18+、Firefox 144+（143 默认禁用）。全球支持率约 93%（2026-11 数据）。详见：https://caniuse.com/view-transitions

### reduced-motion 支持

浏览器会自动应用 `@media (prefers-reduced-motion: reduce)` 到默认转场 CSS。自定义 `::view-transition-*` 动画时需手动加 reduced-motion 分支：

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

### 官方链接

- MDN：https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- caniuse：https://caniuse.com/view-transitions

---

## 6. Web Animations API（WAAPI）

### 何时用
- 需要 JS 控制播放 / 暂停 / 反向 / 速率（`.playbackRate`），不想引库
- 需要精确时间轴（`KeyframeEffect` + `AnimationTimeline`）
- CSS 动画已有但需要用 `getAnimations()` 统一管理或暂停
- 轻量场景：单个元素的一次性入场/出场

### 何时不用
- 需要复杂时间轴编排多个元素：用 GSAP
- 需要 spring / 物理感：GSAP / motion
- 需要布局动画（高度/位置变化）：motion 的 `layout`

### 最小可运行片段

```ts
function fadeInUp(el: HTMLElement): Animation {
  const anim = el.animate(
    [
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    {
      duration: 320,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards", // 动画结束后保持最终状态（但会占用层叠，需要善后）
    }
  );

  // 正确收尾：动画结束后 commitStyles + cancel
  // commitStyles 把最终样式写入 inline style，cancel 释放 WAAPI 占用
  anim.finished.then(() => {
    try {
      anim.commitStyles();
      anim.cancel();
    } catch {
      // cancel 后 finished 会 reject，此处 catch 防止报错
    }
  });

  return anim;
}

// 暂停 / 恢复
const anim = fadeInUp(document.querySelector(".hero")!);
anim.pause();
anim.play();
anim.reverse();
anim.playbackRate = 2; // 2× 速
```

### 版本陷阱

| 症状 | 触发条件 | 处理 |
|---|---|---|
| 动画结束后元素「冻结」在最终值，影响后续 CSS 层叠 | 使用 `fill: 'forwards'` 未善后 | 动画结束后调 `commitStyles()` + `cancel()`，将最终值写入 inline style 后清除 WAAPI 占用 |
| `animation.finished` 报 `AbortError` | 在 `finished` resolve 之前调了 `cancel()` | `finished` 在 `cancel()` 后 reject，务必 `.catch(() => {})` 或 try/catch |
| `composite: 'add'` 在 Safari 不生效 | Safari 部分版本对 `composite` 支持不完整 | 检查 caniuse；必要时降级为 `composite: 'replace'` |
| `KeyframeEffect` 关键帧百分比语法报错 | 旧版浏览器不支持对象数组形式 | 使用 `[{ offset: 0, ... }, { offset: 1, ... }]` 形式更兼容 |

### 与 CSS 动画的关系

CSS `@keyframes` 动画是 WAAPI 的语法糖，可用 `getAnimations()` 读取并统一操作：

```ts
// 暂停页面上所有正在播放的动画（reduced-motion 降级）
document.querySelectorAll("*").forEach((el) => {
  el.getAnimations().forEach((anim) => anim.pause());
});
```

### reduced-motion 支持

不原生支持，需手写：

```ts
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReduced) {
  fadeInUp(el);
} else {
  // 直接切换：只改 opacity，120ms
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: "forwards" })
    .finished.then(() => {
      (el as HTMLElement).style.opacity = "1";
    });
}
```

### 官方链接

- MDN：https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API

---

## 7. 图表库动效（Recharts / visx / ECharts）

> 核心规则：**不要自己 tween 路径**，用库自带动画。数据频繁刷新（间隔 <1s）时关闭动画。

### Recharts

```tsx
import { LineChart, Line } from "recharts";

<LineChart data={data}>
  <Line
    type="monotone"
    dataKey="value"
    isAnimationActive={true}      // 默认 true，刷新频繁时设 false
    animationDuration={400}       // ms
    animationEasing="ease-out"    // CSS easing 字符串
  />
</LineChart>
```

### ECharts

```js
echarts.init(el).setOption({
  animation: true,                    // 全局开关
  animationDuration: 400,             // 初始加载动画时长
  animationDurationUpdate: 300,       // 数据更新动画时长
  animationEasing: "cubicOut",
  animationEasingUpdate: "cubicInOut",
});
```

### visx

visx 本身无内置动画，需自行集成：

```bash
npm i @visx/react-spring
# 或配合 motion 做 path animate
```

```tsx
// 用 @visx/react-spring 的 AnimatedLinePath
import { AnimatedLinePath } from "@visx/react-spring";
```

### 规则汇总

- 数据刷新 <1s：Recharts 设 `isAnimationActive={false}`；ECharts 设 `animation: false`
- 不要用 GSAP / motion 直接操纵 SVG `<path>` 的 `d` 属性来做图表动画，图表库自己处理更高效
- 图表动画时长建议 300–500ms，保持与全站 §3 数值规范一致

---

## 8. 版本陷阱总表

| 库 | 症状 | 触发版本 / 条件 | 处理 |
|---|---|---|---|
| motion | `Module not found: 'framer-motion'` | v12 包名改为 `motion`，旧代码仍引 `framer-motion` | 新项目用 `motion/react`；旧项目保留原路径 |
| motion | `exit` 动画不播放 | 所有版本 | `exit` 只对 `AnimatePresence` 直接子元素生效 |
| motion | Next.js App Router hydration 报错 | App Router | 动画组件加 `"use client"` 或换 `motion/react-client` |
| motion | `layout` 动画抖动 | 所有版本 | `layout` 属性放到最外层运动元素，检查中间非 motion 层 |
| R3F | `WebGLRenderingContext is not defined` | SSR 场景（Next.js） | `dynamic(() => import('./Scene'), { ssr: false })` |
| R3F v9 | React 19 部分 API 不兼容 | R3F v9.8.0+ | v9.8.0 对 React 19.3 基本兼容但未完全支持所有新 API；生产前测试 |
| GSAP | Club 插件（SplitText / MorphSVG）安装报 401 | v3.12 及更早 | 升级到 v3.13+（自 v3.13 起全插件免费） |
| GSAP | StrictMode 下 tween 叠加 | React 18+ StrictMode | 用 `useGSAP()` 或 `gsap.context()` 保证 cleanup |
| GSAP ScrollTrigger | 触发点位置偏移 | 页面有异步加载图片 / 字体 | 资源加载完后调 `ScrollTrigger.refresh()` |
| three.js | `addons` 路径找不到 | 跨版本迁移（旧 `three/examples/jsm/...`，新 `three/addons/...`） | 在 React 中改用 drei，避免直接 import addons |
| @lottiefiles/dotlottie-react | WASM 加载失败 | `.wasm` MIME type 未配置 | 服务器确保 `application/wasm`；检查 Content-Security-Policy |
| @lottiefiles/dotlottie-react | 运行时体积过大 | 首屏引入 | 懒加载；动画资源 >100KB 单独评审 |
| WAAPI | 元素状态冻结影响后续 CSS | `fill: 'forwards'` 未善后 | 动画结束后 `commitStyles()` + `cancel()` |
| View Transitions | Firefox 不支持，直接报错 | Firefox 143 及更早 | `if (document.startViewTransition)` 必须做降级 |
| Tailwind v4 | `ease-*` token 命名变化 | Tailwind v4（新 CSS-first 配置） | v4 的 easing token 通过 CSS 变量定义，`ease-in-out` 等仍可用，但自定义值写法改为 CSS 变量；以当前项目 Tailwind 版本文档为准 |
| Next.js | SSR 直接 import 动画库报 `window is not defined` | 任何涉及 DOM API 的动画库 | 组件加 `"use client"` 或用 `dynamic` 动态导入 |
| Vue `<Transition>` | JS 钩子 `@enter` / `@leave` 回调里 `done` 未调用导致卡住 | 所有 Vue 版本 | JS 钩子必须调 `done()` 通知 Vue 动画结束；`css: false` 时尤其要注意 |
| Svelte transition | `transition:` 与 `in:/out:` 指令在 `{#if}` 块外不生效 | 所有 Svelte 版本 | transition 指令只在 `{#if}` / `{#each}` 块的直接子元素上生效 |

---

## 9. 官方链接汇总

| 库 | 文档 | 版本 / 更新日志 |
|---|---|---|
| motion（React） | https://motion.dev/docs/react | https://github.com/framer/motion/releases |
| motion（Vanilla JS） | https://motion.dev/docs/animate | 同上 |
| GSAP | https://gsap.com/docs/v3/ | https://gsap.com/docs/v3/GSAP/CHANGELOG/ |
| GSAP ScrollTrigger | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | 同 GSAP |
| three.js | https://threejs.org/docs/ | https://github.com/mrdoob/three.js/releases |
| React Three Fiber | https://r3f.docs.pmnd.rs/ | https://github.com/pmndrs/react-three-fiber/releases |
| drei | https://drei.docs.pmnd.rs/ | https://github.com/pmndrs/drei/releases |
| @lottiefiles/dotlottie-react | https://docs.lottiefiles.com/dotlottie-web/ | https://github.com/LottieFiles/dotlottie-web/releases |
| lottie-web（Airbnb） | https://github.com/airbnb/lottie-web | https://github.com/airbnb/lottie-web/releases |
| View Transitions API | https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API | https://caniuse.com/view-transitions |
| Web Animations API | https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API | https://caniuse.com/web-animation |
| bundlephobia（体积查询） | https://bundlephobia.com | — |
