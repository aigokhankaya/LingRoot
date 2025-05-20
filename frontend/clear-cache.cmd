@echo off
echo Next.js Cache Temizleme ve Restart
echo.

echo 1. Next.js uygulamasını durdurma...
taskkill /f /im node.exe

echo 2. .next klasörünü temizleme...
if exist .next rmdir /s /q .next

echo 3. node_modules\.cache klasörünü temizleme...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo 4. .env.local dosyasını tekrar oluşturma...
echo NEXT_PUBLIC_API_URL=http://localhost:5001 > .env.local

echo 5. Yerel browser cache temizleme talimatları:
echo - Chrome: CTRL+SHIFT+DELETE
echo - Firefox: CTRL+SHIFT+DELETE
echo - Edge: CTRL+SHIFT+DELETE

echo 6. Next.js yeniden başlatma...
echo.
echo Uygulamayı yeniden başlatmak için enter tuşuna basın...
pause
npm run dev 