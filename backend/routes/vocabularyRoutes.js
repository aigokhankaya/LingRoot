/**
 * 🗂️ Vocabulary Routes
 * 
 * SRS review system endpoints.
 */

const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabularyController');
const { authenticate } = require('../middleware/authMiddleware');
const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const { processWordForVocabulary } = require('../utils/content/wordTranslationService.js');

// Supabase client provided by shared utility

// Helper to map joined user_vocabulary + vocabulary rows to frontend shape
function mapUserVocabularyRow(row) {
    if (!row) return null;
    const vocab = row.vocabulary || {};

    return {
        id: row.id,
        word: vocab.word || '',
        original_word: vocab.original_word || vocab.word || '',
        definition: vocab.definition || '',
        example_sentence: vocab.example_sentence || '',
        example_sentence_turkish: vocab.example_sentence_turkish || '',
        level: vocab.level || '',
        is_learned: row.is_learned || false,
        original_sentence: row.original_sentence || '',
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

// Global vocabulary lookup (kelime sözlükte varsa sadece bilgileri döndür)
router.get('/lookup', authenticate, async (req, res) => {
    try {
        const rawWord = (req.query.word || '').toString();

        if (!rawWord || !rawWord.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Kelime parametresi gereklidir'
            });
        }

        const normalizedWord = rawWord.toLowerCase().trim();
        const userId = req.user?.id;

        const { data: vocabRow, error } = await supabase
            .from('vocabulary')
            .select(`
                id,
                word,
                original_word,
                definition,
                example_sentence,
                example_sentence_turkish,
                level,
                meanings,
                created_at,
                updated_at
            `)
            .eq('word', normalizedWord)
            .single();

        if (error) {
            // PGRST116 = no rows found
            if (error.code === 'PGRST116') {
                return res.json({
                    success: true,
                    found: false,
                    data: null,
                    hasUserWord: false
                });
            }

            logger.error('Error looking up vocabulary word:', error);
            return res.status(500).json({
                success: false,
                error: 'Kelime aranırken hata oluştu'
            });
        }

        if (!vocabRow) {
            return res.json({
                success: true,
                found: false,
                data: null,
                hasUserWord: false
            });
        }

        let hasUserWord = false;

        if (userId) {
            const { data: userWordRow, error: userWordError } = await supabase
                .from('user_vocabulary')
                .select('id')
                .eq('user_id', userId)
                .eq('word_id', vocabRow.id)
                .single();

            if (userWordError && userWordError.code !== 'PGRST116') {
                logger.error('Error checking user_vocabulary in LOOKUP:', userWordError);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime aranırken hata oluştu'
                });
            }

            hasUserWord = !!userWordRow;
        }

        res.json({
            success: true,
            found: true,
            data: vocabRow,
            hasUserWord
        });
    } catch (error) {
        logger.error('Error in vocabulary LOOKUP:', error);
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası'
        });
    }
});

// Kullanıcının kelimelerini getir
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // Bu UUID (users tablosundan)

        const { data: rows, error } = await supabase
            .from('user_vocabulary')
            .select(`
                id,
                user_id,
                word_id,
                original_sentence,
                translated_sentence,
                is_learned,
                created_at,
                updated_at,
                vocabulary (
                    id,
                    word,
                    original_word,
                    definition,
                    example_sentence,
                    example_sentence_turkish,
                    level,
                    meanings,
                    created_at,
                    updated_at
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching user vocabulary:', error);
            return res.status(500).json({
                success: false,
                error: 'Kelimeler yüklenirken hata oluştu'
            });
        }

        const vocabulary = (rows || []).map(mapUserVocabularyRow);

        res.json({
            success: true,
            data: vocabulary || []
        });
    } catch (error) {
        logger.error('Error in vocabulary GET:', error);
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası'
        });
    }
});

// Yeni kelime ekle
router.post('/add', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // Bu UUID (users tablosundan)
        const { word, definition, sentence, level } = req.body;

        logger.info(`Adding word for user ${userId}: ${word}`);

        if (!word) {
            return res.status(400).json({
                success: false,
                error: 'Kelime alanı gereklidir'
            });
        }

        const normalizedWord = word.toLowerCase().trim();

        // Kelime global vocabulary tablosunda var mı kontrol et
        const { data: existingVocabulary, error: vocabCheckError } = await supabase
            .from('vocabulary')
            .select('*')
            .eq('word', normalizedWord)
            .single();

        if (vocabCheckError && vocabCheckError.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error checking existing vocabulary word:', vocabCheckError);
            return res.status(500).json({
                success: false,
                error: 'Kelime kontrolü sırasında hata oluştu'
            });
        }

        let vocabularyRow = existingVocabulary;

        // Kelime global olarak yoksa vocabulary tablosuna ekle
        if (!vocabularyRow) {
            const meaningsArray = (definition || sentence || level)
                ? [
                    {
                        definition: definition || '',
                        example_sentence: sentence || '',
                        example_sentence_turkish: '',
                        level: (level || '').toUpperCase()
                    }
                ]
                : null;

            const { data: newVocabulary, error: insertVocabError } = await supabase
                .from('vocabulary')
                .insert({
                    word: normalizedWord,
                    original_word: word,
                    definition: definition || '',
                    example_sentence: sentence || '',
                    example_sentence_turkish: '',
                    level: level || '',
                    meanings: meaningsArray
                })
                .select()
                .single();

            if (insertVocabError) {
                // Unique constraint ihlali olursa mevcut kaydı tekrar çek
                if (insertVocabError.code === '23505') {
                    const { data: conflictVocabulary, error: conflictError } = await supabase
                        .from('vocabulary')
                        .select('*')
                        .eq('word', normalizedWord)
                        .single();

                    if (conflictError) {
                        logger.error('Error resolving vocabulary unique constraint conflict:', conflictError);
                        return res.status(500).json({
                            success: false,
                            error: 'Kelime kaydedilirken hata oluştu'
                        });
                    }

                    vocabularyRow = conflictVocabulary;
                } else {
                    logger.error('Error inserting new vocabulary word:', insertVocabError);
                    return res.status(500).json({
                        success: false,
                        error: 'Kelime kaydedilirken hata oluştu'
                    });
                }
            } else {
                vocabularyRow = newVocabulary;
            }
        }

        if (!vocabularyRow) {
            logger.error('Vocabulary row could not be determined for word:', word);
            return res.status(500).json({
                success: false,
                error: 'Kelime kaydedilirken hata oluştu'
            });
        }

        // Kullanıcı bu kelimeyi zaten eklemiş mi kontrol et (pivot tablo)
        const { data: existingUserWord, error: userWordCheckError } = await supabase
            .from('user_vocabulary')
            .select('id')
            .eq('user_id', userId)
            .eq('word_id', vocabularyRow.id)
            .single();

        if (userWordCheckError && userWordCheckError.code !== 'PGRST116') {
            logger.error('Error checking existing user_vocabulary word:', userWordCheckError);
            return res.status(500).json({
                success: false,
                error: 'Kelime kontrolü sırasında hata oluştu'
            });
        }

        if (existingUserWord) {
            return res.status(409).json({
                success: false,
                error: 'Bu kelime zaten listede mevcut'
            });
        }

        // Pivot tabloya yeni kayıt ekle
        const { data: newUserWord, error: insertUserWordError } = await supabase
            .from('user_vocabulary')
            .insert({
                user_id: userId,
                word_id: vocabularyRow.id,
                original_sentence: '',
                translated_sentence: '',
                is_learned: false,
                created_at: new Date().toISOString()
            })
            .select(`
                id,
                user_id,
                word_id,
                original_sentence,
                translated_sentence,
                is_learned,
                created_at,
                updated_at,
                vocabulary (
                    id,
                    word,
                    original_word,
                    definition,
                    example_sentence,
                    example_sentence_turkish,
                    level,
                    meanings,
                    created_at,
                    updated_at
                )
            `)
            .single();

        if (insertUserWordError) {
            logger.error('Error inserting new user_vocabulary word:', insertUserWordError);
            return res.status(500).json({
                success: false,
                error: 'Kelime kaydedilirken hata oluştu'
            });
        }

        const mappedWord = mapUserVocabularyRow(newUserWord);

        logger.info(`New word added by user ${userId}: ${word}`);

        res.json({
            success: true,
            data: mappedWord,
            message: 'Kelime başarıyla eklendi!'
        });
    } catch (error) {
        logger.error('Error in vocabulary POST:', error);
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası'
        });
    }
});

// Kelime sil
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // Bu UUID (users tablosundan)
        const { id } = req.params;

        const { error } = await supabase
            .from('user_vocabulary')
            .delete()
            .eq('id', id)
            .eq('user_id', userId); // Sadece kendi kelimelerini silebilsin

        if (error) {
            logger.error('Error deleting word:', error);
            return res.status(500).json({
                success: false,
                error: 'Kelime silinirken hata oluştu'
            });
        }

        logger.info(`Word deleted by user ${userId}: ${id}`);

        res.json({
            success: true,
            message: 'Kelime başarıyla silindi!'
        });
    } catch (error) {
        logger.error('Error in vocabulary DELETE:', error);
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası'
        });
    }
});

// Kelime güncelle (çalışma durumu, not vb.)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // Bu UUID (users tablosundan)
        const { id } = req.params;
        const { definition, example_sentence, example_sentence_turkish, notes, is_learned, original_sentence, translated_sentence, level } = req.body;

        // Önce mevcut kaydı vocabulary ile birlikte al
        const { data: existingWord, error: fetchError } = await supabase
            .from('user_vocabulary')
            .select(`
                id,
                user_id,
                word_id,
                original_sentence,
                translated_sentence,
                is_learned,
                created_at,
                updated_at,
                vocabulary (
                    id,
                    word,
                    original_word,
                    definition,
                    example_sentence,
                    example_sentence_turkish,
                    level,
                    meanings,
                    created_at,
                    updated_at
                )
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') { // no rows
                return res.status(404).json({
                    success: false,
                    error: 'Kelime bulunamadı'
                });
            }

            logger.error('Error fetching user_vocabulary word for update:', fetchError);
            return res.status(500).json({
                success: false,
                error: 'Kelime güncellenirken hata oluştu'
            });
        }

        const pivotUpdates = {};
        const vocabularyUpdates = {};

        if (typeof is_learned === 'boolean') {
            pivotUpdates.is_learned = is_learned;
        }
        if (typeof original_sentence === 'string') {
            pivotUpdates.original_sentence = original_sentence;
        }
        if (typeof translated_sentence === 'string') {
            pivotUpdates.translated_sentence = translated_sentence;
        }

        if (typeof definition === 'string') {
            vocabularyUpdates.definition = definition;
        }
        if (typeof example_sentence === 'string') {
            vocabularyUpdates.example_sentence = example_sentence;
        }
        if (typeof example_sentence_turkish === 'string') {
            vocabularyUpdates.example_sentence_turkish = example_sentence_turkish;
        }
        if (typeof level === 'string') {
            vocabularyUpdates.level = level;
        }

        // Pivot tabloyu güncelle
        if (Object.keys(pivotUpdates).length > 0) {
            pivotUpdates.updated_at = new Date().toISOString();

            const { error: pivotUpdateError } = await supabase
                .from('user_vocabulary')
                .update(pivotUpdates)
                .eq('id', id)
                .eq('user_id', userId);

            if (pivotUpdateError) {
                logger.error('Error updating user_vocabulary word:', pivotUpdateError);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime güncellenirken hata oluştu'
                });
            }
        }

        // Global vocabulary kaydını güncelle (varsa değişiklik)
        if (Object.keys(vocabularyUpdates).length > 0 && existingWord.word_id) {
            vocabularyUpdates.updated_at = new Date().toISOString();

            const { error: vocabUpdateError } = await supabase
                .from('vocabulary')
                .update(vocabularyUpdates)
                .eq('id', existingWord.word_id);

            if (vocabUpdateError) {
                logger.error('Error updating vocabulary word:', vocabUpdateError);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime güncellenirken hata oluştu'
                });
            }
        }

        // Güncellenmiş kaydı tekrar oku
        const { data: updatedRow, error: refetchError } = await supabase
            .from('user_vocabulary')
            .select(`
                id,
                user_id,
                word_id,
                original_sentence,
                translated_sentence,
                is_learned,
                created_at,
                updated_at,
                vocabulary (
                    id,
                    word,
                    original_word,
                    definition,
                    example_sentence,
                    example_sentence_turkish,
                    level,
                    meanings,
                    created_at,
                    updated_at
                )
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (refetchError) {
            logger.error('Error refetching updated word:', refetchError);
            return res.status(500).json({
                success: false,
                error: 'Kelime güncellenirken hata oluştu'
            });
        }

        const mappedWord = mapUserVocabularyRow(updatedRow);

        logger.info(`Word updated by user ${userId}: ${id}`);

        res.json({
            success: true,
            data: mappedWord,
            message: 'Kelime başarıyla güncellendi!'
        });
    } catch (error) {
        logger.error('Error in vocabulary PUT:', error);
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası'
        });
    }
});

// Kelime çevirisi ve otomatik ekleme (OpenAI ile)
router.post('/add-with-translation', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { word, context, level, originalSentence } = req.body;

        logger.info(`Adding word with translation for user ${userId}: ${word}`);
        logger.info(`Debug - Request body:`, { word, context, level, originalSentence });

        if (!word) {
            return res.status(400).json({
                success: false,
                error: 'Kelime alanı gereklidir'
            });
        }

        // Context boş ise varsayılan bir context oluştur
        let finalContext = context;
        if (!context || context.trim().length < 3) {
            logger.warn(`Empty context received for word "${word}", using default context`);
            finalContext = `The English word "${word}" is used in everyday conversation.`;
        }

        logger.info(`Context received for word "${word}": "${finalContext.substring(0, 100)}..."`);

        const normalizedWord = word.toLowerCase().trim();

        // 1) Kelimenin vocabulary tablosunda olup olmadığını kontrol et
        const { data: existingVocabulary, error: vocabCheckError } = await supabase
            .from('vocabulary')
            .select('*')
            .eq('word', normalizedWord)
            .single();

        if (vocabCheckError && vocabCheckError.code !== 'PGRST116') {
            logger.error('Error checking existing vocabulary word:', vocabCheckError);
            return res.status(500).json({
                success: false,
                error: 'Kelime kontrolü sırasında hata oluştu'
            });
        }

        // Eğer vocabulary'de kelime varsa, sadece pivot ilişkiyi kontrol et / oluştur
        if (existingVocabulary) {
            logger.info(`Word "${word}" already exists in vocabulary table with id ${existingVocabulary.id}`);

            const { data: existingUserWord, error: userWordCheckError } = await supabase
                .from('user_vocabulary')
                .select(`
                    id,
                    user_id,
                    word_id,
                    original_sentence,
                    translated_sentence,
                    is_learned,
                    created_at,
                    updated_at
                `)
                .eq('user_id', userId)
                .eq('word_id', existingVocabulary.id)
                .single();

            if (userWordCheckError && userWordCheckError.code !== 'PGRST116') {
                logger.error('Error checking existing user_vocabulary word:', userWordCheckError);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime kontrolü sırasında hata oluştu'
                });
            }

            if (existingUserWord) {
                logger.info(`Word "${word}" already exists for user ${userId}, returning existing data`);

                const mappedExisting = mapUserVocabularyRow({
                    ...existingUserWord,
                    vocabulary: existingVocabulary
                });

                return res.json({
                    success: true,
                    data: mappedExisting,
                    message: 'Bu kelime zaten listede mevcut, mevcut bilgiler gösteriliyor.',
                    isExisting: true
                });
            }

            // Kullanıcı için yeni pivot kaydı oluştur
            const { data: newUserWord, error: insertUserWordError } = await supabase
                .from('user_vocabulary')
                .insert({
                    user_id: userId,
                    word_id: existingVocabulary.id,
                    original_sentence: originalSentence || '',
                    translated_sentence: '',
                    is_learned: false,
                    created_at: new Date().toISOString()
                })
                .select(`
                    id,
                    user_id,
                    word_id,
                    original_sentence,
                    translated_sentence,
                    is_learned,
                    created_at,
                    updated_at,
                    vocabulary (
                        id,
                        word,
                        original_word,
                        definition,
                        example_sentence,
                        example_sentence_turkish,
                        level,
                        meanings,
                        created_at,
                        updated_at
                    )
                `)
                .single();

            if (insertUserWordError) {
                logger.error('Error inserting user_vocabulary word for existing vocabulary:', insertUserWordError);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime kaydedilirken hata oluştu'
                });
            }

            const mappedNew = mapUserVocabularyRow(newUserWord);

            return res.json({
                success: true,
                data: mappedNew,
                message: 'Kelime başarıyla listenize eklendi.',
                isExisting: false
            });
        }

        // 2) Kelime vocabulary'de yoksa OpenAI ile işle ve hem vocabulary hem pivot tablosuna ekle
        try {
            const wordData = await processWordForVocabulary(word, finalContext, level, originalSentence, userId);

            logger.info(`Debug - Inserting vocabulary word with data:`, wordData);

            const meaningsArray = [
                {
                    definition: wordData.definition,
                    example_sentence: wordData.example_sentence,
                    example_sentence_turkish: wordData.example_sentence_turkish || '',
                    level: (wordData.level || '').toUpperCase()
                }
            ];

            const { data: newVocabulary, error: insertVocabError } = await supabase
                .from('vocabulary')
                .insert({
                    word: wordData.word.toLowerCase(),
                    original_word: wordData.original_word,
                    definition: wordData.definition,
                    example_sentence: wordData.example_sentence,
                    example_sentence_turkish: wordData.example_sentence_turkish || '',
                    level: (wordData.level || '').toUpperCase(),
                    meanings: meaningsArray
                })
                .select()
                .single();

            let vocabularyRow = newVocabulary;

            if (insertVocabError) {
                if (insertVocabError.code === '23505') {
                    const { data: conflictVocabulary, error: conflictError } = await supabase
                        .from('vocabulary')
                        .select('*')
                        .eq('word', wordData.word.toLowerCase())
                        .single();

                    if (conflictError) {
                        logger.error('Error resolving vocabulary unique constraint conflict (translation path):', conflictError);
                        return res.status(500).json({
                            success: false,
                            error: 'Kelime kaydedilirken hata oluştu'
                        });
                    }

                    vocabularyRow = conflictVocabulary;
                } else {
                    logger.error('Error inserting translated vocabulary word:', insertVocabError);
                    return res.status(500).json({
                        success: false,
                        error: 'Kelime kaydedilirken hata oluştu: ' + insertVocabError.message
                    });
                }
            }

            if (!vocabularyRow) {
                logger.error('Vocabulary row is null after insert for word:', word);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime kaydedilirken hata oluştu'
                });
            }

            const { data: newUserWord, error: insertUserWordError } = await supabase
                .from('user_vocabulary')
                .insert({
                    user_id: userId,
                    word_id: vocabularyRow.id,
                    original_sentence: originalSentence || '',
                    translated_sentence: '',
                    is_learned: false,
                    created_at: new Date().toISOString()
                })
                .select(`
                    id,
                    user_id,
                    word_id,
                    original_sentence,
                    translated_sentence,
                    is_learned,
                    created_at,
                    updated_at,
                    vocabulary (
                        id,
                        word,
                        original_word,
                        definition,
                        example_sentence,
                        example_sentence_turkish,
                        level,
                        meanings,
                        created_at,
                        updated_at
                    )
                `)
                .single();

            if (insertUserWordError) {
                logger.error('Error inserting translated user_vocabulary word:', insertUserWordError);
                return res.status(500).json({
                    success: false,
                    error: 'Kelime kaydedilirken hata oluştu'
                });
            }

            const mappedNew = mapUserVocabularyRow(newUserWord);

            logger.info(`New word with translation added by user ${userId}: ${word}`);

            res.json({
                success: true,
                data: mappedNew,
                message: 'Kelime çeviri ile birlikte başarıyla eklendi!',
                isExisting: false
            });
        } catch (translationError) {
            logger.error('Error translating word:', translationError);

            // Çeviri hatası durumunda minimum bilgi ile vocabulary + pivot kaydı oluştur
            let vocabularyRow = null;

            const { data: existingAfterError, error: existingAfterErrorCheck } = await supabase
                .from('vocabulary')
                .select('*')
                .eq('word', normalizedWord)
                .single();

            router.use(authenticate);

            // Lookup word in global vocabulary
            router.get('/lookup', vocabularyController.lookupWord);

            // Get Flashcards (Daily Mix)
            router.get('/due', vocabularyController.getDueWords);

            // Get User Stats (for dashboard)
            router.get('/stats', vocabularyController.getStats);

            // Get User Collection (all words)
            router.get('/collection', vocabularyController.getCollection);

            // Get Random Words (for variety practice)
            router.get('/random', vocabularyController.getRandomWords);

            // Submit Review (Flashcard Swipe)
            router.post('/review', vocabularyController.submitReview);

            // Add Word (from Context Menu etc.)
            router.post('/add', vocabularyController.addWord);
            res.json({
                success: true,
                data: mappedNew,
                message: 'Kelime eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.',
                translationError: true
            });
        }

    } catch (error) {
        logger.error('Error in vocabulary POST with translation:', error);
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası'
        });
    }
});

module.exports = router;