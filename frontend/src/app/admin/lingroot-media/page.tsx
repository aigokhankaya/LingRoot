'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, ChevronRight, CircleAlert, CircleCheck, Copy,
  FilePlus2, Filter, Loader2, MoreHorizontal, Pause, Play, RefreshCw,
  RotateCcw, Search, Settings2, Trash2, WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MediaPlatformIcon, platformLabels } from '@/components/admin/media-platform-icon';
import {
  approveMediaCampaign, cancelMediaCampaign, createMediaCampaign, deleteMediaCampaign,
  duplicateMediaCampaign, generateMediaCampaign, listMediaCampaigns, retryMediaCampaign,
} from '@/services/mediaService';
import type { CefrLevel, MediaCampaign, MediaCampaignInput, MediaPlatform } from '@/types/media';

const platforms: MediaPlatform[] = ['youtube', 'instagram', 'x', 'tiktok'];
const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const activeStatuses = new Set(['queued', 'planning', 'generating_visuals', 'generating_levels', 'rendering', 'qa', 'quality_queued', 'quality_review', 'repairing']);
const statusLabels: Record<string, string> = {
  draft: 'Taslak', queued: 'Kuyrukta', planning: 'Planlanıyor', generating_visuals: 'Görseller',
  generating_levels: 'Seviye paketleri', rendering: 'Render', qa: 'Kalite kontrol',
  quality_queued: 'Agent QA kuyruğunda', quality_review: 'Agent QA', repair_required: 'Düzeltme gerekli',
  repairing: 'Düzeltiliyor', human_review: 'İnsan incelemesi',
  review_ready: 'İncelemeye hazır', approved: 'Onaylandı', scheduled: 'Planlandı',
  published: 'Yayınlandı', failed: 'Başarısız', cancelled: 'İptal edildi',
};

const initialForm: MediaCampaignInput = {
  name: '', topic: '', language: 'tr', objective: 'education', tone: 'educational', cta: '',
  visualStyle: 'editorial documentary', voiceProfile: 'english_female', voiceQuality: 'standard', levels: [...levels],
  sceneCount: 12, targetDurationSeconds: 420, subtitlesEnabled: true,
  humanApprovalRequired: true, targets: [{ platform: 'youtube', format: 'horizontal_video', hashtags: [], config: { privacyStatus: 'private', categoryId: '27', madeForKids: false } }],
};

function statusStyle(status: string) {
  if (status === 'failed') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'review_ready') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (['approved', 'published'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (activeStatuses.has(status)) return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function LingRootMediaPage() {
  const router = useRouter();
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState<MediaCampaignInput>(initialForm);
  const [campaigns, setCampaigns] = useState<MediaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'draft' | 'generate' | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const isLongForm = form.targets.some((target) => target.format === 'horizontal_video');

  const loadCampaigns = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const result = await listMediaCampaigns({ search, status, platform });
      setCampaigns(result.data);
    } catch (error) {
      const statusCode = (error as Error & { status?: number }).status;
      if (statusCode === 401 || statusCode === 403) return router.replace('/admin/login');
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [platform, router, search, status]);

  useEffect(() => { const timer = setTimeout(() => void loadCampaigns(), 250); return () => clearTimeout(timer); }, [loadCampaigns]);
  useEffect(() => {
    if (!campaigns.some((campaign) => activeStatuses.has(campaign.status))) return;
    const timer = setInterval(() => void loadCampaigns(true), 8000);
    return () => clearInterval(timer);
  }, [campaigns, loadCampaigns]);

  const metrics = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter((item) => activeStatuses.has(item.status)).length,
    review: campaigns.filter((item) => item.status === 'review_ready').length,
    failed: campaigns.filter((item) => item.status === 'failed').length,
  }), [campaigns]);

  const togglePlatform = (selected: MediaPlatform) => {
    const exists = form.targets.some((target) => target.platform === selected);
    if (!exists && isLongForm && selected !== 'youtube') {
      setMessage({ type: 'error', text: 'Yatay YouTube videosu için ayrı bir kampanya kullanın.' });
      return;
    }
    setForm({ ...form, targets: exists
      ? form.targets.filter((target) => target.platform !== selected)
      : [...form.targets, { platform: selected, format: 'vertical_video', hashtags: [] }],
    });
  };

  const toggleLevel = (selected: CefrLevel) => setForm({
    ...form,
    levels: form.levels.includes(selected) ? form.levels.filter((level) => level !== selected) : [...form.levels, selected],
  });

  const updateTarget = (selected: MediaPlatform, field: string, value: string) => setForm({
    ...form,
    targets: form.targets.map((target) => target.platform === selected
      ? { ...target, [field]: field === 'hashtags' ? value.split(/[ ,]+/).filter(Boolean).map((tag) => tag.replace(/^#/, '')) : value || null }
      : target),
  });

  const updateYoutubeConfig = (field: string, value: string | boolean) => setForm({
    ...form,
    targets: form.targets.map((target) => target.platform === 'youtube'
      ? { ...target, config: { ...(target.config || {}), [field]: value } }
      : target),
  });

  const updateTargetFormat = (selected: MediaPlatform, format: 'vertical_video' | 'horizontal_video') => {
    const longForm = format === 'horizontal_video';
    setForm({
      ...form,
      targets: form.targets
        .map((target) => target.platform === selected ? { ...target, format } : target)
        .filter((target) => !longForm || target.platform === 'youtube'),
      targetDurationSeconds: longForm ? 420 : 60,
      sceneCount: longForm ? 12 : 4,
      voiceProfile: longForm ? 'openai_marin' : form.voiceProfile,
      voiceQuality: longForm ? 'high' : 'standard',
    });
  };

  const submit = async (event: FormEvent, generate: boolean) => {
    event.preventDefault();
    setMessage(null);
    if (!form.targets.length || !form.levels.length) {
      return setMessage({ type: 'error', text: 'En az bir platform ve bir CEFR seviyesi seçin.' });
    }
    setSubmitting(generate ? 'generate' : 'draft');
    try {
      const created = await createMediaCampaign(form);
      if (generate) await generateMediaCampaign(created.id);
      setForm(initialForm);
      setMessage({ type: 'success', text: generate ? 'Kampanya üretim kuyruğuna eklendi.' : 'Taslak kaydedildi.' });
      setTab('jobs');
      await loadCampaigns();
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally { setSubmitting(null); }
  };

  const runAction = async (id: string, action: () => Promise<unknown>, success: string) => {
    setActionId(id); setMessage(null);
    try { await action(); setMessage({ type: 'success', text: success }); await loadCampaigns(true); }
    catch (error) { setMessage({ type: 'error', text: (error as Error).message }); }
    finally { setActionId(null); }
  };

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-[#f6f8f9] text-gray-950">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push('/admin/dashboard')} aria-label="Admin paneline dön"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="min-w-0"><h1 className="!text-xl !leading-tight sm:!text-2xl">LingRoot Media</h1><p className="truncate !text-sm text-gray-500">Sosyal içerik üretimi ve yayın operasyonları</p></div>
            </div>
            <Button variant="outline" size="icon" onClick={() => void loadCampaigns()} aria-label="Yenile"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6 grid grid-cols-2 border-y border-gray-200 bg-white md:grid-cols-4">
            {[['Toplam iş', metrics.total], ['Aktif üretim', metrics.active], ['İnceleme', metrics.review], ['Hata', metrics.failed]].map(([label, value], index) => (
              <div key={String(label)} className={`px-4 py-4 sm:px-6 ${index ? 'border-l border-gray-200' : ''}`}><p className="!text-xs font-medium uppercase text-gray-500">{label}</p><p className="mt-1 !text-2xl font-semibold">{value}</p></div>
            ))}
          </section>

          {message && <div role="alert" className={`mb-5 flex items-center gap-2 border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.type === 'error' ? <CircleAlert className="h-4 w-4 shrink-0" /> : <CircleCheck className="h-4 w-4 shrink-0" />}{message.text}</div>}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-11 w-full justify-start rounded-md border border-gray-200 bg-white p-1 sm:w-auto">
              <TabsTrigger value="create" className="h-9 flex-1 rounded-sm px-4 data-[state=active]:bg-gray-900 data-[state=active]:text-white sm:flex-none"><FilePlus2 className="mr-2 h-4 w-4" />Yeni içerik</TabsTrigger>
              <TabsTrigger value="jobs" className="h-9 flex-1 rounded-sm px-4 data-[state=active]:bg-gray-900 data-[state=active]:text-white sm:flex-none"><Settings2 className="mr-2 h-4 w-4" />İçerik işleri</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-5">
              <form onSubmit={(event) => void submit(event, false)}>
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,.75fr)]">
                  <section className="rounded-md border border-gray-200 bg-white p-5 sm:p-6">
                    <div className="mb-5"><h2 className="!text-lg">İçerik brief'i</h2><p className="!text-sm text-gray-500">Üretilecek altı seviyeli medya paketinin ana girdileri.</p></div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="name">Kampanya adı</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="İstanbul'un yedi tepesi" /></div>
                      <div className="space-y-2"><Label htmlFor="language">İçerik dili</Label><Select id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}><option value="tr">Türkçe brief / İngilizce öğrenme</option><option value="en">İngilizce</option></Select></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="topic">Konu</Label><Textarea id="topic" required rows={4} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="İstanbul'un yedi tepesi nelerdir ve neden önemlidir?" /></div>
                      <div className="space-y-2"><Label htmlFor="objective">Amaç</Label><Select id="objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value as MediaCampaignInput['objective'] })}><option value="education">Eğitim</option><option value="discovery">Keşif</option><option value="engagement">Etkileşim</option><option value="announcement">Duyuru</option></Select></div>
                      <div className="space-y-2"><Label htmlFor="tone">Ton</Label><Select id="tone" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value as MediaCampaignInput['tone'] })}><option value="educational">Öğretici</option><option value="warm">Samimi</option><option value="professional">Profesyonel</option><option value="energetic">Enerjik</option></Select></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="cta">Eylem çağrısı</Label><Input id="cta" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Yeni kelimeleri LingRoot'ta çalış" /></div>
                    </div>

                    <div className="mt-7 border-t border-gray-200 pt-6"><Label>CEFR seviyeleri</Label><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{levels.map((level) => <button key={level} type="button" onClick={() => toggleLevel(level)} className={`h-10 rounded-md border text-sm font-semibold ${form.levels.includes(level) ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 bg-white text-gray-600'}`}>{level}</button>)}</div></div>

                    <div className="mt-7 border-t border-gray-200 pt-6"><div className="mb-3"><Label>Paylaşım platformları</Label><p className="!text-xs text-gray-500">YouTube uzun video üretimi için format ve yayın metadata'sını belirleyin. Yayın öncesi kalite kontrolü ve admin onayı zorunludur.</p></div><div className="grid items-start gap-3 sm:grid-cols-2">{platforms.map((item) => {
                      const target = form.targets.find((entry) => entry.platform === item);
                      return <div key={item} className={`rounded-md border p-4 ${target ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                        <button type="button" onClick={() => togglePlatform(item)} className="flex w-full items-center justify-between gap-3 text-left"><span className="flex items-center gap-2 font-medium"><MediaPlatformIcon platform={item} />{platformLabels[item]}</span><Checkbox checked={Boolean(target)} readOnly tabIndex={-1} aria-label={`${platformLabels[item]} seç`} /></button>
                        {target && <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">{item === 'youtube' && <Select aria-label="YouTube video formatı" value={target.format} onChange={(e) => updateTargetFormat(item, e.target.value as 'vertical_video' | 'horizontal_video')}><option value="vertical_video">Dikey kısa video</option><option value="horizontal_video">Yatay 5-10 dakika</option></Select>}<Input aria-label={`${platformLabels[item]} başlığı`} value={target.title || ''} onChange={(e) => updateTarget(item, 'title', e.target.value)} placeholder="Platform başlığı (opsiyonel)" /><Textarea aria-label={`${platformLabels[item]} açıklaması`} rows={2} value={target.caption || ''} onChange={(e) => updateTarget(item, 'caption', e.target.value)} placeholder="Açıklama (opsiyonel)" /><Input aria-label={`${platformLabels[item]} etiketleri`} value={(target.hashtags || []).join(' ')} onChange={(e) => updateTarget(item, 'hashtags', e.target.value)} placeholder="#english #learn" /><Input aria-label={`${platformLabels[item]} zamanlaması`} type="datetime-local" value={target.scheduledAt?.slice(0, 16) || ''} onChange={(e) => updateTarget(item, 'scheduledAt', e.target.value)} /></div>}
                      </div>;
                    })}</div></div>
                  </section>

                  <section className="rounded-md border border-gray-200 bg-white p-5 sm:p-6 xl:sticky xl:top-5">
                    <h2 className="!text-lg">Üretim ayarları</h2><p className="!text-sm text-gray-500">Worker ve render paketine gönderilecek teknik seçimler.</p>
                    <div className="mt-5 space-y-5">
                      <div className="space-y-2"><Label htmlFor="style">Görsel stil</Label><Select id="style" value={form.visualStyle} onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}><option value="editorial documentary">Editoryal belgesel</option><option value="clean educational">Temiz eğitsel</option><option value="cinematic travel">Sinematik gezi</option><option value="bold social">Güçlü sosyal</option></Select></div>
                      <div className="space-y-2"><Label htmlFor="voice">Ses profili</Label><Select id="voice" value={form.voiceProfile} onChange={(e) => setForm({ ...form, voiceProfile: e.target.value })}><option value="english_female">İngilizce kadın</option><option value="english_male">İngilizce erkek</option><option value="openai_marin">Doğal anlatıcı - Marin</option><option value="openai_cedar">Doğal anlatıcı - Cedar</option></Select></div>
                      <div className="space-y-2"><Label htmlFor="voiceQuality">Ses kalitesi</Label><Select id="voiceQuality" value={form.voiceQuality} onChange={(e) => setForm({ ...form, voiceQuality: e.target.value as MediaCampaignInput['voiceQuality'] })}><option value="standard">Standart · 24 kHz / 128 kbps</option><option value="high">Yüksek · 48 kHz / 192 kbps + mastering</option></Select><p className="!text-xs text-gray-500">YouTube uzun videoları için yüksek kalite önerilir.</p></div>
                      <div><Label>Hedef süre</Label><div className="mt-2 grid grid-cols-3 gap-2">{(isLongForm ? [300, 360, 420, 480, 540, 600] : [30, 45, 60]).map((seconds) => <button type="button" key={seconds} onClick={() => setForm({ ...form, targetDurationSeconds: seconds })} className={`h-10 rounded-md border text-sm font-medium ${form.targetDurationSeconds === seconds ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200'}`}>{isLongForm ? `${seconds / 60} dk` : `${seconds} sn`}</button>)}</div>{isLongForm && <p className="mt-2 !text-xs text-gray-500">İlk YouTube seti için 7 dakika varsayılan seçilmiştir.</p>}</div>
                      <div className="space-y-2"><Label htmlFor="scenes">Sahne sayısı</Label><Input id="scenes" type="number" min={3} max={12} value={form.sceneCount} onChange={(e) => setForm({ ...form, sceneCount: Number(e.target.value) })} /></div>
                      <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-5"><div><Label htmlFor="subtitles">Altyazı</Label><p className="!text-xs text-gray-500">Videoya zamanlı altyazı ekle</p></div><Switch className="checked:bg-teal-600" id="subtitles" checked={form.subtitlesEnabled} onChange={(event) => setForm({ ...form, subtitlesEnabled: event.target.checked })} /></div>
                      <div className="flex items-center justify-between gap-4"><div><Label htmlFor="approval">İnsan onayı</Label><p className="!text-xs text-gray-500">Yayın öncesi review zorunlu</p></div><Switch className="checked:bg-teal-600" id="approval" checked={form.humanApprovalRequired} onChange={(event) => setForm({ ...form, humanApprovalRequired: event.target.checked })} /></div>
                    </div>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Button type="submit" variant="outline" disabled={Boolean(submitting)}>{submitting === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Taslak kaydet</Button><Button type="button" disabled={Boolean(submitting)} onClick={(event) => void submit(event as unknown as FormEvent, true)}>{submitting === 'generate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}Kaydet ve üret</Button></div>
                  </section>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="jobs" className="mt-5">
              <section className="rounded-md border border-gray-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
                  <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kampanya veya konu ara" /></div>
                  <div className="grid grid-cols-2 gap-2 md:flex"><Select aria-label="Durum filtresi" value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-48"><option value="all">Tüm durumlar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Select aria-label="Platform filtresi" value={platform} onChange={(e) => setPlatform(e.target.value)} className="md:w-40"><option value="all">Tüm platformlar</option>{platforms.map((item) => <option key={item} value={item}>{platformLabels[item]}</option>)}</Select></div>
                </div>
                {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> : campaigns.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><Filter className="mb-3 h-7 w-7 text-gray-400" /><h3 className="!text-base">İçerik işi bulunamadı</h3><p className="!text-sm text-gray-500">Filtreleri temizleyin veya yeni bir kampanya oluşturun.</p></div> : <div className="overflow-x-auto"><table className="min-w-[980px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3 font-medium">İçerik</th><th className="px-4 py-3 font-medium">Platform</th><th className="px-4 py-3 font-medium">Durum</th><th className="px-4 py-3 font-medium">İlerleme</th><th className="px-4 py-3 font-medium">Güncelleme</th><th className="px-5 py-3 text-right font-medium">İşlemler</th></tr></thead><tbody className="divide-y divide-gray-100">{campaigns.map((campaign) => <tr key={campaign.id} className="hover:bg-gray-50/70"><td className="max-w-[330px] px-5 py-4"><button className="block max-w-full text-left" onClick={() => router.push(`/admin/lingroot-media/${campaign.id}`)}><span className="block truncate font-medium text-gray-950">{campaign.name}</span><span className="block truncate text-xs text-gray-500">{campaign.topic}</span></button></td><td className="px-4 py-4"><div className="flex gap-1.5">{campaign.targets.map((target) => <Tooltip key={target.id}><TooltipTrigger asChild><span className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white"><MediaPlatformIcon platform={target.platform} /></span></TooltipTrigger><TooltipContent>{platformLabels[target.platform]}</TooltipContent></Tooltip>)}</div></td><td className="px-4 py-4"><span className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${statusStyle(campaign.status)}`}>{statusLabels[campaign.status] || campaign.status}</span></td><td className="px-4 py-4"><div className="w-36"><div className="mb-1 flex justify-between text-xs"><span className="truncate text-gray-500">{campaign.currentStage || '-'}</span><span>{campaign.progress}%</span></div><div className="h-1.5 overflow-hidden rounded bg-gray-200"><div className="h-full bg-teal-600 transition-all" style={{ width: `${campaign.progress}%` }} /></div></div></td><td className="px-4 py-4 text-xs text-gray-500">{formatDate(campaign.updatedAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1">{campaign.status === 'draft' && <IconAction label="Üretimi başlat" icon={Play} disabled={actionId === campaign.id} onClick={() => void runAction(campaign.id, () => generateMediaCampaign(campaign.id), 'Üretim kuyruğa eklendi.')} />}{campaign.status === 'failed' && <IconAction label="Yeniden dene" icon={RotateCcw} disabled={actionId === campaign.id} onClick={() => void runAction(campaign.id, () => retryMediaCampaign(campaign.id), 'İş yeniden kuyruğa alındı.')} />}{activeStatuses.has(campaign.status) && <IconAction label="İptal et" icon={Pause} disabled={actionId === campaign.id} onClick={() => void runAction(campaign.id, () => cancelMediaCampaign(campaign.id), 'İş iptal edildi.')} />}{campaign.status === 'review_ready' && <IconAction label="Onayla" icon={Check} disabled={actionId === campaign.id} onClick={() => void runAction(campaign.id, () => approveMediaCampaign(campaign.id), 'İçerik onaylandı.')} />}<IconAction label="Çoğalt" icon={Copy} disabled={actionId === campaign.id} onClick={() => void runAction(campaign.id, () => duplicateMediaCampaign(campaign.id), 'Kampanya taslak olarak çoğaltıldı.')} />{['draft', 'failed', 'cancelled'].includes(campaign.status) && <IconAction label="Sil" icon={Trash2} destructive disabled={actionId === campaign.id} onClick={() => { if (window.confirm('Bu kampanya kalıcı olarak silinsin mi?')) void runAction(campaign.id, () => deleteMediaCampaign(campaign.id), 'Kampanya silindi.'); }} />}<IconAction label="Ayrıntıyı aç" icon={ChevronRight} onClick={() => router.push(`/admin/lingroot-media/${campaign.id}`)} /></div></td></tr>)}</tbody></table></div>}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </TooltipProvider>
  );
}

function IconAction({ label, icon: Icon, onClick, disabled, destructive = false }: { label: string; icon: typeof MoreHorizontal; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={onClick} aria-label={label} className={destructive ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : ''}>{disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
