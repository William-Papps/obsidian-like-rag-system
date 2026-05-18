# EternalNotes — home server deployment script
# Usage: .\deploy.ps1
# Run from the repo root. Requires Node 20+.

Set-Location $PSScriptRoot

Write-Host "==> Pulling latest changes..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Error "git pull failed"; exit 1 }

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

Write-Host "==> Building app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "npm build failed"; exit 1 }

Write-Host "==> Registering Discord slash commands..." -ForegroundColor Cyan
node scripts/register-discord-commands.mjs
if ($LASTEXITCODE -ne 0) { Write-Warning "Discord command registration failed — bot will still work but /verify may not appear in Discord" }

Write-Host "==> Starting app + Discord bot..." -ForegroundColor Green
npm start
