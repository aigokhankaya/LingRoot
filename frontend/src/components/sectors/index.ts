// Sector Components barrel export
export { default as SectorCard, SECTOR_ICONS, SECTOR_COLORS, DEFAULT_COLOR } from './SectorCard';
export type { Sector } from './SectorCard';

export { default as SectorHero } from './SectorHero';

export { default as ContentCard, CONTENT_TYPE_CONFIG, LEVEL_COLORS } from './ContentCard';
export type { ContentItem } from './ContentCard';

export { default as VocabularyCard, FlashcardCarousel } from './VocabularyCard';
export type { VocabularyItem } from './VocabularyCard';

export { ProgressCard, MiniProgress, CompletionBadge } from './ProgressCard';

// Dashboard Components (YENİ - Faz 2)
export { default as SectorDashboardCard } from './SectorDashboardCard';
export { default as SectorMiniRoadmap } from './SectorMiniRoadmap';
export { default as SectorQuickActions } from './SectorQuickActions';

// Recommendation Components (YENİ - Faz 3)
export { default as SmartRecommendationCard } from './SmartRecommendationCard';
export { default as DailySummaryCard } from './DailySummaryCard';

// Challenge Components (YENİ - Faz 5)
export { default as SectorChallengeCard } from './SectorChallengeCard';
export { default as ChallengeLeaderboard } from './ChallengeLeaderboard';
export { default as SectorChallengeHub } from './SectorChallengeHub';

// Vocabulary Games (YENİ - Faz 4)
export {
    SectorFlashcardGame,
    WordMatchingGame,
    FillInBlankGame,
    VocabularyGameHub
} from './games';

// Content Creators (YENİ)
export { default as SectorContentCreator } from './SectorContentCreator';
export { default as RoleplayCreator } from './RoleplayCreator';
export { default as PodcastCreator } from './PodcastCreator';

// Content Players (YENİ - Faz 6)
export { default as RoleplayPlayer } from './RoleplayPlayer';
export { default as PodcastPlayer } from './PodcastPlayer';

// Achievement Components (YENİ - Faz 7)
export { default as SectorAchievementCard } from './SectorAchievementCard';
export type { Achievement } from './SectorAchievementCard';
export { default as SectorAchievementHub } from './SectorAchievementHub';
