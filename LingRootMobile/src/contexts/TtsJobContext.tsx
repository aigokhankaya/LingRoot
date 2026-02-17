import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as ttsService from '../services/ttsService';

interface TtsJobContextType {
  isTtsJobLocked: boolean;
  ttsJobMessage: string | null;
  lockTtsJob: (message?: string) => void;
  unlockTtsJob: () => void;
  checkActiveJob: () => Promise<boolean>;
}

const TtsJobContext = createContext<TtsJobContextType | undefined>(undefined);

export const useTtsJob = () => {
  const context = useContext(TtsJobContext);
  if (context === undefined) {
    throw new Error('useTtsJob must be used within a TtsJobProvider');
  }
  return context;
};

interface TtsJobProviderProps {
  children: React.ReactNode;
}

export const TtsJobProvider: React.FC<TtsJobProviderProps> = ({ children }) => {
  const [isTtsJobLocked, setIsTtsJobLocked] = useState(false);
  const [ttsJobMessage, setTtsJobMessage] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  // Client-side lock flag - prevents backend check from unlocking when we just started a job
  const clientLockActiveRef = useRef(false);
  // Timestamp when lock was acquired - used to determine if lock is "fresh"
  const lockStartTimeRef = useRef<number | null>(null);
  // Grace period: only respect client lock if it's recent (10 seconds)
  const LOCK_GRACE_PERIOD = 10000;

  // Polling refs for active job status checking
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const POLLING_INTERVAL = 5000; // 5 seconds
  const MAX_POLLING_DURATION = 30 * 60 * 1000; // 30 minutes failsafe

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingStartTimeRef.current = null;
  }, []);

  const unlockTtsJob = useCallback(() => {
    clientLockActiveRef.current = false;
    lockStartTimeRef.current = null;
    setIsTtsJobLocked(false);
    setTtsJobMessage(null);
    stopPolling();
  }, [stopPolling]);

  // Start polling function - checks job status every 5 seconds
  const startPolling = useCallback(() => {
    // Don't start if already polling
    if (pollingIntervalRef.current) return;

    pollingStartTimeRef.current = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
      // Timeout check - auto unlock after 30 minutes
      const elapsed = Date.now() - (pollingStartTimeRef.current || 0);
      if (elapsed > MAX_POLLING_DURATION) {
        unlockTtsJob();
        return;
      }

      try {
        const res = await ttsService.getActiveTtsJob();
        if (!res?.hasActiveJob) {
          // Job completed or failed - unlock
          unlockTtsJob();
        }
      } catch {
        // On error, continue polling - don't unlock
      }
    }, POLLING_INTERVAL);
  }, [unlockTtsJob]);

  const lockTtsJob = useCallback((message?: string) => {
    clientLockActiveRef.current = true;
    lockStartTimeRef.current = Date.now();
    setIsTtsJobLocked(true);
    if (message) {
      setTtsJobMessage(message);
    }
    startPolling();
  }, [startPolling]);

  const checkActiveJob = useCallback(async (): Promise<boolean> => {
    try {
      const res = await ttsService.getActiveTtsJob();
      if (res?.hasActiveJob === true) {
        // Backend says there's an active job - lock it
        setIsTtsJobLocked(true);
        // Keep existing message if we have one, otherwise set default
        setTtsJobMessage(prev => prev || 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.');
        return true;
      } else {
        // Backend says no active job
        // Respect client lock only if it's recent (within grace period)
        // This prevents race condition where API says no job but we just started one
        const lockAge = lockStartTimeRef.current
          ? Date.now() - lockStartTimeRef.current
          : Infinity;

        if (clientLockActiveRef.current && lockAge < LOCK_GRACE_PERIOD) {
          // Lock is recent (< 10 seconds), keep it - API request might still be in flight
          return true;
        }

        // Lock is old or doesn't exist - trust backend and unlock
        // This handles both success and error cases properly
        clientLockActiveRef.current = false;
        lockStartTimeRef.current = null;
        setIsTtsJobLocked(false);
        setTtsJobMessage(null);
        return false;
      }
    } catch {
      // On error, don't change lock state - return current state
      return isTtsJobLocked || clientLockActiveRef.current;
    }
  }, [isTtsJobLocked]);

  // Check for active job when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        checkActiveJob();
      }
      appState.current = nextAppState;
    });

    // Initial check on mount
    checkActiveJob();

    return () => {
      subscription.remove();
    };
  }, [checkActiveJob]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const value: TtsJobContextType = {
    isTtsJobLocked,
    ttsJobMessage,
    lockTtsJob,
    unlockTtsJob,
    checkActiveJob,
  };

  return (
    <TtsJobContext.Provider value={value}>
      {children}
    </TtsJobContext.Provider>
  );
};
