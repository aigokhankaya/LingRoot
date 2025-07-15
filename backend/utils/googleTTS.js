const textToSpeech = require('@google-cloud/text-to-speech');
const logger = require('./logger');

// Google TTS Client
let ttsClient;

try {
  ttsClient = new textToSpeech.TextToSpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  logger.info('Google TTS client initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Google TTS client:', error.message);
  ttsClient = null;
}

/**
 * Metni noktalama işaretlerinden temizler ve sadece kelimeleri döndürür
 * @param {string} text - Temizlenecek metin
 * @returns {Object} Temizlenmiş kelimeler ve orijinal kelimeler
 */
function cleanTextForTiming(text) {
  // Orijinal kelimeleri sakla (noktalama ile)
  const originalWords = text.split(/\s+/).filter(word => word.length > 0);
  
  // Noktalama işaretlerini temizle - sadece harf ve sayıları bırak
  const cleanWords = originalWords.map(word => {
    return word.replace(/[^\w]/g, '').trim();
  }).filter(word => word.length > 0);
  
  return {
    originalWords,
    cleanWords,
    mapping: originalWords.map((original, index) => ({
      original,
      clean: original.replace(/[^\w]/g, '').trim(),
      index
    })).filter(item => item.clean.length > 0)
  };
}

/**
 * Metni SSML formatına çevirir ve her temiz kelime için tek timing mark ekler
 * @param {string} text - Çevrilecek metin
 * @returns {Object} SSML metin ve kelime mapping bilgisi
 */
function generateSSMLWithOptimizedMarks(text) {
  // SSML için özel karakterleri escape et
  const escapeSSML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  const { originalWords, cleanWords, mapping } = cleanTextForTiming(text);
  
  let ssml = '<speak>';
  let cleanWordIndex = 0;
  
  // Orijinal kelimeler üzerinde dolaş ama sadece temiz kelimeler için mark ekle
  originalWords.forEach((originalWord, originalIndex) => {
    const cleanWord = originalWord.replace(/[^\w]/g, '').trim();
    
    if (cleanWord.length > 0) {
      // Temiz kelime için mark ekle
      ssml += `<mark name="word_${cleanWordIndex}"/>`;
      cleanWordIndex++;
    }
    
    // Orijinal kelimeyi (noktalama ile birlikte) ekle
    ssml += escapeSSML(originalWord);
    
    // Kelimeler arası boşluk (son kelime değilse)
    if (originalIndex < originalWords.length - 1) {
      ssml += ' ';
    }
  });
  
  ssml += '</speak>';
  
  console.log(`🎯 SSML Generated: ${cleanWords.length} clean words, ${originalWords.length} original words`);
  console.log(`📝 Clean words: ${cleanWords.slice(0, 10).join(', ')}${cleanWords.length > 10 ? '...' : ''}`);
  
  return {
    ssml,
    cleanWords,
    originalWords,
    mapping
  };
}

/**
 * Google TTS destekli sesleri getirir - SSML desteği bilgisi ile
 * @param {string} [languageCode] - opsiyonel, sadece belirli bir dil için
 * @returns {Promise<Array>} Array of voice objects with SSML support info
 */
async function listGoogleVoices(languageCode = 'en-US') {
  if (!ttsClient) {
    throw new Error('Google TTS client not initialized');
  }

  try {
    logger.info(`Fetching Google TTS voices for language: ${languageCode}`);
    
    const [result] = await ttsClient.listVoices({
      languageCode: languageCode
    });

    // SSML desteklemeyen sesler listesi
    const ssmlUnsupportedVoices = ['Journey', 'Chirp', 'Studio'];

    const voices = result.voices.map(voice => {
      // SSML desteği kontrolü
      const ssmlSupport = !ssmlUnsupportedVoices.some(unsupported => voice.name.includes(unsupported));
      
      // Kategorileri belirle
      let package, emotion, accent;
      
      // Paket belirleme
      if (voice.name.includes('Journey')) {
        package = 'Premium';
        emotion = 'Natural';
      } else if (voice.name.includes('Chirp')) {
        package = 'Gold';
        emotion = 'Advanced';
      } else if (voice.name.includes('Studio')) {
        package = 'Platinum';
        emotion = 'Professional';
      } else if (voice.name.includes('Wavenet')) {
        package = 'Premium';
        emotion = 'Natural';
      } else if (voice.name.includes('Neural2')) {
        package = 'Premium';
        emotion = 'Advanced';
      } else if (voice.name.includes('Standard')) {
        package = 'Basic';
        emotion = 'Standard';
      } else {
        package = 'Basic';
        emotion = 'Standard';
      }
      
      // Accent belirleme (dil kodundan)
      accent = 'GENERIC';
      if (voice.languageCodes && voice.languageCodes.length > 0) {
        const langParts = voice.languageCodes[0].split('-');
        if (langParts.length > 1) {
          accent = langParts[1].toUpperCase();
        }
      }

      return {
        name: voice.name,
        displayName: voice.name.replace(/^[a-z]{2}-[A-Z]{2}-/, ''),
        languageCode: voice.languageCodes && voice.languageCodes.length > 0 ? voice.languageCodes[0] : 'en-US',
        languageCodes: voice.languageCodes || ['en-US'],
        gender: voice.ssmlGender,
        ssmlGender: voice.ssmlGender,
        ssmlSupport: ssmlSupport,
        package: package,
        emotion: emotion,
        accent: accent,
        naturalSampleRateHertz: voice.naturalSampleRateHertz
      };
    });

    const ssmlSupportedCount = voices.filter(v => v.ssmlSupport).length;
    const ssmlUnsupportedCount = voices.filter(v => !v.ssmlSupport).length;

    logger.info(`Retrieved ${voices.length} voices for ${languageCode}:`);
    logger.info(`- SSML supported: ${ssmlSupportedCount}`);
    logger.info(`- SSML unsupported: ${ssmlUnsupportedCount}`);
    
    return voices;
    
  } catch (error) {
    logger.error(`Failed to list Google TTS voices: ${error.message}`);
    throw error;
  }
}

/**
 * Belirli bir voice'ın gerçek gender'ını Google TTS API'den getirir
 * @param {string} voiceName - Ses adı (örn: en-GB-Neural2-C)
 * @returns {Promise<string>} Voice'ın gerçek gender'ı (MALE/FEMALE/NEUTRAL)
 */
async function getVoiceGender(voiceName) {
  try {
    // Voice adından language code'u çıkar
    const languageCode = voiceName.split('-').slice(0, 2).join('-');
    logger.info(`🔍 [GENDER DETECTION] Looking for ${voiceName} in language: ${languageCode}`);
    
    // O dil için tüm sesleri getir
    const voices = await listGoogleVoices(languageCode);
    logger.info(`🔍 [GENDER DETECTION] Retrieved ${voices.length} voices for ${languageCode}`);
    
    // İstenen voice'ı bul
    const voice = voices.find(v => v.name === voiceName);
    
    if (voice && voice.ssmlGender) {
      logger.info(`🎯 [GENDER DETECTION] Found real gender for ${voiceName}: ${voice.ssmlGender}`);
      return voice.ssmlGender;
    } else {
      // Chirp sesler için özel debug
      if (voiceName.includes('Chirp') || voiceName.includes('Journey')) {
        logger.warn(`🔴 [CHIRP DEBUG] Voice ${voiceName} not found in Google API`);
        
        // Chirp seslerini listele
        const chirpVoices = voices.filter(v => v.name.includes('Chirp') || v.name.includes('Journey'));
        logger.warn(`🔴 [CHIRP DEBUG] Available Chirp voices: ${chirpVoices.map(v => v.name).join(', ')}`);
        
        // Exact match kontrol
        const exactMatch = voices.find(v => v.name === voiceName);
        if (exactMatch) {
          logger.warn(`🔴 [CHIRP DEBUG] Found voice but gender missing: ${JSON.stringify(exactMatch)}`);
        }
      }
      
      logger.warn(`🔴 Voice ${voiceName} not found in Google API, using NEUTRAL`);
      return 'NEUTRAL';
    }
  } catch (error) {
    logger.error(`🔴 Error getting voice gender for ${voiceName}: ${error.message}`);
    return 'NEUTRAL';
  }
}

/**
 * Google TTS ile metin sentezler - optimized timing marks ile
 * @param {Object} options - TTS seçenekleri
 * @param {string} options.text - Sentezlenecek metin
 * @param {string} options.voiceName - Ses adı 
 * @param {string} options.languageCode - Dil kodu
 * @param {number} options.speakingRate - Konuşma hızı (0.25-4.0)
 * @returns {Object} Audio buffer ve timing bilgileri
 */
async function synthesizeWithGoogle(options) {
  if (!ttsClient) {
    throw new Error('Google TTS client not initialized');
  }

  const { text, voiceName = 'en-US-Standard-C', languageCode = 'en-US', speakingRate = 1.0, ssmlGender = 'NEUTRAL' } = options;
  
  logger.info(`🎯 Google TTS synthesis - Voice: ${voiceName}, Rate: ${speakingRate}x, Length: ${text.length} chars`);
  
  try {
    // Bazı sesler SSML desteklemez (Journey, Chirp, Studio gibi)
    const ssmlUnsupportedVoices = ['Journey', 'Chirp', 'Studio'];
    const isSSMLUnsupported = ssmlUnsupportedVoices.some(unsupported => voiceName.includes(unsupported));
    
    if (isSSMLUnsupported) {
      logger.info(`Voice ${voiceName} doesn't support SSML, using fallback immediately`);
      throw new Error('SSML not supported for this voice');
    }
    
    // Optimized SSML ile timing marks ekle
    const ssmlData = generateSSMLWithOptimizedMarks(text);
    logger.debug('🎯 Generated optimized SSML:', ssmlData.ssml.substring(0, 200) + '...');
    
    // 🔥 ÖNEMLİ: Google TTS API'den gerçek voice gender'ını al
    let correctGender = ssmlGender;
    if (!correctGender || correctGender === 'NEUTRAL') {
      correctGender = await getVoiceGender(voiceName);
      logger.info(`🎯 Using real gender from Google API: ${correctGender} for voice: ${voiceName}`);
    }
    
    // TTS request configuration - kesin senkronizasyon için optimize edildi
    const request = {
      input: { ssml: ssmlData.ssml },
      voice: { 
        languageCode: languageCode || 'en-US',
        name: voiceName || 'en-US-Standard-C',
        ssmlGender: correctGender
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: speakingRate || 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
        sampleRateHertz: 24000, // Yeterli kalite için 24kHz
        effectsProfileId: ['telephony-class-application']
      },
      // Timing mark'larını etkinleştir
      enableTimePointing: ['SSML_MARK']
    };



            const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Timing bilgilerini parse et
    const timingMarks = response.timepoints || [];
    
    // Kelime timing'lerini hesapla - temiz kelimelerle
    const wordTimings = [];
    
    for (let i = 0; i < ssmlData.cleanWords.length; i++) {
      const markName = `word_${i}`;
      const startMark = timingMarks.find(mark => mark.markName === markName);
      
      if (startMark) {
        let endTime;
        
        // Sonraki kelime var mı kontrol et
        const nextMarkName = `word_${i + 1}`;
        const nextMark = timingMarks.find(mark => mark.markName === nextMarkName);
        
        if (nextMark) {
          endTime = nextMark.timeSeconds;
        } else {
          // Son kelime için ortalama kelime süresini kullan
          const avgWordDuration = 0.5 / speakingRate; // 500ms base duration
          endTime = startMark.timeSeconds + avgWordDuration;
        }
        
        // Minimum kelime süresi garantisi
        const minWordDuration = 0.1 / speakingRate; // 100ms minimum
        if (endTime - startMark.timeSeconds < minWordDuration) {
          endTime = startMark.timeSeconds + minWordDuration;
        }
        
        wordTimings.push({
          word: ssmlData.cleanWords[i],
          timeSeconds: startMark.timeSeconds,
          endTimeSeconds: endTime,
          markName: markName,
          hasDirectTiming: true
        });
        
        // İlk 5 kelime için detaylı log
        if (i < 5) {
          logger.info(`🎯 Word ${i}: "${ssmlData.cleanWords[i]}" | ${startMark.timeSeconds.toFixed(3)}s - ${endTime.toFixed(3)}s`);
        }
      } else {
        // Fallback timing hesaplama
        const totalEstimatedDuration = ssmlData.cleanWords.length * (0.5 / speakingRate);
        const startTime = (i / ssmlData.cleanWords.length) * totalEstimatedDuration;
        const endTime = ((i + 1) / ssmlData.cleanWords.length) * totalEstimatedDuration;
        
        wordTimings.push({
          word: ssmlData.cleanWords[i],
          timeSeconds: startTime,
          endTimeSeconds: endTime,
          markName: markName,
          hasDirectTiming: false
        });
        
        if (i < 5) {
          logger.warn(`🎯 FALLBACK Word ${i}: "${ssmlData.cleanWords[i]}" | ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
        }
      }
    }
    
    // Total duration hesaplama
    const totalDuration = wordTimings.length > 0 
      ? Math.max(...wordTimings.map(w => w.endTimeSeconds))
      : (ssmlData.cleanWords.length * (0.5 / speakingRate));
    
    // Timing kalitesi analizi
    const timingQuality = {
      totalWords: ssmlData.cleanWords.length,
      markedWords: wordTimings.filter(w => w.hasDirectTiming).length,
      fallbackWords: wordTimings.filter(w => !w.hasDirectTiming).length,
      totalMarks: timingMarks.length,
      expectedMarks: ssmlData.cleanWords.length,
      markAccuracy: (timingMarks.length / ssmlData.cleanWords.length) * 100,
      avgWordDuration: wordTimings.reduce((sum, w) => sum + (w.endTimeSeconds - w.timeSeconds), 0) / wordTimings.length
    };
    
    logger.info(`🎯 Google TTS synthesis completed:
      - Duration: ${totalDuration.toFixed(3)}s
      - Clean words: ${ssmlData.cleanWords.length}
      - Marked words: ${timingQuality.markedWords}/${timingQuality.totalWords} (${timingQuality.markAccuracy.toFixed(1)}%)
      - Audio size: ${response.audioContent.length} bytes
      - Average word duration: ${(timingQuality.avgWordDuration * 1000).toFixed(0)}ms`);
    
    return {
      audioContent: response.audioContent,
      wordTimings: wordTimings,
      cleanWords: ssmlData.cleanWords,
      originalWords: ssmlData.originalWords,
      wordMapping: ssmlData.mapping,
      totalDuration: totalDuration,
      speakingRate: speakingRate,
      voiceName: voiceName,
      actualGender: correctGender, // Gerçek kullanılan gender'ı döndür
      timingMethod: 'Google TTS Timepoints',
      ssmlMarks: timingMarks,
      timingQuality: timingQuality,
      success: true
    };
    
  } catch (error) {
    logger.error(`Google TTS synthesis failed: ${error.message}`);
    
    // SSML, Gender neutral veya diğer voice compatibility hatalarında fallback dene
    if (error.message.includes('SSML') || 
        error.message.includes('mark') || 
        error.message.includes('Gender neutral') ||
        error.message.includes('not supported') ||
        error.message.includes('INVALID_ARGUMENT')) {
      
      logger.info('Retrying with fallback configuration (plain text + compatible gender)...');
      
      try {
        const { cleanWords } = cleanTextForTiming(text);
        const plainText = cleanWords.join(' ');
        
        // 🔥 ÖNEMLİ: Fallback'te de gerçek gender'ı kullan  
        logger.info(`🔄 [CHIRP FALLBACK] Getting gender for voice: ${voiceName}`);
        let fallbackGender = await getVoiceGender(voiceName);
        logger.info(`🔄 [CHIRP FALLBACK] getVoiceGender returned: ${fallbackGender}`);
        
        if (!fallbackGender || fallbackGender === 'NEUTRAL') {
          logger.warn(`🔄 [CHIRP FALLBACK] Gender was ${fallbackGender}, using default FEMALE`);
          fallbackGender = 'FEMALE'; // Varsayılan olarak FEMALE kullan
        }
        
        logger.info(`🔄 [CHIRP FALLBACK] Final gender for ${voiceName}: ${fallbackGender}`);
        
        const request = {
          input: { text: plainText },
          voice: { 
            languageCode: languageCode || 'en-US',
            name: voiceName || 'en-US-Standard-C',
            ssmlGender: fallbackGender
          },
          audioConfig: { 
            audioEncoding: 'MP3',
            speakingRate: speakingRate || 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
            sampleRateHertz: 24000
          }
        };



        const [response] = await ttsClient.synthesizeSpeech(request);
        
        // Fallback timing - eşit dağıtım
        const estimatedDuration = cleanWords.length * (0.5 / speakingRate);
        const wordTimings = cleanWords.map((word, index) => ({
          word: word,
          timeSeconds: (index / cleanWords.length) * estimatedDuration,
          endTimeSeconds: ((index + 1) / cleanWords.length) * estimatedDuration,
          markName: `word_${index}`,
          hasDirectTiming: false
        }));
        
        logger.info(`🔄 Fallback Success - Voice: ${voiceName}, Gender: ${fallbackGender}, Audio size: ${response.audioContent.length} bytes`);
        
        return {
          audioContent: response.audioContent,
          wordTimings: wordTimings,
          cleanWords: cleanWords,
          originalWords: text.split(/\s+/).filter(word => word.length > 0),
          totalDuration: estimatedDuration,
          speakingRate: speakingRate,
          voiceName: voiceName,
          actualGender: fallbackGender, // Gerçek kullanılan gender'ı döndür
          timingMethod: 'Fallback Linear',
          fallbackUsed: true,
          success: true
        };
        
      } catch (fallbackError) {
        logger.error(`Fallback TTS also failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
}

module.exports = {
  synthesizeWithGoogle,
  listGoogleVoices,
  getVoiceGender,
  generateSSMLWithOptimizedMarks
}; 