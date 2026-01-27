/**
 * 🎮 Mini Activity Service
 *
 * Sohbet içinde hızlı, interaktif öğrenme aktiviteleri üretir.
 * Aktivite türleri:
 * - Quick Vocab: 3 kelimelik flash card
 * - Mini Roleplay: 4 turlu kısa dialog pratiği
 * - Instant Quiz: 3 soruluk hızlı quiz
 * - Phrase Practice: Faydalı ifade varyasyonları
 *
 * @module miniActivityService
 */

const openaiClient = require('../utils/ai/openaiClient.js');
const logger = require('../utils/common/logger.js');

class MiniActivityService {
    constructor() {
        // XP ödülleri
        this.XP_REWARDS = {
            quick_vocab: 5,
            mini_roleplay: 15,
            instant_quiz: 10,
            phrase_practice: 8
        };

        // CEFR seviye ayarları
        this.LEVEL_CONFIG = {
            'A1': { wordCount: 3, complexity: 'very_simple', quizDifficulty: 'basic' },
            'A2': { wordCount: 3, complexity: 'simple', quizDifficulty: 'easy' },
            'B1': { wordCount: 4, complexity: 'moderate', quizDifficulty: 'medium' },
            'B2': { wordCount: 4, complexity: 'intermediate', quizDifficulty: 'challenging' },
            'C1': { wordCount: 5, complexity: 'advanced', quizDifficulty: 'hard' },
            'C2': { wordCount: 5, complexity: 'native', quizDifficulty: 'expert' }
        };
    }

    /**
     * 📚 Quick Vocab - Hızlı kelime kartları
     * @param {string} topic - Konu/bağlam
     * @param {string} level - CEFR seviyesi (A1-C2)
     * @param {number} count - Kelime sayısı (default: 3)
     * @returns {Promise<Object>} Kelime kartları
     */
    async generateQuickVocab(topic, level = 'B1', count = 3) {
        const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG['B1'];
        const actualCount = Math.min(count, config.wordCount);

        const prompt = `Generate ${actualCount} English vocabulary words related to "${topic}" for a ${level} level Turkish learner.

IMPORTANT RULES:
- Words must be appropriate for ${level} level (CEFR)
- Include practical, commonly used words
- Provide clear, simple Turkish translations
- Add one memorable example sentence each

Return ONLY valid JSON:
{
  "words": [
    {
      "word": "negotiate",
      "pronunciation": "/nɪˈɡoʊʃieɪt/",
      "partOfSpeech": "verb",
      "turkishMeaning": "müzakere etmek, pazarlık yapmak",
      "exampleSentence": "We need to negotiate the contract terms.",
      "exampleTranslation": "Sözleşme şartlarını müzakere etmemiz gerekiyor.",
      "tip": "Hatırla: 'nego' = iş, 'tiate' = yapmak"
    }
  ],
  "topic": "${topic}",
  "level": "${level}"
}`;

        try {
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.7,
                maxTokens: 800,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a vocabulary expert. Output valid JSON only, no markdown.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            return {
                type: 'quick_vocab',
                ...result,
                xpReward: this.XP_REWARDS.quick_vocab,
                estimatedTime: '30 saniye'
            };

        } catch (error) {
            logger.error('[MiniActivityService] Quick vocab generation failed:', error);
            return this._getFallbackVocab(topic, level);
        }
    }

    /**
     * 💬 Mini Roleplay - Kısa diyalog pratiği
     * @param {string} scenario - Senaryo açıklaması
     * @param {string} level - CEFR seviyesi
     * @param {number} turns - Tur sayısı (default: 4)
     * @returns {Promise<Object>} Roleplay data
     */
    async generateMiniRoleplay(scenario, level = 'B1', turns = 4) {
        const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG['B1'];

        const prompt = `Create a ${turns}-turn mini roleplay scenario about "${scenario}" for a ${level} level English learner.

RULES:
- Language complexity: ${config.complexity}
- User plays the LEARNER role
- AI plays the OTHER person
- Each turn should be 1-2 sentences
- Include helpful phrases the learner might use

Return ONLY valid JSON:
{
  "scenario": {
    "title": "Ordering Coffee",
    "titleTurkish": "Kahve Siparişi",
    "setting": "A busy coffee shop in London",
    "userRole": "Customer",
    "aiRole": "Barista"
  },
  "starterLine": {
    "speaker": "ai",
    "text": "Good morning! What can I get for you today?",
    "translation": "Günaydın! Bugün size ne getirebilirim?"
  },
  "suggestedResponses": [
    {
      "text": "I'd like a large cappuccino, please.",
      "translation": "Büyük boy kapuçino istiyorum, lütfen.",
      "difficulty": "easy"
    },
    {
      "text": "Could I have a cappuccino with oat milk?",
      "translation": "Yulaf sütlü kapuçino alabilir miyim?",
      "difficulty": "medium"
    }
  ],
  "helpfulPhrases": [
    {
      "phrase": "I'd like...",
      "meaning": "... istiyorum",
      "usage": "Sipariş verirken"
    },
    {
      "phrase": "Could I have...?",
      "meaning": "... alabilir miyim?",
      "usage": "Daha kibar sipariş"
    }
  ],
  "expectedTurns": ${turns}
}`;

        try {
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.8,
                maxTokens: 1000,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a roleplay scenario designer. Output valid JSON only, no markdown.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            return {
                type: 'mini_roleplay',
                ...result,
                level,
                xpReward: this.XP_REWARDS.mini_roleplay,
                estimatedTime: '2 dakika'
            };

        } catch (error) {
            logger.error('[MiniActivityService] Mini roleplay generation failed:', error);
            return this._getFallbackRoleplay(scenario, level);
        }
    }

    /**
     * ❓ Instant Quiz - Hızlı quiz
     * @param {string} topic - Konu
     * @param {string} level - CEFR seviyesi
     * @param {number} count - Soru sayısı (default: 3)
     * @param {string} previousContent - Önceki içerik (opsiyonel, bağlam için)
     * @returns {Promise<Object>} Quiz data
     */
    async generateInstantQuiz(topic, level = 'B1', count = 3, previousContent = null) {
        const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG['B1'];

        const contextNote = previousContent
            ? `\nBase questions on this content: "${previousContent.substring(0, 500)}"`
            : '';

        const prompt = `Create ${count} quick quiz questions about "${topic}" for a ${level} level English learner.${contextNote}

RULES:
- Difficulty: ${config.quizDifficulty}
- Mix question types: vocabulary, grammar, comprehension
- Each question has 4 options with 1 correct answer
- Include brief explanation for correct answer

Return ONLY valid JSON:
{
  "quiz": {
    "title": "Quick ${topic} Quiz",
    "titleTurkish": "Hızlı ${topic} Quiz",
    "topic": "${topic}",
    "level": "${level}"
  },
  "questions": [
    {
      "id": 1,
      "type": "vocabulary",
      "question": "What does 'negotiate' mean?",
      "questionTurkish": "'Negotiate' ne demek?",
      "options": [
        { "id": "a", "text": "To argue angrily", "isCorrect": false },
        { "id": "b", "text": "To discuss to reach an agreement", "isCorrect": true },
        { "id": "c", "text": "To ignore completely", "isCorrect": false },
        { "id": "d", "text": "To celebrate loudly", "isCorrect": false }
      ],
      "explanation": "'Negotiate' means to discuss something to reach an agreement, often in business contexts.",
      "explanationTurkish": "'Negotiate' bir anlaşmaya varmak için tartışmak demektir, genellikle iş bağlamında kullanılır."
    }
  ]
}`;

        try {
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.7,
                maxTokens: 1200,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a quiz designer. Output valid JSON only, no markdown.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            return {
                type: 'instant_quiz',
                ...result,
                xpReward: this.XP_REWARDS.instant_quiz,
                estimatedTime: '1 dakika'
            };

        } catch (error) {
            logger.error('[MiniActivityService] Instant quiz generation failed:', error);
            return this._getFallbackQuiz(topic, level);
        }
    }

    /**
     * 📝 Phrase Practice - İfade pratiği
     * @param {string} basePhrase - Temel ifade
     * @param {string} level - CEFR seviyesi
     * @returns {Promise<Object>} Phrase variations
     */
    async generatePhrasePractice(basePhrase, level = 'B1') {
        const prompt = `Create phrase practice variations for "${basePhrase}" for a ${level} level English learner.

Include:
1. The base phrase with pronunciation
2. 3-4 variations (formal, informal, alternative)
3. Common mistakes to avoid
4. Usage context examples

Return ONLY valid JSON:
{
  "basePhrase": {
    "english": "${basePhrase}",
    "turkish": "[translation]",
    "pronunciation": "[IPA]",
    "register": "neutral"
  },
  "variations": [
    {
      "english": "[variation]",
      "turkish": "[translation]",
      "register": "formal/informal/casual",
      "when": "Use when..."
    }
  ],
  "commonMistakes": [
    {
      "wrong": "[incorrect usage]",
      "correct": "[correct usage]",
      "explanation": "[why it's wrong]"
    }
  ],
  "practiceContexts": [
    {
      "context": "At work",
      "example": "[example sentence]",
      "translation": "[Turkish translation]"
    }
  ]
}`;

        try {
            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.7,
                maxTokens: 800,
                model: 'gpt-4o-mini',
                systemPrompt: 'You are a phrase expert. Output valid JSON only, no markdown.'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(content);

            return {
                type: 'phrase_practice',
                ...result,
                level,
                xpReward: this.XP_REWARDS.phrase_practice,
                estimatedTime: '45 saniye'
            };

        } catch (error) {
            logger.error('[MiniActivityService] Phrase practice generation failed:', error);
            return this._getFallbackPhrasePractice(basePhrase, level);
        }
    }

    /**
     * 🎯 Aktivite tipi öner (bağlama göre)
     * @param {string} context - Sohbet bağlamı
     * @param {string} level - CEFR seviyesi
     * @returns {string} Önerilen aktivite tipi
     */
    suggestActivityType(context, level) {
        const contextLower = (context || '').toLowerCase();

        // Kelime sorulmuş
        if (contextLower.includes('kelime') || contextLower.includes('vocabulary') || contextLower.includes('ne demek')) {
            return 'quick_vocab';
        }

        // Pratik/konuşma isteniyor
        if (contextLower.includes('pratik') || contextLower.includes('konuşma') || contextLower.includes('practice')) {
            return 'mini_roleplay';
        }

        // Test/quiz isteniyor
        if (contextLower.includes('test') || contextLower.includes('quiz') || contextLower.includes('sınav')) {
            return 'instant_quiz';
        }

        // Gramer/cümle yapısı
        if (contextLower.includes('gramer') || contextLower.includes('nasıl söylenir') || contextLower.includes('ifade')) {
            return 'phrase_practice';
        }

        // Default: seviyeye göre
        const levelNum = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(level);
        if (levelNum <= 1) return 'quick_vocab';  // A1-A2
        if (levelNum <= 3) return 'instant_quiz'; // B1-B2
        return 'mini_roleplay'; // C1-C2
    }

    /**
     * ✅ Aktivite tamamlandı - XP hesapla
     * @param {string} activityType - Aktivite tipi
     * @param {number} correctAnswers - Doğru cevap sayısı (quiz için)
     * @param {number} totalQuestions - Toplam soru (quiz için)
     * @returns {Object} XP reward info
     */
    calculateXpReward(activityType, correctAnswers = null, totalQuestions = null) {
        const baseXp = this.XP_REWARDS[activityType] || 5;

        if (activityType === 'instant_quiz' && correctAnswers !== null && totalQuestions) {
            const percentage = correctAnswers / totalQuestions;
            const bonusMultiplier = percentage >= 1 ? 1.5 : percentage >= 0.66 ? 1.2 : 1;
            return {
                baseXp,
                bonusMultiplier,
                totalXp: Math.round(baseXp * bonusMultiplier),
                perfectScore: percentage >= 1
            };
        }

        return {
            baseXp,
            bonusMultiplier: 1,
            totalXp: baseXp,
            perfectScore: false
        };
    }

    // =========================================================================
    // Fallback responses (API hata durumunda)
    // =========================================================================

    _getFallbackVocab(topic, level) {
        return {
            type: 'quick_vocab',
            words: [
                {
                    word: 'learn',
                    pronunciation: '/lɜːrn/',
                    partOfSpeech: 'verb',
                    turkishMeaning: 'öğrenmek',
                    exampleSentence: 'I want to learn English.',
                    exampleTranslation: 'İngilizce öğrenmek istiyorum.',
                    tip: 'Temel fiillerden biri!'
                }
            ],
            topic,
            level,
            xpReward: this.XP_REWARDS.quick_vocab,
            estimatedTime: '30 saniye',
            isFallback: true
        };
    }

    _getFallbackRoleplay(scenario, level) {
        return {
            type: 'mini_roleplay',
            scenario: {
                title: 'Basic Greeting',
                titleTurkish: 'Temel Selamlama',
                setting: 'Meeting someone new',
                userRole: 'You',
                aiRole: 'A friendly person'
            },
            starterLine: {
                speaker: 'ai',
                text: 'Hello! How are you today?',
                translation: 'Merhaba! Bugün nasılsın?'
            },
            suggestedResponses: [
                {
                    text: "I'm fine, thank you!",
                    translation: 'İyiyim, teşekkür ederim!',
                    difficulty: 'easy'
                }
            ],
            helpfulPhrases: [
                {
                    phrase: "I'm fine",
                    meaning: 'İyiyim',
                    usage: 'Hal hatır sorusuna cevap'
                }
            ],
            expectedTurns: 4,
            level,
            xpReward: this.XP_REWARDS.mini_roleplay,
            estimatedTime: '2 dakika',
            isFallback: true
        };
    }

    _getFallbackQuiz(topic, level) {
        return {
            type: 'instant_quiz',
            quiz: {
                title: 'Quick English Quiz',
                titleTurkish: 'Hızlı İngilizce Quiz',
                topic,
                level
            },
            questions: [
                {
                    id: 1,
                    type: 'vocabulary',
                    question: "What is the opposite of 'big'?",
                    questionTurkish: "'Big' kelimesinin zıttı nedir?",
                    options: [
                        { id: 'a', text: 'Large', isCorrect: false },
                        { id: 'b', text: 'Small', isCorrect: true },
                        { id: 'c', text: 'Huge', isCorrect: false },
                        { id: 'd', text: 'Tall', isCorrect: false }
                    ],
                    explanation: "'Small' is the opposite of 'big'.",
                    explanationTurkish: "'Small' (küçük), 'big' (büyük) kelimesinin zıttıdır."
                }
            ],
            xpReward: this.XP_REWARDS.instant_quiz,
            estimatedTime: '1 dakika',
            isFallback: true
        };
    }

    _getFallbackPhrasePractice(basePhrase, level) {
        return {
            type: 'phrase_practice',
            basePhrase: {
                english: basePhrase || 'How are you?',
                turkish: 'Nasılsın?',
                pronunciation: '/haʊ ɑːr juː/',
                register: 'neutral'
            },
            variations: [
                {
                    english: "How are you doing?",
                    turkish: 'Nasıl gidiyor?',
                    register: 'informal',
                    when: 'Arkadaşlarla konuşurken'
                }
            ],
            commonMistakes: [
                {
                    wrong: 'How do you do?',
                    correct: 'How are you?',
                    explanation: "'How do you do?' resmi tanışmalarda kullanılır"
                }
            ],
            practiceContexts: [
                {
                    context: 'Meeting a friend',
                    example: 'Hey! How are you?',
                    translation: 'Hey! Nasılsın?'
                }
            ],
            level,
            xpReward: this.XP_REWARDS.phrase_practice,
            estimatedTime: '45 saniye',
            isFallback: true
        };
    }
}

module.exports = new MiniActivityService();
