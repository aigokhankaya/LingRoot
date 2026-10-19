'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, CircleAlert, Clock3, Copy, ExternalLink, FileAudio,
  FileJson, FileText, Film, Loader2, Pause, RefreshCw, RotateCcw, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MediaPlatformIcon, platformLabels } from '@/components/admin/media-platform-icon';
import { MediaAgentQuality } from '@/components/admin/media-agent-quality';
import {
  approveMediaCampaign, cancelMediaCampaign, duplicateMediaCampaign, getMediaCampaign,
  requestMediaRevision, rerunMediaQuality, retryMediaCampaign, submitMediaQualityFeedback,
} from '@/services/mediaService';
import type { MediaArtifact, MediaCampaign } from '@/types/media';

const activeStatuses = new Set(['queued', 'planning', 'generating_visuals', 'generating_levels', 'rendering', 'qa', 'quality_queued', 'quality_review', 'repairing']);
const statusLabels: Record<string, string> = {
  draft: 'Taslak', queued: 'Kuyrukta', planning: 'Planlanıyor', generating_visuals: 'Görseller üretiliyor',
  generating_levels: 'Seviye paketleri üretiliyor', rendering: 'Videolar render ediliyor', qa: 'Kalite kontrol',
  quality_queued: 'Agent QA kuyruğunda', quality_review: 'Agent QA çalışıyor', repair_required: 'Düzeltme gerekli',
  repairing: 'Düzeltiliyor', human_review: 'İnsan incelemesi',
  review_ready: 'İncelemeye hazır', approved: 'Onaylandı', scheduled: 'Planlandı', published: 'Yayınlandı',
  failed: 'Başarısız', cancelled: 'İptal edildi',
};

function artifactIcon(kind: string) {
  if (kind.includes('video')) return Film;
  if (kind.includes('audio')) return FileAudio;
  if (kind.includes('json') || kind.includes('metadata') || kind.includes('report')) return FileJson;
  return FileText;
}

function readableBytes(value?: number | null) {
  if (!value) return '-';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function MediaCampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params?.campaignId || '';
  const router = useRouter();
  const [campaign, setCampaign] = useState<MediaCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    if (!campaignId) return;
    try { setCampaign(await getMediaCampaign(campaignId)); }
    catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 401 || status === 403) return router.replace('/admin/login');
      setMessage({ type: 'error', text: (error as Error).message });
    } finally { if (!quiet) setLoading(false); }
  }, [campaignId, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!campaign || !activeStatuses.has(campaign.status)) return;
    const timer = setInterval(() => void load(true), 7000);
    return () => clearInterval(timer);
  }, [campaign, load]);

  const act = async (work: () => Promise<unknown>, success: string, after?: (result: any) => void) => {
    setActing(true); setMessage(null);
    try { const result = await work(); setMessage({ type: 'success', text: success }); after?.(result); await load(true); }
    catch (error) { setMessage({ type: 'error', text: (error as Error).message }); }
    finally { setActing(false); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f8f9]"><Loader2 className="h-7 w-7 animate-spin text-gray-400" /></main>;
  if (!campaign) return <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f8f9] p-6"><CircleAlert className="h-7 w-7 text-red-600" /><p>{message?.text || 'Kampanya bulunamadı.'}</p><Button variant="outline" onClick={() => router.push('/admin/lingroot-media')}>Listeye dön</Button></main>;

  return <TooltipProvider><main className="min-h-screen bg-[#f6f8f9] text-gray-950">
    <header className="border-b border-gray-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><Button size="icon" variant="ghost" onClick={() => router.push('/admin/lingroot-media')} aria-label="LingRoot Media listesine dön"><ArrowLeft className="h-5 w-5" /></Button><div className="min-w-0"><h1 className="truncate !text-xl !leading-tight sm:!text-2xl">{campaign.name}</h1><p className="truncate !text-sm text-gray-500">{campaign.topic}</p></div></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => void load()} aria-label="Yenile"><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" onClick={() => void act(() => duplicateMediaCampaign(campaign.id), 'Taslak kopya oluşturuldu.', (result: MediaCampaign) => router.push(`/admin/lingroot-media/${result.id}`))} disabled={acting}><Copy className="mr-2 h-4 w-4" />Çoğalt</Button></div></div></header>

    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      {message && <div role="alert" className={`mb-5 border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</div>}

      <section className="mb-5 rounded-md border border-gray-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium">{statusLabels[campaign.status] || campaign.status}</span><span className="text-xs text-gray-500">Son güncelleme: {dateTime(campaign.updatedAt)}</span></div><p className="!text-sm text-gray-600">Aşama: <strong>{campaign.currentStage || '-'}</strong></p></div><div className="w-full lg:max-w-md"><div className="mb-2 flex justify-between text-sm"><span>Üretim ilerlemesi</span><strong>{campaign.progress}%</strong></div><div className="h-2 overflow-hidden rounded bg-gray-200"><div className="h-full bg-teal-600 transition-all" style={{ width: `${campaign.progress}%` }} /></div></div></div>
        {campaign.errorMessage && <div className="mt-5 flex gap-2 border-t border-red-100 pt-4 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{campaign.errorMessage}</div>}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <div className="space-y-5">
          <MediaAgentQuality
            run={campaign.latestQualityRun}
            hasArtifacts={Boolean(campaign.artifacts?.length)}
            acting={acting}
            onRerun={() => void act(() => rerunMediaQuality(campaign.id), 'Agent kalite değerlendirmesi kuyruğa alındı.')}
            onFeedback={(input) => void act(
              () => submitMediaQualityFeedback(campaign.id, campaign.latestQualityRun!.id, input),
              input.decision === 'disagree' ? 'Bulgu reddedildi.' : input.decision === 'request_repair' ? 'Düzeltme talebi kaydedildi.' : 'Kalite geri bildirimi kaydedildi.',
            )}
          />
          <section className="rounded-md border border-gray-200 bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="!text-lg">Üretim çıktıları</h2><p className="!text-sm text-gray-500">Worker tarafından oluşturulan video, ses, altyazı ve raporlar.</p></div><ArtifactList artifacts={campaign.artifacts || []} /></section>
          <section className="rounded-md border border-gray-200 bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="!text-lg">İş geçmişi</h2></div>{!campaign.jobs?.length ? <p className="p-5 !text-sm text-gray-500">Henüz iş kaydı yok.</p> : <div className="divide-y divide-gray-100">{campaign.jobs.map((job) => <div key={job.id} className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_1fr_auto]"><div><span className="block font-medium">{statusLabels[job.stage] || job.stage}</span><span className="text-xs text-gray-500">Deneme {job.attempt}/{job.maxAttempts}</span></div><div><span className="block">{job.progress}%</span><span className="text-xs text-gray-500">{job.workerId || 'Worker bekleniyor'}</span></div><div className="text-xs text-gray-500 sm:text-right"><span className="block">{dateTime(job.startedAt || job.createdAt)}</span><span>{job.errorMessage || dateTime(job.finishedAt)}</span></div></div>)}</div>}</section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5">
          <section className="rounded-md border border-gray-200 bg-white p-5"><h2 className="!text-lg">Hedefler</h2><div className="mt-4 divide-y divide-gray-100">{campaign.targets.map((target) => <div key={target.id} className="py-4 first:pt-0 last:pb-0"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><MediaPlatformIcon platform={target.platform} />{platformLabels[target.platform]}</span><span className="text-xs text-gray-500">{target.status}</span></div>{target.title && <p className="mt-2 !text-sm">{target.title}</p>}{target.hashtags?.length ? <p className="mt-1 !text-xs text-teal-700">{target.hashtags.map((tag) => `#${tag}`).join(' ')}</p> : null}<div className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Clock3 className="h-3.5 w-3.5" />{target.scheduledAt ? dateTime(target.scheduledAt) : 'Zamanlama yok'}</div><div className="mt-2 flex items-center gap-1 text-xs text-amber-700"><Send className="h-3.5 w-3.5" />Yayın bağlantısı sonraki fazda</div></div>)}</div></section>

          <section className="rounded-md border border-gray-200 bg-white p-5"><h2 className="!text-lg">Review ve onay</h2><p className="mt-1 !text-sm text-gray-500">QA çıktısını kontrol edin. Onay, otomatik paylaşım başlatmaz.</p><Textarea className="mt-4" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İnceleme notu" />{campaign.reviewNotes && <div className="mt-3 border-l-2 border-amber-400 pl-3 text-sm text-gray-600">{campaign.reviewNotes}</div>}<div className="mt-4 grid gap-2">
            {campaign.status === 'review_ready' && <Button disabled={acting} onClick={() => void act(() => approveMediaCampaign(campaign.id, notes), 'İçerik onaylandı.')}><Check className="mr-2 h-4 w-4" />İçeriği onayla</Button>}
            {campaign.status === 'review_ready' && <Button variant="outline" disabled={acting || !notes.trim()} onClick={() => void act(() => requestMediaRevision(campaign.id, notes), 'Kampanya revizyon için taslağa alındı.')}><RotateCcw className="mr-2 h-4 w-4" />Revizyon iste</Button>}
            {campaign.status === 'failed' && <Button disabled={acting} onClick={() => void act(() => retryMediaCampaign(campaign.id), 'İş yeniden kuyruğa alındı.')}><RotateCcw className="mr-2 h-4 w-4" />Yeniden dene</Button>}
            {activeStatuses.has(campaign.status) && <Button variant="outline" disabled={acting} onClick={() => void act(() => cancelMediaCampaign(campaign.id), 'İş iptal edildi.')}><Pause className="mr-2 h-4 w-4" />Üretimi iptal et</Button>}
          </div></section>

          <section className="rounded-md border border-gray-200 bg-white p-5"><h2 className="!text-lg">Paket ayarları</h2><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-xs text-gray-500">Seviyeler</dt><dd>{campaign.levels.join(', ')}</dd></div><div><dt className="text-xs text-gray-500">Süre</dt><dd>{campaign.targetDurationSeconds >= 300 ? `${campaign.targetDurationSeconds / 60} dk` : `${campaign.targetDurationSeconds} sn`}</dd></div><div><dt className="text-xs text-gray-500">Sahne</dt><dd>{campaign.sceneCount}</dd></div><div><dt className="text-xs text-gray-500">Altyazı</dt><dd>{campaign.subtitlesEnabled ? 'Açık' : 'Kapalı'}</dd></div><div className="col-span-2"><dt className="text-xs text-gray-500">Görsel stil</dt><dd>{campaign.visualStyle}</dd></div><div><dt className="text-xs text-gray-500">Ses</dt><dd>{campaign.voiceProfile}</dd></div><div><dt className="text-xs text-gray-500">Ses kalitesi</dt><dd>{campaign.voiceQuality === 'high' ? 'Yüksek' : 'Standart'}</dd></div></dl></section>
        </aside>
      </div>
    </div>
  </main></TooltipProvider>;
}

function ArtifactList({ artifacts }: { artifacts: MediaArtifact[] }) {
  if (!artifacts.length) return <div className="flex min-h-48 flex-col items-center justify-center p-5 text-center"><Film className="mb-3 h-7 w-7 text-gray-400" /><p className="!text-sm font-medium">Henüz çıktı oluşmadı</p><p className="!text-xs text-gray-500">Worker ilerledikçe dosyalar burada listelenecek.</p></div>;
  return <div className="divide-y divide-gray-100">{artifacts.map((artifact) => { const Icon = artifactIcon(artifact.kind); const publicUri = /^https?:\/\//.test(artifact.uri); return <div key={artifact.id} className="flex items-center gap-3 px-5 py-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate !text-sm font-medium">{artifact.kind}{artifact.level ? ` · ${artifact.level}` : ''}</p><p className="truncate !text-xs text-gray-500">{publicUri ? artifact.uri : artifact.uri.replace(/^file:\/\//, '')}</p></div><span className="hidden text-xs text-gray-500 sm:block">{readableBytes(artifact.bytes)}</span>{publicUri && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" asChild><a href={artifact.uri} target="_blank" rel="noreferrer" aria-label="Çıktıyı aç"><ExternalLink className="h-4 w-4" /></a></Button></TooltipTrigger><TooltipContent>Çıktıyı aç</TooltipContent></Tooltip>}</div>; })}</div>;
}
