# install.ps1 — 安装 frontend-animation skill 到 Claude Code（Windows）
# 用法：irm https://raw.githubusercontent.com/HEI1491/frontend-animation-skill/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "https://github.com/HEI1491/frontend-animation-skill.git"
$SkillDir = Join-Path $env:USERPROFILE ".claude\skills\frontend-animation"

Write-Host "🎬 安装 frontend-animation skill..." -ForegroundColor Cyan

# 检查 git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 需要 git，请先安装：https://git-scm.com" -ForegroundColor Red
    exit 1
}

# 如果已存在，拉取更新；否则克隆
if (Test-Path (Join-Path $SkillDir ".git")) {
    Write-Host "📦 已存在，更新中..." -ForegroundColor Yellow
    git -C $SkillDir pull --ff-only
} else {
    Write-Host "📦 克隆到 $SkillDir..." -ForegroundColor Yellow
    $ParentDir = Split-Path $SkillDir -Parent
    if (-not (Test-Path $ParentDir)) {
        New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
    }
    git clone --depth 1 $Repo $SkillDir
}

Write-Host ""
Write-Host "✅ 安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "   目录：$SkillDir"
Write-Host ""
Write-Host "   在 Claude Code 中输入动画相关词语（动效、transition、motion...）即可激活。"
Write-Host "   审计命令：node $SkillDir\scripts\audit-animation.mjs <项目目录>"
