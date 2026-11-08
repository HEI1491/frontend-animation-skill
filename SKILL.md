---
name: frontend-animation
description: >
  设计、实现、审查和优化前端动效。当用户要求做动画、加动效、页面转场、
  滚动动画、hover 反馈、加载动画、粒子或 3D 效果、视差、骨架屏过渡、
  数字滚动，或提到 Framer Motion、motion、GSAP、ScrollTrigger、Three.js、
  React Three Fiber、Lottie、View Transitions、Web Animations API、
  CSS transition/animation、spring、easing 时使用。
  触发词：动画、动效、转场、过渡、入场、出场、滚动效果、视差、
  微交互、弹性、缓动、粒子、3D、animation、motion、transition、
  animate、easing、spring、stagger、parallax、keyframes。
---

# 前端动效

你负责设计、实现、审查、优化前端动效。默认假设项目是 React + TypeScript；纯 JS 或其他框架按项目现状，不把 React 方案强加给 Vue 或原生项目。
动效是增强，不是装饰：先保证静态版本好看、能用，再叠加动效。
未经用户确认，不得新增任何依赖。

## §0 动手前必做：依赖与设计系统探测

动手前按顺序完成五步；任何一步缺失，先补探测再写代码。

1. 读 `package.json`，并读 `pnpm-lock.yaml` / `package-lock.json` / `yarn.lock` 里实际锁定的版本，确认已装动画库及其大版本。
2. 读 `tailwind.config.*`、全局样式（`globals.css` / `index.css` / `app.css`）、theme 文件，找出现有 token、时长、缓动与命名。
3. 有 motion 就不用 GSAP，有 GSAP 就不加 motion；同一需求不允许两个库并存。
4. 不得擅自新增依赖。确需新增时，先说明包名、min+gzip 体积量级、替代方案、为什么现有库做不到，等用户确认后再装。
5. 沿用项目已有的命名、文件组织、代码风格与 token 名，不引入第二套动效体系。

| 探测到什么 | 默认怎么做 |
|---|---|
| 已有 motion | 交互、进出场、布局动画全部走 motion，不引入 GSAP |
| 已有 framer-motion 旧版 | 沿用现有包名与 API，不擅自迁移到 motion；升级单独提、单独做 |
| 已有 GSAP | 时间轴与滚动联动走 GSAP + ScrollTrigger；简单 hover 仍用 CSS transition，不加 motion |
| 只有 Tailwind | 用 `transition` / `duration` / `ease` 原子类配合全局 CSS 变量，不装库 |
| 纯 CSS 项目 | 只用 CSS transition/animation + WAAPI，不装 JS 动画库 |
| Next.js App Router | 动画组件标 `"use client"`；View Transitions 与 motion 按客户端组件处理，不做跨路由共享状态 hack |
| Vue | 用原生 CSS 或 Vue 生态的 motion 方案，不把 React 专用库硬塞进去 |

## §1 反模式清单（不可违反）

逐条对照；命中任意一条即退回重写，不做「这次先这样」的妥协。

| 禁止 | 替代 |
|---|---|
| `transition: all .3s` | 显式列出 `transform, opacity`，必要时加 `color` |
| 全站统一 `ease-in-out` | 按进场/出场/双向三种语境选曲线（见 §3） |
| 元素从 `opacity: 0` + `scale(.8)` 弹入 | `opacity: .9→1` + `translateY(8px)→0` |
| 无脑 `linear` | 仅进度条与无限循环装饰可用 |
| 同一屏同时有 3 个以上元素在动 | 只保留 1 个视觉焦点，其余静止或极弱 |
| hover 用 `transform: translateY(-4px)` 但父容器无预留空间 | 用 `scale` 或给父级 `padding` 预留 |
| 只做进场不做出场 | 必须成对设计，且出场快于进场 |
| 大面积 `filter: blur()` / `drop-shadow` 做动画 | 改用预渲染模糊图层，或降低动效范围 |
| 动画层覆盖 CTA / 表单 | 动效层 `pointer-events: none`，或避开交互区 |
| 页面首屏 loading 动画超过 1.5s | 超过则先给骨架屏 |
| 自定义光标 + 拖尾（除非用户明确要求） | 不做 |
| 给每个列表项都加逐字/逐帧复杂动画 | 用 30–50ms stagger 的整体位移即可 |
| 用 `setTimeout` 串联动画 | 用 transition/animation 事件、`onAnimationComplete`、timeline |
| 逐帧 `el.style.left = x` | WAAPI / rAF / 库的 timeline |

阈值理由：首屏等待超过 1.5s，用户开始怀疑页面卡死，所以先给骨架屏；同屏超过 3 个独立运动时视觉焦点失效，用户不知道该看哪里。

## §2 选型决策树（精简版）

先查表定方案，再进 §3 定数值，最后才写代码。

| 场景 | 首选 | 不该用 |
|---|---|---|
| hover / press / toggle 反馈 | CSS transition | GSAP（过重） |
| 组件进出、列表增删、布局变化 | motion（`AnimatePresence` + `layout`） | 手写 height 动画 |
| 路由/页面转场 | View Transitions API，或 motion `layoutId` | 全屏遮罩 + 延时 |
| 复杂时间轴、序列编排、滚动联动 | GSAP + ScrollTrigger | CSS keyframes 堆砌 |
| 3D / 粒子 / 物理 / shader | three.js + React Three Fiber + drei | 用 CSS 假装 3D |
| 设计师给的矢量动画 | dotLottie / Lottie | 转成 GIF |
| 简单图标或路径动画 | SVG + CSS | 引入 Lottie 运行时 |
| 数据图表动效 | 库自带动画（如 Recharts/visx 的 transition） | 自己 tween 路径 |
| 背景装饰（网格/波浪/光晕） | CSS 或 canvas + `requestAnimationFrame`，且可暂停 | three.js（除非真要 3D） |
| 数字/金额变化 | `tabular-nums` + 简单 tween | 逐帧重排布局 |

完整选型逻辑、提问顺序与「CSS → 轻库 → 重库」升级阶梯见 references/decision-tree.md。

## §3 数值规范（不许凭感觉）

所有时长、曲线、幅度从下表取值；表里没有的值，先论证再新增。

**时长**

| 项 | 值 |
|---|---|
| hover / press | 120–180ms |
| toggle / 展开收起 | 200–300ms |
| 进场 | 240–400ms |
| 出场 | 进场时长 × 0.6–0.7 |
| 页面转场 | 300–500ms |
| 布局重排（layout 动画） | 300–500ms |
| stagger 间隔 | 30–50ms，整组总时长 ≤ 500ms |
| 超过 600ms | 必须能说明理由，否则砍掉 |

**缓动**

| 缓动 | 曲线 |
|---|---|
| 进场 | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 出场 | `cubic-bezier(0.4, 0, 1, 1)` |
| 双向/状态切换 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 位移/拖拽/手势 | spring: stiffness 300–500，damping 30–40 |
| linear | 仅进度条、无限循环装饰 |

**幅度**

| 幅度 | 值 |
|---|---|
| 位移 | 微 4–8px / 中 12–24px / 大 32–64px / >80px 仅全屏转场 |
| 透明度 | 微交互 `.9→1`；进场 `.6→1`；`0→1` 仅全屏遮罩与模态 |
| 缩放 | 仅 `0.96–1.04` 区间 |

**Spring**

| 参数 | 值 | 理由 |
|---|---|---|
| stiffness | 300–500 | 低于 300 迟钝，高于 500 抖动像故障 |
| damping | 30–40 | 低于 30 回弹过头，高于 40 没有回弹感 |
| mass | 0.8–1 | 惯性可感知的最小改动 |

区间理由，一句话一条：

- hover / press 120–180ms：低于 120ms 读不出状态变化，高于 180ms 反馈迟滞，用户以为点空了。
- 进场 240–400ms：低于 240ms 读不出位移方向，高于 400ms 用户已经开始等待。
- 出场 × 0.65：离开不需要被看清，慢就是拖沓。
- stagger 30–50ms：低于 30ms 像同时出现，高于 50ms 整组越过 500ms 的耐心线。

这些值已落成 CSS 变量与 TS 常量，见 references/tokens.md；所有代码引用 token，禁止硬编码数字。

## §4 性能与可访问性红线

1. 只动画 `transform` / `opacity`；要动画尺寸用 FLIP 或库的 `layout` 能力。
2. 会持续动画的层加 `will-change: transform`，动画结束后移除。
3. 长列表虚拟化；离屏元素用 IntersectionObserver 暂停。
4. `prefers-reduced-motion: reduce` 是必做分支，不是可选加分项。降级后仍要有清晰的状态变化：通常退化为 ≤120ms 的 opacity 交叉淡入（120ms 足够读出状态切换，又不构成需要被理解的动画），或直接切换。
5. 不使用 3 次/秒以上的闪烁（WCAG 2.3.1 的光敏性阈值就是每秒 3 次）。
6. 动画期间不夺取焦点、不打乱 tab 顺序；键盘焦点环不参与动画。
7. 设计时按「静态版本也好看」来构图，动效只是增强。

WCAG 条款、aria-live、测试方法见 references/accessibility.md。

## §5 实现铁律

- 进出场成对设计，且出场更快。
- 一屏只留一个视觉焦点。
- stagger 用 30–50ms，整组不超过 500ms。
- 装饰动效层必须 `pointer-events: none`。
- 用 transition/animation 事件、`onAnimationComplete` 或 timeline 串联，禁止 `setTimeout`。
- CSS 或 Framer 能做的不用 GSAP。
- 能用 `transform` 就不动画 `width` / `height`。
- 动画时长进设计评审，不靠「感觉慢一点」口头调。
- 先减后加：能删的动效先删，删不掉的再优化。

## §6 审查模式

审查现有动效时，每条按固定四段输出：

`问题 / 依据（引用 §1–§4 的条款）/ 建议代码 / 影响（时长、性能、可访问性）`

规则：

- 只报真问题。不为凑数改写本来合理的实现。
- 最多 8 条，按严重度排序：可访问性 > 性能 > 时长/曲线 > 风格。
- 结尾写一段「这些地方是对的」，列 1–3 条，避免用户把合理实现误改掉。

扫描命令（只读，不提供 `--fix`；任何自动改动画都会破坏设计意图）：

`node ~/.claude/skills/frontend-animation/scripts/audit-animation.mjs <项目目录> --json`

脚本只报告问题与位置，修复由人决定。

## §7 需要 X 时读什么

| 症状/需求 | 文件 |
|---|---|
| 不知道用 CSS 还是库、要在框架间选、要按顺序提问 | references/decision-tree.md |
| 要落 token、接 Tailwind、写 CSS 变量或 TS 常量 | references/tokens.md |
| 查 motion / GSAP / three.js+R3F / Lottie / View Transitions 的安装、API、版本陷阱 | references/libraries.md |
| 要现成模板（列表进场 / 路由转场 / 拖拽 / 鼠标跟随 / 数字滚动 / 3D 翻转 / 循环背景 / 骨架屏 / 磁吸按钮 / Lottie） | references/patterns.md |
| 选缓动曲线、要 spring 的 linear() 近似、解释某条曲线为什么 | references/easing.md |
| reduced-motion 降级、WCAG、闪烁与焦点、测试方法 | references/accessibility.md |
| 要一份带完整 reduced-motion 分支的参考组件 | assets/template-component.tsx |
| 要扫描现有代码里的动画问题 | scripts/audit-animation.mjs |

## §8 提交前自检（8 问，逐条作答）

1. 这个动效必要吗？去掉后静态版本仍然好看吗？
2. 是否只动 transform / opacity？
3. 时长、曲线、幅度是否都在 §3 内？
4. 进出场是否成对，出场是否更快？
5. reduced-motion 是否有分支，降级后状态是否仍可辨？
6. 是否新增了依赖？未经确认即违规。
7. 是否有 >3 次/秒闪烁、是否在动画期间抢焦点？
8. 一屏是否只有一个视觉焦点？

有一问答不上来，就停下修，不提交。