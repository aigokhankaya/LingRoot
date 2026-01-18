/**
 * 🔊 Sound Effects Utility
 * 
 * Gamification ses efektleri yönetimi
 */

type SoundType = 'xp' | 'levelUp' | 'achievement' | 'streak' | 'click' | 'success' | 'error';

const SOUND_URLS: Record<SoundType, string> = {
    xp: '/sounds/xp-gain.mp3',
    levelUp: '/sounds/level-up.mp3',
    achievement: '/sounds/achievement.mp3',
    streak: '/sounds/streak.mp3',
    click: '/sounds/click.mp3',
    success: '/sounds/success.mp3',
    error: '/sounds/error.mp3'
};

// Preloaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a sound effect
 */
export const playSound = (type: SoundType, volume: number = 0.5): void => {
    if (typeof window === 'undefined') return;

    // Check if user has sounds enabled
    const soundsEnabled = localStorage.getItem('lingroot_sounds') !== 'false';
    if (!soundsEnabled) return;

    try {
        const url = SOUND_URLS[type];

        // Use cached audio or create new
        let audio = audioCache[type];
        if (!audio) {
            audio = new Audio(url);
            audioCache[type] = audio;
        }

        audio.volume = volume;
        audio.currentTime = 0;

        // Try to play (may fail due to browser autoplay policies)
        audio.play().catch(() => {
            // Silently fail if autoplay is blocked
        });
    } catch (error) {
        // Ignore sound errors
    }
};

/**
 * Preload sounds for faster playback
 */
export const preloadSounds = (): void => {
    if (typeof window === 'undefined') return;

    Object.entries(SOUND_URLS).forEach(([type, url]) => {
        try {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = url;
            audioCache[type as SoundType] = audio;
        } catch (error) {
            // Ignore preload errors
        }
    });
};

/**
 * Toggle sound effects
 */
export const toggleSounds = (enabled: boolean): void => {
    localStorage.setItem('lingroot_sounds', enabled ? 'true' : 'false');
};

/**
 * Check if sounds are enabled
 */
export const areSoundsEnabled = (): boolean => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('lingroot_sounds') !== 'false';
};

/**
 * Haptic feedback (for supported devices)
 */
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium'): void => {
    if (typeof window === 'undefined') return;

    if ('vibrate' in navigator) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 25 : 50;
        navigator.vibrate(duration);
    }
};

export default {
    playSound,
    preloadSounds,
    toggleSounds,
    areSoundsEnabled,
    hapticFeedback
};
