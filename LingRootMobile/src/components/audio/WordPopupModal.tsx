import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../theme/colors';
import { addWordWithTranslation, lookupVocabularyWord } from '../../services/vocabularyService';
import { useCustomAlert } from '../../contexts/AlertContext';

interface WordData {
  original_word?: string;
  word?: string;
  definition?: string;
  level?: string;
  example_sentence?: string;
  example_sentence_turkish?: string;
}

interface WordPopupState {
  mode: 'info' | 'confirm';
  word: string;
  data?: WordData & { wordIndex?: number };
}

interface WordPopupModalProps {
  visible: boolean;
  wordPopup: WordPopupState | null;
  language: 'tr' | 'en';
  wordsArray: string[];
  textToHighlight: string;
  onClose: () => void;
  onWordAdded: (word: string) => void;
}

export const WordPopupModal: React.FC<WordPopupModalProps> = ({
  visible,
  wordPopup,
  language,
  wordsArray,
  textToHighlight,
  onClose,
  onWordAdded,
}) => {
  const { showAlert } = useCustomAlert();
  const [addingWord, setAddingWord] = useState(false);
  const [addingWordText, setAddingWordText] = useState('');

  const loadPronunciation = useCallback(async (_word: string) => {
    // Pronunciation feature removed on mobile
    return;
  }, []);

  const handleShowWordInfo = useCallback(async (word: string) => {
    const cleanWord = word.replace(/[.,!?;:]/g, '');

    try {
      const result = await lookupVocabularyWord(cleanWord);

      if (!result.found || !result.data) {
        showAlert(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? `"${cleanWord}" kelimesi için henüz sözlük kaydı bulunamadı.\n\nBu kelimeyi kelime listenize ekleyebilirsiniz.`
            : `There is no dictionary entry yet for "${cleanWord}".\n\nYou can add this word to your vocabulary list.`,
          [{ text: 'OK', style: 'default' }],
          'info-outline',
          '#3B82F6'
        );
        return;
      }

      await loadPronunciation(cleanWord);
    } catch (error: unknown) {
      showAlert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? `Kelime bilgisi yüklenirken hata oluştu: ${(error as Error)?.message || 'Bilinmeyen hata'}`
          : `An error occurred while loading word info: ${(error as Error)?.message || 'Unknown error'}`,
        [{ text: 'OK', style: 'default' }],
        'error-outline',
        '#EF4444'
      );
    }
  }, [language, loadPronunciation, showAlert]);

  const handleAddWordToVocabulary = useCallback(async (word: string, wordIndex: number) => {
    const cleanWord = word.replace(/[.,!?;:]/g, ''); // Remove punctuation

    // Show loading state
    setAddingWord(true);
    setAddingWordText(language === 'tr' ? `"${cleanWord}" kelimesi ekleniyor...` : `Adding "${cleanWord}"...`);

    try {
      // Create context from surrounding words or text
      let context = '';
      let originalSentence = '';
      if (wordsArray.length > 0 && wordIndex >= 0 && wordIndex < wordsArray.length) {
        const startIndex = Math.max(0, wordIndex - 5);
        const endIndex = Math.min(wordsArray.length, wordIndex + 6);
        const contextWords = wordsArray.slice(startIndex, endIndex);
        context = contextWords.join(' ');
      } else {
        // Fallback: use text around the word
        const textToSearch = textToHighlight.toLowerCase();
        const wordPos = textToSearch.indexOf(cleanWord.toLowerCase());
        if (wordPos >= 0) {
          const start = Math.max(0, wordPos - 50);
          const end = Math.min(textToHighlight.length, wordPos + 50);
          context = textToHighlight.substring(start, end);
        } else {
          context = `The word "${cleanWord}" appears in an English text.`;
        }
      }

      // Find original sentence
      const sentences = textToHighlight.split(/[.!?;]+/).map(s => s.trim()).filter(s => s.length > 5);
      originalSentence = sentences.find(sentence =>
        sentence.toLowerCase().includes(cleanWord.toLowerCase())
      ) || context;

      // Call the real API with translation (like web version)
      const result = await addWordWithTranslation(
        cleanWord,
        context, // Context for AI translation
        '', // Level boş - OpenAI otomatik belirleyecek
        originalSentence
      );

      // Add word to selected words set for UI feedback
      onWordAdded(cleanWord.toLowerCase());

      // Show detailed success message like web version
      if (result.isExisting) {
        showAlert(
          language === 'tr' ? 'Bilgi!' : 'Info!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data.definition || 'Belirtilmemiş'}\nÖrnek: ${result.data.example_sentence || 'Belirtilmemiş'}`
            : `"${cleanWord}" is already in your vocabulary list:\n\nMeaning: ${result.data.definition || 'Not specified'}\nExample: ${result.data.example_sentence || 'Not specified'}`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK', style: 'default' }],
          'info-outline',
          '#3B82F6'
        );
      } else if (result.translationError) {
        showAlert(
          language === 'tr' ? 'Uyarı!' : 'Warning!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`
            : `"${cleanWord}" was added but translation failed. You can add the meaning manually.`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK', style: 'default' }],
          'warning',
          '#F59E0B'
        );
      } else {
        showAlert(
          language === 'tr' ? 'Başarılı!' : 'Success!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data.definition}\nÖrnek Cümle: ${result.data.example_sentence}\nSeviye: ${result.data.level}`
            : `"${cleanWord}" was successfully added!\n\nMeaning: ${result.data.definition}\nExample: ${result.data.example_sentence}\nLevel: ${result.data.level}`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK', style: 'default' }],
          'check-circle',
          '#10B981'
        );
      }

    } catch (error: unknown) {
      if ((error as Error).message?.includes('zaten listede mevcut')) {
        showAlert(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? `"${cleanWord}" kelimesi zaten kelime listenizdedir.`
            : `"${cleanWord}" is already in your vocabulary list.`,
          [{ text: 'OK', style: 'default' }],
          'info-outline',
          '#3B82F6'
        );
      } else {
        showAlert(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr'
            ? `Kelime eklenirken bir hata oluştu: ${(error as Error).message || 'Lütfen internet bağlantınızı kontrol edin.'}`
            : `An error occurred while adding the word: ${(error as Error).message || 'Please check your internet connection.'}`,
          [{ text: 'OK', style: 'default' }],
          'error-outline',
          '#EF4444'
        );
      }
    } finally {
      // Hide loading state
      setAddingWord(false);
      setAddingWordText('');
    }
  }, [wordsArray, textToHighlight, language, onWordAdded, showAlert]);

  if (!visible || !wordPopup) {
    return null;
  }

  return (
    <>
      {/* Loading indicator for adding word */}
      {addingWord && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{addingWordText}</Text>
          </View>
        </View>
      )}

      {/* Word info popup */}
      <Modal
        transparent
        visible={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.wordPopupOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.wordPopupCard}>
            {/* Header with close button */}
            <View style={styles.wordPopupHeader}>
              <View style={styles.wordPopupIconContainer}>
                <Icon name={wordPopup.mode === 'info' ? 'menu-book' : 'add-circle'} size={24} color={COLORS.primary} />
              </View>
              <TouchableOpacity
                style={styles.wordPopupCloseButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color={COLORS.slate400} />
              </TouchableOpacity>
            </View>

            {/* Word Title */}
            <Text style={styles.wordPopupLabel}>
              {language === 'tr' ? 'Seçilen kelime' : 'Selected word'}
            </Text>
            <Text style={styles.wordPopupWord}>
              {wordPopup.data?.original_word || wordPopup.data?.word || wordPopup.word}
            </Text>

            {wordPopup.mode === 'info' ? (
              <>
                {/* Definition Card */}
                <View style={styles.wordPopupInfoCard}>
                  <View style={styles.wordPopupInfoRow}>
                    <View style={styles.wordPopupInfoIconBg}>
                      <Icon name="translate" size={16} color={COLORS.primary} />
                    </View>
                    <View style={styles.wordPopupInfoContent}>
                      <Text style={styles.wordPopupInfoLabel}>
                        {language === 'tr' ? 'Anlam' : 'Meaning'}
                      </Text>
                      <Text style={styles.wordPopupInfoValue}>
                        {wordPopup.data?.definition || '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Level Badge */}
                <View style={styles.wordPopupLevelRow}>
                  <View style={styles.wordPopupInfoIconBg}>
                    <Icon name="school" size={16} color={COLORS.brandOrange} />
                  </View>
                  <Text style={styles.wordPopupInfoLabel}>
                    {language === 'tr' ? 'Seviye' : 'Level'}
                  </Text>
                  <View style={styles.wordPopupLevelBadge}>
                    <Text style={styles.wordPopupLevelText}>
                      {(wordPopup.data?.level || '').toUpperCase() || '-'}
                    </Text>
                  </View>
                </View>

                {/* Example Section */}
                {wordPopup.data?.example_sentence && (
                  <View style={styles.wordPopupExampleCard}>
                    <View style={styles.wordPopupExampleHeader}>
                      <Icon name="format-quote" size={18} color={COLORS.brandIndigo} />
                      <Text style={styles.wordPopupExampleTitle}>
                        {language === 'tr' ? 'Örnek Cümle' : 'Example Sentence'}
                      </Text>
                    </View>
                    <Text style={styles.wordPopupExampleText}>
                      {wordPopup.data?.example_sentence}
                    </Text>
                    {wordPopup.data?.example_sentence_turkish && (
                      <Text style={styles.wordPopupExampleTranslation}>
                        {wordPopup.data?.example_sentence_turkish}
                      </Text>
                    )}
                  </View>
                )}

                {/* Close button for info mode */}
                <TouchableOpacity
                  style={styles.wordPopupDoneButton}
                  onPress={onClose}
                >
                  <Text style={styles.wordPopupDoneText}>
                    {language === 'tr' ? 'Tamam' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Confirm mode content */}
                <View style={styles.wordPopupConfirmContent}>
                  <Icon name="help-outline" size={48} color={COLORS.primary} style={{ marginBottom: 12 }} />
                  <Text style={styles.wordPopupConfirmMessage}>
                    {language === 'tr'
                      ? `Bu kelimeyi kelime listenize eklemek istiyor musunuz?`
                      : `Do you want to add this word to your vocabulary list?`}
                  </Text>
                </View>

                <View style={styles.wordPopupActionsRow}>
                  <TouchableOpacity
                    style={[styles.wordPopupActionButton, styles.wordPopupCancelButton]}
                    onPress={onClose}
                  >
                    <Text style={styles.wordPopupCancelText}>
                      {language === 'tr' ? 'İptal' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.wordPopupActionButton, styles.wordPopupConfirmButton]}
                    onPress={() => {
                      handleAddWordToVocabulary(wordPopup.word, wordPopup.data?.wordIndex || 0);
                      onClose();
                    }}
                  >
                    <Icon name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.wordPopupConfirmText}>
                      {language === 'tr' ? 'Ekle' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  wordPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordPopupCard: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    padding: 24,
    shadowColor: COLORS.brandIndigo,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  wordPopupLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  wordPopupWord: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  wordPopupActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  wordPopupActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  wordPopupCancelButton: {
    backgroundColor: '#E5E7EB',
  },
  wordPopupConfirmButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordPopupCancelText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  wordPopupConfirmText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  wordPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wordPopupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordPopupCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordPopupInfoCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wordPopupInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wordPopupInfoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  wordPopupInfoContent: {
    flex: 1,
  },
  wordPopupInfoLabel: {
    fontSize: 12,
    color: COLORS.slate500,
    marginBottom: 4,
    fontWeight: '500',
  },
  wordPopupInfoValue: {
    fontSize: 16,
    color: COLORS.slate800,
    fontWeight: '600',
    lineHeight: 22,
  },
  wordPopupLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  wordPopupLevelBadge: {
    backgroundColor: `${COLORS.brandOrange}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  wordPopupLevelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandOrange,
  },
  wordPopupExampleCard: {
    backgroundColor: `${COLORS.brandIndigo}08`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brandIndigo,
  },
  wordPopupExampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  wordPopupExampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brandIndigo,
    marginLeft: 8,
  },
  wordPopupExampleText: {
    fontSize: 15,
    color: COLORS.slate700,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 8,
  },
  wordPopupExampleTranslation: {
    fontSize: 14,
    color: COLORS.slate500,
    lineHeight: 20,
  },
  wordPopupDoneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  wordPopupDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wordPopupConfirmContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  wordPopupConfirmMessage: {
    fontSize: 15,
    color: COLORS.slate600,
    textAlign: 'center',
    lineHeight: 22,
  },
});
