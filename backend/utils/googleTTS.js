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
 * Metni SSML formatına çevirir ve her kelime için timing mark'ı ekler
 * @param {string} text - Çevrilecek metin
 * @returns {string} SSML formatlı metin
 */
function generateSSMLWithTimingMarks(text) {
  // SSML için özel karakterleri escape et
  const escapeSSML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  let ssml = '<speak>';
  
  words.forEach((word, index) => {
    // Her kelimeden önce mark ekle
    ssml += `<mark name="word_${index}"/>`;
    
    // Kelimeyi escape ederek ekle
    ssml += escapeSSML(word);
    
    // Son kelime değilse boşluk ekle
    if (index < words.length - 1) {
      ssml += ' ';
    }
  });
  
  // Son kelimeden sonra da mark ekle
  ssml += `<mark name="word_${words.length}"/></speak>`;
  
  return ssml;
}

/**
 * Google TTS ile metin sentezler - timing marks ile
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

  const { text, voiceName = 'en-US-Standard-C', languageCode = 'en-US', speakingRate = 1.0 } = options;
  
  logger.info(`Google TTS synthesis starting - Voice: ${voiceName}, Rate: ${speakingRate}x, Length: ${text.length} chars`);
  
  try {
    // Bazı sesler SSML desteklemez (Journey, Chirp gibi)
    const ssmlUnsupportedVoices = ['Journey', 'Chirp'];
    const isSSMLUnsupported = ssmlUnsupportedVoices.some(unsupported => voiceName.includes(unsupported));
    
    if (isSSMLUnsupported) {
      logger.info(`Voice ${voiceName} doesn't support SSML, using fallback immediately`);
      throw new Error('SSML not supported for this voice');
    }
    
    // SSML ile timing marks ekle
    const ssmlText = generateSSMLWithTimingMarks(text);
    logger.debug('Generated SSML:', ssmlText.substring(0, 200) + '...');
    
    const request = {
      input: { ssml: ssmlText },
      voice: { 
        languageCode, 
        name: voiceName 
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        sampleRateHertz: 24000,
        effectsProfileId: ['headphone-class-device'] // Daha iyi ses kalitesi
      },
      // Timing bilgilerini de iste
      enableTimePointing: ['SSML_MARK']
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Timing bilgilerini parse et
    const timingMarks = response.timepoints || [];
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    // Her kelime için timing bilgisi oluştur
    const wordTimings = [];
    for (let i = 0; i < words.length; i++) {
      const currentMark = timingMarks.find(mark => mark.markName === `word_${i}`);
      const nextMark = timingMarks.find(mark => mark.markName === `word_${i + 1}`);
      
      if (currentMark) {
        const startTime = currentMark.timeSeconds || (i * speakingRate);
        const endTime = nextMark ? nextMark.timeSeconds : (startTime + (words[i].length * 0.1));
        
        wordTimings.push({
          word: words[i],
          startTime: startTime,
          endTime: endTime,
          markName: `word_${i}`
        });
      }
    }
    
    // Toplam süreyi hesapla
    const totalDuration = wordTimings.length > 0 
      ? Math.max(...wordTimings.map(w => w.endTime))
      : (words.length * speakingRate * 0.5); // Fallback hesaplama
    
    logger.info(`Google TTS synthesis completed - Duration: ${totalDuration.toFixed(1)}s, Word timings: ${wordTimings.length}, Audio size: ${response.audioContent.length} bytes`);
    
    return {
      audioContent: response.audioContent,
      wordTimings: wordTimings,
      totalDuration: totalDuration,
      speakingRate: speakingRate,
      ssmlMarks: timingMarks,
      success: true
    };
    
  } catch (error) {
    logger.error('Google TTS synthesis failed:', error.message);
    
    // Fallback - SSML olmadan dene
    try {
      logger.info('Attempting fallback synthesis without SSML...');
      
      const fallbackRequest = {
        input: { text: text },
        voice: { 
          languageCode, 
          name: voiceName 
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: speakingRate,
          sampleRateHertz: 24000
        }
      };

      const [fallbackResponse] = await ttsClient.synthesizeSpeech(fallbackRequest);
      
      // Gelişmiş timing hesaplaması - kelime uzunluğuna göre
      const words = text.split(/\s+/).filter(word => word.length > 0);
      
      // Kelime uzunluklarına göre ağırlıklı timing
      const totalCharacters = words.reduce((sum, word) => sum + word.length, 0);
      const baseWPM = 150; // Words per minute
      const adjustedWPM = baseWPM * speakingRate;
      const estimatedDuration = (words.length / adjustedWPM) * 60;
      
      let currentTime = 0;
      const simpleWordTimings = words.map((word, index) => {
        const wordWeight = word.length / totalCharacters;
        const wordDuration = estimatedDuration * wordWeight * words.length / words.length;
        const minWordDuration = 0.1; // Minimum 100ms per word
        const actualWordDuration = Math.max(wordDuration, minWordDuration);
        
        const startTime = currentTime;
        const endTime = currentTime + actualWordDuration;
        currentTime = endTime;
        
        return {
          word: word,
          startTime: startTime,
          endTime: endTime,
          markName: `word_${index}`
        };
      });
      
      // Son kelimeyi toplam süreye göre ayarla
      if (simpleWordTimings.length > 0) {
        const lastWord = simpleWordTimings[simpleWordTimings.length - 1];
        const actualTotalDuration = lastWord.endTime;
        const scaleFactor = estimatedDuration / actualTotalDuration;
        
        simpleWordTimings.forEach(timing => {
          timing.startTime *= scaleFactor;
          timing.endTime *= scaleFactor;
        });
      }
      
      logger.info(`Fallback synthesis completed - Estimated duration: ${estimatedDuration.toFixed(1)}s`);
      
      return {
        audioContent: fallbackResponse.audioContent,
        wordTimings: simpleWordTimings,
        totalDuration: estimatedDuration,
        speakingRate: speakingRate,
        ssmlMarks: [],
        success: true,
        isFallback: true
      };
      
    } catch (fallbackError) {
      logger.error('Fallback synthesis also failed:', fallbackError.message);
      throw new Error(`Google TTS failed: ${error.message}, Fallback: ${fallbackError.message}`);
    }
  }
}

/**
 * Google TTS destekli sesleri getirir
 * @param {string} [languageCode] - opsiyonel, sadece belirli bir dil için
 * @returns {Promise<Array>} Array of voice objects
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

    const voices = result.voices.map(voice => ({
      name: voice.name,
      languageCode: voice.languageCodes[0],
      gender: voice.ssmlGender
    }));

    logger.info(`Retrieved ${voices.length} voices for ${languageCode}`);
    return voices;
    
  } catch (error) {
    logger.error(`Failed to list Google TTS voices: ${error.message}`);
    throw error;
  }
}

module.exports = {
  synthesizeWithGoogle,
  listGoogleVoices,
  generateSSMLWithTimingMarks
}; 