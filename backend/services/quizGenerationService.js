// Quiz Generation Service
// Extracted from contentController.js - handles business logic for quiz generation and submission

const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const gamificationService = require('./gamificationService');

/**
 * Helper function to parse JSON strings safely
 */
function tryParseJson(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a smart question with pedagogically sound distractors
 * @param {Object} wordData - Word object with word, definition, etc.
 * @param {string} type - Question type
 * @param {Array} allWords - All available words for distractor pool
 * @param {number} difficulty - Difficulty level 1-5
 * @param {number} id - Question ID
 */
async function generateSmartQuestion(wordData, type, allWords, difficulty, id) {
  const word = wordData.word;
  const meaning = wordData.definition || wordData.meaning;

  if (!word || !meaning) return null;

  switch (type) {
    case 'cloze':
      return generateClozeQuestion(wordData, id, difficulty);

    case 'matching':
      return null; // Handled separately

    case 'multiple_choice':
    default:
      return generateMCQuestion(wordData, allWords, id, difficulty);
  }
}

/**
 * Generate Multiple Choice question with smart distractors
 */
function generateMCQuestion(wordData, allWords, id, difficulty) {
  const word = wordData.word;
  const meaning = wordData.definition || wordData.meaning;

  // Smart distractor selection strategies
  const distractors = selectSmartDistractors(wordData, allWords, 3);

  // Combine correct answer with distractors and shuffle
  const allOptions = [meaning, ...distractors];
  const shuffled = shuffleArray(allOptions);
  const correctIndex = shuffled.indexOf(meaning);

  // Determine question template based on difficulty
  let questionTemplate = `"${word}" kelimesinin anlamı nedir?`;
  if (difficulty >= 4) {
    questionTemplate = `Which of the following best describes "${word}"?`;
  }

  return {
    id,
    type: 'multiple_choice',
    word,
    question: questionTemplate,
    options: shuffled,
    correct: correctIndex,
    points: 10,
    difficulty,
    explanation: {
      tr: `${word}: ${meaning}`,
      en: wordData.example || null
    },
    priority: wordData.priority || 'content'
  };
}

/**
 * Generate Cloze (fill-in-the-blank) question
 */
function generateClozeQuestion(wordData, id, difficulty) {
  const word = wordData.word;
  const meaning = wordData.definition || wordData.meaning;
  const example = wordData.example || wordData.context;

  // Generate sentence with blank
  let sentence;
  if (example && example.toLowerCase().includes(word.toLowerCase())) {
    // Use actual example sentence
    sentence = example.replace(new RegExp(`\\b${word}\\b`, 'gi'), '_____');
  } else {
    // Generate generic template
    const templates = [
      `The concept of _____ is essential in this context.`,
      `Understanding _____ helps in professional communication.`,
      `The term _____ refers to ${meaning.split(' ').slice(0, 5).join(' ')}...`
    ];
    sentence = templates[Math.floor(Math.random() * templates.length)];
  }

  return {
    id,
    type: 'cloze',
    word,
    question: `Boşluğu doldurun: "${sentence}"`,
    sentence_template: sentence,
    correct: word,
    acceptAlternatives: [word.toLowerCase(), word.toUpperCase()],
    points: 12,
    difficulty,
    explanation: {
      tr: `Doğru cevap: ${word} - ${meaning}`,
      en: example || null
    },
    priority: wordData.priority || 'content'
  };
}

/**
 * Select pedagogically sound distractors
 * Strategies:
 * 1. Semantic similarity (same category)
 * 2. Phonetic similarity (similar sounding)
 * 3. Common confusion (frequently mistaken pairs)
 */
function selectSmartDistractors(targetWord, allWords, count) {
  const targetMeaning = targetWord.definition || targetWord.meaning || '';
  const targetWordStr = targetWord.word || '';

  // Filter out target word
  const otherWords = allWords.filter(w =>
    w.word && w.word.toLowerCase() !== targetWordStr.toLowerCase()
  );

  if (otherWords.length === 0) {
    return getGenericDistractors(count);
  }

  // Score each potential distractor
  const scored = otherWords.map(w => {
    let score = 0;
    const meaning = w.definition || w.meaning || '';
    const wordStr = w.word || '';

    // Semantic similarity (longer similar words = more confusing)
    const targetWords = targetMeaning.toLowerCase().split(' ');
    const candidateWords = meaning.toLowerCase().split(' ');
    const commonWords = targetWords.filter(tw =>
      candidateWords.some(cw => cw.includes(tw) || tw.includes(cw))
    );
    score += commonWords.length * 2;

    // Phonetic similarity (first letter match, similar length)
    if (wordStr[0]?.toLowerCase() === targetWordStr[0]?.toLowerCase()) {
      score += 1;
    }
    if (Math.abs(wordStr.length - targetWordStr.length) <= 2) {
      score += 1;
    }

    // Part of speech similarity (if available)
    if (w.pos && targetWord.pos && w.pos === targetWord.pos) {
      score += 2;
    }

    return { ...w, distractorScore: score };
  });

  // Sort by score (higher = better distractor)
  scored.sort((a, b) => b.distractorScore - a.distractorScore);

  // Take top N distractors
  const selected = scored.slice(0, count);

  // If not enough distractors, fill with generic ones
  const distractorMeanings = selected.map(w => w.definition || w.meaning || 'Bilinmiyor');

  while (distractorMeanings.length < count) {
    const generic = getGenericDistractors(1)[0];
    if (!distractorMeanings.includes(generic)) {
      distractorMeanings.push(generic);
    }
  }

  return distractorMeanings.slice(0, count);
}

/**
 * Generic distractors when not enough words available
 */
function getGenericDistractors(count) {
  const generics = [
    'önemli bir kavram olmak',
    'hızlı hareket etmek',
    'dikkatli davranmak',
    'sessiz kalmak',
    'değişiklik yapmak',
    'açıklama sunmak',
    'karşı çıkmak',
    'destek vermek',
    'analiz etmek',
    'yönetmek'
  ];

  return shuffleArray(generics).slice(0, count);
}

/**
 * Generate quiz from content
 * @param {string} contentId - Content ID
 * @param {string} userId - User ID
 * @param {Object} options - Quiz generation options (count, types, difficulty)
 * @returns {Object} - Generated quiz data
 */
async function generateQuiz(contentId, userId, options = {}) {
  try {
    const { count = 5, types, difficulty } = options;

    // Get content with words
    const { data: content, error } = await supabase
      .from('contenthistory')
      .select('id, words, adapted_text, level')
      .eq('id', contentId)
      .eq('user_id', userId)
      .single();

    if (error || !content) {
      throw new Error('Content not found');
    }

    let words = [];
    if (content.words) {
      try {
        words = typeof content.words === 'string' ? JSON.parse(content.words) : content.words;
      } catch (e) {
        words = [];
      }
    }

    if (!Array.isArray(words) || words.length < 3) {
      throw new Error('Not enough words in content. At least 3 words required.');
    }

    // =====================================================
    // ENHANCED QUIZ GENERATION WITH QUIZ ENGINE
    // =====================================================

    const quizEngineService = require('./quizEngineService');
    const srsService = require('./srsService');

    // Calculate adaptive difficulty
    let recommendedDifficulty = 3; // Default: Medium
    try {
      if (difficulty) {
        recommendedDifficulty = parseInt(difficulty);
      } else {
        recommendedDifficulty = await quizEngineService.calculateRecommendedDifficulty(userId);
      }
    } catch (diffErr) {
      logger.warn('[GenerateQuiz] Difficulty calculation failed, using default:', diffErr.message);
    }

    // Get SRS words that need review (to inject into quiz)
    let srsWords = [];
    try {
      const dueWords = await srsService.getDueWords(userId, 2);
      srsWords = dueWords.map(w => ({
        word: w.word,
        definition: w.definition,
        priority: 'srs'
      }));
    } catch (srsErr) {
      logger.warn('[GenerateQuiz] SRS words fetch failed:', srsErr.message);
    }

    // Get user's struggling words from previous quizzes
    let strugglingWords = [];
    try {
      const struggling = await quizEngineService.getStrugglingWords(userId, 2);
      strugglingWords = struggling.map(w => ({
        word: w.word,
        priority: 'struggling'
      }));
    } catch (strErr) {
      logger.warn('[GenerateQuiz] Struggling words fetch failed:', strErr.message);
    }

    // Merge word pools with priorities
    // Priority: SRS > Struggling > Content
    const allWords = [
      ...srsWords,
      ...strugglingWords,
      ...words.map(w => ({ ...w, priority: 'content' }))
    ];

    // Remove duplicates, keep highest priority
    const seenWords = new Set();
    const uniqueWords = allWords.filter(w => {
      const key = (w.word || '').toLowerCase();
      if (seenWords.has(key)) return false;
      seenWords.add(key);
      return true;
    });

    // Select words for quiz
    const questionCount = Math.min(parseInt(count), uniqueWords.length, 7);
    const selectedWords = uniqueWords.slice(0, questionCount);

    // Determine question types
    let questionTypes = ['multiple_choice'];
    if (types) {
      questionTypes = types.split(',').map(t => t.trim());
    } else if (questionCount >= 3) {
      questionTypes = ['multiple_choice', 'cloze'];
    }
    if (questionCount >= 5 && words.length >= 6) {
      questionTypes.push('matching');
    }

    // Generate questions with smart distractors
    const questions = [];
    let typeIndex = 0;

    for (let i = 0; i < selectedWords.length; i++) {
      const wordData = selectedWords[i];
      const questionType = questionTypes[typeIndex % questionTypes.length];
      typeIndex++;

      const question = await generateSmartQuestion(
        wordData,
        questionType,
        words, // All content words for distractor pool
        recommendedDifficulty,
        i + 1
      );

      if (question) {
        questions.push(question);
      }
    }

    // Add matching question if enough words
    if (questionTypes.includes('matching') && words.length >= 6) {
      const matchingPairs = words
        .filter(w => w.word && (w.definition || w.meaning))
        .slice(0, 5)
        .map((w, idx) => ({
          id: idx,
          left: w.word,
          right: w.definition || w.meaning
        }));

      if (matchingPairs.length >= 4) {
        questions.push({
          id: questions.length + 1,
          type: 'matching',
          question: 'Kelimeleri anlamlarıyla eşleştirin:',
          pairs: matchingPairs,
          points: 15,
          difficulty: recommendedDifficulty
        });
      }
    }

    return {
      contentId: contentId,
      totalQuestions: questions.length,
      questions,
      metadata: {
        cefrLevel: content.level,
        recommendedDifficulty,
        includedTypes: [...new Set(questions.map(q => q.type))],
        srsWordsIncluded: srsWords.length,
        strugglingWordsIncluded: strugglingWords.length
      }
    };
  } catch (error) {
    logger.error('[GenerateQuiz Service] Error:', error);
    throw error;
  }
}

/**
 * Generate smart next action suggestions based on quiz performance
 */
function generateNextActions(passed, wrongCount, correctCount) {
  const actions = [];

  if (wrongCount > 0) {
    actions.push({
      type: 'review_words',
      title: 'Kelimeleri Çalış',
      description: `${wrongCount} kelimeyi SRS kartlarında tekrar et`,
      route: '/vocabulary?mode=due',
      priority: 1
    });
  }

  if (passed) {
    actions.push({
      type: 'next_content',
      title: 'Yeni İçerik Dinle',
      description: 'Öğrendiklerini pekiştirmek için yeni içerik dinle',
      route: '/dashboard',
      priority: 2
    });
  } else {
    actions.push({
      type: 'retry_quiz',
      title: 'Quiz\'i Tekrarla',
      description: 'Biraz daha çalışıp tekrar dene',
      priority: 2
    });
  }

  if (correctCount >= 3) {
    actions.push({
      type: 'celebrate',
      title: 'Tebrikler!',
      description: `${correctCount} soruyu doğru cevapladın!`,
      priority: 3
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Submit quiz answers and calculate results
 * @param {string} contentId - Content ID
 * @param {string} userId - User ID
 * @param {Array} answers - User's answers
 * @param {Array} clientQuestions - Original questions (optional)
 * @returns {Object} - Quiz results with score, XP, and feedback
 */
async function submitQuiz(contentId, userId, answers, clientQuestions = null) {
  try {
    if (!answers || !Array.isArray(answers)) {
      throw new Error('Answers array required');
    }

    // Get the content with words
    const { data: content, error } = await supabase
      .from('contenthistory')
      .select('words, level')
      .eq('id', contentId)
      .eq('user_id', userId)
      .single();

    if (error || !content) {
      throw new Error('Content not found');
    }

    let words = [];
    try {
      words = typeof content.words === 'string' ? JSON.parse(content.words) : content.words;
    } catch (e) {
      words = [];
    }

    // =====================================================
    // ENHANCED EVALUATION WITH QUIZ ENGINE
    // =====================================================

    const quizEngineService = require('./quizEngineService');
    const srsService = require('./srsService');

    // Build questions from client data or reconstruct from answers
    let questions = clientQuestions || [];
    if (!questions.length) {
      // Reconstruct questions from answers for backward compatibility
      questions = answers.map(ans => ({
        id: ans.questionId || ans.id,
        type: ans.type || 'multiple_choice',
        word: ans.word,
        correct: ans.correctAnswer,
        options: ans.options
      }));
    }

    // Normalize answers for Quiz Engine
    const normalizedAnswers = answers.map(ans => ({
      question_id: ans.questionId || ans.id,
      questionId: ans.questionId || ans.id,
      selected: ans.selectedAnswer ?? ans.selected ?? ans.answer,
      answer: ans.selectedAnswer ?? ans.selected ?? ans.answer,
      responseTime: ans.responseTime || null
    }));

    // Use Quiz Engine for evaluation
    let evaluation;
    try {
      evaluation = quizEngineService.evaluateMultipleAnswers(questions, normalizedAnswers);
    } catch (evalErr) {
      logger.warn('[QuizSubmit] Quiz Engine evaluation failed, using fallback:', evalErr.message);

      // Fallback to simple evaluation
      let correctCount = 0;
      const results = answers.map(ans => {
        const word = words.find(w => w.word === ans.word);
        const isCorrect = word && (ans.selectedAnswer === word.definition || ans.selectedAnswer === word.meaning);
        if (isCorrect) correctCount++;
        return { ...ans, isCorrect };
      });

      evaluation = {
        score: correctCount * 10,
        maxScore: answers.length * 10,
        scorePercentage: Math.round((correctCount / answers.length) * 100),
        correctCount,
        wrongCount: answers.length - correctCount,
        totalQuestions: answers.length,
        detailedAnswers: results.map(r => ({
          questionId: r.questionId || r.id,
          word: r.word,
          isCorrect: r.isCorrect,
          userAnswer: r.selectedAnswer,
          feedback: r.isCorrect ? 'Doğru!' : 'Yanlış cevap'
        }))
      };
    }

    const totalQuestions = evaluation.totalQuestions;
    const score = evaluation.scorePercentage;
    const passed = score >= 60;

    // =====================================================
    // SRS INTEGRATION - Sync wrong answers
    // =====================================================

    const wrongWords = [];
    const detailedResults = [];

    for (const answer of (evaluation.detailedAnswers || [])) {
      const wordData = words.find(w => w.word === answer.word);
      const meaning = wordData?.definition || wordData?.meaning || '';

      // Build rich feedback
      const richFeedback = {
        questionId: answer.questionId,
        word: answer.word,
        isCorrect: answer.isCorrect,
        userAnswer: answer.userAnswer,
        correctAnswer: answer.correctAnswer,
        feedback: answer.feedback,
        explanation: answer.explanation || {
          tr: wordData ? `${answer.word}: ${meaning}` : null,
          en: wordData?.example || null
        }
      };

      detailedResults.push(richFeedback);

      // Track wrong answers for SRS
      if (!answer.isCorrect && answer.word) {
        wrongWords.push({
          word: answer.word,
          meaning: meaning,
          context: wordData?.example || null
        });
      }
    }

    // Sync wrong words to SRS
    let srsSyncResult = { synced: 0, wordsToReview: [] };
    if (wrongWords.length > 0) {
      try {
        await Promise.all(wrongWords.map(wrongWord =>
          srsService.reviewWord(
            userId,
            wrongWord.word,
            wrongWord.meaning,
            2, // quality=2 means "wrong" in SM-2
            wrongWord.meaning,
            wrongWord.context,
            contentId // sourceContentId
          )
        ));

        srsSyncResult = {
          synced: wrongWords.length,
          wordsToReview: wrongWords.map(w => w.word)
        };

        logger.info(`[QuizSubmit] SRS sync: ${wrongWords.length} words synced for user ${userId}`);
      } catch (srsErr) {
        logger.warn('[QuizSubmit] SRS sync failed:', srsErr.message);
      }
    }

    // =====================================================
    // RECORD WORD ATTEMPTS FOR ANALYTICS
    // =====================================================

    try {
      await Promise.all(
        detailedResults
          .filter(answer => answer.word)
          .map(answer =>
            quizEngineService.recordWordAttempt(userId, {
              questionId: answer.questionId,
              questionType: 'multiple_choice',
              word: answer.word,
              isCorrect: answer.isCorrect,
              userAnswer: answer.userAnswer,
              correctAnswer: answer.correctAnswer,
              responseTime: null
            }, {
              contentId: contentId,
              cefrLevel: content.level
            })
          )
      );
    } catch (recordErr) {
      logger.warn('[QuizSubmit] Word attempt recording failed:', recordErr.message);
    }

    // =====================================================
    // XP CALCULATION WITH BONUSES
    // =====================================================

    let xpResult = null;
    let xpAmount = 0;

    try {
      // Base XP calculation
      if (passed) {
        xpAmount = gamificationService.xpRewards.QUIZ_COMPLETE || 50;

        // Perfect score bonus
        if (score === 100) {
          xpAmount = gamificationService.xpRewards.QUIZ_PERFECT_SCORE || 100;
        }

        // Score-based bonus
        xpAmount += Math.floor(score / 10) * 2;
      } else {
        // Participation XP even if failed
        xpAmount = Math.floor((gamificationService.xpRewards.QUIZ_COMPLETE || 50) / 2);

        // Effort bonus (>50%)
        if (score >= 50) {
          xpAmount += 10;
        }
      }

      xpResult = await gamificationService.addXP(
        userId,
        xpAmount,
        'content_quiz',
        contentId,
        `Quiz tamamlandı: ${score}%`
      );

      await gamificationService.updateDailyQuestProgress(userId, 'complete_quiz', 1);

      // Update review words quest if applicable
      if (wrongWords.length > 0) {
        await gamificationService.updateDailyQuestProgress(userId, 'review_words', wrongWords.length);
      }
    } catch (xpErr) {
      logger.warn('[QuizSubmit] XP award failed:', xpErr.message);
    }

    // =====================================================
    // RESPONSE WITH RICH DATA
    // =====================================================

    return {
      score,
      correctCount: evaluation.correctCount,
      wrongCount: evaluation.wrongCount,
      totalQuestions,
      passed,
      xpEarned: xpResult?.xpAdded || xpAmount,

      // Detailed results with feedback
      detailedAnswers: detailedResults,

      // SRS sync info
      srsSync: srsSyncResult,

      // Performance metrics
      performance: evaluation.performance || null,

      // Level progress
      levelProgress: xpResult ? {
        currentLevel: xpResult.currentLevel,
        xpInLevel: xpResult.xpInLevel,
        xpForNextLevel: xpResult.xpForNextLevel,
        leveledUp: xpResult.leveledUp
      } : null,

      // Next actions suggestion
      nextActions: generateNextActions(passed, wrongWords.length, evaluation.correctCount)
    };
  } catch (error) {
    logger.error('[SubmitQuiz Service] Error:', error);
    throw error;
  }
}

module.exports = {
  generateQuiz,
  submitQuiz,
  generateSmartQuestion,
  generateNextActions,
};
