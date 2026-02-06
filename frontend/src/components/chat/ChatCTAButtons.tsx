import React, { useState, useRef, useEffect } from 'react';
import { FileText, Podcast, Volume2, Sparkles, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface ChatCTAButtonsProps {
  disabled: boolean;
  isProcessing?: boolean;
  hasContent?: boolean;
  onAnlatim: () => void;
  onPodcast: () => void;
  onSeslendir: () => void;
  onCancel?: () => void;
}

export const ChatCTAButtons: React.FC<ChatCTAButtonsProps> = ({
  disabled,
  isProcessing = false,
  hasContent = false,
  onAnlatim,
  onPodcast,
  onSeslendir,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isProcessing) {
    return (
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
          <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
            {t('chat_processing') || 'Icerik olusturuluyor...'}
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="ml-2 px-3 py-1 text-xs rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              {t('cancel') || 'Vazgec'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto relative" ref={dropdownRef}>
        <button
          disabled={disabled}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('chat_create_content') || 'Icerik Olustur'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {disabled && (
          <p className="text-xs text-gray-400 text-center mt-1.5">
            {t('chat_action_disabled_tooltip') || 'Konu netlestikten sonra icerik olusturabilirsin.'}
          </p>
        )}

        {dropdownOpen && !disabled && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
            <button
              onClick={() => { setDropdownOpen(false); onAnlatim(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('chat_create_narration') || 'Anlatim Olustur'}
                </div>
                <div className="text-xs text-gray-500">~3 dk · Konu hakkinda arastirma + seslendirme</div>
              </div>
            </button>

            <button
              onClick={() => { setDropdownOpen(false); onPodcast(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left border-t border-gray-100 dark:border-gray-700"
            >
              <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <Podcast className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('chat_create_podcast') || 'Podcast Olustur'}
                </div>
                <div className="text-xs text-gray-500">~10 dk · Iki kisilik diyalog formati</div>
              </div>
            </button>

            {hasContent && (
              <button
                onClick={() => { setDropdownOpen(false); onSeslendir(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left border-t border-gray-100 dark:border-gray-700"
              >
                <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t('chat_voice_text') || 'Metni Seslendir'}
                  </div>
                  <div className="text-xs text-gray-500">Mevcut Ingilizce metni seslendir</div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
