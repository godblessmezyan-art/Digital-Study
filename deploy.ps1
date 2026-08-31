# ============================================================
# 数字书房 一键发布脚本
# 功能：1) 同步 GitHub（提交 + 推送） 2) 上传到 wxhappylife.top/test
# 用法：powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#   或直接在此目录执行  .\deploy.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$REMOTE = "root@wxhappylife.top"
$REMOTE_DIR = "/opt/1panel/apps/openresty/openresty/root/test"

Write-Host "=== 1/3 提交并推送到 GitHub ===" -ForegroundColor Cyan

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
Write-Host "=== 2/3 上传站点文件到服务器 ===" -ForegroundColor Cyan

# 只上传发布所需的文件（排除 .git、截图、文档等）
$files = @(
    "index.html"
    "css"
    "js"
    "assets"
)
foreach ($f in $files) {
    if (Test-Path $f) {
        scp -r -o BatchMode=yes $f "${REMOTE}:${REMOTE_DIR}/"
        if ($LASTEXITCODE -ne 0) { Write-Host "上传 $f 失败" -ForegroundColor Red; exit 1 }
    } else {
        Write-Host "跳过（不存在）：$f" -ForegroundColor Yellow
    }
}

Write-Host "文件上传完成" -ForegroundColor Green

Write-Host ""
Write-Host "=== 3/3 验证线上访问 ===" -ForegroundColor Cyan

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
