
// API Base URL
export const API_BASE_URL = '/api';

// Common types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    code?: string;
    [key: string]: any;
}

/**
* Constructs the full API URL given a path.
*/
export const getApiUrl = (path: string): string => {
    if (!path) return '/api';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `/api/${cleanPath}`;
};

/**
* Creates standard headers for API requests.
*/
export const createHeaders = (contentType: string = 'application/json'): HeadersInit => {
    const headers: Record<string, string> = {
        'Content-Type': contentType,
    };
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('lingroot_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const lang = localStorage.getItem('lingroot_interfaceLanguage');
        if (lang) {
            headers['Accept-Language'] = lang;
        }
    }
    return headers;
};

export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('lingroot_token');
    }
    return null;
};

// --- Helper for standardized fetch calls ---
async function fetchApi<T = any>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = getApiUrl(path);
    const headers = createHeaders();
    const config = {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
        credentials: 'include' as RequestCredentials,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) {
            console.error(`API Error (${path}):`, data.message);
        }
        return data;
    } catch (error: any) {
        console.error(`Network Error (${path}):`, error);
        return { success: false, message: error.message || 'Network error' };
    }
}

// --- Auth & User Settings ---

export const getUserSettings = async () => fetchApi('user-settings');

export const resendVerificationEmail = async (email: string) =>
    fetchApi('auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
    });

// --- Notifications ---

export const getUnreadNotificationCount = async () => fetchApi('notifications/unread-count');
export const getNotifications = async (limit = 20, offset = 0, unreadOnly = false) =>
    fetchApi(`notifications?limit=${limit}&offset=${offset}&unreadOnly=${unreadOnly}`);
export const markNotificationAsRead = async (id: string) => fetchApi(`notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsAsRead = async () => fetchApi('notifications/read-all', { method: 'PUT' });
export const deleteNotification = async (id: string) => fetchApi(`notifications/${id}`, { method: 'DELETE' });

// --- Vocabulary ---

export const lookupVocabularyWord = async (word: string, context?: string) =>
    fetchApi('vocabulary/lookup', {
        method: 'POST',
        body: JSON.stringify({ word, context })
    });

export const addWordWithTranslation = async (
    dataOrWord: any,
    context?: string,
    translation?: string,
    originalSentence?: string
) => {
    let payload: any;
    if (typeof dataOrWord === 'object' && dataOrWord !== null && context === undefined) {
        payload = dataOrWord;
    } else {
        payload = { word: dataOrWord, context, translation, originalSentence };
    }
    return fetchApi('vocabulary/add-with-translation', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

// --- Topic Hierarchy ---

export const getTopicTree = async () => fetchApi('topic-hierarchy');
export const createMainTopic = async (params: { title: string; description?: string; level?: string; mood?: string; language?: string }) =>
    fetchApi('topic-hierarchy', {
        method: 'POST',
        body: JSON.stringify(params)
    });
export const generateSubtopics = async (parentId: string, options: { count?: number; language?: string; angle?: string } | string) => {
    const body = typeof options === 'string'
        ? { parentId, parentTitle: options }
        : { parentId, ...options };
    return fetchApi('topic-hierarchy/generate-subtopics', {
        method: 'POST',
        body: JSON.stringify(body)
    });
};
export const addManualSubtopic = async (parentId: string, options: { title: string; description?: string } | string) => {
    const body = typeof options === 'string'
        ? { parentId, title: options }
        : { parentId, ...options };
    return fetchApi('topic-hierarchy/manual', {
        method: 'POST',
        body: JSON.stringify(body)
    });
};
export const deleteTopicAndChildren = async (id: string) =>
    fetchApi(`topic-hierarchy/${id}`, { method: 'DELETE' });

export const getTopicDetailSuggestions = async (topicTitle: string, language: string) =>
    fetchApi('topic-suggest/suggestions', {
        method: 'POST',
        body: JSON.stringify({ topic: topicTitle, language })
    });

// --- Content & TTS ---

export const processTts = async (
    textOrOptions: string | Record<string, any>,
    voiceId?: string,
    speed?: number
) => {
    let payload: any;
    if (typeof textOrOptions === 'object' && textOrOptions !== null) {
        payload = textOrOptions;
    } else {
        payload = { text: textOrOptions, voiceId, speed };
    }
    return fetchApi('tts/process', {
        method: 'POST',
        body: JSON.stringify(payload)
    }) as Promise<TtsResponseData>;
};

export const submitContent = async (
    dataOrInput: any,
    input_type?: string,
    level?: string,
    mp3_url?: string,
    translated_text?: string,
    adapted_text?: string,
    chapter_id?: number | string | null,
    timepoints?: any[],
    words?: any[],
    detected_mood?: any,
    processing_duration_ms?: number
) => {
    let payload: any;
    if (typeof dataOrInput === 'object' && !Array.isArray(dataOrInput) && input_type === undefined) {
        payload = dataOrInput;
    } else {
        payload = {
            input: dataOrInput,
            input_type,
            level,
            mp3_url,
            translated_text,
            adapted_text,
            chapter_id,
            timepoints,
            words,
            detected_mood,
            processing_duration_ms
        };
    }
    return fetchApi('content/submit', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const markTopicAudioListened = async (topicId: string, duration: number) =>
    fetchApi('topic-mastery/listen', {
        method: 'POST',
        body: JSON.stringify({ topicId, duration })
    });

export const getIncompleteListenings = async () => fetchApi('topic-hierarchy/topics/incomplete');

export const saveListeningProgress = async (id: string, progress: number, duration: number) =>
    fetchApi(`content/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress, duration })
    });

export const getListeningProgress = async (id: string) => fetchApi(`content/${id}/progress`);

export const getContentHistory = async (userId: string, page = 1) =>
    fetchApi(`users/${userId}/audio-history?page=${page}`);

export const generateContentQuiz = async (contentId: string) => fetchApi(`content/${contentId}/quiz`);

export const submitContentQuiz = async (contentId: string, answers: any, questions?: any[]) =>
    fetchApi(`content/${contentId}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, questions })
    });

export const createPodcast = async (options: any) =>
    fetchApi('podcasts/create', {
        method: 'POST',
        body: JSON.stringify(options)
    });

export const createDocumentFromText = async (text: string, title?: string) =>
    fetchApi('documents/create-from-text', {
        method: 'POST',
        body: JSON.stringify({ text, title })
    });

export const fetchArticleDetails = async (url: string) =>
    fetchApi('external-services/fetch-article', {
        method: 'POST',
        body: JSON.stringify({ url })
    });

export const getHashtagNews = async (hashtag: string, limit = 10, language = 'en') =>
    fetchApi('content/process-hashtag', {
        method: 'POST',
        body: JSON.stringify({ hashtag, limit, language })
    });

// --- User Stats & Interests ---

export const getUserStats = async (userId: string) => fetchApi(`users/${userId}/stats`);
export const getUsageSummary = async () => fetchApi('subscription/usage-summary');

export const getUserInterests = async () => fetchApi('user-sectors/interests'); // user-sectorRoutes usually handles this or userRoutes
export const updateUserInterests = async (interests: string[]) =>
    fetchApi('user-sectors/interests', {
        method: 'PUT',
        body: JSON.stringify({ interests })
    });

// --- Sector Dashboard API ---

export interface SectorProgressSummary {
    vocabulary: {
        learned: number;
        total: number;
        progress: number;
    };
    content: {
        completed: number;
        total: number;
        progress: number;
    };
    modules: {
        completed: number;
        total: number;
        progress: number;
    };
    totalXP: number;
    sectorStreak: number;
    longestStreak: number;
    lastActivity: string | null;
}

export interface UserSectorWithPosition {
    id: number;
    sector_id: number;
    is_primary: boolean;
    job_position?: string;
    job_position_en?: string;
    years_experience?: number;
    company_name?: string;
    company_size?: string;
    sector: {
        id: number;
        code: string;
        name_tr: string;
        name_en: string;
        icon: string;
        color: string;
    };
}

// Get all user sectors with position info
export const getUserSectors = async () =>
    fetchApi<UserSectorWithPosition[]>('sectors/user-sectors');

// Get user's primary sector with position
export const getUserPrimarySector = async () =>
    fetchApi<UserSectorWithPosition>('sectors/user-sectors/primary');

// Get sector progress summary (gamification + progress)
export const getSectorProgressSummary = async (sectorId: number) =>
    fetchApi<SectorProgressSummary>(`sectors/${sectorId}/gamification/progress`);

// Get all sectors gamification stats
export const getAllSectorStats = async () =>
    fetchApi('sectors/gamification/all-stats');

// Get sector content recommendations
export const getSectorRecommendations = async (sectorId: number, limit = 5) =>
    fetchApi(`sectors/${sectorId}/content?limit=${limit}&sort=recommended`);

// Get sector vocabulary for review today
export const getSectorReviewWords = async (sectorId: number, limit = 10) =>
    fetchApi(`sectors/${sectorId}/vocabulary/review-today?limit=${limit}`);

// Get sector daily quests
export const generateSectorDailyQuests = async (sectorId: number, count = 2) =>
    fetchApi(`sectors/${sectorId}/gamification/daily-quests`, {
        method: 'POST',
        body: JSON.stringify({ count })
    });

// --- Sector Recommendation API (Faz 3) ---

export interface ContentRecommendation {
    id: number;
    title: string;
    content_type: string;
    difficulty_level: string;
    cefr_level: string;
    estimated_time?: number;
    xp_reward: number;
    score: number;
    recommendation_reason: string;
}

export interface NextBestContent {
    type: 'continue' | 'vocabulary_review' | 'new_content';
    content?: ContentRecommendation;
    words?: VocabularyWord[];
    reason: string;
}

export interface LearningPathStep {
    id: number;
    title: string;
    content_type: string;
    difficulty_level: string;
    cefr_level: string;
    estimated_time?: number;
    xp_reward: number;
    module_name: string;
    status: 'not_started' | 'in_progress' | 'completed';
    step_number: number;
    is_next: boolean;
}

export interface LearningPath {
    steps: LearningPathStep[];
    total_remaining: number;
    user_level: string;
    completion_percentage: number;
}

export interface VocabularyWord {
    id: number;
    term: string;
    definition: string;
    example_sentence?: string;
    cefr_level: string;
    mastery_level?: number;
}

export interface VocabularyRecommendations {
    type: 'review' | 'new' | 'mixed';
    review_words?: VocabularyWord[];
    new_words?: VocabularyWord[];
    words?: VocabularyWord[];
    total_due: number;
    total_new: number;
}

export interface DailySummary {
    greeting: string;
    next_action: NextBestContent | null;
    vocabulary_due: number;
    learning_path: LearningPathStep[];
    today_stats: {
        content_completed: number;
        words_reviewed: number;
    };
    motivational_message: string;
}

// Get personalized content recommendations
export const getPersonalizedRecommendations = async (sectorId: number, limit = 5, types?: string[]) =>
    fetchApi<ContentRecommendation[]>(`sectors/${sectorId}/recommendations?limit=${limit}${types ? `&types=${types.join(',')}` : ''}`);

// Get next best content to study
export const getNextBestContent = async (sectorId: number) =>
    fetchApi<NextBestContent>(`sectors/${sectorId}/next-best`);

// Get learning path
export const getLearningPath = async (sectorId: number, maxSteps = 5) =>
    fetchApi<LearningPath>(`sectors/${sectorId}/learning-path?maxSteps=${maxSteps}`);

// Get vocabulary recommendations
export const getVocabularyRecommendations = async (sectorId: number, limit = 10, mode: 'review' | 'new' | 'mixed' = 'mixed') =>
    fetchApi<VocabularyRecommendations>(`sectors/${sectorId}/vocabulary-recommendations?limit=${limit}&mode=${mode}`);

// Get daily summary
export const getDailySummary = async (sectorId: number) =>
    fetchApi<DailySummary>(`sectors/${sectorId}/daily-summary`);

// Get vocabulary injection for content
export const getVocabularyInjection = async (sectorId: number, contentId: number) =>
    fetchApi(`sectors/${sectorId}/content/${contentId}/vocabulary-injection`);

// --- Sector Challenge API (Faz 5) ---

export interface SectorChallenge {
    id: number;
    sector_id: number;
    challenge_type: string;
    title: string;
    title_tr: string;
    description: string;
    description_tr: string;
    task_type: string;
    target_count: number;
    xp_reward: number;
    badge_id?: number;
    difficulty: 'easy' | 'medium' | 'hard';
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    participant_count?: number;
    user_joined?: boolean;
    user_progress?: number;
    user_completed?: boolean;
}

export interface ChallengeProgress {
    challenge_id: number;
    user_id: number;
    current_progress: number;
    target_count: number;
    percentage: number;
    is_completed: boolean;
    completed_at?: string;
    joined_at: string;
    xp_earned?: number;
    rank?: number;
}

export interface LeaderboardEntry {
    user_id: number;
    username: string;
    avatar_url?: string;
    progress: number;
    completed_at?: string;
    rank: number;
    xp_earned?: number;
}

export interface ChallengeLeaderboard {
    leaderboard: LeaderboardEntry[];
    userRank: {
        rank: number;
        progress: number;
        isInTop: boolean;
    } | null;
}

export interface ChallengeStats {
    total_joined: number;
    total_completed: number;
    total_xp_earned: number;
    active_challenges: number;
    win_rate: number;
    best_rank: number;
    current_challenges: SectorChallenge[];
}

// Get active sector challenges
export const getSectorChallenges = async (sectorId: number, includeJoined = true) =>
    fetchApi<SectorChallenge[]>(`sectors/${sectorId}/challenges?includeJoined=${includeJoined}`);

// Get challenge details
export const getChallengeDetails = async (sectorId: number, challengeId: number) =>
    fetchApi<SectorChallenge>(`sectors/${sectorId}/challenges/${challengeId}`);

// Get user's challenge progress
export const getChallengeProgress = async (sectorId: number, challengeId: number) =>
    fetchApi<ChallengeProgress>(`sectors/${sectorId}/challenges/${challengeId}/progress`);

// Join a challenge
export const joinChallenge = async (sectorId: number, challengeId: number) =>
    fetchApi(`sectors/${sectorId}/challenges/${challengeId}/join`, { method: 'POST' });

// Update challenge progress
export const updateChallengeProgress = async (sectorId: number, challengeId: number, incrementBy = 1) =>
    fetchApi(`sectors/${sectorId}/challenges/${challengeId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ incrementBy })
    });

// Get challenge leaderboard
export const getChallengeLeaderboard = async (sectorId: number, challengeId: number, limit = 10) =>
    fetchApi<ChallengeLeaderboard>(`sectors/${sectorId}/challenges/${challengeId}/leaderboard?limit=${limit}`);

// Get user's challenge stats
export const getChallengeStats = async (sectorId: number) =>
    fetchApi<ChallengeStats>(`sectors/${sectorId}/challenge-stats`);

export const saveUserBookFavorites = async (bookIds: number[] | string[]) =>
    fetchApi('user-book-favorites', {
        method: 'POST',
        body: JSON.stringify({ ids: bookIds })
    });

// --- Suggestions ---

export const generateHobbySuggestions = async (hobby: string) =>
    fetchApi('hobby-suggestions/generate', {
        method: 'POST',
        body: JSON.stringify({ hobby })
    });

export const getRandomHobbySuggestions = async (hobby: string) =>
    fetchApi('hobby-suggestions/random', {
        method: 'POST',
        body: JSON.stringify({ hobby })
    });

export const checkHobbyExists = async (hobby: string) =>
    fetchApi(`hobby-suggestions/check?hobby=${encodeURIComponent(hobby)}`);

export const fetchYoutubeTranscript = async (url: string, language_code: string = 'en') =>
    fetchApi('youtube/youtube-transcript', {
        method: 'POST',
        body: JSON.stringify({ url, language_code })
    });

export const getMyPlanFeatures = async () => fetchApi<ApiResponse<PlanFeatures>>('subscription/my-features');

export const getGeneratedSuggestions = async (prompt?: string, language: string = 'en') =>
    fetchApi('topic-suggest', {
        method: 'POST',
        body: JSON.stringify({ prompt, language })
    });

export interface PlanFeatures {
    planName: string;
    maxCharacters: number;
    audioCreationLimit: number;
    canDownload: boolean;
    prioritySupport: boolean;
    [key: string]: any;
}

export interface LibraryItem {
    id: string;
    real_id: number;
    type: 'book' | 'document';
    title: string;
    author: string;
    cover_url?: string;
    progress: number;
    current_chapter: number;
    last_accessed: string;
    is_finished: boolean;
}

export interface NotificationItem {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
    link?: string;
    isRead: boolean;
    createdAt: string;
    updatedAt?: string;
}


// --- Types ---

export interface UserStats {
    total_xp: number;
    level: number;
    streak: number;
    activity: {
        currentStreak: number;
        longestStreak: number;
        weeklyActivity: Array<{
            day: string;
            count: number;
            active: boolean;
        }>;
    };
    vocabulary: {
        total: number;
        learned: number;
        learning: number;
        new: number;
    };
    subscription: {
        plan: string;
        status: string;
        audioCreationCount: number;
    };
}

export interface Topic {
    id: string;
    title: string;
    level: number | string;
    description?: string;
    parentId?: string;
    children?: Topic[];
    progress?: number; // 0-100
    isLocked?: boolean;
    is_manual?: boolean;
    mood_tag?: string;
    latest_content?: {
        mp3_url?: string;
        vtt_url?: string;
        adapted_text?: string;
        translated_text?: string;
        words?: any[];
        timepoints?: any[];
        listened_at?: string;
        is_completed?: boolean;
        progress_percentage?: number;
        last_position_seconds?: number;
        dialogue_segments?: any[];
        message?: string;
        level?: string;
    };
}

export interface BookHistoryItem {
    id: number;
    user_id: string;
    book_id?: number;
    book_title: string;
    book_authors: string;
    chapter_index: number;
    chapter_title: string;
    level: string;
    cover_url?: string;
    subjects?: string[];
    created_at: string;
}

export interface FavoriteBookItem {
    id: number;
    title: string;
    authors: string;
    cover_url?: string;
    language?: string;
    subjects?: string[];
    gutendex_id?: number;
}

export interface DocumentRecord {
    id: number;
    user_id: string;
    title: string;
    file_type: string;
    file_path?: string;
    file_url?: string;
    created_at: string;
    updated_at: string;
    page_count?: number;
    status?: string;
}

export interface DocumentSection {
    id: number;
    document_id: number;
    section_index: number;
    title: string;
    content: string;
    start_page?: number;
    end_page?: number;
    word_count?: number;
    section_text?: string;
    section_title?: string;
}

export interface BookSearchResult {
    id: number;
    gutendex_id: number;
    title: string;
    authors: string;
    translators?: string;
    languages?: string;
    language: string;
    copyright: boolean;
    media_type?: string;
    formats?: any;
    download_count: number;
    subjects?: string[];
    bookshelves?: string[];
    cover_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BookChapter {
    id: number;
    book_id: number;
    chapter_index: number;
    chapter_title: string;
    chapter_text: string;
    word_count?: number;
    created_at?: string;
}

export interface ProcessInputData {
    type: string;
    input?: string;
    text?: string;
    file?: File;
    level?: string;
    SesHızı?: number;
    voice?: string;
    chapter?: string;
    chapter_id?: string;
    topic_id?: string;
    targetDurationMinutes?: number;
    mood?: string;
    suppressPlanAlerts?: boolean;
}

export interface PodcastCreationParams {
    topic: string;
    level: string;
    duration: number;
    ttsProvider?: string;
    hostSpeakerId?: string;
    guestSpeakerId?: string;
    styleType?: string;
    voiceChoice?: string;
    personalityA?: string;
    personalityB?: string;
    includeHumor?: boolean;
    includeFiller?: boolean;
}

export interface HashtagNewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    source: string;
    sourceName?: string;
    author?: string;
    publishedAt?: string;
    language?: string;
    type?: 'twitter' | 'news' | 'web';
}

export interface IncompleteListeningItem {
    id: string;
    topic_id: string;
    user_id: string;
    mp3_url: string;
    vtt_url?: string;
    adapted_text?: string;
    translated_text?: string;
    words?: any[];
    timepoints?: any[];
    progress?: number;
    progress_percentage?: number;
    last_position_seconds?: number;
    total_duration_seconds?: number;
    last_listened_at?: string;
    topics?: {
        title: string;
        level: string;
    };
}

export interface TtsResponseData extends ApiResponse {
    mp3_url: string;
    message?: string;
    vtt_url?: string;
    level?: string;
    translated_text?: string;
    adapted_text?: string;
    translatedText?: string;
    adaptedText?: string;
    [key: string]: any;
}

// --- Documents ---

export const getUserDocuments = async () => fetchApi<DocumentRecord[]>('documents');

export const getDocumentSections = async (documentId: number) => fetchApi<DocumentSection[]>(`documents/${documentId}/sections`);

// --- Books & User History ---

export const getUserBookHistory = async (userId: string, page = 1, limit = 50) =>
    fetchApi<BookHistoryItem[]>(`users/${userId}/book-history?page=${page}&limit=${limit}`);

export const getUserBookFavoritesDetails = async () => fetchApi<FavoriteBookItem[]>('user-book-favorites/details');

export const getUserBookFavorites = async () => fetchApi<number[]>('user-book-favorites');

export const saveBookFavorites = async (bookIds: number[] | string[]) =>
    fetchApi('user-book-favorites', {
        method: 'POST',
        body: JSON.stringify({ ids: bookIds })
    });

export const searchBooks = async (query: string, page = 1, limit = 20) =>
    fetchApi<{ books: BookSearchResult[], total: number }>(`books/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);

export const rewriteToNarration = async (text: string, level: string) => fetchApi('narration/rewrite', {
    method: 'POST',
    body: JSON.stringify({ text, level })
});

export const getBookChapters = async (bookId: number) => fetchApi<BookChapter[]>(`books/${bookId}/chapters`);

export const getChapterAudio = async (bookId: number, chapterId: number, voiceId?: string, speed?: number, level?: string) =>
    fetchApi(`books/${bookId}/chapters/${chapterId}/audio`, {
        method: 'POST', // or GET depending on backend, treating as POST for generation trigger logic if needed, but usually POST to process
        // Correction: Based on BookTab usage, it might be a generation request.
        // Assuming it hits a TTS process endpoint specialized for chapters or the generic one.
        // If specific endpoint exists:
        body: JSON.stringify({ voiceId, speed, level })
    });


// --- Library ---

export const getLibrary = async () => fetchApi<LibraryItem[]>('library');

export const getItemDetails = async (id: string, type: 'book' | 'document') =>
    fetchApi(`library/${id}?type=${type}`);

// Chapter Info for library player
export interface ChapterInfo {
    id: number;
    index: number;
    title: string;
    content: string;
    word_count?: number;
}

// Library Item Details for player page
export interface LibraryItemDetails {
    item: {
        id: number;
        title: string;
        author: string;
        type: 'book' | 'document';
        cover_url?: string;
    };
    chapters: ChapterInfo[];
    progress: {
        current_chapter_index: number;
        position_seconds?: number;
        progress_percentage?: number;
        is_finished?: boolean;
    };
}

export const getLibraryItemDetails = async (id: number, type: 'book' | 'document') =>
    fetchApi<LibraryItemDetails>(`library/${id}?type=${type}`);

export const updateProgress = async (
    type: 'book' | 'document',
    id: number | string,
    data: {
        chapterIndex?: number;
        positionSeconds?: number;
        progressPercentage?: number;
        isFinished?: boolean;
    }
) => fetchApi('library/progress', {
    method: 'POST',
    body: JSON.stringify({
        type, id, ...data
    })
});

// --- Settings ---

export const saveInterfaceLanguage = async (language: string) =>
    fetchApi('user-settings/interface-language', {
        method: 'PUT',
        body: JSON.stringify({ language })
    });

export const saveDefaultVoice = async (voice: string) =>
    fetchApi('user-settings/default-voice', {
        method: 'PUT',
        body: JSON.stringify({ voice })
    });

export const api = {
    getApiUrl,
    createHeaders,
    getUserSettings,
    resendVerificationEmail,
    getUnreadNotificationCount,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    lookupVocabularyWord,
    addWordWithTranslation,
    getTopicTree,
    createMainTopic,
    generateSubtopics,
    addManualSubtopic,
    deleteTopicAndChildren,
    getTopicDetailSuggestions,
    processTts,
    submitContent,
    markTopicAudioListened,
    getIncompleteListenings,
    saveListeningProgress,
    getListeningProgress,
    getContentHistory,
    createPodcast,
    createDocumentFromText,
    fetchArticleDetails,
    getHashtagNews,
    getUserStats,
    getUsageSummary,
    getUserInterests,
    updateUserInterests,
    saveUserBookFavorites,
    saveBookFavorites,
    generateHobbySuggestions,
    getRandomHobbySuggestions,
    checkHobbyExists,
    // Generic methods
    get: <T = any>(path: string, config?: { params?: Record<string, any> }) => {
        let url = path;
        if (config?.params) {
            const queryString = new URLSearchParams(
                Object.entries(config.params).filter(([, v]) => v !== undefined && v !== null)
            ).toString();
            if (queryString) {
                url = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
            }
        }
        return fetchApi<T>(url);
    },
    post: <T = any>(path: string, body: any) => fetchApi<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T = any>(path: string, body: any) => fetchApi<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T = any>(path: string, body: any) => fetchApi<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T = any>(path: string) => fetchApi<T>(path, { method: 'DELETE' }),

    getUserDocuments,
    getDocumentSections,
    getUserBookHistory,
    getUserBookFavoritesDetails,
    getUserBookFavorites,
    rewriteToNarration,
    searchBooks,
    getBookChapters,
    getChapterAudio,
    saveInterfaceLanguage
};

export default api;
