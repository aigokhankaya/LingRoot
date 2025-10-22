# Backend Bağlantı Test Script
# Bu script, backend'in erişilebilir olup olmadığını test eder

Write-Host "🔍 Backend Bağlantı Testi" -ForegroundColor Cyan
Write-Host ""

# .env dosyasından API URL'i oku
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $apiUrlLine = $envContent | Where-Object { $_ -match "^EXPO_PUBLIC_API_URL=" }
    
    if ($apiUrlLine) {
        $apiUrl = ($apiUrlLine -split "=")[1].Trim()
        Write-Host "📡 API URL: $apiUrl" -ForegroundColor Yellow
    } else {
        Write-Host "❌ .env dosyasında EXPO_PUBLIC_API_URL bulunamadı!" -ForegroundColor Red
        exit
    }
} else {
    Write-Host "❌ .env dosyası bulunamadı!" -ForegroundColor Red
    Write-Host "Önce 'setup-local-dev.ps1' scriptini çalıştırın." -ForegroundColor Yellow
    exit
}

Write-Host ""

# Health endpoint'i test et
$healthUrl = "$apiUrl/api/health"
Write-Host "🏥 Health endpoint test ediliyor: $healthUrl" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
    
    if ($response.success) {
        Write-Host "✅ Backend bağlantısı başarılı!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Yanıt:" -ForegroundColor Cyan
        Write-Host "  - Success: $($response.success)" -ForegroundColor White
        Write-Host "  - Message: $($response.message)" -ForegroundColor White
        Write-Host "  - Timestamp: $($response.timestamp)" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Backend çalışıyor ve erişilebilir!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend yanıt verdi ama success=false" -ForegroundColor Yellow
        Write-Host $response
    }
} catch {
    Write-Host "❌ Backend'e bağlanılamadı!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Olası Çözümler:" -ForegroundColor Yellow
    Write-Host "1. Backend'in çalıştığından emin olun:" -ForegroundColor White
    Write-Host "   cd ..\backend && npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. IP adresinin doğru olduğunu kontrol edin:" -ForegroundColor White
    Write-Host "   ipconfig" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Firewall'un 5001 portunu engellemediğinden emin olun" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Fiziksel cihaz kullanıyorsanız, aynı Wi-Fi ağında olduğunuzdan emin olun" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "📖 Daha fazla yardim icin LOCAL_DEVELOPMENT.md dosyasini okuyun." -ForegroundColor Cyan
Write-Host ""
