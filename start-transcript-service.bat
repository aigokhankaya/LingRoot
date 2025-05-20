@echo off
echo YouTube Transcript Servisini Baslatiyorum...
echo.

rem Admin yetkisi kontrolü
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Bu script'i yonetici olarak calistirmalisiniz!
    echo Lutfen script'i sag tiklayip "Yonetici olarak calistir" secenegini kullanin.
    pause
    exit /b 1
)

cd /d "%~dp0"
echo Calisma dizini: %CD%
echo.

rem Python Kontrolu
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python bulunamadi! Lutfen Python 3.8 veya ustu bir surum yukleyin.
    pause
    exit /b 1
)

echo 1. Gerekli paketler kontrol ediliyor...
pip install -r backend/youtubetranscriptservice/requirements.txt

echo 2. Playwright tarayicilari kuruluyor...
python -m playwright install chromium

echo 3. Port kontrolu yapiliyor...
rem Portları ayarla
SET PORT1=8001
SET PORT2=8051

echo 4. Transcript servisini %PORT1% ve %PORT2% portlarinda baslatiyorum...
echo.
echo Servisler hazir olunca asagidaki adreslerden test edebilirsiniz:
echo - http://localhost:%PORT1%/docs
echo - http://localhost:%PORT2%/docs
echo.

rem Birinci servisi başlat (arka planda)
start cmd /k "SET PORT=%PORT1% && python -c "import os; os.environ['PORT']='%PORT1%'; import uvicorn; uvicorn.run('backend.youtubetranscriptservice.main:app', host='0.0.0.0', port=int(os.environ['PORT']), reload=True)""

rem Ikinci servisi başlat (ön planda)
SET PORT=%PORT2%
python -c "import os; os.environ['PORT']='%PORT2%'; import uvicorn; uvicorn.run('backend.youtubetranscriptservice.main:app', host='0.0.0.0', port=int(os.environ['PORT']), reload=True)"

echo.
echo Servis kapatildi.
pause 