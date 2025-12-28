$servicePath = 'F:\Main\mfa'
$logPath     = 'F:\Main\mfa\logs\service-mfa.log'
$npmCmd      = 'C:\Program Files\nodejs\npm.cmd'

# Klasor kontrol
if (-not (Test-Path $servicePath)) {
    Write-Error "Service path not found: $servicePath"
    exit 1
}

# Log klasoru
$logDir = Split-Path $logPath
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# UTF8 BOM ile baslangic tarihi yazalim ki dosya UTF8 olarak olussun
"$(Get-Date) - MFA Service Task invoked" | Out-File $logPath -Append -Encoding utf8

# PowerShell komutu:
# 1. Encoding UTF8 yap
# 2. Klasore git
# 3. npm start calistir ve ciktisini Tee-Object ile hem ekrana hem dosyaya bas
$psCommand = "
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
    Write-Host 'Starting MFA Service in $servicePath...';
    Set-Location '$servicePath';
    & '$npmCmd' start | Tee-Object -FilePath '$logPath' -Append
"

# Yeni pencerede, kapanmasin (-NoExit), UTF8 destegiyle PowerShell calistir
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "$psCommand" -WindowStyle Normal
