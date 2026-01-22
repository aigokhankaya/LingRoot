$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting LingRoot MFA Service (Standalone)..." -ForegroundColor Cyan

# 1. Navigate to MFA directory
$MfaDir = Join-Path $PSScriptRoot "mfa"
if (!(Test-Path $MfaDir)) {
    Write-Error "Could not find 'mfa' directory at $MfaDir"
    exit 1
}
Set-Location $MfaDir

# 2. Check/Install dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# 3. Start MFA Service
Write-Host "✅ MFA Dependencies Check OK" -ForegroundColor Green
Write-Host "🌐 Starting Service on Port 5002..." -ForegroundColor Green
Write-Host "   (Press Ctrl+C to stop)" -ForegroundColor Gray

# Run node server directly
# We don't use 'npm start' to avoid swallowing errors in some shells
node server.js
