# Cloudflare Tunnel Test Script'i
# Backend bağlantısını ve tunnel durumunu test eder

param(
    [string]$Hostname = "",
    [string]$TunnelName = "lingroot-mfa"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Tunnel Test Script'i" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Hostname al
if ([string]::IsNullOrWhiteSpace($Hostname)) {
    $Hostname = Read-Host "Domain/Subdomain (örn: api.lingroot.com)"
    if ([string]::IsNullOrWhiteSpace($Hostname)) {
        Write-Host "❌ Domain gerekli!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🔍 Test ediliyor: https://$Hostname" -ForegroundColor Yellow
Write-Host ""

# Test 1: Cloudflared kurulumu
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 1: Cloudflared Kurulumu" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$cloudflaredInstalled = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredInstalled) {
    $version = cloudflared --version
    Write-Host "✅ Cloudflared kurulu: $version" -ForegroundColor Green
} else {
    Write-Host "❌ Cloudflared bulunamadı!" -ForegroundColor Red
}
Write-Host ""

# Test 2: Tunnel durumu
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 2: Tunnel Durumu" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if ($cloudflaredInstalled) {
    try {
        $tunnelInfo = cloudflared tunnel info $TunnelName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Tunnel bulundu: $TunnelName" -ForegroundColor Green
            Write-Host $tunnelInfo -ForegroundColor Gray
        } else {
            Write-Host "❌ Tunnel bulunamadı: $TunnelName" -ForegroundColor Red
            Write-Host $tunnelInfo -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Tunnel bilgisi alınamadı: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️  Cloudflared kurulu olmadığı için atlandı" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Config dosyası
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 3: Config Dosyası" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$configFile = "$env:USERPROFILE\.cloudflared\config.yml"
if (Test-Path $configFile) {
    Write-Host "✅ Config dosyası bulundu: $configFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "İçerik:" -ForegroundColor Gray
    Get-Content $configFile | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "❌ Config dosyası bulunamadı: $configFile" -ForegroundColor Red
}
Write-Host ""

# Test 4: Lokal backend
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 4: Lokal Backend (localhost:5001)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend çalışıyor" -ForegroundColor Green
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Backend yanıt verdi ama status code beklenmedik: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Backend'e erişilemiyor!" -ForegroundColor Red
    Write-Host "   Hata: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Backend'i başlatmak için:" -ForegroundColor Yellow
    Write-Host "   cd f:\Main\backend" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
}
Write-Host ""

# Test 5: DNS çözümleme
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 5: DNS Çözümleme" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

try {
    $dnsResult = Resolve-DnsName -Name $Hostname -ErrorAction Stop
    Write-Host "✅ DNS kaydı bulundu" -ForegroundColor Green
    $dnsResult | ForEach-Object {
        Write-Host "   Type: $($_.Type), Value: $($_.IPAddress)$($_.NameHost)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ DNS kaydı bulunamadı!" -ForegroundColor Red
    Write-Host "   Hata: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   DNS kaydı oluşturmak için:" -ForegroundColor Yellow
    Write-Host "   cloudflared tunnel route dns $TunnelName $Hostname" -ForegroundColor Gray
}
Write-Host ""

# Test 6: HTTPS erişimi
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 6: HTTPS Erişimi (Cloudflare Tunnel)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "https://$Hostname/api/health" -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Cloudflare Tunnel çalışıyor!" -ForegroundColor Green
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Tunnel yanıt verdi ama status code beklenmedik: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 502) {
        Write-Host "❌ 502 Bad Gateway - Backend çalışmıyor veya tunnel başlatılmamış!" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Çözüm:" -ForegroundColor Yellow
        Write-Host "   1. Backend'i başlatın: cd f:\Main\backend && npm run dev" -ForegroundColor Gray
        Write-Host "   2. Tunnel'ı başlatın: cloudflared tunnel run $TunnelName" -ForegroundColor Gray
    } elseif ($statusCode -eq 404) {
        Write-Host "❌ 404 Not Found - Endpoint bulunamadı!" -ForegroundColor Red
        Write-Host "   URL doğru mu? https://$Hostname/api/health" -ForegroundColor Gray
    } else {
        Write-Host "❌ Cloudflare Tunnel'a erişilemiyor!" -ForegroundColor Red
        Write-Host "   Hata: $($_.Exception.Message)" -ForegroundColor Gray
        if ($statusCode) {
            Write-Host "   Status Code: $statusCode" -ForegroundColor Gray
        }
    }
}
Write-Host ""

# Test 7: Backend .env
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 7: Backend .env Dosyası" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$backendEnvFile = "f:\Main\backend\.env"
if (Test-Path $backendEnvFile) {
    Write-Host "✅ Backend .env bulundu: $backendEnvFile" -ForegroundColor Green
    
    $envContent = Get-Content $backendEnvFile -Raw
    
    # PORT kontrolü
    if ($envContent -match "PORT=(\d+)") {
        $port = $matches[1]
        Write-Host "   PORT: $port" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  PORT tanımlanmamış" -ForegroundColor Yellow
    }
    
    # ALLOWED_ORIGINS kontrolü
    if ($envContent -match "ALLOWED_ORIGINS=(.+)") {
        $origins = $matches[1]
        Write-Host "   ALLOWED_ORIGINS: $origins" -ForegroundColor Gray
        
        if ($origins -notmatch [regex]::Escape($Hostname)) {
            Write-Host "   ⚠️  ALLOWED_ORIGINS'de $Hostname bulunamadı!" -ForegroundColor Yellow
            Write-Host "   Ekleyin: ALLOWED_ORIGINS=https://$Hostname,..." -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  ALLOWED_ORIGINS tanımlanmamış" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Backend .env bulunamadı: $backendEnvFile" -ForegroundColor Red
}
Write-Host ""

# Test 8: Mobile .env
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test 8: Mobile .env Dosyası" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$mobileEnvFile = "f:\Main\LingRootMobile\.env"
if (Test-Path $mobileEnvFile) {
    Write-Host "✅ Mobile .env bulundu: $mobileEnvFile" -ForegroundColor Green
    
    $envContent = Get-Content $mobileEnvFile -Raw
    
    if ($envContent -match "EXPO_PUBLIC_API_URL=(.+)") {
        $apiUrl = $matches[1].Trim()
        Write-Host "   EXPO_PUBLIC_API_URL: $apiUrl" -ForegroundColor Gray
        
        if ($apiUrl -notmatch [regex]::Escape($Hostname)) {
            Write-Host "   ⚠️  API URL'de $Hostname bulunamadı!" -ForegroundColor Yellow
            Write-Host "   Güncelleyin: EXPO_PUBLIC_API_URL=https://$Hostname/api" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  EXPO_PUBLIC_API_URL tanımlanmamış" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Mobile .env bulunamadı: $mobileEnvFile" -ForegroundColor Red
    Write-Host "   Oluşturun: EXPO_PUBLIC_API_URL=https://$Hostname/api" -ForegroundColor Gray
}
Write-Host ""

# Özet
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Test Özeti" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$allTestsPassed = $true

if (-not $cloudflaredInstalled) {
    Write-Host "❌ Cloudflared kurulu değil" -ForegroundColor Red
    $allTestsPassed = $false
}

if (-not (Test-Path $configFile)) {
    Write-Host "❌ Config dosyası eksik" -ForegroundColor Red
    $allTestsPassed = $false
}

try {
    Invoke-WebRequest -Uri "http://localhost:5001/api/health" -TimeoutSec 5 -ErrorAction Stop | Out-Null
} catch {
    Write-Host "❌ Lokal backend çalışmıyor" -ForegroundColor Red
    $allTestsPassed = $false
}

try {
    Invoke-WebRequest -Uri "https://$Hostname/api/health" -TimeoutSec 10 -ErrorAction Stop | Out-Null
} catch {
    Write-Host "❌ Cloudflare Tunnel erişilemiyor" -ForegroundColor Red
    $allTestsPassed = $false
}

if ($allTestsPassed) {
    Write-Host ""
    Write-Host "🎉 Tüm testler başarılı! Sistem hazır." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Bazı testler başarısız. Yukarıdaki hataları kontrol edin." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📚 Detaylı bilgi için: CLOUDFLARE_TUNNEL_SETUP.md" -ForegroundColor Cyan
Write-Host ""
