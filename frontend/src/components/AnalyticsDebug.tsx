import React, { useEffect, useState } from 'react';
import { getFirebaseAnalytics } from '../lib/firebase';
import { logEvent } from 'firebase/analytics';

const AnalyticsDebug = () => {
    const [status, setStatus] = useState<string>('Checking...');
    const [configStatus, setConfigStatus] = useState<string>('');
    const [lastLog, setLastLog] = useState<string>('None');

    const handleTestEvent = async () => {
        const analytics = await getFirebaseAnalytics();
        if (analytics) {
            try {
                logEvent(analytics, 'test_debug_event', {
                    debug_mode: true,
                    timestamp: Date.now()
                });
                setLastLog('Sent: test_debug_event');
                console.log('[AnalyticsDebug] Test event sent');
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                setLastLog(`Error: ${message}`);
            }
        } else {
            setLastLog('Failed: Analytics is null');
        }
    };

    useEffect(() => {
        const checkStatus = async () => {
            if (typeof window !== 'undefined') {
                const analytics = await getFirebaseAnalytics();
                const isAnalyticsLoaded = !!analytics;
                setStatus(isAnalyticsLoaded ? 'Active (Ready to log)' : 'Inactive (Analytics is null)');

                // Safe check of config presence (without revealing secrets)
                const envKeys = [
                    'NEXT_PUBLIC_FIREBASE_API_KEY',
                    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
                    'NEXT_PUBLIC_FIREBASE_APP_ID'
                ];
                const missing = envKeys.filter(key => !process.env[key]);

                if (missing.length > 0) {
                    setConfigStatus(`Missing Env: ${missing.join(', ')}`);
                } else {
                    setConfigStatus('Env Config Loaded');
                }
            }
        };

        const interval = setInterval(checkStatus, 1000);
        checkStatus();
        return () => clearInterval(interval);
    }, []);

    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '4px' }}>
                Analytics Debugger
            </div>
            <div style={{ marginBottom: '4px' }}>
                Status: <span style={{ color: status.startsWith('Active') ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{status}</span>
            </div>
            <div style={{ marginBottom: '4px' }}>Config: {configStatus}</div>
            <div style={{ marginBottom: '8px', color: '#ccc' }}>Last: {lastLog}</div>

            <button
                onClick={handleTestEvent}
                style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: 'bold'
                }}
            >
                Send Test Event
            </button>

            <div style={{ marginTop: '8px', fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
                Check Browser Console & Firebase DebugView
            </div>
        </div>
    );
};

export default AnalyticsDebug;
