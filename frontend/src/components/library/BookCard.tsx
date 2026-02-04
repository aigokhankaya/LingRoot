import React from 'react';
import Image from 'next/image';
import { Play, Check, BookOpen, FileText } from 'lucide-react';
import { LibraryItem } from '@/lib/api';

interface BookCardProps {
  item: LibraryItem;
  onClick: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ item, onClick }) => {
  const isFinished = item.is_finished;
  const isStarted = item.progress > 0;
  
  // Dynamic cover color based on title hash if no image
  const getCoverColor = (title: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div 
      className="group relative flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer h-full"
      onClick={onClick}
    >
      {/* Cover Image Area */}
      <div className={`relative aspect-[2/3] w-full overflow-hidden ${!item.cover_url ? getCoverColor(item.title) : ''}`}>
        {item.cover_url ? (
          <Image
            src={item.cover_url}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
            {item.type === 'book' ? <BookOpen size={48} className="opacity-50 mb-2" /> : <FileText size={48} className="opacity-50 mb-2" />}
            <span className="text-xl font-bold text-center line-clamp-3 leading-tight opacity-90">{item.title}</span>
          </div>
        )}

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300 border border-white/30">
            <Play size={32} className="text-white fill-current ml-1" />
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-sm border border-white/10">
          {item.type === 'book' ? 'Kitap' : 'Doküman'}
        </div>

        {/* Finished Badge */}
        {isFinished && (
          <div className="absolute top-2 left-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
            <Check size={14} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1 leading-snug">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">
          {item.author}
        </p>

        {/* Progress Section */}
        <div className="mt-auto">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              {isStarted ? `%${Math.round(item.progress)} Tamamlandı` : 'Başlanmadı'}
            </span>
            {isStarted && (
              <span className="text-[10px] text-gray-400">
                Bölüm {item.current_chapter}
              </span>
            )}
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isFinished ? 'bg-green-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.max(item.progress, 5)}%` }} // Min width so it's visible
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
