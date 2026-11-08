# 动效决策树：从「该不该做」到「用什么库」

这份文档回答三个问题：该不该做动效、用什么库、先问什么。SKILL.md 里只有精简表；这里是完整逻辑与问卷。

## 0. 先问三个问题

依次回答。任意一问答否，停止、不做。

**Q1：去掉这个动效，界面还能表达同样的信息吗？**

能 → 不做。动效是增强，不是救场。如果没有动效用户已经能理解界面在发生什么，那加动效只是炫技。例子：按钮 hover 时变色，去掉颜色变化后按钮还是可点击的、用户理解没变，所以可以加 hover 动效；但如果某个错误状态只靠「抖动」来传达，没有文字或图标补充，那就是用动效遮丑，应该先改版式。

**Q2：它在传达状态变化，还是在装饰？**

状态变化（显示/隐藏、开/关、激活/未激活、加载中/完成）必须做、必须清晰。装饰（背景网格摇晃、光晕脉动、图标旋转但无语义）必须可关闭——用户设置了 `prefers-reduced-motion: reduce` 或在低端设备上，装饰动效要能完全关掉，不能让用户被强制看。

**Q3：静态版本好看吗？**

不好看 → 先改版式，不要用动效遮丑。例子：按钮没有悬停视觉反馈，你想加一个快速闪烁让它「看起来有反应」。错。应该先给按钮足够的对比度与明显的颜色变化，再加动效。动效是锦上添花，不是雪中送炭。

---

## 1. 升级阶梯（Escalation ladder）

从轻到重，每一级都有「够用的条件」「不该越级的信号」「越级代价」。核心规则：**能用上一级解决的，不用下一级**。

### 级别 0：没有动效

**够用的条件**：状态变化已经清晰（色彩对比、尺寸差异、文案提示）；界面交互流畅，无需拟物反馈。

**不该越级的信号**：无。

**代价**：无。可访问性 100%，性能 100%。

---

### 级别 1：CSS transition

**够用的条件**：
- 属性变化是一次性的（hover、click、class 切换），不需要暂停或打断。
- 变化涉及 `opacity`、`transform` 两种属性，时长 120–300ms。
- 不涉及复杂的序列或时间线（多个元素依序进场）。

示例：按钮 hover 时背景色变化 + 微 scale；表单聚焦时 border 变色；toggle 开关 160ms 内切换状态。

**不该越级的信号**：
- 需要暂停、反向或打断（用户滑走 hover、动画中途按 Escape 关闭弹窗）。
- 需要同时控制 3 个以上的元素。
- 需要根据滚动位置或时间戳编排。

**越级代价**：无。CSS transition 无运行时成本。

**给出完整片段**：
```css
.button {
  transition: transform var(--dur-fast) var(--ease-both),
              background-color var(--dur-fast) var(--ease-both);
}
.button:hover {
  background-color: hsl(220, 90%, 50%);
  transform: translateY(-2px);
}
```

---

### 级别 2：CSS animation + @keyframes

**够用的条件**：
- 动画需要循环播放或分多个阶段（无限转圈、加载进度 0→50→100）。
- 无需 JS 控制，一旦开始就让它播完。
- 装饰类（背景波浪、网格闪烁），允许 `prefers-reduced-motion` 下禁用。

示例：加载圈无限旋转；骨架屏背景闪烁；无限循环的渐变背景。

**不该越级的信号**：
- 需要在特定时刻暂停或快进。
- 需要根据用户输入（拖拽进度）动态改变。
- 需要与其他动画同步（两个元素的离开和进入要无缝衔接）。

**越级代价**：无。CSS animation 无运行时成本。

**给出完整片段**：
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.loader {
  animation: spin var(--dur-slower) var(--ease-progress) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .loader {
    animation: none;
    opacity: 0.6;
    /* 改为静态进度文案或脉动 */
  }
}
```

---

### 级别 3：Web Animations API（WAAPI）

**够用的条件**：
- 需要 JS 控制（暂停、续播、反向）。
- 绑定到 DOM 事件或用户手势。
- 轻量动画，不涉及复杂的时间线编排。

示例：点击按钮时播放一个「按下」的脉动；手指松开时立刻停止。不必引入库，WAAPI 即可。

**不该越级的信号**：
- 需要同时协调 5 个以上的元素或多条轨道。
- 需要条件分支（根据加载状态选择不同的结束位置）。

**越级代价**：浏览器支持接近 100%；开发体验逊于库（手写 keyframes 数组）。

**给出完整片段**：
```javascript
const box = document.querySelector('.box');
const animation = box.animate(
  [
    { transform: 'scale(1)', offset: 0 },
    { transform: 'scale(1.1)', offset: 0.5 },
    { transform: 'scale(1)', offset: 1 },
  ],
  {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  }
);

// 暂停
animation.pause();

// 续播
animation.play();

// 反向
animation.reverse();
```

---

### 级别 4：motion（React）或 Framer Motion

**够用的条件**：
- React 组件动效，涉及组件挂载/卸载（`AnimatePresence`）。
- 列表项依次进场，用 stagger。
- 布局变化时平滑过渡（`layout` prop）。
- Spring 物理感（手势拖拽、弹性回弹）。

示例：弹窗进场、离场；列表增删项；拖拽排序。

**不该越级的信号**：
- 只是简单 hover 反馈（用 CSS transition）。
- 无 React 项目（有 Vue、纯 JS、Angular 用对应生态）。
- 需要跨路由共享元素位置（用 View Transitions API，不用 motion）。

**越级代价**：包体积 ~70KB（gzip），运行时每帧计算一个三次贝塞尔曲线，性能足够但不如 CSS 免费。

**给出完整片段**（进出场 + stagger）：
```tsx
import { motion, AnimatePresence } from 'motion/react';
import { duration, ease, distance, stagger } from '@/lib/motion-tokens';

export function List({ items }) {
  return (
    <AnimatePresence mode="wait">
      <motion.ul layout>
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -distance.md }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -distance.md }}
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
    </AnimatePresence>
  );
}
```

---

### 级别 5：GSAP + ScrollTrigger

**够用的条件**：
- 需要复杂的时间线编排（多个元素依序、并行、错开播放）。
- 滚动驱动的动画（进度条、视差、钉住元素）。
- SVG 路径动画、文字逐字 (SplitText)。
- 打断与恢复（动画中途 `kill()` 然后重新调用）。

示例：5 个卡片轮流进场，第 2 个卡片进场时第 1 个慢慢淡出；滚动到某个位置时一个数字从 0 数到 1000；SVG 路径描边 + 填充顺序播放。

**不该越级的信号**：
- motion 或 CSS animation 能做（已有 React 项目、简单 stagger）。
- 只是单个元素的转场（用级别 4）。
- 动画与滚动绑定但只是进出场（用 `whileInView` + motion，不用 ScrollTrigger）。

**越级代价**：包体积 ~50KB（gzip），性能取决于轨道复杂度。ScrollTrigger 在低端机表现可能不稳定。

**给出完整片段**（基础时间线）：
```javascript
import gsap from 'gsap';

const timeline = gsap.timeline();
timeline
  .to('.card-1', { opacity: 1, duration: 0.24, ease: 'cubic-bezier(0.16,1,0.3,1)' }, 0)
  .to('.card-2', { opacity: 1, duration: 0.24, ease: 'cubic-bezier(0.16,1,0.3,1)' }, 0.04)
  .to('.card-3', { opacity: 1, duration: 0.24, ease: 'cubic-bezier(0.16,1,0.3,1)' }, 0.08);

// 滚动驱动（需要 ScrollTrigger）
gsap.registerPlugin(ScrollTrigger);
gsap.to('.element', {
  scrollTrigger: {
    trigger: '.element',
    start: 'top center',
    end: 'bottom center',
    scrub: 1, // 与滚动条 1:1 绑定
  },
  opacity: 1,
});
```

---

### 级别 6：three.js + React Three Fiber

**够用的条件**：
- 3D 几何体、光照、相机变换。
- 大规模粒子系统（>1000 粒子）。
- 自定义 shader。
- 实时渲染与用户输入联动（鼠标拖拽旋转、滚动放大）。

示例：3D 产品展示转台；粒子爆炸效果；需要透视投影的几何变换。

**不该越级的信号**：
- 伪 3D（CSS 3D transform 或 SVG perspective）足够了。
- 不需要动态光照或材质变化。
- 低端机兼容性要求高。

**越级代价**：包体积 three.js ~200KB，React Three Fiber ~50KB（都 gzip）。帧率要求高，低端机 30fps 以下体验很差。

**给出完整片段**（cube 旋转）：
```tsx
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function Cube() {
  const mesh = useRef(null);
  useFrame(() => {
    if (mesh.current) mesh.current.rotation.x += 0.01;
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas>
      <Cube />
    </Canvas>
  );
}
```

---

## 2. 完整决策树

从「触发源」开始分支。使用缩进列表表示逻辑流。

```
触发源
│
├─ 状态变化（按钮颜色、输入框 border、toggle 开关）
│  └─ 时长 <300ms，只涉及 transform/opacity
│     └─ 用 CSS transition
│
├─ 元素出现/消失（弹窗、Toast、列表增删）
│  ├─ React 组件
│  │  └─ 用 motion + AnimatePresence
│  └─ 纯 JS/其他框架
│     └─ 用 WAAPI 或 CSS animation
│
├─ 布局位置变化（排序、网格重排、响应式调整）
│  ├─ 同一份 DOM，位置改变（无新增删除）
│  │  └─ 用 motion `layout` prop 或 FLIP 技巧
│  └─ 跨路由保留元素位置
│     └─ 用 View Transitions API
│
├─ 滚动驱动（进场、视差、进度条与滚动绑定）
│  ├─ 简单进出场（元素滚入视野时淡入）
│  │  └─ 用 motion `whileInView` 或 IntersectionObserver
│  ├─ 钉住元素与滚动条 1:1 绑定
│  │  └─ 用 GSAP ScrollTrigger（注明尚未全量浏览器支持，见 references/accessibility.md）
│  └─ CSS scroll-driven animations（scroll-timeline）
│     └─ 注意：caniuse 显示支持度不足 50%，必须有降级方案
│
├─ 手势/交互（拖拽、滑动、长按）
│  ├─ 简单拖拽与 spring 回弹
│  │  └─ 用 motion `drag` + spring
│  └─ 复杂手势识别（识别手势方向、速度）
│     └─ 用原生 Pointer Events + 自建状态机，或引入手势库（Hammer.js）
│
├─ 时间轴序列（多元素编排、SVG 路径、文字逐字）
│  ├─ 简单 stagger（每个元素延迟进场）
│  │  └─ 用 motion + stagger 参数
│  ├─ 复杂时间线（元素 A 播完后才播 B，B 播到 50% 时插入 C）
│  │  └─ 用 GSAP timeline
│  └─ 文字逐字或 SVG 路径描边
│     └─ 用 GSAP SplitText（3.13 起免费）或 SVG + GSAP morphing
│
├─ 3D/shader/粒子
│  └─ 用 three.js + React Three Fiber + drei
│
├─ 矢量播放（Figma/Adobe 导出的动画）
│  └─ 用 dotLottie 或 Lottie
│
└─ 图表数据变化
   └─ 用图表库自带过渡（Recharts、visx、D3）
```

---

## 3. 场景选型表（完整版）

在 SKILL.md 的 10 行基础上扩到 18 行。每行包含「场景」「首选」「为什么」「最小实现骨架」「替代方案」。

| 场景 | 首选 | 为什么 | 最小骨架 | 替代方案 |
|------|------|--------|---------|---------|
| 按钮 hover 反馈 | CSS transition | 无 JS 开销，hover 状态浏览器原生处理 | `.btn:hover { transition: transform 160ms cubic-bezier(...); transform: translateY(-2px); }` | motion（过重） |
| 表单聚焦变色 | CSS transition | 同上，`:focus-visible` 伪类原生支持 | `input:focus-visible { transition: border-color 160ms; border-color: blue; }` | WAAPI |
| 组件进出场（React） | motion + AnimatePresence | 内置卸载时的动画处理，焦点管理，组件库无缝整合 | Pattern #1 见 references/patterns.md | 手写 WAAPI（易漏焦点管理） |
| 列表 stagger 入场 | motion + stagger 参数 | 原生支持多元素时序，控制整组时长 ≤500ms | Pattern #1 | GSAP timeline（简单需求过重） |
| 路由/页面转场 | View Transitions API | 浏览器原生，跨路由共享元素位置无需手写 | `document.startViewTransition(() => navigate(...))` | motion layoutId（需手写路由hook） |
| 复杂时间轴（5+ 元素） | GSAP timeline | 原生支持时间戳、相对播放、条件分支 | Pattern #6（时间轴编排） | motion + delay 串联（易超 500ms） |
| 滚动进度绑定 | GSAP ScrollTrigger | 原生 `scrub` 参数与滚动条 1:1 同步 | 见 Pattern #X（ScrollTrigger 示例待补） | CSS scroll-timeline（支持度 <50%，需降级） |
| SVG 路径动画 | GSAP MorphSVG（免费） | 原生支持路径形变与描边动画 | 见 references/libraries.md GSAP 部分 | 手写 SVG path 插值（易出错） |
| 文字逐字 / 逐行 | GSAP SplitText（免费） | 自动拆分，原生支持 stagger | 见 Pattern #5（数字滚动相近） | CSS 手动包装（代码臃肿） |
| 数字/金额变化 | 简单 tween（motion 或 GSAP） | 无需重排布局，只改文本内容 | Pattern #5 | 逐帧改 DOM（导致重排） |
| 背景装饰循环 | CSS animation | 无 JS 开销，`infinite` 原生支持 | `@keyframes wave { ... } .bg { animation: wave 4s linear infinite; }` | 取决于效果复杂度；`prefers-reduced-motion` 下必须可关 |
| 加载圈旋转 | CSS animation | 同上，装饰类允许关闭 | Pattern #3（见 references/patterns.md） | WAAPI（无必要） |
| 3D 产品展示 | three.js + R3F | 原生支持透视、光照、相机 | Pattern #9（3D 翻转卡片） | CSS 3D transform（仅伪 3D，无光照） |
| 粒子爆炸 | three.js + PointsMaterial | 原生支持大规模实例化渲染 | 见 references/libraries.md 中 three.js 部分 | Canvas 2D（性能受限） |
| 设计师给的 JSON 动画 | dotLottie 或 Lottie | 直接读设计源文件，无需手写关键帧 | 见 references/patterns.md Pattern #10 | 手转 GIF（无法控制） |
| 图表柱状图增长 | 图表库自带 transition | 数据驱动，与图表库一体 | Recharts: `<BarChart> + animationBegin/animationDuration` | 自己 tween 路径（易丧失数据绑定） |
| 骨架屏加载 | motion + CSS 脉动 | AnimatePresence 管理卸载，脉动用 CSS 装饰 | Pattern #8 | 只用 CSS animation（无法同步内容加载状态） |

---

## 4. 库共存规则

一个功能只用一个库；库间有明确边界。

**motion 与 GSAP**：可共存，但不许同一元素两套驱动。边界规则：
- 组件动效、进出场、React 组件内部状态 → motion
- 时间轴、滚动编排、SVG 路径、多轨道编排 → GSAP
- 简单 hover（无 React）→ CSS transition

示例（正确）：
```tsx
// React 组件用 motion
<motion.div initial={{ x: -100 }} animate={{ x: 0 }} />

// 页面级时间轴用 GSAP（在 useEffect 里初始化）
useEffect(() => {
  gsap.timeline()
    .to('.card-1', { opacity: 1, duration: 0.24 })
    .to('.card-2', { opacity: 1, duration: 0.24 }, 0.04);
}, []);
```

示例（错误）：
```tsx
// 同一元素既用 motion 又用 GSAP
<motion.div animate={{ x: 100 }} />
gsap.to(divRef, { x: 200 }); // 冲突！哪个生效？
```

**已有 framer-motion 旧包**：沿用旧导入 `from 'framer-motion'`，不擅自改包名。新增功能或用户同意升级后再迁移到 `motion`。

**已有 GSAP 3.13+**：插件已全部免费商用（SplitText、MorphSVG）。但仍不得为了一个 hover 反馈引入 GSAP，那样得不偿失。

---

## 5. 不该做动效的场景

8 条硬限制。违反任意一条即删除、改用文案/图标。

1. **表单校验错误**：用红色 border + 错误文案，不用抖动或闪烁。抖动会加重焦虑感（WCAG 2.3.1 光敏性风险）。
2. **破坏性操作确认**：删除、清空、退出登录等。用模态对话框 + 两个按钮，不用「确认时淡出」的延迟感，用户需要立刻反馈。
3. **高频数据刷新**（秒级或毫秒级）：股票行情、实时日志、聊天消息。每个新消息都做一个进场动画会导致屏幕不断闪烁，用户看不清内容。用 `aria-live="polite"` 播报更新，不做视觉动画。
4. **用户正在输入**：输入框聚焦后不能再做动画，会干扰光标位置感知。一旦 focus，动画全关。
5. **系统级导航的返回**：浏览器返回按钮、面包屑点击返回。不做淡出再淡入，直接跳转。用户已经有「返回」的心理预期，等待动效会产生卡顿感。
6. **打印样式**：`@media print` 下 `display: none` 所有动效层。打印版本需要时间线清晰，动画会干扰。
7. **reduced-motion 下的装饰层**：用户明确关闭了动效，你还在硬塞 `animation: none !important` 的底层处理中发现某个装饰仍在闪，这是无障碍失败。见 references/accessibility.md。
8. **低端设备 / 省电模式**：检测 `navigator.connection?.saveData` 或帧率（连续两帧 >50ms），降级到「无动效」或「极弱动效」（见 references/accessibility.md）。后台标签页用 `document.visibilitychange` 暂停。

---

## 6. 决策记录模板

把「为什么选这个方案」写进 PR 描述或代码注释。每份决策用这个模板记录。

```yaml
# 场景（触发源、用户行为）
scenario: 用户点击「删除」按钮，弹窗进场

# 选择的库
library: motion + AnimatePresence

# 为什么不是别的
rationale: |
  - 不用 CSS animation：需要 JS 控制卸载时的动画，CSS 无法达成
  - 不用 GSAP：只有一个元素，timeline 过重
  - 不用 WAAPI：React 组件，组织 WAAPI 手写易漏焦点管理

# 时长与曲线
duration: 240ms
easing: cubic-bezier(0.16, 1, 0.3, 1)

# 降级策略
reduced_motion_fallback: |
  prefers-reduced-motion: reduce 下，时长改为 1ms，
  保留 opacity 变化（0.6→1）防止瞬间闪现

# 性能预期
perf: 60fps on mid-range device，无布局抖动
```

在 PR 或代码注释里粘贴这个模板，填空即可。示例：

```tsx
// 决策记录：列表项 stagger 进场
// 场景：加载完毕，列表项依次出现
// 库：motion + AnimatePresence + stagger
// 时长：240ms 基准 + 40ms stagger
// 曲线：cubic-bezier(0.16, 1, 0.3, 1)
// 降级：prefers-reduced-motion 下 1ms 瞬间显示 + opacity 0.6→1

<motion.li
  initial={{ opacity: 0, y: distance.md }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -distance.md }}
  transition={{ duration: duration.base, ease: ease.enter, delay: i * stagger.step }}
/>
```

---

## 7. 反例（三个真实感错误）

### 反例 1：用 GSAP 做一个简单按钮 hover

```jsx
// 错误：为了一个 hover 引入 50KB 库
import gsap from 'gsap';

function Button() {
  const ref = useRef(null);
  
  return (
    <button
      ref={ref}
      onMouseEnter={() => gsap.to(ref.current, { scale: 1.05, duration: 0.16 })}
      onMouseLeave={() => gsap.to(ref.current, { scale: 1, duration: 0.16 })}
    >
      Click me
    </button>
  );
}
```

**问题**：JS 事件处理 hover，包体积 +50KB（gzip），运行时每帧计算贝塞尔曲线。

**正确做法**（CSS）：
```css
.button {
  transition: transform var(--dur-fast) var(--ease-both);
}
.button:hover {
  transform: scale(1.05);
}
```

**代价对比**：
- 错误版：+50KB 包体积，每个 hover 都要 JS 事件 + 动画引擎
- 正确版：0 字节额外代码，hover 由浏览器处理，99% 场景下性能 +100%

---

### 反例 2：用 setTimeout 串联 4 个元素进场

```jsx
// 错误：setTimeout 串联动画
function CardList() {
  const [show, setShow] = useState([false, false, false, false]);
  
  useEffect(() => {
    let delay = 0;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        setShow(prev => { prev[i] = true; return [...prev]; });
      }, delay);
      delay += 100; // 每个卡片延迟 100ms
    }
  }, []);
  
  return show.map((visible, i) => (
    visible && <Card key={i} />
  ));
}
```

**问题**：
- 每个 setState 触发一次重排。4 个卡片 = 4 次重排。
- setTimeout 与 React 状态更新无法保证同步（组件卸载时 timer 继续运行）。
- 如果用户快速导航走，timer 会继续执行，报警告。
- 无法暂停或打断。

**正确做法**（motion + stagger）：
```tsx
import { motion } from 'motion/react';
import { stagger } from '@/lib/motion-tokens';

function CardList() {
  return (
    <motion.div>
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * stagger.step }}
        >
          <Card />
        </motion.div>
      ))}
    </motion.div>
  );
}
```

**代价对比**：
- 错误版：4 次重排，timer 内存泄漏风险，代码 30 行
- 正确版：1 次重排，motion 自动清理，代码 15 行，且支持暂停

---

### 反例 3：用 CSS keyframes 手写 12 个元素滚动进场

```css
/* 错误：手写 12 个元素的 keyframes */
.list-item-1 { animation: enter-1 0.24s cubic-bezier(...) 0s; }
.list-item-2 { animation: enter-2 0.24s cubic-bezier(...) 0.04s; }
.list-item-3 { animation: enter-3 0.24s cubic-bezier(...) 0.08s; }
/* ... 重复 9 次 */

@keyframes enter-1 { from { opacity: 0; y: 16px; } to { opacity: 1; y: 0; } }
@keyframes enter-2 { from { opacity: 0; y: 16px; } to { opacity: 1; y: 0; } }
@keyframes enter-3 { from { opacity: 0; y: 16px; } to { opacity: 1; y: 0; } }
/* ... 重复 9 次 */
```

**问题**：
- CSS 文件臃肿（36 行规则）。
- 改时长要手改 12 个地方。
- 新增元素要新增 keyframe 和 class。
- 无法动态改变元素数量。

**正确做法**（motion 或 GSAP）：
```tsx
// motion：列表长度改变时自动适配
<motion.ul>
  {items.map((item, i) => (
    <motion.li key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} />
  ))}
</motion.ul>
```

**代价对比**：
- 错误版：CSS 36 行，维护困难，无法响应动态列表
- 正确版：JSX 4 行，自适应列表长度，改时长一处搞定

---

结论：升级阶梯的核心是「按需选用，不越级」。能用 CSS 就用 CSS，能用 motion 就不用 GSAP，能用 GSAP timeline 就不用手写 setTimeout。每一级都有其最优应用场景，混用会导致代码膨胀与维护成本增加。
