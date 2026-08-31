# ============================================================
# 数字书房 一键发布脚本
# 功能：1) 同步 GitHub（提交 + 推送）
#       2) 构建前端（Vite -> frontend/dist/）
#       3) 上传构建产物到 wxhappylife.top/test
#       4) 验证线上访问 HTTP 200
# 用法：powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#   或直接在此目录执行  .\deploy.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$REMOTE = "root@wxhappylife.top"
$REMOTE_DIR = "/opt/1panel/apps/openresty/openresty/root/test"

Write-Host "=== 1/4 提交并推送到 GitHub ===" -ForegroundColor Cyan

# 检查是否有改动
$changed = git status --porcelain
if ($changed) {
    git add -A
    git commit -m "publish: $(Get-Date -Format 'yyyy-MM-dd HH:mm') 站点更新"
    git push origin main
    if ($LASTEXITCODE -ne 0) { Write-Host "GitHub 推送失败，请检查远程地址" -ForegroundColor Red; exit 1 }
    Write-Host "GitHub 同步完成" -ForegroundColor Green
} else {
    Write-Host "工作区无改动，跳过提交（仅同步推送状态）" -ForegroundColor Yellow
    git push origin main
}

Write-Host ""
Write-Host "=== 2/4 构建前端（Vite）===" -ForegroundColor Cyan

Push-Location .\frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "前端构建失败，终止发布（线上保持原版本）" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
$distDir = Join-Path (Get-Location) "frontend\dist"
if (-not (Test-Path $distDir)) {
    Write-Host "构建产物 frontend/dist 不存在，终止发布" -ForegroundColor Red
    exit 1
}
Write-Host "构建完成：$distDir" -ForegroundColor Green

Write-Host ""
Write-Host "=== 3/4 上传构建产物到服务器 ===" -ForegroundColor Cyan

# 清空线上旧文件，避免 hash 文件名累积（构建产物是整体替换语义）
Write-Host "清空线上目录 $REMOTE_DIR ..." -ForegroundColor Yellow
ssh -o BatchMode=yes $REMOTE "rm -rf $REMOTE_DIR/*"
if ($LASTEXITCODE -ne 0) { Write-Host "清空线上目录失败" -ForegroundColor Red; exit 1 }

# 上传 dist/ 下所有条目（index.html + assets/ 等）
Get-ChildItem $distDir | ForEach-Object {
    Write-Host "上传: $($_.Name)"
    scp -r -o BatchMode=yes $_.FullName "${REMOTE}:${REMOTE_DIR}/"
    if ($LASTEXITCODE -ne 0) { Write-Host "上传 $($_.Name) 失败" -ForegroundColor Red; exit 1 }
}
Write-Host "文件上传完成" -ForegroundColor Green

Write-Host ""
Write-Host "=== 4/4 验证线上访问 ===" -ForegroundColor Cyan

try {
    $r = Invoke-WebRequest -Uri "https://wxhappylife.top/test/" -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 5
    if ($r.StatusCode -eq 200) {
        Write-Host "验证成功：https://wxhappylife.top/test/ -> HTTP $($r.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "验证异常：HTTP $($r.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "验证失败：$($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "发布完成" -ForegroundColor Green
