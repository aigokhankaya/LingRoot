import { AtSign, Instagram, Music2, Youtube } from 'lucide-react';
import type { MediaPlatform } from '@/types/media';

export const platformLabels: Record<MediaPlatform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
};

export function MediaPlatformIcon({ platform, className = 'h-4 w-4' }: { platform: MediaPlatform; className?: string }) {
  if (platform === 'youtube') return <Youtube className={className} />;
  if (platform === 'instagram') return <Instagram className={className} />;
  if (platform === 'tiktok') return <Music2 className={className} />;
  return <AtSign className={className} />;
}
