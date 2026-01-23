/**
 * Quiz Components Index
 * 
 * Export all quiz components
 */

// Main Quiz Player
export { default as QuizPlayer } from '../../pages/sectors/QuizPlayer';

// Legacy Content Quiz (backward compatibility)
export { default as ContentQuizModal } from './ContentQuizModal';

// Re-export types
export type {
    QuizQuestion,
    QuizResult,
    QuizPlayerProps
} from '../../pages/sectors/QuizPlayer';
