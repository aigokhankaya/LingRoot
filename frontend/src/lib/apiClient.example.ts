/**
 * Example: How to migrate from old api.ts to new apiClient
 * 
 * This file shows the before/after for common API patterns.
 * 
 * Created: 2026-01-16
 */

// ============================================
// BEFORE (Old way - using api.ts functions)
// ============================================

// import { login, register, getVoices, processTts, getContentHistory } from '../lib/api';
// 
// async function oldWay() {
//   // Login
//   const loginResult = await login({ email: 'user@example.com', password: 'pass' });
//   
//   // Get voices
//   const voices = await getVoices();
//   
//   // Process TTS
//   const audio = await processTts({
//     type: 'text',
//     input: 'Hello world',
//     level: 'A1',
//   });
//   
//   // Get history
//   const history = await getContentHistory();
// }

// ============================================
// AFTER (New way - using apiClient)
// ============================================

import { apiClient } from '@/lib/apiClient';

async function newWay() {
    // Login
    const loginResult = await apiClient.auth.login({
        email: 'user@example.com',
        password: 'pass'
    });
    console.log('Logged in user:', loginResult.data.user.email);

    // Get voices
    const voicesResult = await apiClient.tts.listVoices();
    console.log('Available voices:', voicesResult.voices.length);

    // Process TTS
    const audio = await apiClient.tts.process({
        type: 'text',
        input: 'Hello world',
        level: 'A1',
    });
    console.log('Audio URL:', audio.mp3_url);

    // Get history
    const history = await apiClient.content.getHistory(1, 20);
    console.log('Content items:', history.data.length);

    // Get usage summary
    const usage = await apiClient.subscription.getUsageSummary();
    console.log('TTS used today:', usage.data?.ttsUsedToday);

    // Chat with Liro
    const chatResponse = await apiClient.chat.sendMessage({
        message: 'Hi, I want to learn about cooking',
        generateAudio: true,
        conversationId: 'dummy-id',
    });
    console.log('Liro says:', chatResponse.message.content);

    // Vocabulary lookup
    const wordLookup = await apiClient.vocabulary.lookup('serendipity');
    if (wordLookup.data?.found) {
        console.log('Definition:', wordLookup.data.data?.definition);
    }

    // Add word to SRS
    const addedWord = await apiClient.vocabulary.addWord('serendipity', 'chat');
    console.log('Word added:', addedWord.data?.word);

    // Books
    const books = await apiClient.book.search('Shakespeare');
    console.log('Found books:', books.data.length);
}

// ============================================
// MOBILE USAGE (React Native)
// ============================================

// import { getApiClientAsync } from '../services/apiClient';
//
// async function mobileExample() {
//   const client = await getApiClientAsync();
//   
//   // Same API as web!
//   const voices = await client.tts.listVoices();
//   const user = await client.auth.getCurrentUser();
// }

// ============================================
// ERROR HANDLING
// ============================================

import type { ApiError } from '@lingroot/api-client';

async function withErrorHandling() {
    try {
        await apiClient.auth.login({
            email: 'user@example.com',
            password: 'wrong'
        });
    } catch (error: any) {
        // Check for specific error codes
        if (error.response?.data?.code === 'INVALID_CREDENTIALS') {
            console.log('Wrong email or password');
        } else if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
            console.log('Please verify your email first');
        } else {
            console.log('Login failed:', error.message);
        }
    }
}

// ============================================
// TYPE-SAFE RESPONSES
// ============================================

import type { User, TTSResponse, Voice } from '@lingroot/api-client';

async function typeSafeExample() {
    // Types are automatically inferred
    const loginResult = await apiClient.auth.login({
        email: 'user@example.com',
        password: 'pass'
    });

    // TypeScript knows the shape of the response
    const user: User = loginResult.data.user;
    const token: string = loginResult.data.token;

    // Voice listing with types
    const voicesResult = await apiClient.tts.listVoices();
    const voices: Voice[] = voicesResult.voices;

    // Filter by type-safe properties
    const femaleVoices = voices.filter(v => v.gender === 'female');
    const britishVoices = voices.filter(v => v.accent === 'british');
}

export { newWay, withErrorHandling, typeSafeExample };
