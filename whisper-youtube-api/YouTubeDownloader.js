const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class YouTubeDownloader {
    constructor() {
        this.downloadDir = path.join(__dirname, 'downloads');
        this.ensureDownloadDir();
    }

    async ensureDownloadDir() {
        await fs.ensureDir(this.downloadDir);
    }

    // YouTube URL'den video ID çıkar
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    // YouTube'dan ses indir
    async downloadAudio(videoUrl) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Geçersiz YouTube URL formatı');
        }

        // Video bilgilerini önce al
        console.log(`📋 [DOWNLOADER] ${videoId} için video bilgileri alınıyor...`);
        let videoInfo = null;
        try {
            videoInfo = await this.getVideoInfo(videoUrl);
            console.log(`📹 [DOWNLOADER] Video: ${videoInfo.title}`);
            console.log(`⏱️ [DOWNLOADER] Süre: ${Math.floor(videoInfo.duration/60)}:${String(videoInfo.duration%60).padStart(2,'0')} (${videoInfo.duration}s)`);
            
            // Video süresi kontrolü ve maliyet uyarısı
            const durationMinutes = videoInfo.duration / 60;
            const estimatedCostUSD = Math.max(1, Math.ceil(durationMinutes)) * 0.006; // Minimum 1 dakika ücretlendirilir
            const estimatedCostTRY = estimatedCostUSD * 34; // Yaklaşık TRY kuru
            
            if (videoInfo.duration > 900) { // 15 dakika = 900 saniye
                throw new Error(`Video çok uzun (${Math.floor(videoInfo.duration/60)}:${String(videoInfo.duration%60).padStart(2,'0')}). Maksimum 15 dakikalık videolar destekleniyor. Tahmini maliyet: $${estimatedCostUSD.toFixed(3)} (₺${estimatedCostTRY.toFixed(2)})`);
            } else if (videoInfo.duration > 300) { // 5 dakikadan uzun ama 15 dakikadan kısa
                console.log(`⚠️ [DOWNLOADER] Uzun video uyarısı: ${Math.floor(videoInfo.duration/60)}:${String(videoInfo.duration%60).padStart(2,'0')} - Tahmini maliyet: $${estimatedCostUSD.toFixed(3)} (₺${estimatedCostTRY.toFixed(2)})`);
            }
        } catch (error) {
            if (error.message.includes('Video çok uzun')) {
                throw error;
            }
            console.log(`⚠️ [DOWNLOADER] Video bilgileri alınamadı, devam ediliyor: ${error.message}`);
        }

        const fileName = `${uuidv4()}.mp3`;
        const outputPath = path.join(this.downloadDir, fileName);
        
        console.log(`🔽 [DOWNLOADER] ${videoId} için ses indiriliyor...`);
        console.log(`📁 [DOWNLOADER] Çıktı: ${outputPath}`);

        try {
            // yt-dlp ile ses indirme
            await this.runYtDlp(videoUrl, outputPath);
            
            // Dosyanın var olduğunu kontrol et
            if (!(await fs.pathExists(outputPath))) {
                throw new Error('Ses dosyası indirilemedi');
            }

            const stats = await fs.stat(outputPath);
            const fileSizeMB = stats.size / 1024 / 1024;
            
            console.log(`✅ [DOWNLOADER] Ses indirildi: ${fileSizeMB.toFixed(2)} MB`);

            // Dosya boyutu kontrolü (Whisper limiti 25MB)
            if (stats.size > 25 * 1024 * 1024) {
                // Dosyayı temizle
                await fs.remove(outputPath);
                throw new Error(`Dosya çok büyük (${fileSizeMB.toFixed(2)} MB). Whisper API limiti 25MB. Daha kısa video deneyin.`);
            }

            return {
                filePath: outputPath,
                fileName: fileName,
                videoId: videoId,
                fileSize: stats.size,
                videoInfo: videoInfo
            };

        } catch (error) {
            // Hata durumunda dosyayı temizle
            if (await fs.pathExists(outputPath)) {
                await fs.remove(outputPath);
            }
            throw error;
        }
    }

    // yt-dlp komutu çalıştır
    async runYtDlp(videoUrl, outputPath) {
        return new Promise((resolve, reject) => {
            // yt-dlp parametreleri - MP3 format ve orta kalite (dosya boyutu için)
            const args = [
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '5',  // Orta kalite (0=en iyi, 9=en kötü)
                '--output', outputPath,
                '--no-playlist',
                '--ignore-errors',
                videoUrl
            ];

            console.log(`🔧 [YT-DLP] Komut: yt-dlp ${args.join(' ')}`);

            const ytDlp = spawn('yt-dlp', args);
            
            let stdout = '';
            let stderr = '';

            ytDlp.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log(`📝 [YT-DLP] ${data.toString().trim()}`);
            });

            ytDlp.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log(`⚠️ [YT-DLP] ${data.toString().trim()}`);
            });

            ytDlp.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ [YT-DLP] İndirme tamamlandı`);
                    resolve();
                } else {
                    console.error(`❌ [YT-DLP] Hata kodu: ${code}`);
                    reject(new Error(`yt-dlp failed with code ${code}. stderr: ${stderr}`));
                }
            });

            ytDlp.on('error', (error) => {
                console.error(`❌ [YT-DLP] Process hatası: ${error.message}`);
                reject(new Error(`yt-dlp process error: ${error.message}`));
            });
        });
    }

    // Video bilgilerini al (opsiyonel)
    async getVideoInfo(videoUrl) {
        return new Promise((resolve, reject) => {
            const args = [
                '--dump-json',
                '--no-playlist',
                videoUrl
            ];

            const ytDlp = spawn('yt-dlp', args);
            
            let stdout = '';
            let stderr = '';

            ytDlp.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ytDlp.on('close', (code) => {
                if (code === 0) {
                    try {
                        const info = JSON.parse(stdout);
                        resolve({
                            title: info.title || 'Unknown',
                            duration: info.duration || 0,
                            uploader: info.uploader || 'Unknown',
                            view_count: info.view_count || 0
                        });
                    } catch (parseError) {
                        reject(new Error(`JSON parse error: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`yt-dlp info failed with code ${code}`));
                }
            });

            ytDlp.on('error', (error) => {
                reject(new Error(`yt-dlp info process error: ${error.message}`));
            });
        });
    }

    // İndirilen dosyayı temizle
    async cleanupFile(filePath) {
        try {
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                console.log(`🗑️ [CLEANUP] Dosya silindi: ${path.basename(filePath)}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ [CLEANUP] Dosya silinirken hata: ${error.message}`);
            return false;
        }
    }

    // Tüm geçici dosyaları temizle
    async cleanupOldFiles(maxAgeMinutes = 30) {
        try {
            const files = await fs.readdir(this.downloadDir);
            const now = Date.now();
            let cleanedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.downloadDir, file);
                const stats = await fs.stat(filePath);
                const ageMinutes = (now - stats.mtimeMs) / (1000 * 60);

                if (ageMinutes > maxAgeMinutes) {
                    await fs.remove(filePath);
                    cleanedCount++;
                    console.log(`🗑️ [CLEANUP] Eski dosya silindi: ${file}`);
                }
            }

            if (cleanedCount > 0) {
                console.log(`🗑️ [CLEANUP] ${cleanedCount} eski dosya temizlendi`);
            }

            return cleanedCount;
        } catch (error) {
            console.error(`❌ [CLEANUP] Temizlik hatası: ${error.message}`);
            return 0;
        }
    }

    // yt-dlp kurulu mu kontrol et
    async checkYtDlp() {
        return new Promise((resolve) => {
            const ytDlp = spawn('yt-dlp', ['--version']);
            
            ytDlp.on('close', (code) => {
                resolve(code === 0);
            });

            ytDlp.on('error', () => {
                resolve(false);
            });
        });
    }
}

module.exports = YouTubeDownloader; 