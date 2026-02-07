/**
 * 🏰 Memory Palace Component
 *
 * Kelime ustaligi gorsellestirmesi.
 * 5 oda: Karanlik Bolge, Tanik Odasi, Ogrenim Salonu, Bilgi Kutuphanesi, Altin Kasa
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface PalaceRoom {
  name: string;
  description: string;
  count: number;
  icon: string;
  estimatedTotal?: number;
  dueForReview?: number;
}

interface PalaceData {
  rooms: {
    darkZone: PalaceRoom;
    witnessRoom: PalaceRoom;
    learningHall: PalaceRoom;
    knowledgeLibrary: PalaceRoom;
    goldenVault: PalaceRoom;
  };
  totalWords: number;
  recentWords: RecentWord[];
}

interface RecentWord {
  word: string;
  status: string;
  room: string;
  encounters: number;
  lastSeen: string;
}

export const MemoryPalace: React.FC = () => {
  const [palace, setPalace] = useState<PalaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchPalace();
  }, []);

  const fetchPalace = async () => {
    try {
      setLoading(true);
      const response = await apiClient.http.get('/listening/palace');

      if (response.data?.success) {
        setPalace(response.data.data);
      }
    } catch (error) {
      console.error('[MemoryPalace] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 animate-pulse shadow-sm">
        <div className="w-48 h-6 bg-slate-200 rounded-md mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-200/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!palace) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="text-center py-8 text-slate-500">
          <span className="text-4xl mb-4 block">🏰</span>
          <p className="text-sm">Kelime Sarayin henuz bos.</p>
          <p className="text-xs text-slate-400 mt-1">Dinlerken kelimelere tikla!</p>
        </div>
      </div>
    );
  }

  const rooms = [
    { key: 'goldenVault', data: palace.rooms.goldenVault, color: 'amber', bgGradient: 'from-amber-50 to-yellow-50' },
    { key: 'knowledgeLibrary', data: palace.rooms.knowledgeLibrary, color: 'teal', bgGradient: 'from-teal-50 to-cyan-50' },
    { key: 'learningHall', data: palace.rooms.learningHall, color: 'cyan', bgGradient: 'from-cyan-50 to-sky-50' },
    { key: 'witnessRoom', data: palace.rooms.witnessRoom, color: 'slate', bgGradient: 'from-slate-100 to-gray-100' },
    { key: 'darkZone', data: palace.rooms.darkZone, color: 'gray', bgGradient: 'from-gray-200 to-slate-200' },
  ];

  const masteredPercentage = palace.totalWords > 0
    ? Math.round((palace.rooms.goldenVault.count / Math.max(palace.totalWords, 1)) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏰</span>
            <div>
              <h3 className="text-xl font-bold">Kelime Sarayin</h3>
              <p className="text-teal-100 text-sm">Ustalastigin kelimeler burada yasiyorlar</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{palace.totalWords}</div>
            <div className="text-teal-100 text-xs">Toplam Kelime</div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="mt-4 bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-teal-100">Ustalasma Orani</span>
            <span className="text-sm font-bold">{masteredPercentage}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${masteredPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div className="p-4 space-y-2">
        {rooms.map(({ key, data, color, bgGradient }) => (
          <RoomCard
            key={key}
            room={data}
            roomKey={key}
            color={color}
            bgGradient={bgGradient}
            isSelected={selectedRoom === key}
            onClick={() => setSelectedRoom(selectedRoom === key ? null : key)}
          />
        ))}
      </div>

      {/* Due Reviews Alert */}
      {palace.rooms.learningHall.dueForReview && palace.rooms.learningHall.dueForReview > 0 && (
        <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {palace.rooms.learningHall.dueForReview} kelime tekrar bekliyor
                </p>
                <p className="text-xs text-amber-600">Hafiza pekistirmek icin tekrar et</p>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
              Tekrar Et
            </button>
          </div>
        </div>
      )}

      {/* Recent Words */}
      {palace.recentWords && palace.recentWords.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Son Kesfedilen Kelimeler</h4>
          <div className="flex flex-wrap gap-2">
            {palace.recentWords.slice(0, 8).map((word, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoomBadgeStyle(word.room)}`}
                title={`${word.encounters} kez karsilasildi`}
              >
                {word.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Room Card Component
interface RoomCardProps {
  room: PalaceRoom;
  roomKey: string;
  color: string;
  bgGradient: string;
  isSelected: boolean;
  onClick: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, roomKey, color, bgGradient, isSelected, onClick }) => {
  const colorStyles: Record<string, { border: string; text: string; progress: string }> = {
    amber: { border: 'border-amber-200', text: 'text-amber-700', progress: 'bg-amber-400' },
    teal: { border: 'border-teal-200', text: 'text-teal-700', progress: 'bg-teal-400' },
    cyan: { border: 'border-cyan-200', text: 'text-cyan-700', progress: 'bg-cyan-400' },
    slate: { border: 'border-slate-200', text: 'text-slate-600', progress: 'bg-slate-400' },
    gray: { border: 'border-gray-300', text: 'text-gray-500', progress: 'bg-gray-400' },
  };

  const styles = colorStyles[color] || colorStyles.slate;
  const isGoldenVault = roomKey === 'goldenVault';
  const isDarkZone = roomKey === 'darkZone';

  return (
    <div
      onClick={onClick}
      className={`
        bg-gradient-to-r ${bgGradient} rounded-xl border ${styles.border}
        p-4 cursor-pointer transition-all duration-300
        hover:shadow-md hover:scale-[1.01]
        ${isSelected ? 'ring-2 ring-teal-500 ring-offset-2' : ''}
        ${isGoldenVault ? 'relative overflow-hidden' : ''}
      `}
    >
      {/* Golden shimmer effect */}
      {isGoldenVault && room.count > 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent animate-shimmer" />
      )}

      <div className="flex items-center gap-4 relative">
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${isDarkZone ? 'bg-gray-300' : `bg-white shadow-sm`}
        `}>
          {room.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-bold ${styles.text}`}>{room.name}</span>
            <span className={`text-lg font-bold ${styles.text}`}>
              {room.count.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate">{room.description}</p>

          {/* Progress bar for non-dark zone */}
          {!isDarkZone && room.count > 0 && (
            <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${styles.progress}`}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Dark zone estimation */}
          {isDarkZone && room.estimatedTotal && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">
                Tahmini {room.estimatedTotal.toLocaleString()}+ kelime kesfedilmeyi bekliyor
              </span>
            </div>
          )}

          {/* Due for review badge */}
          {room.dueForReview && room.dueForReview > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">
                <span>🔔</span>
                {room.dueForReview} tekrar bekliyor
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function for badge styles
function getRoomBadgeStyle(room: string): string {
  const styles: Record<string, string> = {
    golden_vault: 'bg-amber-100 text-amber-700 border border-amber-200',
    knowledge_library: 'bg-teal-100 text-teal-700 border border-teal-200',
    learning_hall: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    witness_room: 'bg-slate-100 text-slate-600 border border-slate-200',
    dark_zone: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  return styles[room] || styles.witness_room;
}

// Add shimmer animation to tailwind (should be in globals.css or tailwind config)
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer { animation: shimmer 2s infinite; }

export default MemoryPalace;
