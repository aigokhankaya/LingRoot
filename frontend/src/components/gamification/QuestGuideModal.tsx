/**
 * 🎯 Quest Guide Modal
 *
 * Görev tıklandığında açılan yönlendirme modal'ı.
 * Kullanıcıya görevi nasıl tamamlayacağını adım adım gösterir.
 */

import React from 'react';
import { useRouter } from 'next/router';
import { DailyQuest } from '@/hooks/useGamification';

interface QuestGuideModalProps {
  quest: DailyQuest;
  isOpen: boolean;
  onClose: () => void;
}

interface QuestGuideConfig {
  icon: string;
  title: string;
  steps: string[];
  targetUrl: string;
  buttonText: string;
  tip?: string;
}

const getQuestGuideConfig = (quest: DailyQuest): QuestGuideConfig => {
  const sectorId = (quest as any).sector_id;

  // Sektör görevleri
  if (sectorId) {
    switch (quest.task_type) {
      case 'sector_vocab':
      case 'sector_vocabulary':
        return {
          icon: '💼',
          title: 'Sektörel Kelime Öğren',
          steps: [
            'Sektörler sayfasına yönlendirileceksin',
            '"Kelimeler" sekmesine tıkla',
            'Kelime kartlarını çalışarak öğren',
            `${quest.target_amount} kelime öğrendiğinde görev tamamlanacak`
          ],
          targetUrl: `/sectors/${sectorId}?tab=vocabulary`,
          buttonText: 'Kelimelere Git',
          tip: 'Her kelimeyi kartla çalıştığında otomatik sayılır'
        };
      case 'sector_content':
      case 'sector_article':
        return {
          icon: '📰',
          title: 'Sektörel İçerik Dinle',
          steps: [
            'Sektörler sayfasına yönlendirileceksin',
            '"İçerikler" sekmesinde bir içerik seç',
            'İçeriği dinlemeye başla',
            'İçeriği tamamladığında görev bitecek'
          ],
          targetUrl: `/sectors/${sectorId}?tab=content`,
          buttonText: 'İçeriklere Git'
        };
      case 'sector_quiz':
        return {
          icon: '🧠',
          title: 'Sektörel Quiz Tamamla',
          steps: [
            'Sektörler sayfasına yönlendirileceksin',
            'Bir içerik dinle veya kelime çalış',
            'Quiz bölümüne git ve quiz\'i tamamla'
          ],
          targetUrl: `/sectors/${sectorId}?tab=content`,
          buttonText: 'Quiz\'e Git'
        };
      case 'sector_podcast':
        return {
          icon: '🎙️',
          title: 'Sektörel Podcast Dinle',
          steps: [
            'Sektörler sayfasına yönlendirileceksin',
            '"Podcast" sekmesine tıkla',
            'Bir bölüm seç ve dinlemeye başla'
          ],
          targetUrl: `/sectors/${sectorId}?tab=podcast`,
          buttonText: 'Podcast\'e Git'
        };
      case 'sector_roleplay':
      case 'sector_dialogue':
        return {
          icon: '🎭',
          title: 'Roleplay Tamamla',
          steps: [
            'Sektörler sayfasına yönlendirileceksin',
            '"Roleplay" sekmesine tıkla',
            'Bir senaryo seç ve diyaloğu tamamla'
          ],
          targetUrl: `/sectors/${sectorId}?tab=roleplay`,
          buttonText: 'Roleplay\'e Git'
        };
    }
  }

  // Genel görevler
  switch (quest.task_type) {
    case 'listen_minutes':
      return {
        icon: '🎧',
        title: `${quest.target_amount} Dakika Dinle`,
        steps: [
          'Ana sayfaya yönlendirileceksin',
          '"Sana Özel İçerikler" bölümünden bir içerik seç',
          'Veya "Yeni İçerik Oluştur" ile kendi içeriğini üret',
          '"Başla" butonuna tıklayarak dinlemeye başla',
          `Toplam ${quest.target_amount} dakika dinlediğinde görev tamamlanacak`
        ],
        targetUrl: '/welcome',
        buttonText: 'İçeriklere Git',
        tip: 'Dinlediğin süre otomatik olarak sayılır, kesintisiz olması gerekmez'
      };

    case 'listen_content':
      return {
        icon: '👂',
        title: 'İçerik Dinle',
        steps: [
          'Ana sayfaya yönlendirileceksin',
          '"Sana Özel İçerikler" veya "İçeriklerim" bölümünden bir içerik seç',
          'İçeriği dinlemeye başla',
          'Dinlemeye başladığında görev tamamlanacak'
        ],
        targetUrl: '/welcome',
        buttonText: 'İçerik Seç'
      };

    case 'complete_content':
      return {
        icon: '✅',
        title: `${quest.target_amount} İçerik Tamamla`,
        steps: [
          'Ana sayfaya yönlendirileceksin',
          'Bir içerik seç ve dinlemeye başla',
          'İçeriği sonuna kadar dinle',
          'İlerleme çubuğu %100 olduğunda içerik tamamlanmış sayılır'
        ],
        targetUrl: '/welcome',
        buttonText: 'İçerik Seç',
        tip: 'Yarıda bıraktığın içeriklere "İçeriklerim" bölümünden devam edebilirsin'
      };

    case 'learn_words':
      return {
        icon: '📚',
        title: `${quest.target_amount} Kelime Öğren`,
        steps: [
          'Kelime Kartları sayfasına yönlendirileceksin',
          '"Yeni Kelimeler" sekmesinde olduğundan emin ol',
          'Kartları çevirerek kelimeleri öğren',
          `${quest.target_amount} kelime çalıştığında görev tamamlanacak`
        ],
        targetUrl: '/vocabulary?mode=new',
        buttonText: 'Kelimelere Git',
        tip: 'Her kartı çevirdiğinde otomatik sayılır'
      };

    case 'review_words':
      return {
        icon: '📝',
        title: `${quest.target_amount} Kelime Tekrar Et`,
        steps: [
          'Kelime Kartları sayfasına yönlendirileceksin',
          '"Tekrar Et" sekmesine tıkla',
          'Daha önce öğrendiğin kelimeleri tekrar et',
          `${quest.target_amount} kelime tekrar ettiğinde görev tamamlanacak`
        ],
        targetUrl: '/vocabulary?mode=due',
        buttonText: 'Tekrar\'a Git',
        tip: 'Düzenli tekrar, kelimelerin kalıcı olmasını sağlar'
      };

    case 'complete_quiz':
      return {
        icon: '🧠',
        title: 'Quiz Tamamla',
        steps: [
          'Önce bir içerik dinlemen gerekiyor',
          'İçerik sayfasında "Quiz" bölümüne git',
          'Soruları cevapla ve quiz\'i tamamla'
        ],
        targetUrl: '/dashboard?tab=reading-history',
        buttonText: 'İçeriklere Git',
        tip: 'Quiz\'ler dinlediğin içerikten çıkıyor, önce içerik dinle'
      };

    case 'create_content':
      return {
        icon: '✨',
        title: 'Yeni İçerik Oluştur',
        steps: [
          'Ana sayfaya yönlendirileceksin',
          '"Yeni İçerik Oluştur" butonuna tıkla',
          'İlgi alanlarını ve konuyu seç',
          'İçerik oluşturulduğunda görev tamamlanacak'
        ],
        targetUrl: '/welcome',
        buttonText: 'İçerik Oluştur',
        tip: 'İlgi alanlarına göre sana özel içerik üretilecek'
      };

    default:
      return {
        icon: '📋',
        title: quest.task_title,
        steps: [
          quest.description || 'Görevi tamamlamak için tıkla'
        ],
        targetUrl: '/dashboard',
        buttonText: 'Başla'
      };
  }
};

export const QuestGuideModal: React.FC<QuestGuideModalProps> = ({ quest, isOpen, onClose }) => {
  const router = useRouter();
  const config = getQuestGuideConfig(quest);

  if (!isOpen) return null;

  const handleStart = () => {
    // Aktif görevi localStorage'a kaydet (banner için)
    localStorage.setItem('activeQuest', JSON.stringify({
      id: quest.id,
      task_type: quest.task_type,
      task_title: quest.task_title,
      description: quest.description,
      target_amount: quest.target_amount,
      current_amount: quest.current_amount,
      xp_reward: quest.xp_reward
    }));

    onClose();
    router.push(config.targetUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
              {config.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold">{config.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/80">
                  {quest.current_amount}/{quest.target_amount}
                </span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  +{quest.xp_reward} XP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
            Nasıl Yapılır?
          </h3>
          <ol className="space-y-3">
            {config.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-sm text-slate-600 leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {/* Tip */}
          {config.tip && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
              <span className="text-amber-500">💡</span>
              <p className="text-xs text-amber-700">{config.tip}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-teal-200 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            {config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestGuideModal;
