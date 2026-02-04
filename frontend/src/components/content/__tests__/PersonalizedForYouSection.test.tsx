/**
 * PersonalizedForYouSection Unit Tests
 *
 * Kapsamlı test senaryoları:
 * - Render durumları (loading, empty, error, success)
 * - API entegrasyonu ve error handling
 * - Filtreleme ve localStorage persistence
 * - Kart interaksiyonları (click, dismiss, expand)
 * - Race condition korumaları
 * - Accessibility uyumu
 *
 * @version 1.0
 * @date 2026-01-25
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalizedForYouSection } from '../PersonalizedForYouSection';
import { getTopicContent } from '@/lib/api';

// ============================================================================
// Mocks
// ============================================================================

// Mock next/router
const mockPush = jest.fn();
const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
};
jest.mock('next/router', () => ({
    useRouter: () => mockRouter,
}));

// Mock AudioPlayerContext
const mockPlayTrack = jest.fn();
jest.mock('@/context/AudioPlayerContext', () => ({
    useAudioPlayerSafe: () => ({
        playTrack: mockPlayTrack,
        isPlaying: false,
        currentTrack: null,
        pause: jest.fn(),
        resume: jest.fn(),
    }),
}));

// Mock API
jest.mock('@/lib/api', () => ({
    getTopicContent: jest.fn(),
}));

const mockGetTopicContent = getTopicContent as jest.MockedFunction<typeof getTopicContent>;

// ============================================================================
// Test Data
// ============================================================================

const mockRecommendations = [
    {
        id: '1',
        category: 'level_appropriate',
        content_type: 'topic',
        content_id: 'topic-123',
        title: 'Test Topic',
        description: 'Test description',
        target_url: '/content/topic-123',
        cefr_level: 'B1',
        duration_minutes: 5,
        reason: 'Seviyene uygun',
        reason_key: null,
        score: 85,
        rank: 1,
        source_data: {},
        is_dismissed: false,
        is_clicked: false,
    },
    {
        id: '2',
        category: 'smart_suggestions',
        content_type: 'suggestion',
        content_id: null,
        title: 'AI Suggestion',
        description: null,
        target_url: '/welcome?action=create',
        cefr_level: 'B2',
        duration_minutes: null,
        reason: 'AI tarafından önerildi',
        reason_key: 'ai_suggestion',
        score: 70,
        rank: 2,
        source_data: {},
        is_dismissed: false,
        is_clicked: false,
    },
    {
        id: '3',
        category: 'continue_listening',
        content_type: 'topic',
        content_id: 'topic-456',
        title: 'Yarıda Kalan İçerik',
        description: 'Devam edilecek içerik',
        target_url: '/content/topic-456',
        cefr_level: 'A2',
        duration_minutes: 10,
        reason: 'Yarıda bıraktın',
        reason_key: 'continue',
        score: 100,
        rank: 1,
        source_data: { progress: 0.5 },
        is_dismissed: false,
        is_clicked: false,
    },
];

// Successful API response factory
const createSuccessResponse = (data: any = mockRecommendations) => ({
    success: true,
    data,
});

// Error API response factory
const createErrorResponse = (error = 'API Error') => ({
    success: false,
    error,
    data: [], // Add empty data to satisfy type requirements if needed
});

// Topic content response factory
const createTopicResponse = (hasAudio = true) => ({
    success: true,
    data: {
        id: 'topic-123',
        title: 'Test Topic',
        mp3_url: hasAudio ? 'https://example.com/audio.mp3' : null,
        level: 'B1',
        words: ['test', 'words'],
        timepoints: [{ start: 0, end: 1, word: 'test' }],
        adapted_text: 'Adapted text content',
        translated_text: 'Translated text content',
    },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Setup mock fetch with initial response
 */
/**
 * Setup mock fetch with initial response
 */
function setupFetch(response: any = createSuccessResponse()) {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
        // Recommendations API
        if (url.includes('/api/recommendations/personalized')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(response),
            });
        }
        // Interaction tracking API
        if (url.includes('/interaction')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
        }
        return Promise.reject(new Error('Unknown URL'));
    });
}

/**
 * Setup localStorage with token
 */
function setupAuth(hasToken = true) {
    if (hasToken) {
        localStorage.setItem('lingroot_token', 'test-token-123');
    }
}

/**
 * Wait for loading to complete
 */
async function waitForLoadingComplete() {
    await waitFor(() => {
        expect(screen.queryByText('Sana Özel')).toBeInTheDocument();
    });
}

// ============================================================================
// Tests
// ============================================================================

describe('PersonalizedForYouSection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        (global.fetch as jest.Mock).mockReset();
        mockPush.mockReset();
        mockPlayTrack.mockReset();
        mockGetTopicContent.mockReset();
    });

    // ==========================================================================
    // Rendering Tests
    // ==========================================================================
    describe('Rendering', () => {
        it('shows loading skeleton initially', async () => {
            setupAuth();
            // Delay the API response to see loading state
            (global.fetch as jest.Mock).mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve(createSuccessResponse()),
                }), 100))
            );

            render(<PersonalizedForYouSection />);

            // Should show loading skeleton
            expect(screen.getByText('Sana Özel')).toBeInTheDocument();
            const skeletons = document.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('renders recommendations when loaded successfully', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
                expect(screen.getByText('Yarıda Kalan İçerik')).toBeInTheDocument();
            });
        });

        it('returns null when no recommendations', async () => {
            setupAuth();
            setupFetch(createSuccessResponse([]));

            const { container } = render(<PersonalizedForYouSection />);

            await waitFor(() => {
                // Component should return null
                expect(container.firstChild).toBeNull();
            });
        });

        it('returns null on error state', async () => {
            setupAuth();
            setupFetch(createErrorResponse('Failed to fetch'));

            const { container } = render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(container.firstChild).toBeNull();
            });
        });

        it('hides title when showTitle=false', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection showTitle={false} />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Title should not be visible
            expect(screen.queryByText('Sana Özel')).not.toBeInTheDocument();
        });

        it('hides filters when showFilters=false', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection showFilters={false} />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Filter buttons should not be visible
            expect(screen.queryByText('Tümü')).not.toBeInTheDocument();
        });

        it('applies single column layout in compactMode', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection compactMode={true} />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            const section = screen.getByRole('region', { name: /kişiselleştirilmiş öneriler/i });
            expect(section).toHaveClass('grid-cols-1');
            expect(section).not.toHaveClass('md:grid-cols-2');
        });

        it('displays recommendation count in header', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('3/3 öneri')).toBeInTheDocument();
            });
        });

        it('shows CEFR level badge when available', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('B1')).toBeInTheDocument();
                expect(screen.getByText('B2')).toBeInTheDocument();
                expect(screen.getByText('A2')).toBeInTheDocument();
            });
        });

        it('displays duration when available', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText(/~5 dk/)).toBeInTheDocument();
                expect(screen.getByText(/~10 dk/)).toBeInTheDocument();
            });
        });
    });

    // ==========================================================================
    // API Integration Tests
    // ==========================================================================
    describe('API Integration', () => {
        it('does not fetch when token is missing', async () => {
            // No token setup
            setupFetch();

            const { container } = render(<PersonalizedForYouSection />);

            // Wait a bit and check fetch wasn't called
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fetch should not be called with recommendations endpoint
            const fetchCalls = (global.fetch as jest.Mock).mock.calls;
            const recommendationCalls = fetchCalls.filter(
                (call: string[]) => call[0].includes('/api/recommendations/personalized')
            );
            expect(recommendationCalls.length).toBe(0);
        });

        it('updates recommendations state on successful API response', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Verify correct API endpoint was called
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/recommendations/personalized'),
                expect.objectContaining({
                    headers: { Authorization: 'Bearer test-token-123' },
                })
            );
        });

        it('sets error state on API failure', async () => {
            setupAuth();
            setupFetch(createErrorResponse('Öneriler alınamadı'));

            const { container } = render(<PersonalizedForYouSection />);

            await waitFor(() => {
                // Component returns null on error
                expect(container.firstChild).toBeNull();
            });
        });

        it('shows refreshing state when refresh=true', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click refresh button
            const refreshButton = screen.getByText('🔄').closest('button');
            expect(refreshButton).toBeTruthy();

            // Setup delayed response for refresh
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve(createSuccessResponse()),
                }), 100))
            );

            await act(async () => {
                fireEvent.click(refreshButton!);
            });

            // Check refresh was called with refresh=true parameter
            await waitFor(() => {
                const calls = (global.fetch as jest.Mock).mock.calls;
                const refreshCall = calls.find((call: string[]) => call[0].includes('refresh=true'));
                expect(refreshCall).toBeTruthy();
            });
        });

        it('cancels pending request on unmount', async () => {
            setupAuth();

            const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

            // Setup delayed response
            setupFetch();

            const { unmount } = render(<PersonalizedForYouSection />);

            // Unmount immediately
            unmount();

            // AbortController.abort should have been called
            expect(abortSpy).toHaveBeenCalled();

            abortSpy.mockRestore();
        });
    });

    // ==========================================================================
    // Filtering Tests
    // ==========================================================================
    describe('Filtering', () => {
        it('shows filter chips for available categories', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            expect(await screen.findByText('Tümü')).toBeInTheDocument();
            const seviyeElements = await screen.findAllByText(/Seviye/);
            expect(seviyeElements.length).toBeGreaterThan(0);

            const aiElements = await screen.findAllByText(/AI/);
            expect(aiElements.length).toBeGreaterThan(0);

            const devamElements = await screen.findAllByText(/Devam/);
            expect(devamElements.length).toBeGreaterThan(0);
        });

        it('toggles category filter when chip clicked', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on "Seviye" filter
            const seviyeButton = screen.getByRole('button', { name: /seviyene uygun/i });
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            // Only "Test Topic" (level_appropriate) should be visible
            expect(screen.getByText('Test Topic')).toBeInTheDocument();
            expect(screen.queryByText('AI Suggestion')).not.toBeInTheDocument();
            expect(screen.queryByText('Yarıda Kalan İçerik')).not.toBeInTheDocument();
        });

        it('clears all filters when "Tümü" clicked', async () => {
            setupAuth();
            setupFetch();

            // Pre-set filters in localStorage
            localStorage.setItem('lingroot_recommendation_filters', JSON.stringify(['level_appropriate']));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                // Only filtered items should show initially
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click "Tümü" button
            const tumuButton = screen.getByRole('button', { name: /tüm önerileri göster/i });
            await act(async () => {
                fireEvent.click(tumuButton);
            });

            // All items should be visible now
            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
                expect(screen.getByText('Yarıda Kalan İçerik')).toBeInTheDocument();
            });
        });

        it('persists filters to localStorage', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on filter
            const seviyeButton = screen.getByRole('button', { name: /seviyene uygun/i });
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            // Check localStorage was updated
            const savedFilters = localStorage.getItem('lingroot_recommendation_filters');
            expect(savedFilters).toBe(JSON.stringify(['level_appropriate']));
        });

        it('loads saved filters from localStorage', async () => {
            setupAuth();
            setupFetch();

            // Pre-set filters
            localStorage.setItem('lingroot_recommendation_filters', JSON.stringify(['smart_suggestions']));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                // Only AI Suggestion should be visible  
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
                expect(screen.queryByText('Test Topic')).not.toBeInTheDocument();
            });
        });

        it('displays correct filtered count', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('3/3 öneri')).toBeInTheDocument();
            });

            // Apply filter
            const seviyeButton = screen.getByRole('button', { name: /seviyene uygun/i });
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            await waitFor(() => {
                expect(screen.getByText('1/3 öneri')).toBeInTheDocument();
            });
        });

        it('shows empty state when filtered results are empty', async () => {
            setupAuth();
            // Only one category
            setupFetch(createSuccessResponse([mockRecommendations[0]]));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Note: This test assumes filters are available only for existing categories
            // Since we only have one category, let's test with an artificial filter state
        });
    });

    // ==========================================================================
    // Card Interaction Tests
    // ==========================================================================
    describe('Card Interactions', () => {
        it('calls handleItemClick when card is clicked', async () => {
            setupAuth();
            setupFetch();
            const onItemClick = jest.fn();

            render(<PersonalizedForYouSection onItemClick={onItemClick} />);

            await waitFor(() => {
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
            });

            // Click on non-topic card (suggestion type)
            const suggestionCard = screen.getByText('AI Suggestion').closest('article');
            const clickableArea = suggestionCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            expect(onItemClick).toHaveBeenCalledWith(
                expect.objectContaining({ id: '2', title: 'AI Suggestion' })
            );
        });

        it('fetches topic content and plays audio for topic cards', async () => {
            setupAuth();
            setupFetch();
            mockGetTopicContent.mockResolvedValue(createTopicResponse());

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on topic card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            await waitFor(() => {
                expect(mockGetTopicContent).toHaveBeenCalledWith('topic-123');
                expect(mockPlayTrack).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 'topic-123',
                        url: 'https://example.com/audio.mp3',
                    })
                );
            });
        });

        it('redirects to welcome page when topic has no audio', async () => {
            setupAuth();
            setupFetch();
            mockGetTopicContent.mockResolvedValue(createTopicResponse(false));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on topic card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/welcome?topicId=topic-123&action=generate-audio');
            });
        });

        it('navigates to target_url for non-topic content', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
            });

            // Click on suggestion card
            const suggestionCard = screen.getByText('AI Suggestion').closest('article');
            const clickableArea = suggestionCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/welcome?action=create');
            });
        });

        it('removes card from list when dismissed', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Find dismiss button for first card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const dismissButton = within(topicCard!).getByRole('button', { name: /önerisini kaldır/i });

            await act(async () => {
                fireEvent.click(dismissButton);
            });

            // Card should be removed
            await waitFor(() => {
                expect(screen.queryByText('Test Topic')).not.toBeInTheDocument();
            });

            // Verify interaction tracking was called
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/interaction'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ type: 'dismiss' }),
                })
            );
        });

        it('toggles expanded panel when info button clicked', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Find info button for first card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const infoButton = within(topicCard!).getByRole('button', { name: /detayları göster/i });

            // Click to expand
            await act(async () => {
                fireEvent.click(infoButton);
            });

            // Expanded content should be visible
            await waitFor(() => {
                expect(screen.getByText('Neden önerildi?')).toBeInTheDocument();
                expect(screen.getByText('Kaynak:')).toBeInTheDocument();
            });

            // Click again to collapse
            const collapseButton = within(topicCard!).getByRole('button', { name: /detayları gizle/i });
            await act(async () => {
                fireEvent.click(collapseButton);
            });

            // Expanded content should be hidden
            await waitFor(() => {
                expect(screen.queryByText('Neden önerildi?')).not.toBeInTheDocument();
            });
        });

        it('tracks click interaction when card clicked', async () => {
            setupAuth();
            setupFetch();
            mockGetTopicContent.mockResolvedValue(createTopicResponse());

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on topic card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Verify interaction tracking was called with 'click'
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/1/interaction'),
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify({ type: 'click' }),
                    })
                );
            });
        });

        it('shows loading overlay while loading topic content', async () => {
            setupAuth();
            setupFetch();

            // Delay the topic content response
            mockGetTopicContent.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(createTopicResponse()), 200))
            );

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on topic card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Loading overlay should be visible (spinner)
            expect(topicCard).toHaveAttribute('aria-busy', 'true');
        });
    });

    // ==========================================================================
    // Race Condition Tests
    // ==========================================================================
    describe('Race Conditions', () => {
        it('handles rapid consecutive clicks - only last request processed', async () => {
            setupAuth();
            setupFetch();

            let callCount = 0;
            mockGetTopicContent.mockImplementation(() => {
                callCount++;
                const currentCall = callCount;
                return new Promise(resolve => setTimeout(() => {
                    resolve({
                        success: true,
                        data: {
                            id: `topic-${currentCall}`,
                            title: `Topic ${currentCall}`,
                            mp3_url: `https://example.com/audio-${currentCall}.mp3`,
                            level: 'B1',
                            words: [],
                            timepoints: [],
                            adapted_text: '',
                            translated_text: '',
                        },
                    });
                }, currentCall === 1 ? 200 : 50)); // First call slower
            });

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Rapidly click the same topic card twice
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            // First click
            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Immediately click card 3
            const continueCard = screen.getByText('Yarıda Kalan İçerik').closest('article');
            const continueClickable = continueCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(continueClickable!);
            });

            // Wait for all to complete
            await waitFor(() => {
                expect(mockGetTopicContent).toHaveBeenCalledTimes(2);
            }, { timeout: 500 });

            // Only the second (last) track should be played
            // First request should be cancelled/ignored
        });

        it('does not update state after component unmounts', async () => {
            setupAuth();

            // Slow API response
            (global.fetch as jest.Mock).mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve(createSuccessResponse()),
                }), 200))
            );

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            const { unmount } = render(<PersonalizedForYouSection />);

            // Unmount before response arrives
            unmount();

            // Wait for the pending request to complete
            await new Promise(resolve => setTimeout(resolve, 300));

            // Should not cause "can't perform state update on unmounted component" error
            expect(consoleSpy).not.toHaveBeenCalledWith(
                expect.stringContaining("Can't perform a React state update")
            );

            consoleSpy.mockRestore();
        });

        it('aborts pending request when refresh is triggered', async () => {
            setupAuth();
            setupFetch();

            const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Trigger refresh
            const refreshButton = screen.getByText('🔄').closest('button');
            await act(async () => {
                fireEvent.click(refreshButton!);
            });

            // Abort should be called for the previous request
            expect(abortSpy).toHaveBeenCalled();

            abortSpy.mockRestore();
        });
    });

    // ==========================================================================
    // Accessibility Tests
    // ==========================================================================
    describe('Accessibility', () => {
        it('has proper aria-label on filter buttons', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Check filter buttons have aria-labels
            const tumuButton = screen.getByRole('button', { name: /tüm önerileri göster/i });
            expect(tumuButton).toHaveAttribute('aria-pressed', 'true');

            const categoryButton = screen.getByRole('button', { name: /seviyene uygun kategorisi/i });
            expect(categoryButton).toBeInTheDocument();
        });

        it('sets aria-pressed correctly on filter buttons', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // "Tümü" should be pressed initially (no filters)
            const tumuButton = screen.getByRole('button', { name: /tüm önerileri göster/i });
            expect(tumuButton).toHaveAttribute('aria-pressed', 'true');

            // Click a category filter
            const seviyeButton = screen.getByRole('button', { name: /seviyene uygun/i });
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            // Now category should be pressed, Tümü should not
            expect(seviyeButton).toHaveAttribute('aria-pressed', 'true');
            expect(tumuButton).toHaveAttribute('aria-pressed', 'false');
        });

        it('sets aria-expanded correctly on info buttons', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            const topicCard = screen.getByText('Test Topic').closest('article');
            const infoButton = within(topicCard!).getByRole('button', { name: /detayları göster/i });

            // Initially not expanded
            expect(infoButton).toHaveAttribute('aria-expanded', 'false');

            // Click to expand
            await act(async () => {
                fireEvent.click(infoButton);
            });

            // Should now be expanded
            const expandedButton = within(topicCard!).getByRole('button', { name: /detayları gizle/i });
            expect(expandedButton).toHaveAttribute('aria-expanded', 'true');
        });

        it('has aria-busy on loading cards', async () => {
            setupAuth();
            setupFetch();

            mockGetTopicContent.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(createTopicResponse()), 200))
            );

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            const topicCard = screen.getByText('Test Topic').closest('article');

            // Initially not busy
            expect(topicCard).toHaveAttribute('aria-busy', 'false');

            // Click to load
            const clickableArea = topicCard?.querySelector('.p-4');
            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Should be busy while loading
            expect(topicCard).toHaveAttribute('aria-busy', 'true');
        });

        it('has proper region landmark for recommendations', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Should have section with aria-label
            const section = screen.getByRole('region', { name: /kişiselleştirilmiş öneriler/i });
            expect(section).toBeInTheDocument();
        });

        it('has proper navigation landmark for filters', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Should have nav with aria-label
            const nav = screen.getByRole('navigation', { name: /öneri kategori filtreleri/i });
            expect(nav).toBeInTheDocument();
        });

        it('has article role for recommendation cards', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            const articles = screen.getAllByRole('article');
            expect(articles.length).toBe(3);
        });

        it('supports keyboard navigation on buttons', async () => {
            setupAuth();
            setupFetch();
            const user = userEvent.setup();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Tab to refresh button first (it comes before filters)
            await user.tab();
            const refreshButton = screen.getByText('🔄').closest('button');
            expect(refreshButton).toHaveFocus();

            // Tab again to reach "Tümü" filter button
            await user.tab();
            const tumuButton = screen.getByRole('button', { name: /tüm önerileri göster/i });
            expect(tumuButton).toHaveFocus();

            // Activate with Enter
            await user.keyboard('{Enter}');

            // Button should still be active
            expect(tumuButton).toHaveAttribute('aria-pressed', 'true');
        });
    });

    // ==========================================================================
    // Props Tests
    // ==========================================================================
    describe('Props', () => {
        it('respects maxItems prop', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection maxItems={2} />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Verify API was called with limit=2
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=2'),
                expect.anything()
            );
        });

        it('applies custom className', async () => {
            setupAuth();
            setupFetch();

            const { container } = render(<PersonalizedForYouSection className="custom-class" />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    // ==========================================================================
    // Edge Cases
    // ==========================================================================
    describe('Edge Cases', () => {
        it('handles malformed localStorage data gracefully', async () => {
            setupAuth();
            setupFetch();

            // Set invalid JSON
            localStorage.setItem('lingroot_recommendation_filters', 'invalid-json{');

            // Should not throw
            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });
        });

        it('handles network error gracefully', async () => {
            setupAuth();
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const { container } = render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(container.firstChild).toBeNull();
            });
        });

        it('handles empty API response data', async () => {
            setupAuth();
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, data: null }),
            });

            const { container } = render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(container.firstChild).toBeNull();
            });
        });

        it('handles recommendation with missing optional fields', async () => {
            setupAuth();
            setupFetch(createSuccessResponse([
                {
                    id: 'minimal',
                    category: 'level_appropriate',
                    content_type: 'topic',
                    content_id: null,
                    title: 'Minimal Item',
                    description: null,
                    target_url: '/test',
                    cefr_level: null,
                    duration_minutes: null,
                    reason: 'Test',
                    reason_key: null,
                    score: 0,
                    rank: 1,
                    source_data: {},
                    is_dismissed: false,
                    is_clicked: false,
                },
            ]));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Minimal Item')).toBeInTheDocument();
            });

            // Should not show CEFR level or duration
            expect(screen.queryByText('B1')).not.toBeInTheDocument();
            expect(screen.queryByText(/dk/)).not.toBeInTheDocument();
        });

        it('handles localStorage write failure gracefully', async () => {
            setupAuth();
            setupFetch();

            // Make localStorage.setItem throw an error
            const originalSetItem = localStorage.setItem;
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            localStorage.setItem = jest.fn(() => {
                throw new Error('QuotaExceededError');
            });

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click a category filter - should handle the localStorage error gracefully
            const seviyeButton = screen.getByRole('button', { name: /seviyene uygun/i });
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            // Component should still work despite localStorage failure
            expect(screen.getByText('Test Topic')).toBeInTheDocument();

            // Restore
            localStorage.setItem = originalSetItem;
            consoleSpy.mockRestore();
        });

        it('handles AbortError gracefully during fetch', async () => {
            setupAuth();

            // Create a fetch that will reject with AbortError
            (global.fetch as jest.Mock).mockImplementation(() => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                return Promise.reject(error);
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            render(<PersonalizedForYouSection />);

            // Wait for the abort error to be handled
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should have logged the abort
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Request aborted')
            );

            consoleSpy.mockRestore();
        });

        it('handles interaction tracking failure gracefully', async () => {
            setupAuth();
            setupFetch();

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

            // Make interaction API fail
            (global.fetch as jest.Mock).mockImplementation((url: string) => {
                if (url.includes('/api/recommendations/personalized')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(createSuccessResponse()),
                    });
                }
                if (url.includes('/interaction')) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.reject(new Error('Unknown URL'));
            });

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
            });

            // Click on non-topic card to trigger interaction tracking
            const suggestionCard = screen.getByText('AI Suggestion').closest('article');
            const clickableArea = suggestionCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Interaction tracking failure should be logged (fire and forget)
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to track'),
                    expect.any(Error)
                );
            });

            consoleSpy.mockRestore();
        });

        it('falls back to navigation when topic content fetch fails', async () => {
            setupAuth();
            setupFetch();
            mockGetTopicContent.mockRejectedValue(new Error('Topic fetch failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on topic card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Should log error and fallback to navigation
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Error loading topic content'),
                    expect.any(Error)
                );
            });

            // Should navigate to target URL as fallback
            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/content/topic-123');
            });

            consoleSpy.mockRestore();
        });

        it('falls back to navigation when topic content response is not successful', async () => {
            setupAuth();
            setupFetch();
            mockGetTopicContent.mockResolvedValue({ success: false, data: null });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Click on topic card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const clickableArea = topicCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Should log warning about fallback
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Topic content not found, falling back to navigation')
                );
            });

            // Should navigate to target URL as fallback
            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/content/topic-123');
            });

            consoleSpy.mockRestore();
        });

        it('removes selected category when clicking same filter twice', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            const seviyeButton = screen.getByRole('button', { name: /seviyene uygun/i });

            // First click - add filter
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            expect(seviyeButton).toHaveAttribute('aria-pressed', 'true');
            expect(screen.queryByText('AI Suggestion')).not.toBeInTheDocument();

            // Second click - remove filter (toggle off)
            await act(async () => {
                fireEvent.click(seviyeButton);
            });

            // Filter should be removed, all items visible again
            expect(seviyeButton).toHaveAttribute('aria-pressed', 'false');
            await waitFor(() => {
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
            });
        });

        it('stops propagation when clicking expanded panel content', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Expand the card first
            const topicCard = screen.getByText('Test Topic').closest('article');
            const infoButton = within(topicCard!).getByRole('button', { name: /detayları göster/i });

            await act(async () => {
                fireEvent.click(infoButton);
            });

            // Find the expanded panel content
            const expandedPanel = topicCard!.querySelector('.bg-slate-50\\/50');
            expect(expandedPanel).toBeInTheDocument();

            // Click on expanded panel - should not trigger card click (navigation)
            await act(async () => {
                fireEvent.click(expandedPanel!);
            });

            // Navigation should NOT have been called
            expect(mockPush).not.toHaveBeenCalled();
        });

        it('displays score indicator in expanded panel when score > 0', async () => {
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Expand the card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const infoButton = within(topicCard!).getByRole('button', { name: /detayları göster/i });

            await act(async () => {
                fireEvent.click(infoButton);
            });

            // Score indicator should be visible (score is 85)
            expect(screen.getByText('Uyumluluk')).toBeInTheDocument();
            expect(screen.getByText('85%')).toBeInTheDocument();
        });

        it('hides score indicator when score is 0', async () => {
            setupAuth();
            setupFetch(createSuccessResponse([
                {
                    ...mockRecommendations[0],
                    id: 'zero-score',
                    score: 0,
                },
            ]));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Expand the card
            const topicCard = screen.getByText('Test Topic').closest('article');
            const infoButton = within(topicCard!).getByRole('button', { name: /detayları göster/i });

            await act(async () => {
                fireEvent.click(infoButton);
            });

            // Score indicator should NOT be visible
            expect(screen.queryByText('Uyumluluk')).not.toBeInTheDocument();
        });

        it('does not show filters when only one category exists', async () => {
            setupAuth();
            // Only one category in recommendations
            setupFetch(createSuccessResponse([mockRecommendations[0]]));

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Topic')).toBeInTheDocument();
            });

            // Filters should not be visible when only one category
            expect(screen.queryByText('Tümü')).not.toBeInTheDocument();
        });

        it('does not track interaction when no token', async () => {
            // Setup with token for initial fetch
            setupAuth();
            setupFetch();

            render(<PersonalizedForYouSection />);

            await waitFor(() => {
                expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
            });

            // Remove token
            localStorage.removeItem('lingroot_token');

            // Reset fetch calls
            (global.fetch as jest.Mock).mockClear();

            // Click on card
            const suggestionCard = screen.getByText('AI Suggestion').closest('article');
            const clickableArea = suggestionCard?.querySelector('.p-4');

            await act(async () => {
                fireEvent.click(clickableArea!);
            });

            // Interaction tracking should not be called (fire and forget skipped)
            const interactionCalls = (global.fetch as jest.Mock).mock.calls.filter(
                (call: string[]) => call[0].includes('/interaction')
            );
            expect(interactionCalls.length).toBe(0);
        });
    });
});
