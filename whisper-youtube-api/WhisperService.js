const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class WhisperService {
    constructor() {
        this.supportedModels = [
            'tiny', 'tiny.en', 
            'base', 'base.en', 
            'small', 'small.en', 
            'medium', 'medium.en', 
            'large', 'large-v1', 'large-v2', 'large-v3'
        ];
        
        console.log('✅ [WHISPER] Yerel Whisper servisi başlatıldı');
    }

    // Ses dosyasını yerel Whisper ile transkribe et
    async transcribeAudio(audioFilePath, options = {}) {
        if (!(await fs.pathExists(audioFilePath))) {
            throw new Error(`Ses dosyası bulunamadı: ${audioFilePath}`);
        }

        const fileName = path.basename(audioFilePath);
        const fileStats = await fs.stat(audioFilePath);
        const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

        console.log(`🎤 [WHISPER] Ses dosyası transkribe ediliyor...`);
        console.log(`📁 [WHISPER] Dosya: ${fileName} (${fileSizeMB} MB)`);

        try {
            const startTime = Date.now();

            // Whisper parametreleri
            const model = options.model || 'base';
            const language = options.language && options.language !== 'auto' ? options.language : undefined;
            const outputFormat = 'json';
            
            console.log(`🔧 [WHISPER] Model: ${model}`);
            console.log(`🌐 [WHISPER] Dil: ${language || 'otomatik algılama'}`);

            // Yerel Whisper komutunu çalıştır
            const transcription = await this.runWhisperCommand(audioFilePath, {
                model,
                language,
                outputFormat,
                temperature: options.temperature || 0
            });

            const duration = Date.now() - startTime;
            console.log(`✅ [WHISPER] Transkripsiyon tamamlandı (${(duration / 1000).toFixed(1)}s)`);

            // Sonucu formatla
            const result = this.formatTranscriptionResult(transcription, {
                fileName,
                fileSizeMB,
                duration,
                model,
                language
            });

            return result;

        } catch (error) {
            console.error(`❌ [WHISPER] Transkripsiyon hatası: ${error.message}`);
            throw new Error(`Whisper transkripsiyon hatası: ${error.message}`);
        }
    }

    // Yerel Whisper komutunu çalıştır
    async runWhisperCommand(audioFilePath, options) {
        return new Promise((resolve, reject) => {
            // Windows için python -m whisper kullan
            const args = [
                '-m', 'whisper',
                audioFilePath,
                '--model', options.model,
                '--output_format', options.outputFormat,
                '--temperature', options.temperature.toString()
            ];

            // Dil belirtilmişse ekle
            if (options.language) {
                args.push('--language', options.language);
            }

            // Verbose JSON formatı için
            args.push('--verbose', 'True');

            console.log(`🚀 [WHISPER] Komut çalıştırılıyor: python ${args.join(' ')}`);

            const whisperProcess = spawn('python', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            whisperProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            whisperProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                // Progress bilgilerini console'a yazdır
                if (data.toString().includes('%')) {
                    console.log(`📊 [WHISPER] ${data.toString().trim()}`);
                }
            });

            whisperProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        // JSON output dosyasını oku
                        const outputDir = path.dirname(audioFilePath);
                        const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
                        const jsonFile = path.join(outputDir, `${baseName}.json`);
                        
                        if (fs.existsSync(jsonFile)) {
                            const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
                            // JSON dosyasını temizle
                            fs.unlinkSync(jsonFile);
                            resolve(jsonData);
                        } else {
                            // JSON dosyası yoksa stdout'dan parse etmeye çalış
                            resolve({ text: stdout.trim() });
                        }
                    } catch (parseError) {
                        reject(new Error(`JSON parse hatası: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Whisper hatası (kod: ${code}): ${stderr}`));
                }
            });

            whisperProcess.on('error', (error) => {
                reject(new Error(`Whisper process hatası: ${error.message}`));
            });
        });
    }

    // Transkripsiyon sonucunu formatla
    formatTranscriptionResult(transcription, metadata) {
        let segments = [];
        let fullText = '';

        // Whisper JSON formatından veri çıkar
        if (transcription.segments && Array.isArray(transcription.segments)) {
            // Verbose JSON formatı - segmentler var
            segments = transcription.segments.map(segment => ({
                id: segment.id,
                start: segment.start,
                end: segment.end,
                duration: segment.end - segment.start,
                text: segment.text.trim(),
                confidence: segment.avg_logprob || null,
                tokens: segment.tokens || []
            }));
            fullText = transcription.text || segments.map(s => s.text).join(' ');
        } else {
            // Basit text formatı
            fullText = transcription.text || transcription;
            segments = this.createBasicSegments(fullText);
        }

        return {
            success: true,
            text: fullText.trim(),
            segments: segments,
            language: transcription.language || 'unknown',
            duration: transcription.duration || null,
            wordCount: fullText.trim().split(/\s+/).length,
            characterCount: fullText.length,
            metadata: {
                fileName: metadata.fileName,
                fileSize: metadata.fileSizeMB + ' MB',
                processingTime: (metadata.duration / 1000).toFixed(1) + 's',
                model: metadata.model,
                language: metadata.language || 'auto',
                transcribedAt: new Date().toISOString(),
                whisperVersion: 'local'
            }
        };
    }

    // Basit segmentler oluştur (eğer Whisper segmentleri döndürmemişse)
    createBasicSegments(text, segmentLengthWords = 20) {
        const words = text.trim().split(/\s+/);
        const segments = [];
        
        for (let i = 0; i < words.length; i += segmentLengthWords) {
            const segmentWords = words.slice(i, i + segmentLengthWords);
            const segmentText = segmentWords.join(' ');
            
            segments.push({
                id: Math.floor(i / segmentLengthWords),
                start: (i / words.length) * 100, // Tahmini süre
                end: ((i + segmentWords.length) / words.length) * 100,
                duration: (segmentWords.length / words.length) * 100,
                text: segmentText,
                confidence: null,
                tokens: segmentWords
            });
        }
        
        return segments;
    }

    // Desteklenen ses formatlarını kontrol et
    isSupportedAudioFormat(filePath) {
        const supportedFormats = [
            '.mp3', '.mp4', '.mpeg', '.mpga', 
            '.m4a', '.wav', '.webm', '.flac', '.ogg'
        ];
        
        const ext = path.extname(filePath).toLowerCase();
        return supportedFormats.includes(ext);
    }

    // Whisper kurulumunu kontrol et
    async testWhisperInstallation() {
        return new Promise((resolve) => {
            // Python modülü olarak test et
            const whisperProcess = spawn('python', ['-m', 'whisper', '--help'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            whisperProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, message: 'Whisper kurulu ve çalışıyor' });
                } else {
                    resolve({ 
                        success: false, 
                        error: 'Whisper kurulu değil. Lütfen "pip install openai-whisper" komutunu çalıştırın.' 
                    });
                }
            });

            whisperProcess.on('error', (error) => {
                resolve({ 
                    success: false, 
                    error: `Whisper kurulu değil veya Python bulunamıyor: ${error.message}` 
                });
            });
            
            // Timeout ekle (5 saniye)
            setTimeout(() => {
                whisperProcess.kill();
                resolve({ 
                    success: false, 
                    error: 'Whisper test timeout - komut yanıt vermiyor' 
                });
            }, 5000);
        });
    }

    // Desteklenen dilleri listele
    getSupportedLanguages() {
        return {
            'auto': 'Otomatik Algılama',
            'tr': 'Türkçe',
            'en': 'İngilizce',
            'de': 'Almanca',
            'fr': 'Fransızca',
            'es': 'İspanyolca',
            'it': 'İtalyanca',
            'pt': 'Portekizce',
            'ru': 'Rusça',
            'ja': 'Japonca',
            'ko': 'Korece',
            'zh': 'Çince',
            'ar': 'Arapça',
            'hi': 'Hintçe',
            'nl': 'Hollandaca',
            'pl': 'Lehçe',
            'sv': 'İsveçce',
            'da': 'Danca',
            'no': 'Norveççe',
            'fi': 'Fince'
        };
    }

    // Desteklenen modelleri listele
    getSupportedModels() {
        return {
            'tiny': 'Tiny (En hızlı, düşük kalite)',
            'tiny.en': 'Tiny English (Sadece İngilizce)',
            'base': 'Base (Hızlı, orta kalite)',
            'base.en': 'Base English (Sadece İngilizce)',
            'small': 'Small (Dengeli hız/kalite)',
            'small.en': 'Small English (Sadece İngilizce)',
            'medium': 'Medium (Yavaş, yüksek kalite)',
            'medium.en': 'Medium English (Sadece İngilizce)',
            'large': 'Large (En yavaş, en yüksek kalite)',
            'large-v1': 'Large v1',
            'large-v2': 'Large v2',
            'large-v3': 'Large v3 (En güncel)'
        };
    }
}

module.exports = WhisperService; 