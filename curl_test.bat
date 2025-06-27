@echo off
echo Testing YouTube Transcript API...
echo.
curl -X POST http://localhost:5001/api/content/youtube-transcript ^
     -H "Content-Type: application/json" ^
     -d "{\"youtubeUrl\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}" ^
     --verbose
echo.
pause 