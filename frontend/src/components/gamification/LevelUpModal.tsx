/* eslint-disable react/no-unknown-property */
/**
 * 🎉 Level Up Celebration Modal
 * 
 * Kullanıcı level atladığında gösterilen animasyonlu kutlama.
 * Epik ses ve görsel efektlerle.
 */

import React, { useEffect, useState } from 'react';
import { levelToCEFR } from '@/hooks/useGamification';

interface LevelUpModalProps {
  isOpen: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  oldLevel,
  newLevel,
  onClose
}) => {
  const [showContent, setShowContent] = useState(false);
  const [counter, setCounter] = useState(oldLevel);

  useEffect(() => {
    if (isOpen) {
      // Giriş animasyonu
      setTimeout(() => setShowContent(true), 100);

      // Level sayacı animasyonu
      const interval = setInterval(() => {
        setCounter(prev => {
          if (prev >= newLevel) {
            clearInterval(interval);
            return newLevel;
          }
          return prev + 1;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setShowContent(false);
      setCounter(oldLevel);
    }
  }, [isOpen, oldLevel, newLevel]);

  if (!isOpen) return null;

  const oldCEFR = levelToCEFR(oldLevel);
  const newCEFR = levelToCEFR(newLevel);
  const cefrChanged = oldCEFR !== newCEFR;

  return (
    <div className="level-up-overlay" onClick={onClose}>
      <div
        className={`level-up-modal ${showContent ? 'show' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Parlayan arka plan */}
        <div className="glow-bg" />

        {/* Yıldızlar */}
        <div className="stars">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* İçerik */}
        <div className="content">
          <div className="crown">👑</div>

          <h1 className="title">SEVİYE ATLADIN!</h1>

          <div className="level-display">
            <div className="level-badge old">{oldLevel}</div>
            <div className="arrow">→</div>
            <div className="level-badge new">
              <span className="level-number">{counter}</span>
              <div className="pulse-ring" />
            </div>
          </div>

          {cefrChanged && (
            <div className="cefr-upgrade">
              <span className="cefr-badge old">{oldCEFR}</span>
              <span className="upgrade-arrow">⬆️</span>
              <span className="cefr-badge new">{newCEFR}</span>
            </div>
          )}

          <p className="message">
            {cefrChanged
              ? `Tebrikler! Artık ${newCEFR} seviyesindesin!`
              : `Harika gidiyorsun! Level ${newLevel}'e ulaştın!`
            }
          </p>

          <button className="continue-btn" onClick={onClose}>
            <span>Devam Et</span>
            <span className="btn-glow" />
          </button>
        </div>

        <style jsx>{`
          .level-up-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
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

          .level-up-modal {
            position: relative;
            width: 90%;
            max-width: 440px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 24px;
            padding: 48px 32px;
            text-align: center;
            overflow: hidden;
            transform: scale(0.8);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .level-up-modal.show {
            transform: scale(1);
            opacity: 1;
          }

          .glow-bg {
            position: absolute;
            inset: -50%;
            background: radial-gradient(
              circle at center,
              rgba(99, 102, 241, 0.3) 0%,
              rgba(139, 92, 246, 0.2) 30%,
              transparent 70%
            );
            animation: rotate 10s linear infinite;
          }

          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .stars {
            position: absolute;
            inset: 0;
            overflow: hidden;
          }

          .star {
            position: absolute;
            width: 4px;
            height: 4px;
            background: white;
            border-radius: 50%;
            animation: twinkle 2s infinite;
          }

          @keyframes twinkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
          }

          .content {
            position: relative;
            z-index: 1;
          }

          .crown {
            font-size: 64px;
            animation: bounce 1s ease infinite;
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .title {
            font-size: 32px;
            font-weight: 900;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 16px 0;
            letter-spacing: 2px;
          }

          .level-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            margin: 32px 0;
          }

          .level-badge {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: 900;
            color: white;
          }

          .level-badge.old {
            background: rgba(107, 114, 128, 0.5);
            opacity: 0.6;
          }

          .level-badge.new {
            background: linear-gradient(135deg, #6366F1, #8B5CF6);
            box-shadow: 0 0 40px rgba(99, 102, 241, 0.6);
            position: relative;
          }

          .level-number {
            position: relative;
            z-index: 1;
          }

          .pulse-ring {
            position: absolute;
            inset: -10px;
            border: 3px solid rgba(99, 102, 241, 0.5);
            border-radius: 26px;
            animation: pulse-ring 1.5s infinite;
          }

          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.3); opacity: 0; }
          }

          .arrow {
            font-size: 32px;
            color: rgba(255, 255, 255, 0.5);
          }

          .cefr-upgrade {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 24px;
          }

          .cefr-badge {
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
          }

          .cefr-badge.old {
            background: rgba(107, 114, 128, 0.3);
            color: rgba(255, 255, 255, 0.5);
          }

          .cefr-badge.new {
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            animation: glow 2s infinite;
          }

          @keyframes glow {
            0%, 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
            50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.8); }
          }

          .upgrade-arrow {
            font-size: 20px;
            animation: arrowBounce 0.5s infinite alternate;
          }

          @keyframes arrowBounce {
            from { transform: translateY(2px); }
            to { transform: translateY(-2px); }
          }

          .message {
            color: rgba(255, 255, 255, 0.8);
            font-size: 16px;
            margin-bottom: 32px;
          }

          .continue-btn {
            position: relative;
            background: linear-gradient(135deg, #6366F1, #8B5CF6);
            color: white;
            border: none;
            padding: 16px 48px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            overflow: hidden;
            transition: transform 0.2s ease;
          }

          .continue-btn:hover {
            transform: scale(1.05);
          }

          .btn-glow {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
            animation: btnShimmer 2s infinite;
          }

          @keyframes btnShimmer {
            from { transform: translateX(-100%); }
            to { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LevelUpModal;
