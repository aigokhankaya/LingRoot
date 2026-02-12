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

  const lockTtsJob = useCallback((message?: string) => {
    clientLockActiveRef.current = true;
    setIsTtsJobLocked(true);
    if (message) {
      setTtsJobMessage(message);
    }
  }, []);

  const unlockTtsJob = useCallback(() => {
    clientLockActiveRef.current = false;
    setIsTtsJobLocked(false);
    setTtsJobMessage(null);
  }, []);

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
        // Only unlock if client-side lock is NOT active
        // This prevents race condition where API says no job but we just started one
        if (!clientLockActiveRef.current) {
          setIsTtsJobLocked(false);
          setTtsJobMessage(null);
        }
        return clientLockActiveRef.current;
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
