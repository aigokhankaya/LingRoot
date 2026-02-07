/**
 * 🎧 useListeningSession Hook
 *
 * Dinleme oturumu yonetimi.
 * LQS metrikleri icin event tracking.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface SessionData {
  sessionId: string;
  startedAt: string;
  contentId: string;
  contentType: string;
}

interface SessionResult {
  sessionId: string;
  durationSeconds: number;
  durationMinutes: number;
  completionPercentage: number;
  engagementScore: number;
  comprehensionScore: number | null;
  lqs: number;
  baseXp: number;
  qualityMultiplier: number;
  finalXp: number;
  bonuses: Array<{ type: string; xp: number }>;
  warning: string | null;
}

interface UseListeningSessionReturn {
  sessionId: string | null;
  isActive: boolean;
  startSession: (contentId: string, contentType: string, contentDuration?: number) => Promise<void>;
  endSession: (comprehensionScore?: number, completionPercentage?: number) => Promise<SessionResult | null>;
  abandonSession: () => Promise<void>;
  trackPause: (currentTime: number) => void;
  trackPlay: (currentTime: number) => void;
  trackReplay: (fromTime: number, toTime: number) => void;
  trackWordTap: (word: string, currentTime: number) => void;
  trackSpeedChange: (newSpeed: number, currentTime: number) => void;
  trackSubtitleToggle: (enabled: boolean, currentTime: number) => void;
  trackSeek: (fromTime: number, toTime: number) => void;
  metrics: {
    pauseCount: number;
    replayCount: number;
    wordTapCount: number;
    speedChangeCount: number;
  };
}

export function useListeningSession(): UseListeningSessionReturn {
  const [session, setSession] = useState<SessionData | null>(null);
  const [metrics, setMetrics] = useState({
    pauseCount: 0,
    replayCount: 0,
    wordTapCount: 0,
    speedChangeCount: 0,
  });

  // Debounce icin refs
  const eventQueueRef = useRef<Array<{ type: string; data: Record<string, unknown> }>>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event'leri toplu gonder (debounced)
  const flushEvents = useCallback(async () => {
    if (!session?.sessionId || eventQueueRef.current.length === 0) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    // Her event'i gonder (paralel)
    try {
      await Promise.all(
        events.map(event =>
          apiClient.http.post(`/listening/session/${session.sessionId}/event`, {
            eventType: event.type,
            eventData: event.data,
          }).catch((err: Error) => {
            console.warn('[useListeningSession] Event send failed:', err.message);
          })
        )
      );
    } catch (error) {
      console.error('[useListeningSession] Flush events error:', error);
    }
  }, [session?.sessionId]);

  // Debounced event ekleme
  const queueEvent = useCallback((type: string, data: Record<string, unknown>) => {
    eventQueueRef.current.push({ type, data });

    // Debounce: 500ms sonra gonder
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(flushEvents, 500);
  }, [flushEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      // Son event'leri gonder
      flushEvents();
    };
  }, [flushEvents]);

  /**
   * Yeni oturum baslat
   */
  const startSession = useCallback(async (
    contentId: string,
    contentType: string,
    contentDuration?: number
  ) => {
    try {
      // Onceki oturumu kapat
      if (session?.sessionId) {
        await abandonSession();
      }

      const response = await apiClient.http.post('/listening/session/start', {
        contentId,
        contentType,
        contentDuration,
      });

      if (response.data?.success) {
        setSession(response.data.data);
        setMetrics({
          pauseCount: 0,
          replayCount: 0,
          wordTapCount: 0,
          speedChangeCount: 0,
        });
      }
    } catch (error) {
      console.error('[useListeningSession] Start session error:', error);
    }
  }, [session?.sessionId]);

  /**
   * Oturumu tamamla
   */
  const endSession = useCallback(async (
    comprehensionScore?: number,
    completionPercentage?: number
  ): Promise<SessionResult | null> => {
    if (!session?.sessionId) return null;

    try {
      // Bekleyen event'leri gonder
      await flushEvents();

      const response = await apiClient.http.post(`/listening/session/${session.sessionId}/complete`, {
        comprehensionScore,
        completionPercentage,
      });

      if (response.data?.success) {
        setSession(null);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[useListeningSession] End session error:', error);
      return null;
    }
  }, [session?.sessionId, flushEvents]);

  /**
   * Oturumu terk et
   */
  const abandonSession = useCallback(async () => {
    if (!session?.sessionId) return;

    try {
      await apiClient.http.post(`/listening/session/${session.sessionId}/abandon`);
      setSession(null);
    } catch (error) {
      console.error('[useListeningSession] Abandon session error:', error);
    }
  }, [session?.sessionId]);

  // Event tracking fonksiyonlari
  const trackPause = useCallback((currentTime: number) => {
    if (!session?.sessionId) return;
    setMetrics(m => ({ ...m, pauseCount: m.pauseCount + 1 }));
    queueEvent('pause', { currentTime });
  }, [session?.sessionId, queueEvent]);

  const trackPlay = useCallback((currentTime: number) => {
    if (!session?.sessionId) return;
    queueEvent('play', { currentTime });
  }, [session?.sessionId, queueEvent]);

  const trackReplay = useCallback((fromTime: number, toTime: number) => {
    if (!session?.sessionId) return;
    setMetrics(m => ({ ...m, replayCount: m.replayCount + 1 }));
    queueEvent('replay', { fromTime, toTime });
  }, [session?.sessionId, queueEvent]);

  const trackWordTap = useCallback((word: string, currentTime: number) => {
    if (!session?.sessionId) return;
    setMetrics(m => ({ ...m, wordTapCount: m.wordTapCount + 1 }));
    queueEvent('word_tap', { word, currentTime });
  }, [session?.sessionId, queueEvent]);

  const trackSpeedChange = useCallback((newSpeed: number, currentTime: number) => {
    if (!session?.sessionId) return;
    setMetrics(m => ({ ...m, speedChangeCount: m.speedChangeCount + 1 }));
    queueEvent('speed_change', { newSpeed, currentTime });
  }, [session?.sessionId, queueEvent]);

  const trackSubtitleToggle = useCallback((enabled: boolean, currentTime: number) => {
    if (!session?.sessionId) return;
    queueEvent('subtitle_toggle', { enabled, currentTime });
  }, [session?.sessionId, queueEvent]);

  const trackSeek = useCallback((fromTime: number, toTime: number) => {
    if (!session?.sessionId) return;
    queueEvent('seek', { fromTime, toTime });
  }, [session?.sessionId, queueEvent]);

  return {
    sessionId: session?.sessionId || null,
    isActive: !!session,
    startSession,
    endSession,
    abandonSession,
    trackPause,
    trackPlay,
    trackReplay,
    trackWordTap,
    trackSpeedChange,
    trackSubtitleToggle,
    trackSeek,
    metrics,
  };
}

export default useListeningSession;
