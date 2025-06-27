Write-Host "🚀 Zaman damgası özelliği test ediliyor..." -ForegroundColor Green
Write-Host ""

$url = "http://localhost:5001/api/content/youtube-transcript"
$testVideo = "https://www.youtube.com/watch?v=6O5Kf4CHKco"

# Test 1: Zaman damgaları olmadan
Write-Host "📝 Test 1: Zaman damgaları olmadan (includeTimestamps: false)" -ForegroundColor Yellow
$body1 = @{
    youtubeUrl = $testVideo
    includeTimestamps = $false
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $url -Method POST -Body $body1 -ContentType "application/json"
    Write-Host "✅ Başarılı!" -ForegroundColor Green
    Write-Host "📊 Karakter sayısı: $($response1.statistics.characterCount)"
    Write-Host "🔢 Kelime sayısı: $($response1.statistics.wordCount)"
    Write-Host "📈 Segment sayısı: $($response1.statistics.segmentCount)"
    Write-Host "⏰ Zaman damgaları dahil: $($response1.includeTimestamps)"
    Write-Host "📄 Transkript önizleme (ilk 200 karakter):"
    Write-Host $response1.transcript.Substring(0, [Math]::Min(200, $response1.transcript.Length)) -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Hata: $_" -ForegroundColor Red
}

# Test 2: Zaman damgaları ile
Write-Host "📝 Test 2: Zaman damgaları ile (includeTimestamps: true)" -ForegroundColor Yellow
$body2 = @{
    youtubeUrl = $testVideo
    includeTimestamps = $true
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $url -Method POST -Body $body2 -ContentType "application/json"
    Write-Host "✅ Başarılı!" -ForegroundColor Green
    Write-Host "📊 Karakter sayısı: $($response2.statistics.characterCount)"
    Write-Host "🔢 Kelime sayısı: $($response2.statistics.wordCount)"
    Write-Host "📈 Segment sayısı: $($response2.statistics.segmentCount)"
    Write-Host "⏰ Zaman damgaları dahil: $($response2.includeTimestamps)"
    Write-Host "📄 Transkript önizleme (ilk 400 karakter):"
    Write-Host $response2.transcript.Substring(0, [Math]::Min(400, $response2.transcript.Length)) -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Hata: $_" -ForegroundColor Red
}

# Test 3: Default değer
Write-Host "📝 Test 3: Default davranış (includeTimestamps belirtilmemiş)" -ForegroundColor Yellow
$body3 = @{
    youtubeUrl = $testVideo
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $url -Method POST -Body $body3 -ContentType "application/json"
    Write-Host "✅ Başarılı!" -ForegroundColor Green
    Write-Host "⏰ Zaman damgaları dahil: $($response3.includeTimestamps) (default false olmalı)"
    Write-Host "📄 Transkript önizleme (ilk 200 karakter):"
    Write-Host $response3.transcript.Substring(0, [Math]::Min(200, $response3.transcript.Length)) -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Hata: $_" -ForegroundColor Red
}

Write-Host "🏁 Test tamamlandı!" -ForegroundColor Green 