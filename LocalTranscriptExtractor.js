const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

class LocalTranscriptExtractor {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        this.extractionMethods = [
            this.extractViaInternalAPI,
            this.extractViaPageScraping,
            this.extractViaSubtitleFiles
        ];
    }

    async extract(videoUrl) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Geçersiz YouTube URL formatı');
        }

        console.log(`🎬 [LOCAL] Video ID: ${videoId} için transcript çıkarılıyor...`);
        
        let lastError = null;
        
        for (let i = 0; i < this.extractionMethods.length; i++) {
            const method = this.extractionMethods[i];
            const methodName = method.name;
            
            console.log(`📝 [LOCAL] Method ${i + 1}/${this.extractionMethods.length}: ${methodName}`);
            
            try {
                const result = await method.call(this, videoId);
                
                if (result && result.transcript && result.transcript.length > 0) {
                    console.log(`✅ [LOCAL] Başarılı! ${methodName} ile ${result.transcript.length} segment bulundu`);
                    return {
                        success: true,
                        videoId,
                        method: methodName,
                        extractedAt: new Date().toISOString(),
                        ...result
                    };
                }
            } catch (error) {
                console.log(`❌ [LOCAL] ${methodName} başarısız: ${error.message}`);
                lastError = error;
                await this.sleep(1000);
            }
        }

        throw new Error(`Tüm local yöntemler başarısız oldu. Son hata: ${lastError?.message || 'Bilinmeyen hata'}`);
    }

    async extractViaInternalAPI(videoId) {
        console.log(`🔍 [INTERNAL API] ${videoId} için internal API deneniyor...`);
        
        const userAgent = this.getRandomUserAgent();
        
        try {
            const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const pageResponse = await axios.get(videoPageUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            });

            const $ = cheerio.load(pageResponse.data);
            
            const title = $('meta[name="title"]').attr('content') || 
                         $('meta[property="og:title"]').attr('content') || 
                         $('title').text().replace(' - YouTube', '') ||
                         `Video ${videoId}`;

            const scriptTags = $('script').toArray();
            let ytInitialPlayerResponse = null;

            for (const script of scriptTags) {
                const content = $(script).html();
                if (!content) continue;

                if (content.includes('ytInitialPlayerResponse')) {
                    const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
                    if (match) {
                        try {
                            ytInitialPlayerResponse = JSON.parse(match[1]);
                            break;
                        } catch (e) {}
                    }
                }
            }

            if (ytInitialPlayerResponse && ytInitialPlayerResponse.captions) {
                const captionTracks = ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;
                
                if (captionTracks && captionTracks.length > 0) {
                    const track = captionTracks[0];
                    const captionUrl = track.baseUrl;
                    
                    if (captionUrl) {
                        console.log(`📄 [INTERNAL API] Caption URL bulundu`);
                        
                        const captionResponse = await axios.get(captionUrl, {
                            headers: { 'User-Agent': userAgent },
                            timeout: 10000
                        });

                        const transcript = this.parseCaptionData(captionResponse.data);
                        
                        if (transcript.length > 0) {
                            return {
                                transcript,
                                title,
                                language: track.languageCode || 'auto',
                                source: 'internal-api-captions'
                            };
                        }
                    }
                }
            }

            throw new Error('Internal API\'den caption verileri alınamadı');

        } catch (error) {
            throw new Error(`Internal API hatası: ${error.message}`);
        }
    }

    async extractViaPageScraping(videoId) {
        console.log(`🔍 [SCRAPING] ${videoId} için sayfa scraping deneniyor...`);
        
        const userAgent = this.getRandomUserAgent();
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        try {
            const response = await axios.get(videoUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            
            const title = $('meta[property="og:title"]').attr('content') || 
                         $('title').text().replace(' - YouTube', '') ||
                         `Video ${videoId}`;

            const scripts = $('script').toArray();
            
            for (const script of scripts) {
                const content = $(script).html();
                if (!content) continue;

                if (content.includes('"captions"') || content.includes('transcriptRenderer')) {
                    try {
                        const segments = this.extractTranscriptFromScript(content);
                        if (segments.length > 0) {
                            return {
                                transcript: segments,
                                title,
                                language: 'auto',
                                source: 'page-scraping'
                            };
                        }
                    } catch (e) {
                        console.log(`📄 [SCRAPING] Script parse hatası: ${e.message}`);
                    }
                }
            }

            throw new Error('Sayfa scraping\'den transcript verileri bulunamadı');

        } catch (error) {
            throw new Error(`Sayfa scraping hatası: ${error.message}`);
        }
    }

    async extractViaSubtitleFiles(videoId) {
        console.log(`🔍 [SUBTITLE] ${videoId} için subtitle dosyaları aranıyor...`);
        
        const userAgent = this.getRandomUserAgent();
        
        try {
            const infoUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}&el=embedded&ps=default&eurl=&gl=US&hl=en`;
            
            const response = await axios.get(infoUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': '*/*',
                    'Referer': 'https://www.youtube.com/'
                },
                timeout: 10000
            });

            const data = new URLSearchParams(response.data);
            const playerResponse = data.get('player_response');
            
            if (playerResponse) {
                const playerData = JSON.parse(playerResponse);
                
                const videoDetails = playerData.videoDetails;
                const title = videoDetails?.title || `Video ${videoId}`;
                
                const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                
                if (captionTracks && captionTracks.length > 0) {
                    const track = captionTracks[0];
                    const subtitleUrl = track.baseUrl;
                    
                    if (subtitleUrl) {
                        console.log(`📄 [SUBTITLE] Subtitle URL bulundu`);
                        
                        const subtitleResponse = await axios.get(subtitleUrl, {
                            headers: { 'User-Agent': userAgent },
                            timeout: 10000
                        });

                        const transcript = this.parseCaptionData(subtitleResponse.data);
                        
                        if (transcript.length > 0) {
                            return {
                                transcript,
                                title,
                                language: track.languageCode || 'auto',
                                source: 'subtitle-files'
                            };
                        }
                    }
                }
            }

            throw new Error('Subtitle dosyaları bulunamadı');

        } catch (error) {
            throw new Error(`Subtitle dosya hatası: ${error.message}`);
        }
    }

    parseCaptionData(data) {
        const segments = [];
        
        try {
            if (data.includes('<?xml') || data.includes('<transcript>')) {
                const $ = cheerio.load(data, { xmlMode: true });
                
                $('text').each((index, element) => {
                    const $element = $(element);
                    const start = parseFloat($element.attr('start')) || 0;
                    const dur = parseFloat($element.attr('dur')) || 3;
                    const text = $element.text().trim();
                    
                    if (text) {
                        segments.push({
                            start: start,
                            duration: dur,
                            text: this.cleanText(text)
                        });
                    }
                });
            }
            else if (data.includes('"text"') && data.includes('"start"')) {
                const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
                
                if (jsonData.events) {
                    jsonData.events.forEach(event => {
                        if (event.segs) {
                            event.segs.forEach(seg => {
                                if (seg.utf8) {
                                    segments.push({
                                        start: parseFloat(event.tStartMs) / 1000 || 0,
                                        duration: parseFloat(event.dDurationMs) / 1000 || 3,
                                        text: this.cleanText(seg.utf8)
                                    });
                                }
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.log(`📄 Caption parse hatası: ${error.message}`);
        }
        
        return segments;
    }

    extractTranscriptFromScript(scriptContent) {
        const segments = [];
        
        try {
            const transcriptMatch = scriptContent.match(/"transcriptRenderer":\s*{[^}]+}/);
            if (transcriptMatch) {
                const transcriptData = JSON.parse(`{${transcriptMatch[0]}}`);
                // Transcript verilerini işle...
            }
            
            const captionsMatch = scriptContent.match(/"captions":\s*({[^}]+})/);
            if (captionsMatch) {
                const captionsData = JSON.parse(captionsMatch[1]);
                // Caption verilerini işle...
            }
            
        } catch (error) {
            console.log(`Script extraction hatası: ${error.message}`);
        }
        
        return segments;
    }

    cleanText(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

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

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = LocalTranscriptExtractor; 