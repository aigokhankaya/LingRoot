import React from 'react';
import { FileText, Podcast, Volume2 } from 'lucide-react';

interface ChatCTAButtonsProps {
  disabled: boolean;
  onAnlatim: () => void;
  onPodcast: () => void;
  onSeslendir: () => void;
}

export const ChatCTAButtons: React.FC<ChatCTAButtonsProps> = ({
  disabled,
  onAnlatim,
  onPodcast,
  onSeslendir,
}) => {
  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Anlatım Oluştur */}
          <button
            disabled={disabled}
            onClick={onAnlatim}
            title={disabled ? "Konu/İçerik netleşince aktif olacaktır." : "Anlatım Oluştur"}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <FileText className="w-4 h-4" />
            <span className="whitespace-nowrap">Anlatım Oluştur</span>
          </button>

          {/* Podcast Oluştur */}
          <button
            disabled={disabled}
            onClick={onPodcast}
            title={disabled ? "Konu/İçerik netleşince aktif olacaktır." : "Podcast Oluştur"}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Podcast className="w-4 h-4" />
            <span className="whitespace-nowrap">Podcast Oluştur</span>
          </button>

          {/* Metni Seslendir */}
          <button
            disabled={disabled}
            onClick={onSeslendir}
            title={disabled ? "Konu/İçerik netleşince aktif olacaktır." : "Metni Seslendir"}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Volume2 className="w-4 h-4" />
            <span className="whitespace-nowrap">Metni Seslendir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
