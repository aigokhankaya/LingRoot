/**
 * 🎯 Placement Test Service
 * 
 * Adaptive CEFR-based vocabulary placement test.
 * Uses Computerized Adaptive Testing (CAT) principles.
 */

const db = require('../config/db');
const logger = require('../utils/logger');

// CEFR Word Bank (Oxford 3000/5000 inspired)
const QUESTION_BANK = [
    // A1 - Beginner
    { id: 1, word: "apple", level: "A1", correct: "Elma", distractors: ["Armut", "Portakal", "Muz"] },
    { id: 2, word: "house", level: "A1", correct: "Ev", distractors: ["Araba", "Okul", "Hastane"] },
    { id: 3, word: "water", level: "A1", correct: "Su", distractors: ["Süt", "Çay", "Kahve"] },
    { id: 4, word: "happy", level: "A1", correct: "Mutlu", distractors: ["Üzgün", "Kızgın", "Yorgun"] },
    { id: 5, word: "big", level: "A1", correct: "Büyük", distractors: ["Küçük", "Uzun", "Kısa"] },
    { id: 6, word: "eat", level: "A1", correct: "Yemek yemek", distractors: ["İçmek", "Uyumak", "Koşmak"] },
    { id: 7, word: "run", level: "A1", correct: "Koşmak", distractors: ["Yürümek", "Oturmak", "Yüzmek"] },
    { id: 8, word: "friend", level: "A1", correct: "Arkadaş", distractors: ["Düşman", "Komşu", "Öğretmen"] },
    { id: 9, word: "school", level: "A1", correct: "Okul", distractors: ["Hastane", "Market", "Park"] },
    { id: 10, word: "today", level: "A1", correct: "Bugün", distractors: ["Yarın", "Dün", "Hafta"] },

    // A2 - Elementary
    { id: 11, word: "expensive", level: "A2", correct: "Pahalı", distractors: ["Ucuz", "Güzel", "Kötü"] },
    { id: 12, word: "journey", level: "A2", correct: "Yolculuk", distractors: ["Tatil", "İş", "Oyun"] },
    { id: 13, word: "customer", level: "A2", correct: "Müşteri", distractors: ["Satıcı", "Şef", "Garson"] },
    { id: 14, word: "furniture", level: "A2", correct: "Mobilya", distractors: ["Giysi", "Yiyecek", "Araç"] },
    { id: 15, word: "weather", level: "A2", correct: "Hava durumu", distractors: ["Mevsim", "Yıl", "Gün"] },
    { id: 16, word: "abroad", level: "A2", correct: "Yurt dışında", distractors: ["Evde", "Okulda", "Şehirde"] },
    { id: 17, word: "improve", level: "A2", correct: "Geliştirmek", distractors: ["Bozmak", "Durdurmak", "Silmek"] },
    { id: 18, word: "envelope", level: "A2", correct: "Zarf", distractors: ["Mektup", "Pul", "Kutu"] },
    { id: 19, word: "borrow", level: "A2", correct: "Ödünç almak", distractors: ["Ödünç vermek", "Satmak", "Çalmak"] },
    { id: 20, word: "ancient", level: "A2", correct: "Antik, eski", distractors: ["Modern", "Yeni", "Genç"] },

    // B1 - Intermediate
    { id: 21, word: "opportunity", level: "B1", correct: "Fırsat", distractors: ["Sorun", "Engel", "Tehlike"] },
    { id: 22, word: "experience", level: "B1", correct: "Deneyim", distractors: ["Teori", "Hayal", "Plan"] },
    { id: 23, word: "environment", level: "B1", correct: "Çevre", distractors: ["Ekonomi", "Politika", "Teknoloji"] },
    { id: 24, word: "reasonable", level: "B1", correct: "Makul, mantıklı", distractors: ["Saçma", "Pahalı", "Zor"] },
    { id: 25, word: "achieve", level: "B1", correct: "Başarmak", distractors: ["Başarısız olmak", "Denemek", "Planlamak"] },
    { id: 26, word: "influence", level: "B1", correct: "Etkilemek", distractors: ["İzlemek", "Beklemek", "Görmezden gelmek"] },
    { id: 27, word: "reduce", level: "B1", correct: "Azaltmak", distractors: ["Artırmak", "Sabit tutmak", "İkiye katlamak"] },
    { id: 28, word: "organization", level: "B1", correct: "Organizasyon, kuruluş", distractors: ["Karmaşa", "Birey", "Rastgele"] },
    { id: 29, word: "previous", level: "B1", correct: "Önceki", distractors: ["Sonraki", "Şimdiki", "Gelecek"] },
    { id: 30, word: "variety", level: "B1", correct: "Çeşitlilik", distractors: ["Tekdüzelik", "Azlık", "Sıkıcılık"] },

    // B2 - Upper Intermediate
    { id: 31, word: "comprehensive", level: "B2", correct: "Kapsamlı", distractors: ["Kısmi", "Yüzeysel", "Dar"] },
    { id: 32, word: "acknowledge", level: "B2", correct: "Kabul etmek, onaylamak", distractors: ["Reddetmek", "Görmezden gelmek", "Yalanlamak"] },
    { id: 33, word: "consequence", level: "B2", correct: "Sonuç", distractors: ["Neden", "Başlangıç", "Kaynak"] },
    { id: 34, word: "inevitable", level: "B2", correct: "Kaçınılmaz", distractors: ["Önlenebilir", "İsteğe bağlı", "Belirsiz"] },
    { id: 35, word: "sophisticated", level: "B2", correct: "Sofistike, karmaşık", distractors: ["Basit", "İlkel", "Kaba"] },
    { id: 36, word: "eliminate", level: "B2", correct: "Ortadan kaldırmak", distractors: ["Eklemek", "Korumak", "Güçlendirmek"] },
    { id: 37, word: "advocate", level: "B2", correct: "Savunmak", distractors: ["Eleştirmek", "Karşı çıkmak", "İhmal etmek"] },
    { id: 38, word: "legitimate", level: "B2", correct: "Meşru, yasal", distractors: ["Yasadışı", "Şüpheli", "Hileli"] },
    { id: 39, word: "enormous", level: "B2", correct: "Devasa, çok büyük", distractors: ["Minik", "Orta", "Küçük"] },
    { id: 40, word: "phenomenon", level: "B2", correct: "Fenomen, olağanüstü olay", distractors: ["Rutin", "Sıradanlık", "Alışkanlık"] },

    // C1 - Advanced
    { id: 41, word: "ambiguous", level: "C1", correct: "Belirsiz, muğlak", distractors: ["Net", "Açık", "Kesin"] },
    { id: 42, word: "corroborate", level: "C1", correct: "Doğrulamak, desteklemek", distractors: ["Çürütmek", "Reddetmek", "Sorgulamak"] },
    { id: 43, word: "intricacy", level: "C1", correct: "Karmaşıklık, incelik", distractors: ["Basitlik", "Açıklık", "Kolaylık"] },
    { id: 44, word: "pragmatic", level: "C1", correct: "Pragmatik, pratik", distractors: ["İdealist", "Hayalci", "Teorik"] },
    { id: 45, word: "ubiquitous", level: "C1", correct: "Her yerde bulunan", distractors: ["Nadir", "Eşsiz", "Gizli"] },
    { id: 46, word: "lucrative", level: "C1", correct: "Kazançlı, kârlı", distractors: ["Zararlı", "Maliyetli", "Değersiz"] },
    { id: 47, word: "alleviate", level: "C1", correct: "Hafifletmek, azaltmak", distractors: ["Ağırlaştırmak", "Artırmak", "Kötüleştirmek"] },
    { id: 48, word: "meticulous", level: "C1", correct: "Titiz, dikkatli", distractors: ["Özensiz", "Dikkatsiz", "Aceleci"] },
    { id: 49, word: "resilient", level: "C1", correct: "Dayanıklı, esnek", distractors: ["Kırılgan", "Zayıf", "Hassas"] },
    { id: 50, word: "transient", level: "C1", correct: "Geçici, kısa süreli", distractors: ["Kalıcı", "Sürekli", "Ebedi"] },

    // C2 - Proficiency
    { id: 51, word: "ineffable", level: "C2", correct: "Tarif edilemez", distractors: ["Kolay anlatılır", "Basit", "Sıradan"] },
    { id: 52, word: "obfuscate", level: "C2", correct: "Karmaşıklaştırmak, bulandırmak", distractors: ["Açıklamak", "Netleştirmek", "Sadeleştirmek"] },
    { id: 53, word: "perspicacious", level: "C2", correct: "Keskin zekalı, anlayışlı", distractors: ["Aptal", "Saf", "Dikkatsiz"] },
    { id: 54, word: "sesquipedalian", level: "C2", correct: "Uzun kelimeler kullanan", distractors: ["Kısa konuşan", "Sessiz", "Az sözlü"] },
    { id: 55, word: "verisimilitude", level: "C2", correct: "Gerçeğe benzerlik", distractors: ["Sahtelik", "Yapaylık", "Tutarsızlık"] },
    { id: 56, word: "sycophant", level: "C2", correct: "Dalkavuk, yağcı", distractors: ["Eleştirmen", "Muhalif", "Dürüst kişi"] },
    { id: 57, word: "recalcitrant", level: "C2", correct: "İnatçı, söz dinlemez", distractors: ["Uysal", "İtaatkar", "Uyumlu"] },
    { id: 58, word: "pulchritudinous", level: "C2", correct: "Güzel (fiziksel olarak)", distractors: ["Çirkin", "Sıradan", "Vasat"] },
    { id: 59, word: "cacophony", level: "C2", correct: "Gürültülü ses uyumsuzluğu", distractors: ["Armoni", "Melodi", "Sessizlik"] },
    { id: 60, word: "ephemeral", level: "C2", correct: "Geçici, kısa ömürlü", distractors: ["Kalıcı", "Ölümsüz", "Sonsuz"] }
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_SCORES = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

class PlacementTestService {
    /**
     * Start a new test session
     * Returns initial questions (starting from B1)
     */
    startTest() {
        const session = {
            currentLevel: 'B1',
            questionsAsked: [],
            correctByLevel: { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 },
            totalByLevel: { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 },
            score: 0,
            maxQuestions: 20
        };
        return session;
    }

    /**
     * Get next question based on current performance (Adaptive)
     */
    getNextQuestion(session) {
        if (session.questionsAsked.length >= session.maxQuestions) {
            return null; // Test complete
        }

        const availableQuestions = QUESTION_BANK.filter(
            q => q.level === session.currentLevel && !session.questionsAsked.includes(q.id)
        );

        // If no questions left at current level, try adjacent levels
        let question = null;
        if (availableQuestions.length > 0) {
            question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        } else {
            // Find any unanswered question, preferring closer levels
            const allAvailable = QUESTION_BANK.filter(q => !session.questionsAsked.includes(q.id));
            if (allAvailable.length > 0) {
                // Sort by distance to current level
                allAvailable.sort((a, b) => {
                    const distA = Math.abs(LEVEL_SCORES[a.level] - LEVEL_SCORES[session.currentLevel]);
                    const distB = Math.abs(LEVEL_SCORES[b.level] - LEVEL_SCORES[session.currentLevel]);
                    return distA - distB;
                });
                question = allAvailable[0];
            }
        }

        if (!question) return null;

        // Shuffle options
        const options = this.shuffleArray([question.correct, ...question.distractors]);

        return {
            id: question.id,
            word: question.word,
            level: question.level,
            options,
            correctIndex: options.indexOf(question.correct)
        };
    }

    /**
     * Process user's answer and adapt difficulty
     */
    processAnswer(session, questionId, selectedIndex) {
        const question = QUESTION_BANK.find(q => q.id === questionId);
        if (!question) throw new Error('Question not found');

        session.questionsAsked.push(questionId);
        session.totalByLevel[question.level]++;

        const options = this.shuffleArray([question.correct, ...question.distractors]);
        const correctIndex = options.indexOf(question.correct);
        const isCorrect = selectedIndex === correctIndex;

        if (isCorrect) {
            session.correctByLevel[question.level]++;
            session.score++;

            // Adapt UP if doing well
            const currentLevelIdx = LEVELS.indexOf(session.currentLevel);
            if (currentLevelIdx < LEVELS.length - 1) {
                session.currentLevel = LEVELS[currentLevelIdx + 1];
            }
        } else {
            // Adapt DOWN if struggling
            const currentLevelIdx = LEVELS.indexOf(session.currentLevel);
            if (currentLevelIdx > 0) {
                session.currentLevel = LEVELS[currentLevelIdx - 1];
            }
        }

        return {
            isCorrect,
            correctAnswer: question.correct,
            newLevel: session.currentLevel,
            progress: session.questionsAsked.length / session.maxQuestions
        };
    }

    /**
     * Calculate final CEFR level
     */
    calculateFinalLevel(session) {
        // Find highest level with >= 50% accuracy
        let finalLevel = 'A1';
        let totalCorrect = 0;
        let totalQuestions = 0;

        for (const level of LEVELS) {
            const correct = session.correctByLevel[level];
            const total = session.totalByLevel[level];
            totalCorrect += correct;
            totalQuestions += total;

            if (total >= 2 && correct / total >= 0.5) {
                finalLevel = level;
            }
        }

        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        return {
            level: finalLevel,
            accuracy,
            breakdown: {
                A1: { correct: session.correctByLevel.A1, total: session.totalByLevel.A1 },
                A2: { correct: session.correctByLevel.A2, total: session.totalByLevel.A2 },
                B1: { correct: session.correctByLevel.B1, total: session.totalByLevel.B1 },
                B2: { correct: session.correctByLevel.B2, total: session.totalByLevel.B2 },
                C1: { correct: session.correctByLevel.C1, total: session.totalByLevel.C1 },
                C2: { correct: session.correctByLevel.C2, total: session.totalByLevel.C2 }
            }
        };
    }

    /**
     * Save result to user profile
     */
    async saveResult(userId, result) {
        try {
            await db.query(
                `UPDATE users SET cefr_level = $1, vocabulary_size_estimate = $2, placement_test_at = NOW() WHERE id = $3`,
                [result.level, this.estimateVocabularySize(result.level), userId]
            );
            logger.info(`[Placement Test] User ${userId} placed at ${result.level}`);
            return true;
        } catch (error) {
            logger.error('[Placement Test] Save error:', error);
            // Column might not exist yet, that's okay
            return false;
        }
    }

    estimateVocabularySize(level) {
        const estimates = { A1: 500, A2: 1500, B1: 2500, B2: 4000, C1: 5500, C2: 8000 };
        return estimates[level] || 2500;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

module.exports = new PlacementTestService();
