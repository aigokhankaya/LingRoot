const express = require('express');
const cors = require('cors');
const YouTubeDownloader = require('./YouTubeDownloader');
const WhisperService = require('./WhisperService');

const app = express();
const PORT = process.env.PORT || 3005;

const downloader = new YouTubeDownloader();
const whisper = new WhisperService();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
    const ytDlpAvailable = await downloader.checkYtDlp();
    const whisperTest = await whisper.testWhisperInstallation();
    
    res.json({
        status: 'healthy',
        service: 'YouTube Whisper API (Local)',
        yt_dlp: ytDlpAvailable,
        whisper: whisperTest.success,
        whisperError: whisperTest.error || null,
        version: '2.0.0-local'
    });
});

app.post('/transcribe', async (req, res) => {
    let audioFilePath = null;
    
    try {
        const { url, model = 'base', language = 'auto', temperature = 0 } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL gerekli' });
        }

        console.log('Ses indiriliyor...');
        const downloadResult = await downloader.downloadAudio(url);
        audioFilePath = downloadResult.filePath;

        // Video bilgilerini downloadResult'tan al
        const videoInfo = downloadResult.videoInfo;

        console.log('Yerel Whisper ile transkribe ediliyor...');
        const transcriptionResult = await whisper.transcribeAudio(audioFilePath, {
            model,
            language: language === 'auto' ? undefined : language,
            temperature
        });

        await downloader.cleanupFile(audioFilePath);

        // Süre bilgileri
        const videoDurationMinutes = videoInfo ? (videoInfo.duration / 60) : 0;

        res.json({
            success: true,
            videoId: downloadResult.videoId,
            title: videoInfo?.title || `Video ${downloadResult.videoId}`,
            transcript: transcriptionResult.text,
            segments: transcriptionResult.segments,
            language: transcriptionResult.language,
            duration: {
                seconds: videoInfo?.duration || 0,
                minutes: videoDurationMinutes.toFixed(2),
                formatted: `${Math.floor(videoDurationMinutes)}:${String(Math.floor((videoDurationMinutes % 1) * 60)).padStart(2, '0')}`
            },
            statistics: {
                wordCount: transcriptionResult.wordCount,
                characterCount: transcriptionResult.characterCount,
                segmentCount: transcriptionResult.segments?.length || 0
            },
            processing: {
                extractedAt: new Date().toISOString(),
                model: model,
                source: 'youtube-whisper-api-local',
                whisperVersion: 'local',
                language: language
            }
        });

    } catch (error) {
        if (audioFilePath) await downloader.cleanupFile(audioFilePath);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Video bilgilerini al
app.post('/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL gerekli' });
        }

        console.log('Video bilgileri alınıyor:', url);
        const videoInfo = await downloader.getVideoInfo(url);

        const durationMinutes = videoInfo.duration / 60;

        res.json({
            title: videoInfo.title,
            duration: videoInfo.duration,
            durationFormatted: `${Math.floor(durationMinutes)}:${String(Math.floor((durationMinutes % 1) * 60)).padStart(2, '0')}`,
            uploader: videoInfo.uploader,
            view_count: videoInfo.view_count,
            estimated_processing_time: `${Math.ceil(durationMinutes * 0.1)}-${Math.ceil(durationMinutes * 0.3)} dakika`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Desteklenen modelleri listele
app.get('/models', (req, res) => {
    res.json({
        models: whisper.getSupportedModels(),
        recommended: 'base',
        fastest: 'tiny',
        best_quality: 'large-v3'
    });
});

// Desteklenen dilleri listele
app.get('/languages', (req, res) => {
    res.json({
        languages: whisper.getSupportedLanguages()
    });
});

app.listen(PORT, () => {
    console.log('YouTube Whisper API v2.0 (Local)');
    console.log('Server: http://localhost:' + PORT);
    console.log('Health: http://localhost:' + PORT + '/health');
    console.log('Video Info: http://localhost:' + PORT + '/video-info');
    console.log('Models: http://localhost:' + PORT + '/models');
    console.log('Languages: http://localhost:' + PORT + '/languages');
    console.log('');
    console.log('🎯 Yerel Whisper kullanılıyor - OpenAI API gerekmez!');
});
