import { processTts } from '../apps/frontend/src/lib/api';
import { TtsResponseData } from '../apps/frontend/src/lib/api';

describe('TTS Service Tests', () => {
  // Test 1: Basit metin girişi
  test('should generate audio from text input', async () => {
    const testInput = {
      type: 'text',
      input: 'Hello, this is a test message.',
      level: 'A1',
      SesHızı: 1.0
    };

    try {
      const result = await processTts(testInput);
      expect(result).toHaveProperty('mp3_url');
      expect(result).toHaveProperty('vtt_url');
      expect(result.level).toBe('A1');
      console.log('Test 1 Başarılı:', result);
    } catch (error) {
      console.error('Test 1 Hatası:', error);
      throw error;
    }
  });

  // Test 2: Dosya yükleme
  test('should generate audio from file upload', async () => {
    const testFile = new File(['Test content for file upload'], 'test.txt', { type: 'text/plain' });
    const testInput = {
      type: 'file',
      file: testFile,
      level: 'B1',
      SesHızı: 1.2
    };

    try {
      const result = await processTts(testInput);
      expect(result).toHaveProperty('mp3_url');
      expect(result).toHaveProperty('vtt_url');
      expect(result.level).toBe('B1');
      console.log('Test 2 Başarılı:', result);
    } catch (error) {
      console.error('Test 2 Hatası:', error);
      throw error;
    }
  });

  // Test 3: URL işleme
  test('should generate audio from URL', async () => {
    const testInput = {
      type: 'youtube',
      input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      level: 'C1',
      SesHızı: 1.0
    };

    try {
      const result = await processTts(testInput);
      expect(result).toHaveProperty('mp3_url');
      expect(result).toHaveProperty('vtt_url');
      expect(result.level).toBe('C1');
      console.log('Test 3 Başarılı:', result);
    } catch (error) {
      console.error('Test 3 Hatası:', error);
      throw error;
    }
  });

  // Test 4: Hata durumu
  test('should handle invalid input gracefully', async () => {
    const testInput = {
      type: 'text',
      input: '', // Boş metin
      level: 'A1',
      SesHızı: 1.0
    };

    try {
      await processTts(testInput);
      // Bu satıra ulaşılmamalı
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      console.log('Test 4 Başarılı: Hata beklendiği gibi yakalandı');
    }
  });

  // Test 5: Farklı dil seviyeleri
  test('should handle different CEFR levels', async () => {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const testText = 'This is a test message for different CEFR levels.';

    for (const level of levels) {
      const testInput = {
        type: 'text',
        input: testText,
        level: level,
        SesHızı: 1.0
      };

      try {
        const result = await processTts(testInput);
        expect(result.level).toBe(level);
        expect(result).toHaveProperty('mp3_url');
        console.log(`Test 5 Başarılı (${level}):`, result);
      } catch (error) {
        console.error(`Test 5 Hatası (${level}):`, error);
        throw error;
      }
    }
  });
}); 