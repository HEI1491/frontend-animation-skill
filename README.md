# 前端动效 Skill

Claude 动效设计、实现、审查、优化的完整规范与工具集。一份让动画脱离廉价感的 Skill：统一 token 系统 + 8 条反模式规则 + 10 个可复用模板 + 零依赖审计脚本。

## 功能

- **§0 动手前探测** — 读 package.json、锁文件、Tailwind 配置，确认已装库版本
- **§1 反模式清单** — 8 条硬规则，命中即退回重写
- **§2 选型决策树** — CSS → WAAPI → motion → GSAP → three.js 升级阶梯
- **§3 数值规范** — 时长 / 曲线 / 幅度 / Spring 全部有据可查
- **§4 性能与可访问性** — `prefers-reduced-motion` 是必做分支，不是加分项
- **§5 实现铁律** — 进出场成对、一屏一焦点、禁止 setTimeout 串联
- **§6 审查模式** — 固定四段输出格式，最多 8 条按严重度排序
- **§7 参考文档索引** — 7 份专项文档按症状索引
- **§8 提交前自检** — 8 问逐条作答，有一问答不上就停

## 文件结构

```
frontend-animation-skill/
├── SKILL.md                        # 主规范（必读）
├── references/
│   ├── decision-tree.md            # 完整决策树与升级阶梯
│   ├── tokens.md                   # CSS 变量与 TS 常量
│   ├── libraries.md                # 库速查（motion / GSAP / three.js / Lottie / View Transitions / WAAPI）
│   ├── patterns.md                 # 10 个完整模板
│   ├── easing.md                   # 缓动曲线详解与 spring 转 CSS
│   └── accessibility.md            # reduced-motion / 光敏性 / 焦点 / 语义播报
├── assets/
│   └── template-component.tsx      # 带完整 reduced-motion 分支的参考组件
└── scripts/
    └── audit-animation.mjs         # 零依赖动画反模式扫描工具
```

## 安装

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/HEI1491/frontend-animation-skill/main/install.sh | bash
```

### Windows（PowerShell）

```powershell
irm https://raw.githubusercontent.com/HEI1491/frontend-animation-skill/main/install.ps1 | iex
```

### 手动安装

```bash
git clone https://github.com/HEI1491/frontend-animation-skill.git \
  ~/.claude/skills/frontend-animation
```

## 使用

在 Claude Code 中输入触发词即可激活：

```
动画、动效、转场、过渡、入场、出场、滚动效果、视差、
微交互、弹性、缓动、粒子、3D、animation、motion、transition、
animate、easing、spring、stagger、parallax、keyframes
```

或直接在 Claude Code 中使用 `/frontend-animation` 斜杠命令。

## 审计工具

扫描项目中的动画反模式（只读，不修改任何文件）：

```bash
node ~/.claude/skills/frontend-animation/scripts/audit-animation.mjs <项目目录>

# 输出 JSON
node ~/.claude/skills/frontend-animation/scripts/audit-animation.mjs <项目目录> --json

# CI 严格模式（有问题时退出码 1）
node ~/.claude/skills/frontend-animation/scripts/audit-animation.mjs <项目目录> --strict
```

### 检测规则（8 条）

| 规则 | 级别 | 说明 |
|------|------|------|
| `transition-all` | error | 过渡所有属性，应显式列出 |
| `linear-easing` | warn | 位移动画用 linear，显得机械 |
| `layout-animating` | error | 动画 width/height/top/left 等布局属性 |
| `long-duration` | warn | 时长超过 800ms |
| `no-reduced-motion` | warn | 无 prefers-reduced-motion 降级 |
| `timeout-driven` | warn | setTimeout 串联动画序列 |
| `missing-will-change` | info | 无限循环动画缺少 will-change |
| `z-index-overlay` | info | 全屏装饰层缺少 pointer-events: none |

## 数值规范速查

| 场景 | 时长 | 曲线 |
|------|------|------|
| hover / press | 120–160ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 进场 | 240–400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 出场 | 进场 × 0.65 | `cubic-bezier(0.4, 0, 1, 1)` |
| 页面转场 | 300–500ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| stagger 间隔 | 30–50ms | — |

## 许可证

MIT © 2024
