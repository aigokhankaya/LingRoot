#!/bin/bash

echo "🎯 Yerel Whisper Kurulum Script'i"
echo "================================"

# Python kontrolü
echo ""
echo "🔧 Python kontrolü yapılıyor..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 kurulu değil! Lütfen Python 3.8+ kurun:"
    echo "   Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "   macOS: brew install python3"
    echo "   CentOS/RHEL: sudo yum install python3 python3-pip"
    exit 1
fi
echo "✅ Python3 mevcut: $(python3 --version)"

# pip kontrolü
echo ""
echo "🔧 pip kontrolü yapılıyor..."
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 kurulu değil!"
    exit 1
fi
echo "✅ pip3 mevcut: $(pip3 --version)"

# Whisper kurulumu
echo ""
echo "📦 Whisper kuruluyor..."
if ! pip3 install openai-whisper; then
    echo "❌ Whisper kurulumu başarısız!"
    exit 1
fi

# Ek bağımlılıklar
echo ""
echo "📦 Ek bağımlılıklar kuruluyor..."
pip3 install torch torchaudio

# FFmpeg kontrolü
echo ""
echo "🎵 FFmpeg kontrolü..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️ FFmpeg kurulu değil. Ses işleme için gerekli!"
    echo "   Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   macOS: brew install ffmpeg"
    echo "   CentOS/RHEL: sudo yum install ffmpeg"
else
    echo "✅ FFmpeg mevcut: $(ffmpeg -version | head -n1)"
fi

# Whisper testi
echo ""
echo "🧪 Whisper test ediliyor..."
if ! whisper --help &> /dev/null; then
    echo "❌ Whisper çalışmıyor!"
    exit 1
fi

echo ""
echo "✅ Kurulum tamamlandı!"
echo "🚀 Artık 'npm start' ile sunucuyu başlatabilirsiniz"
echo "💰 Hiçbir API ücreti yok - tamamen ücretsiz!" 