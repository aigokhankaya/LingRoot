@echo off
echo 🎯 Yerel Whisper Kurulum Script'i
echo ================================

echo.
echo 🔧 Python kontrolu yapiliyor...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python kurulu degil! Lutfen Python 3.8+ kurunuz:
    echo    https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✅ Python mevcut

echo.
echo 🔧 pip kontrolu yapiliyor...
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip kurulu degil!
    pause
    exit /b 1
)
echo ✅ pip mevcut

echo.
echo 📦 Whisper kuruluyor...
pip install openai-whisper
if errorlevel 1 (
    echo ❌ Whisper kurulumu basarisiz!
    pause
    exit /b 1
)

echo.
echo 📦 Ek bagimliliklar kuruluyor...
pip install torch torchaudio

echo.
echo 🎵 FFmpeg kontrolu...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ FFmpeg kurulu degil. Ses isleme icin gerekli!
    echo    Windows: winget install ffmpeg
    echo    Chocolatey: choco install ffmpeg
) else (
    echo ✅ FFmpeg mevcut
)

echo.
echo 🧪 Whisper test ediliyor...
whisper --help >nul 2>&1
if errorlevel 1 (
    echo ❌ Whisper calismiyor!
    pause
    exit /b 1
)

echo.
echo ✅ Kurulum tamamlandi!
echo 🚀 Artik "npm start" ile sunucuyu baslatabilirsiniz
echo 💰 Hicbir API ucreti yok - tamamen ucretsiz!
echo.
pause 