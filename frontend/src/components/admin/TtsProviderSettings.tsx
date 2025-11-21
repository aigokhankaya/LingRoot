import React, { useState, useEffect } from 'react';

interface TtsProviderSettingsProps {
  onProviderChange?: (provider: string) => void;
}

export default function TtsProviderSettings({ onProviderChange }: TtsProviderSettingsProps) {
  const [currentProvider, setCurrentProvider] = useState<string>('google');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current TTS provider setting
  useEffect(() => {
    fetchCurrentProvider();
  }, []);

  const fetchCurrentProvider = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
      if (!token) {
        console.warn('No token found');
        return;
      }

      const response = await fetch('/api/admin/settings/tts_provider', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentProvider(data.tts_provider || 'google');
      }
    } catch (error) {
      console.error('Failed to fetch TTS provider:', error);
    }
  };

  const handleProviderChange = async (provider: string) => {
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('lingroot_token');
    if (!token) {
      setMessage({
        type: 'error',
        text: 'Oturum açmanız gerekiyor'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/tts_provider', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tts_provider: provider })
      });

      if (response.ok) {
        setCurrentProvider(provider);
        setMessage({
          type: 'success',
          text: `TTS provider successfully changed to ${provider === 'azure' ? 'Azure' : 'Google'}`
        });
        
        if (onProviderChange) {
          onProviderChange(provider);
        }
      } else {
        throw new Error('Failed to update provider');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update TTS provider. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">TTS Provider Settings</h2>
      
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">
          Choose which Text-to-Speech provider to use for audio generation.
        </p>

        {/* Provider Options */}
        <div className="space-y-3">
          {/* Google TTS */}
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="tts-provider"
              value="google"
              checked={currentProvider === 'google'}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={loading}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Google Cloud Text-to-Speech</div>
              <div className="text-sm text-gray-600 mt-1">
                • High-quality neural voices<br />
                • SSML support for precise timing<br />
                • Multiple voice types (Standard, Neural2, Wavenet, Journey, Chirp)<br />
                • Current default provider
              </div>
            </div>
          </label>

          {/* Azure TTS */}
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="tts-provider"
              value="azure"
              checked={currentProvider === 'azure'}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={loading}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Microsoft Azure Cognitive Services</div>
              <div className="text-sm text-gray-600 mt-1">
                • Neural voices with natural prosody<br />
                • <span className="font-semibold text-primary">Real-time word boundary events</span> for precise timing<br />
                • Multiple voice styles and emotions<br />
                • Excellent for word-level synchronization
              </div>
            </div>
          </label>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Updating provider...</span>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-primary mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-primary">
              <strong>Note:</strong> Azure TTS provides superior word-level timing through WordBoundary events, 
              enabling precise word highlighting during audio playback. This is especially useful for language learning applications.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
