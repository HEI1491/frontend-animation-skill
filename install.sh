#!/usr/bin/env bash
# install.sh — 安装 frontend-animation skill 到 Claude Code
# 用法：curl -fsSL https://raw.githubusercontent.com/HEI1491/frontend-animation-skill/main/install.sh | bash

set -euo pipefail

REPO="https://github.com/HEI1491/frontend-animation-skill.git"
SKILL_DIR="${HOME}/.claude/skills/frontend-animation"

echo "🎬 安装 frontend-animation skill..."

# 检查 git
if ! command -v git &>/dev/null; then
  echo "❌ 需要 git，请先安装：https://git-scm.com"
  exit 1
fi

# 如果已存在，拉取更新；否则克隆
if [ -d "$SKILL_DIR/.git" ]; then
  echo "📦 已存在，更新中..."
  git -C "$SKILL_DIR" pull --ff-only
else
  echo "📦 克隆到 $SKILL_DIR..."
  mkdir -p "$(dirname "$SKILL_DIR")"
  git clone --depth 1 "$REPO" "$SKILL_DIR"
fi

echo ""
echo "✅ 安装完成！"
echo ""
echo "   目录：$SKILL_DIR"
echo ""
echo "   在 Claude Code 中输入动画相关词语（动效、transition、motion...）即可激活。"
echo "   审计命令：node $SKILL_DIR/scripts/audit-animation.mjs <项目目录>"
