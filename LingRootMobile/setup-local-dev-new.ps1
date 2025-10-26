# LingRootMobile - Local Development Setup Script
# Bu script, local development icin gerekli .env dosyasini olusturur

Write-Host "LingRootMobile Local Development Setup" -ForegroundColor Cyan
Write-Host ""

# IP adresini bul
Write-Host "Bilgisayarinizin IP adresi bulunuyor..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*" | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" | Select-Object -First 1).IPAddress
}

if (-not $ipAddress) {
    Write-Host "IP adresi bulunamadi. Manuel olarak giriniz:" -ForegroundColor Red
    $ipAddress = Read-Host "IP Adresi (orn: 192.168.1.100)"
}

Write-Host "IP Adresi: $ipAddress" -ForegroundColor Green
Write-Host ""

# .env dosyasi var mi kontrol et
if (Test-Path ".env") {
    Write-Host ".env dosyasi zaten mevcut!" -ForegroundColor Yellow
    $overwrite = Read-Host "Uzerine yazmak ister misiniz? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Islem iptal edildi." -ForegroundColor Red
        exit
    }
}

# Emulator mu fiziksel cihaz mi?
Write-Host "Hangi cihazda test edeceksiniz?" -ForegroundColor Cyan
Write-Host "1. Android Emulator (Android Studio)"
Write-Host "2. Fiziksel Android Cihaz"
Write-Host ""
$choice = Read-Host "Seciminiz (1/2)"

if ($choice -eq "1") {
    $apiUrl = "http://10.0.2.2:5001"
    Write-Host "Emulator icin ozel IP kullanilacak: 10.0.2.2" -ForegroundColor Green
} else {
    $apiUrl = "http://${ipAddress}:5001"
    Write-Host "Fiziksel cihaz icin IP kullanilacak: $ipAddress" -ForegroundColor Green
}

Write-Host ""

# .env dosyasini olustur
$envContent = @"
# Backend API URL - Local Development
EXPO_PUBLIC_API_URL=$apiUrl

# Supabase Configuration
# Bu degerleri kendi Supabase projenizden alin
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id

# Production'a donmek icin:
# EXPO_PUBLIC_API_URL=https://lingloops-backend.onrender.com
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host ".env dosyasi olusturuldu!" -ForegroundColor Green
Write-Host ""

# Firewall kontrolu
Write-Host "Firewall Kontrolu" -ForegroundColor Cyan
Write-Host "Backend'e erisim icin 5001 portu acik olmali." -ForegroundColor Yellow
Write-Host ""
$openFirewall = Read-Host "Firewall kurali eklemek ister misiniz? (Yonetici yetkisi gerekir) (y/N)"

if ($openFirewall -eq "y" -or $openFirewall -eq "Y") {
    Write-Host "Firewall kurali ekleniyor..." -ForegroundColor Yellow
    
    # Yonetici yetkisi kontrolu
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($isAdmin) {
        try {
            New-NetFirewallRule -DisplayName "Node.js Backend Port 5001" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow -ErrorAction Stop
            Write-Host "Firewall kurali eklendi!" -ForegroundColor Green
        } catch {
            Write-Host "Firewall kurali eklenemedi: $_" -ForegroundColor Yellow
            Write-Host "Manuel olarak ekleyebilirsiniz: Windows Defender Firewall - Advanced Settings - Inbound Rules" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Yonetici yetkisi gerekli! PowerShell'i 'Run as Administrator' ile calistirin." -ForegroundColor Red
        Write-Host "Veya manuel olarak ekleyin: Windows Defender Firewall - Advanced Settings - Inbound Rules" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Kurulum tamamlandi!" -ForegroundColor Green
Write-Host ""
Write-Host "Sonraki Adimlar:" -ForegroundColor Cyan
Write-Host "1. Backend'i baslatin:" -ForegroundColor White
Write-Host "   cd ..\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Expo'yu baslatin (cache temizleyerek):" -ForegroundColor White
Write-Host "   npx expo start -c" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Backend'in calistigini test edin:" -ForegroundColor White
Write-Host "   Tarayicida: $apiUrl/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Daha fazla bilgi icin LOCAL_DEVELOPMENT.md dosyasini okuyun." -ForegroundColor Yellow
Write-Host ""
