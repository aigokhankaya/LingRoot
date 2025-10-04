const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { processWordForVocabulary } = require('../utils/wordTranslationService');

// Supabase client provided by shared utility

// Kullanıcının kelimelerini getir
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // Bu UUID (users tablosundan)
        
        const { data: vocabulary, error } = await supabase
            .from('user_vocabulary')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            logger.error('Error fetching user vocabulary:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Kelimeler yüklenirken hata oluştu' 
            });
        }
        
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
        
        // Kelime zaten var mı kontrol et
        const { data: existingWord, error: checkError } = await supabase
            .from('user_vocabulary')
            .select('id')
            .eq('user_id', userId)
            .eq('word', word.toLowerCase())
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error checking existing word:', checkError);
            return res.status(500).json({ 
                success: false, 
                error: 'Kelime kontrolü sırasında hata oluştu' 
            });
        }
        
        if (existingWord) {
            return res.status(409).json({ 
                success: false, 
                error: 'Bu kelime zaten listede mevcut' 
            });
        }
        
        // Yeni kelime ekle
        const { data: newWord, error: insertError } = await supabase
            .from('user_vocabulary')
            .insert({
                user_id: userId, // UUID olarak kullanılacak
                word: word.toLowerCase(),
                original_word: word, // Orijinal case'i korumak için
                definition: definition || '',
                example_sentence: sentence || '',
                level: level || '',
                original_sentence: '', // Orijinal cümle (manuel ekleme için boş)
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (insertError) {
            logger.error('Error inserting new word:', insertError);
            logger.error('Insert error details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
            });
            return res.status(500).json({ 
                success: false, 
                error: 'Kelime kaydedilirken hata oluştu' 
            });
        }
        
        logger.info(`New word added by user ${userId}: ${word}`);
        
        res.json({ 
            success: true, 
            data: newWord,
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
        const { definition, example_sentence, example_sentence_turkish, notes, is_learned, original_sentence } = req.body;
        
        const { data: updatedWord, error } = await supabase
            .from('user_vocabulary')
            .update({
                definition,
                example_sentence,
                example_sentence_turkish,
                notes,
                is_learned,
                original_sentence,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) {
            logger.error('Error updating word:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Kelime güncellenirken hata oluştu' 
            });
        }
        
        logger.info(`Word updated by user ${userId}: ${id}`);
        
        res.json({ 
            success: true, 
            data: updatedWord,
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
        
        // Kelime zaten var mı kontrol et
        const { data: existingWord, error: checkError } = await supabase
            .from('user_vocabulary')
            .select('*')
            .eq('user_id', userId)
            .eq('word', word.toLowerCase())
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error checking existing word:', checkError);
            return res.status(500).json({ 
                success: false, 
                error: 'Kelime kontrolü sırasında hata oluştu' 
            });
        }
        
        // Eğer kelime zaten varsa mevcut verileri döndür
        if (existingWord) {
            logger.info(`Word "${word}" already exists for user ${userId}, returning existing data`);
            return res.json({ 
                success: true, 
                data: existingWord,
                message: 'Bu kelime zaten listede mevcut, mevcut bilgiler gösteriliyor.',
                isExisting: true
            });
        }
        
        // OpenAI ile kelimeyi işle
        try {
            const wordData = await processWordForVocabulary(word, finalContext, level);
            
            // Yeni kelime ekle
            logger.info(`Debug - Inserting word with data:`, {
                user_id: userId,
                word: wordData.word,
                original_word: wordData.original_word,
                definition: wordData.definition,
                example_sentence: wordData.example_sentence,
                level: wordData.level,
                original_sentence: originalSentence || ''
            });
            
            const { data: newWord, error: insertError } = await supabase
                .from('user_vocabulary')
                .insert({
                    user_id: userId,
                    word: wordData.word,
                    original_word: wordData.original_word,
                    definition: wordData.definition,
                    example_sentence: wordData.example_sentence,
                    example_sentence_turkish: wordData.example_sentence_turkish || '',
                    level: wordData.level,
                    original_sentence: originalSentence || '', // Orijinal cümle
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (insertError) {
                logger.error('Error inserting translated word:', insertError);
                logger.error('Insert error details:', {
                    code: insertError.code,
                    message: insertError.message,
                    details: insertError.details,
                    hint: insertError.hint
                });
                return res.status(500).json({ 
                    success: false, 
                    error: 'Kelime kaydedilirken hata oluştu: ' + insertError.message 
                });
            }
            
            logger.info(`Word successfully inserted:`, newWord);
            
            logger.info(`New word with translation added by user ${userId}: ${word}`);
            
            res.json({ 
                success: true, 
                data: newWord,
                message: 'Kelime çeviri ile birlikte başarıyla eklendi!',
                isExisting: false
            });
            
        } catch (translationError) {
            logger.error('Error translating word:', translationError);
            
            // Çeviri hatası durumunda basit ekleme yap
            const { data: newWord, error: insertError } = await supabase
                .from('user_vocabulary')
                .insert({
                    user_id: userId,
                    word: word.toLowerCase(),
                    original_word: word,
                    definition: '',
                    example_sentence: '',
                    example_sentence_turkish: '',
                    level: level || 'B1',
                    original_sentence: originalSentence || '', // Orijinal cümle
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (insertError) {
                logger.error('Error inserting word without translation:', insertError);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Kelime kaydedilirken hata oluştu' 
                });
            }
            
            res.json({ 
                success: true, 
                data: newWord,
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