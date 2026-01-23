/**
 * 🏆 Achievement Unlock Modal
 * 
 * Başarım kazanıldığında gösterilen animasyonlu modal.
 * React Portal kullanılarak document.body altında render edilir.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Achievement, getRarityColor } from '@/hooks/useGamification';

interface AchievementModalProps {
  isOpen: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  achievement,
  onClose
}) => {
  const [showContent, setShowContent] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-side mounting for Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen || !achievement || !mounted) return null;

  const rarityColor = getRarityColor(achievement.rarity);
  const rarityLabels: Record<string, string> = {
    common: 'Yaygın',
    rare: 'Nadir',
    epic: 'Epik',
    legendary: 'Efsanevi'
  };

  const modalContent = (
    <div className="achievement-overlay" onClick={onClose}>
      <div
        className={`achievement-modal ${showContent ? 'show' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Rarity glow */}
        <div className="rarity-glow" style={{ background: `radial-gradient(circle, ${rarityColor}40 0%, transparent 70%)` }} />

        {/* Badge */}
        <div className="badge-container">
          <div className="badge-ring" style={{ borderColor: rarityColor }} />
          <div className="badge-inner">
            <span className="badge-emoji">{achievement.icon_emoji}</span>
          </div>
          <div className="sparkles">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="sparkle"
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-60px)`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Text */}
        <div className="text-content">
          <span className="unlock-text">BAŞARIM KAZANILDI!</span>

          <h2 className="achievement-title">{achievement.title_tr}</h2>

          <p className="achievement-desc">{achievement.description_tr}</p>

          <div className="rarity-badge" style={{ background: `${rarityColor}30`, color: rarityColor }}>
            {rarityLabels[achievement.rarity] || 'Yaygın'}
          </div>

          <div className="xp-reward">
            <span className="xp-icon">⚡</span>
            <span className="xp-amount">+{achievement.xp_reward} XP</span>
          </div>
        </div>

        <button className="close-btn" onClick={onClose}>
          Harika!
        </button>

        <style jsx>{`
          .achievement-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .achievement-modal {
            position: relative;
            width: 90%;
            max-width: 380px;
            background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
            border-radius: 24px;
            padding: 48px 32px 32px;
            text-align: center;
            overflow: visible;
            transform: scale(0.5) translateY(50px);
            opacity: 0;
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .achievement-modal.show {
            transform: scale(1) translateY(0);
            opacity: 1;
          }

          .rarity-glow {
            position: absolute;
            top: -100px;
            left: -100px;
            right: -100px;
            bottom: -100px;
            pointer-events: none;
          }

          .badge-container {
            position: relative;
            width: 120px;
            height: 120px;
            margin: -80px auto 24px;
          }

          .badge-ring {
            position: absolute;
            inset: 0;
            border: 4px solid;
            border-radius: 50%;
            animation: spin 8s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .badge-inner {
            position: absolute;
            inset: 8px;
            background: linear-gradient(135deg, #374151, #1f2937);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
              0 10px 40px rgba(0, 0, 0, 0.5),
              inset 0 2px 10px rgba(255, 255, 255, 0.1);
          }

          .badge-emoji {
            font-size: 48px;
            animation: popIn 0.5s ease 0.3s both;
          }

          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }

          .sparkles {
            position: absolute;
            inset: 0;
            animation: sparkle-rotate 4s linear infinite;
          }

          @keyframes sparkle-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .sparkle {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            animation: sparkle-pulse 1s ease-in-out infinite;
          }

          @keyframes sparkle-pulse {
            0%, 100% { opacity: 0; transform-origin: center; }
            50% { opacity: 1; }
          }

          .text-content {
            position: relative;
            z-index: 1;
          }

          .unlock-text {
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 3px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 8px;
          }

          .achievement-title {
            font-size: 24px;
            font-weight: 800;
            color: white;
            margin: 0 0 8px;
          }

          .achievement-desc {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0 0 16px;
            line-height: 1.5;
          }

          .rarity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
          }

          .xp-reward {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            background: rgba(99, 102, 241, 0.2);
            border-radius: 12px;
            margin-bottom: 24px;
          }

          .xp-icon {
            font-size: 20px;
          }

          .xp-amount {
            font-size: 20px;
            font-weight: 800;
            color: #A5B4FC;
          }

          .close-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #6366F1, #8B5CF6);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
          }
        `}</style>
      </div>
    </div>
  );

  // React Portal ile document.body altında render et
  return createPortal(modalContent, document.body);
};

export default AchievementModal;
