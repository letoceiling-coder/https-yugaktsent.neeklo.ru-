# Запуск из PowerShell:
#   $env:LG_SSH='root@212.67.9.173'; $env:LG_REMOTE_DEPLOY_ROOT='/var/www/yugaktsent-lg'; .\deploy\yugaktsent\remote-deploy.ps1

$ErrorActionPreference = "Stop"
$ssh = if ($env:LG_SSH) { $env:LG_SSH } else { "root@212.67.9.173" }
$deployRoot = if ($env:LG_REMOTE_DEPLOY_ROOT) { $env:LG_REMOTE_DEPLOY_ROOT } else { "/var/www/yugaktsent-lg" }
$branch = if ($env:DEPLOY_BRANCH) { $env:DEPLOY_BRANCH } else { "main" }
$repo = if ($env:LG_REPO_URL) { $env:LG_REPO_URL } else { "https://github.com/letoceiling-coder/livegrid.git" }

$bootstrap = Join-Path $PSScriptRoot "bootstrap-server.sh"
if (-not (Test-Path $bootstrap)) { throw "Не найден $bootstrap" }

Write-Host "=== yugaktsent remote-deploy -> $ssh DEPLOY_ROOT=$deployRoot ===" -ForegroundColor Cyan

$preamble = "export DEPLOY_ROOT=$deployRoot`nexport DEPLOY_BRANCH=$branch`nexport LG_REPO_URL=$repo`n"
$body = Get-Content -LiteralPath $bootstrap -Raw -Encoding UTF8
$remoteScript = $preamble + $body

$remoteScript | ssh -o BatchMode=yes -o ConnectTimeout=60 $ssh "bash -s"

Write-Host "=== yugaktsent remote-deploy: OK ===" -ForegroundColor Green
