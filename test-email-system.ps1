# LingRoot Email System Test Script
# Bu script email sisteminin kurulumunu ve çalışıp çalışmadığını test eder

Write-Host "🎯 LingRoot Email System Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"

# 1. Server çalışıyor mu kontrol et
Write-Host "`n1. Backend server kontrolü..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$baseUrl/healthz" -Method GET
    Write-Host "✅ Backend server çalışıyor" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server çalışmıyor. Lütfen backend'i başlatın:" -ForegroundColor Red
    Write-Host "   cd backend && npm start" -ForegroundColor White
    exit 1
}

# 2. Email yapılandırması kontrolü
Write-Host "`n2. Email yapılandırması kontrolü..." -ForegroundColor Yellow
try {
    $configStatus = Invoke-RestMethod -Uri "$baseUrl/api/test-email/config-status" -Method GET
    
    Write-Host "Email User: $($configStatus.status.emailUser)" -ForegroundColor White
    Write-Host "Email Password: $($configStatus.status.emailPassword)" -ForegroundColor White
    Write-Host "Hazır durumu: $($configStatus.status.ready)" -ForegroundColor White
    
    if ($configStatus.status.ready) {
        Write-Host "✅ Email yapılandırması tamam" -ForegroundColor Green
    } else {
        Write-Host "❌ Email yapılandırması eksik" -ForegroundColor Red
        Write-Host "`nYapılması gerekenler:" -ForegroundColor Yellow
        foreach ($step in $configStatus.instructions.steps) {
            Write-Host "  $step" -ForegroundColor White
        }
        Write-Host "`nDevam etmek için herhangi bir tuşa basın..." -ForegroundColor Yellow
        Read-Host
    }
} catch {
    Write-Host "❌ Email yapılandırması kontrol edilemedi: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Email bağlantı testi
Write-Host "`n3. Email bağlantı testi..." -ForegroundColor Yellow
try {
    $connectionTest = Invoke-RestMethod -Uri "$baseUrl/api/test-email/test-connection" -Method GET
    
    if ($connectionTest.success) {
        Write-Host "✅ Email servisi bağlantısı başarılı" -ForegroundColor Green
        Write-Host "Service: $($connectionTest.config.service)" -ForegroundColor White
        Write-Host "User: $($connectionTest.config.user)" -ForegroundColor White
    } else {
        Write-Host "❌ Email servisi bağlantısı başarısız" -ForegroundColor Red
        Write-Host "Mesaj: $($connectionTest.message)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Email bağlantı testi başarısız: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test email gönderimi
Write-Host "`n4. Test email gönderimi..." -ForegroundColor Yellow
$testEmail = Read-Host "Test için email adresi girin (boş bırakırsanız atlayalım)"

if ($testEmail -and $testEmail.Trim() -ne "") {
    $firstName = Read-Host "Test için isim girin (varsayılan: Test Kullanıcı)"
    if (-not $firstName -or $firstName.Trim() -eq "") {
        $firstName = "Test Kullanıcı"
    }
    
    try {
        $body = @{
            email = $testEmail.Trim()
            firstName = $firstName.Trim()
        } | ConvertTo-Json
        
        Write-Host "Test email gönderiliyor..." -ForegroundColor Yellow
        $testResult = Invoke-RestMethod -Uri "$baseUrl/api/test-email/test-welcome" -Method POST -Body $body -ContentType "application/json"
        
        if ($testResult.success) {
            Write-Host "✅ Test email başarıyla gönderildi!" -ForegroundColor Green
            Write-Host "Email: $($testResult.data.email)" -ForegroundColor White
            Write-Host "İsim: $($testResult.data.firstName)" -ForegroundColor White
            Write-Host "Message ID: $($testResult.data.messageId)" -ForegroundColor White
        } else {
            Write-Host "❌ Test email gönderilemedi" -ForegroundColor Red
            Write-Host "Hata: $($testResult.error)" -ForegroundColor White
        }
    } catch {
        Write-Host "❌ Test email gönderimi başarısız: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️  Test email gönderimi atlandı" -ForegroundColor Yellow
}

# 5. Email template önizleme
Write-Host "`n5. Email template önizleme..." -ForegroundColor Yellow
Write-Host "Email şablonunu önizlemek için: $baseUrl/api/test-email/preview-template?firstName=TestKullanıcı&email=test@example.com" -ForegroundColor White

Write-Host "`n🎉 Test tamamlandı!" -ForegroundColor Cyan
Write-Host "`n📧 Email sistemi bilgileri:" -ForegroundColor Cyan
Write-Host "- Yeni kayıt olan kullanıcılara otomatik hoşgeldin maili gönderilir" -ForegroundColor White
Write-Host "- Google OAuth ile kayıt olan kullanıcılara da hoşgeldin maili gönderilir" -ForegroundColor White
Write-Host "- Email gönderimi başarısız olursa kayıt işlemi etkilenmez" -ForegroundColor White
Write-Host "- Tüm email işlemleri loglanır" -ForegroundColor White

Write-Host "`n🔧 Kullanışlı endpoint'ler:" -ForegroundColor Cyan
Write-Host "- GET  $baseUrl/api/test-email/config-status     → Email yapılandırması" -ForegroundColor White
Write-Host "- GET  $baseUrl/api/test-email/test-connection   → Email bağlantı testi" -ForegroundColor White
Write-Host "- POST $baseUrl/api/test-email/test-welcome      → Test email gönder" -ForegroundColor White
Write-Host "- GET  $baseUrl/api/test-email/preview-template  → Email şablonu önizle" -ForegroundColor White

Read-Host "`nÇıkmak için Enter'a basın" 