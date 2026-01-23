/**
 * Vocabulary Service (New API Client Wrapper)
 * 
 * This service wraps the new @lingroot/api-client vocabulary module
 * to provide backward-compatible functions for the existing codebase.
 * 
 * Created: 2026-01-16
 */

import { getApiClientAsync, UserWord, ApiResponse } from '../services/apiClient';

// Legacy VocabularyWord interface for backward compatibility with existing screens
export interface VocabularyWord {
    id: number;
    word: string;
    definition: string;
    level: string;
    is_learned: boolean;
    example_sentence?: string;
    example_sentence_turkish?: string;
    original_sentence?: string;
    created_at?: string;
}

// Re-export types for backward compatibility
export type { UserWord };

/**
 * Get all vocabulary words for the current user
 */
export async function getVocabulary(): Promise<VocabularyWord[]> {
    const client = await getApiClientAsync();
    const response = await client.vocabulary.getUserWords(1, 1000);

    // Transform UserWord to VocabularyWord format if needed
    return response.data.map(word => ({
        id: parseInt(word.id, 10) || 0,
        word: word.word,
        definition: (word as any).definition || '',
        level: (word as any).level || 'B1',
        is_learned: word.mastery >= 80,
        example_sentence: (word as any).example || '',
        example_sentence_turkish: (word as any).translation || '',
        original_sentence: '',
        created_at: (word as any).createdAt || new Date().toISOString(),
    }));
}

/**
 * Add a word to vocabulary
 */
export async function addWordToVocabulary(word: string, source?: string): Promise<ApiResponse<UserWord>> {
    const client = await getApiClientAsync();
    return client.vocabulary.addWord(word, source || 'manual');
}

/**
 * Add a word with translation (uses AI to enrich)
 */
export async function addWordWithTranslation(
    word: string,
    context: string,
    level: string,
    originalSentence: string
): Promise<{ data: VocabularyWord; isExisting?: boolean; translationError?: boolean }> {
    const client = await getApiClientAsync();

    try {
        // First lookup the word to get definition
        const lookupResult = await client.vocabulary.lookup(word);

        // Add to user's vocabulary
        const addResult = await client.vocabulary.addWord(word, 'manual');

        // Build VocabularyWord from results
        const vocabWord: VocabularyWord = {
            id: parseInt(addResult.data?.id || '0', 10),
            word: word,
            definition: lookupResult.data?.data?.definition || '',
            level: (lookupResult.data?.data as any)?.level || level || 'B1',
            is_learned: false,
            example_sentence: lookupResult.data?.data?.example || '',
            example_sentence_turkish: lookupResult.data?.data?.translation || '',
            original_sentence: originalSentence,
            created_at: new Date().toISOString(),
        };

        return {
            data: vocabWord,
            isExisting: lookupResult.data?.hasUserWord,
            translationError: !lookupResult.data?.found
        };
    } catch (error: any) {
        throw new Error(error.message || 'Failed to add word with translation');
    }
}

/**
 * Delete a word from vocabulary
 */
export async function deleteWordFromVocabulary(wordId: number): Promise<void> {
    const client = await getApiClientAsync();
    await client.vocabulary.removeWord(wordId.toString());
}

/**
 * Update a word in vocabulary
 */
export async function updateWordInVocabulary(
    wordId: number,
    updates: Partial<VocabularyWord>
): Promise<VocabularyWord> {
    const client = await getApiClientAsync();

    // If updating is_learned status, submit a review
    if ('is_learned' in updates) {
        const quality = updates.is_learned ? 5 : 1; // 5 = perfect recall, 1 = forgot
        await client.vocabulary.submitReview({
            wordId: wordId.toString(),
            quality: quality as 0 | 1 | 2 | 3 | 4 | 5
        });
    }

    // Return updated word (simplified - in real impl, refetch from server)
    return {
        id: wordId,
        word: updates.word || '',
        definition: updates.definition || '',
        level: updates.level || 'B1',
        is_learned: updates.is_learned || false,
        example_sentence: updates.example_sentence || '',
        original_sentence: updates.original_sentence || '',
        created_at: new Date().toISOString(),
    };
}

/**
 * Lookup a word in dictionary
 */
export async function lookupVocabularyWord(word: string): Promise<{
    found: boolean;
    data: VocabularyWord | null;
    hasUserWord?: boolean;
}> {
    const client = await getApiClientAsync();
    const result = await client.vocabulary.lookup(word);

    if (result.data?.found && result.data?.data) {
        return {
            found: true,
            data: {
                id: 0,
                word: result.data.data.word,
                definition: result.data.data.definition,
                level: (result.data.data as any).level || 'B1',
                is_learned: false,
                example_sentence: result.data.data.example || '',
                original_sentence: '',
                created_at: new Date().toISOString(),
            },
            hasUserWord: result.data.hasUserWord,
        };
    }

    return { found: false, data: null };
}

/**
 * Get SRS due words
 */
export async function getDueWords(): Promise<UserWord[]> {
    const client = await getApiClientAsync();
    const result = await client.vocabulary.getDueWords();
    return result.data || [];
}

/**
 * Get vocabulary statistics
 */
export async function getVocabularyStats(): Promise<{
    totalWords: number;
    masteredWords: number;
    learningWords: number;
    dueToday: number;
    streakDays: number;
    reviewsToday: number;
}> {
    const client = await getApiClientAsync();
    const result = await client.vocabulary.getStats();
    return result.data || {
        totalWords: 0,
        masteredWords: 0,
        learningWords: 0,
        dueToday: 0,
        streakDays: 0,
        reviewsToday: 0,
    };
}


