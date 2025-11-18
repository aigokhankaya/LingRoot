# Cloudflare Tunnel Kurulum Script'i
# LingRoot MFA Backend için

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Tunnel Kurulum Script'i" -ForegroundColor Cyan
Write-Host "  LingRoot MFA Backend" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Yönetici kontrolü
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  UYARI: Bu script yönetici yetkisi gerektirir!" -ForegroundColor Yellow
    Write-Host "PowerShell'i 'Yönetici olarak çalıştır' ile açın." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Devam etmek için Enter'a basın (bazı işlemler başarısız olabilir)"
}

# Cloudflared kontrolü
Write-Host "🔍 Cloudflared kurulumu kontrol ediliyor..." -ForegroundColor Yellow
$cloudflaredInstalled = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflaredInstalled) {
    Write-Host "❌ Cloudflared bulunamadı!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cloudflared'i kurmak için aşağıdaki seçeneklerden birini kullanın:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Chocolatey ile (önerilen):" -ForegroundColor White
    Write-Host "   choco install cloudflared" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Manuel indirme:" -ForegroundColor White
    Write-Host "   https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Gray
    Write-Host ""
    exit 1
} else {
    $version = cloudflared --version
    Write-Host "✅ Cloudflared kurulu: $version" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Tunnel Yapılandırması" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Kullanıcıdan bilgi al
$tunnelName = Read-Host "Tunnel adı (örn: lingroot-mfa)"
if ([string]::IsNullOrWhiteSpace($tunnelName)) {
    $tunnelName = "lingroot-mfa"
    Write-Host "Varsayılan kullanılıyor: $tunnelName" -ForegroundColor Gray
}

$hostname = Read-Host "Domain/Subdomain (örn: api.lingroot.com)"
if ([string]::IsNullOrWhiteSpace($hostname)) {
    Write-Host "❌ Domain gerekli!" -ForegroundColor Red
    exit 1
}

$backendPort = Read-Host "Backend port (varsayılan: 5001)"
if ([string]::IsNullOrWhiteSpace($backendPort)) {
    $backendPort = "5001"
}

Write-Host ""
Write-Host "📋 Yapılandırma Özeti:" -ForegroundColor Cyan
Write-Host "  Tunnel Adı: $tunnelName" -ForegroundColor White
Write-Host "  Domain: $hostname" -ForegroundColor White
Write-Host "  Backend Port: $backendPort" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Devam edilsin mi? (E/H)"
if ($confirm -ne "E" -and $confirm -ne "e") {
    Write-Host "İptal edildi." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Adım 1: Cloudflare'e Giriş" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tarayıcıda Cloudflare login sayfası açılacak..." -ForegroundColor Yellow
Write-Host "Giriş yapın ve domain'inizi seçin." -ForegroundColor Yellow
Write-Host ""
Read-Host "Hazır olduğunuzda Enter'a basın"

try {
    cloudflared tunnel login
    Write-Host "✅ Cloudflare girişi başarılı" -ForegroundColor Green
} catch {
    Write-Host "❌ Cloudflare girişi başarısız: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Adım 2: Tunnel Oluşturma" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

try {
    $output = cloudflared tunnel create $tunnelName 2>&1
    Write-Host $output
    
    # Tunnel ID'yi çıkar
    $tunnelId = $null
    if ($output -match "Created tunnel .* with id ([a-f0-9\-]+)") {
        $tunnelId = $matches[1]
        Write-Host "✅ Tunnel oluşturuldu: $tunnelId" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Tunnel ID otomatik olarak alınamadı" -ForegroundColor Yellow
        Write-Host "Lütfen yukarıdaki çıktıdan tunnel ID'yi not edin" -ForegroundColor Yellow
        $tunnelId = Read-Host "Tunnel ID'yi girin"
    }
} catch {
    Write-Host "❌ Tunnel oluşturma başarısız: $_" -ForegroundColor Red
    Write-Host "Tunnel zaten var olabilir. Devam ediliyor..." -ForegroundColor Yellow
    $tunnelId = Read-Host "Mevcut tunnel ID'yi girin (boş bırakırsanız config dosyası oluşturulmaz)"
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Adım 3: DNS Kaydı Oluşturma" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

try {
    cloudflared tunnel route dns $tunnelName $hostname
    Write-Host "✅ DNS kaydı oluşturuldu: $hostname" -ForegroundColor Green
} catch {
    Write-Host "❌ DNS kaydı oluşturma başarısız: $_" -ForegroundColor Red
    Write-Host "DNS kaydını manuel olarak Cloudflare Dashboard'dan oluşturabilirsiniz" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Adım 4: Config Dosyası Oluşturma" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if (-not [string]::IsNullOrWhiteSpace($tunnelId)) {
    $configDir = "$env:USERPROFILE\.cloudflared"
    $configFile = "$configDir\config.yml"
    
    # Config dizini oluştur
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    # Credentials dosyası yolu
    $credentialsFile = "$configDir\$tunnelId.json"
    
    # Config içeriği
    $configContent = @"
tunnel: $tunnelName
credentials-file: $credentialsFile

ingress:
  # MFA Backend
  - hostname: $hostname
    service: http://localhost:$backendPort
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      
  # Catch-all rule (zorunlu)
  - service: http_status:404
"@
    
    # Config dosyasını yaz
    $configContent | Out-File -FilePath $configFile -Encoding UTF8
    Write-Host "✅ Config dosyası oluşturuldu: $configFile" -ForegroundColor Green
    
    # Config dosyasını göster
    Write-Host ""
    Write-Host "📄 Config Dosyası İçeriği:" -ForegroundColor Cyan
    Write-Host $configContent -ForegroundColor Gray
} else {
    Write-Host "⚠️  Tunnel ID olmadığı için config dosyası oluşturulamadı" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Adım 5: Backend .env Güncellemesi" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$backendEnvFile = "f:\Main\backend\.env"
if (Test-Path $backendEnvFile) {
    Write-Host "Backend .env dosyası bulundu: $backendEnvFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Aşağıdaki satırları .env dosyanıza ekleyin veya güncelleyin:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NODE_ENV=production" -ForegroundColor White
    Write-Host "PORT=$backendPort" -ForegroundColor White
    Write-Host "ALLOWED_ORIGINS=https://$hostname,http://localhost:19006" -ForegroundColor White
    Write-Host ""
    
    $updateEnv = Read-Host "Otomatik olarak güncellensin mi? (E/H)"
    if ($updateEnv -eq "E" -or $updateEnv -eq "e") {
        try {
            $envContent = Get-Content $backendEnvFile -Raw
            
            # ALLOWED_ORIGINS güncelle veya ekle
            if ($envContent -match "ALLOWED_ORIGINS=") {
                $envContent = $envContent -replace "ALLOWED_ORIGINS=.*", "ALLOWED_ORIGINS=https://$hostname,http://localhost:19006"
            } else {
                $envContent += "`nALLOWED_ORIGINS=https://$hostname,http://localhost:19006"
            }
            
            # PORT güncelle veya ekle
            if ($envContent -match "PORT=") {
                $envContent = $envContent -replace "PORT=.*", "PORT=$backendPort"
            } else {
                $envContent += "`nPORT=$backendPort"
            }
            
            $envContent | Out-File -FilePath $backendEnvFile -Encoding UTF8 -NoNewline
            Write-Host "✅ Backend .env dosyası güncellendi" -ForegroundColor Green
        } catch {
            Write-Host "❌ .env güncellemesi başarısız: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠️  Backend .env dosyası bulunamadı: $backendEnvFile" -ForegroundColor Yellow
    Write-Host "Manuel olarak oluşturmanız gerekiyor" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Adım 6: Mobile App .env Güncellemesi" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$mobileEnvFile = "f:\Main\LingRootMobile\.env"
$mobileEnvContent = "EXPO_PUBLIC_API_URL=https://$hostname/api"

try {
    $mobileEnvContent | Out-File -FilePath $mobileEnvFile -Encoding UTF8
    Write-Host "✅ Mobile .env dosyası oluşturuldu: $mobileEnvFile" -ForegroundColor Green
    Write-Host "   $mobileEnvContent" -ForegroundColor Gray
} catch {
    Write-Host "❌ Mobile .env oluşturma başarısız: $_" -ForegroundColor Red
    Write-Host "Manuel olarak oluşturun: $mobileEnvFile" -ForegroundColor Yellow
    Write-Host "İçerik: $mobileEnvContent" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ✅ Kurulum Tamamlandı!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Backend'i başlatın:" -ForegroundColor White
Write-Host "   cd f:\Main\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Tunnel'ı başlatın:" -ForegroundColor White
Write-Host "   cloudflared tunnel run $tunnelName" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test edin:" -ForegroundColor White
Write-Host "   curl https://$hostname/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "4. (Opsiyonel) Windows servisi olarak kurun:" -ForegroundColor White
Write-Host "   cloudflared service install" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Detaylı bilgi için: CLOUDFLARE_TUNNEL_SETUP.md" -ForegroundColor Cyan
Write-Host ""

$startTunnel = Read-Host "Tunnel'ı şimdi başlatmak ister misiniz? (E/H)"
if ($startTunnel -eq "E" -or $startTunnel -eq "e") {
    Write-Host ""
    Write-Host "🚀 Tunnel başlatılıyor..." -ForegroundColor Yellow
    Write-Host "Durdurmak için Ctrl+C kullanın" -ForegroundColor Gray
    Write-Host ""
    cloudflared tunnel run $tunnelName
}
