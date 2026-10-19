'use client';

import {
  Bot, Check, CircleAlert, Eye, Loader2, RefreshCw, ThumbsDown,
  ThumbsUp, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MediaQualityFinding, MediaQualityRun } from '@/types/media';

const agentLabels: Record<string, string> = {
  content: 'İçerik', visual: 'Görsel', av_sync: 'Ses ve senkron', platform: 'Platform', supervisor: 'Supervisor',
};
const dimensionLabels: Record<string, string> = {
  content: 'İçerik', cefr: 'CEFR', visual: 'Görsel', av_sync: 'Senkron', platform: 'Platform',
};
const recommendationLabels: Record<string, string> = {
  accept: 'Uygun', human_review: 'İnsan incelemesi', repair_required: 'Düzeltme öneriliyor', blocked: 'Bloklandı',
};

function severityStyle(severity: MediaQualityFinding['severity']) {
  if (severity === 'critical') return 'border-red-300 bg-red-50 text-red-800';
  if (severity === 'high') return 'border-orange-300 bg-orange-50 text-orange-800';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-gray-200 bg-gray-50 text-gray-700';
}

export function MediaAgentQuality({
  run,
  hasArtifacts,
  acting,
  onRerun,
  onFeedback,
}: {
  run?: MediaQualityRun | null;
  hasArtifacts: boolean;
  acting: boolean;
  onRerun: () => void;
  onFeedback: (input: { findingId?: string; decision: 'agree' | 'disagree' | 'override_accept' | 'request_repair' }) => void;
}) {
  const active = run && ['queued', 'processing'].includes(run.status);
  return <section className="rounded-md border border-gray-200 bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
      <div><div className="flex items-center gap-2"><Bot className="h-5 w-5 text-teal-700" /><h2 className="!text-lg">Agent QA</h2>{run && <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{run.mode === 'shadow' ? 'Shadow mode' : 'Enforced'}</span>}</div><p className="mt-1 !text-sm text-gray-500">İçerik, görsel, ses ve platform değerlendirmesi. Yayın yetkisi yoktur.</p></div>
      <Button size="sm" variant="outline" disabled={acting || active || !hasArtifacts} onClick={onRerun}>{acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{run ? 'Yeniden değerlendir' : 'Değerlendirmeyi başlat'}</Button>
    </div>
    {!run ? <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center"><Eye className="mb-2 h-6 w-6 text-gray-400" /><p className="!text-sm font-medium">Henüz agent değerlendirmesi yok</p><p className="!text-xs text-gray-500">Üretim artifact’ları hazır olduğunda shadow inceleme başlatılabilir.</p></div>
      : active ? <div className="p-5"><div className="mb-2 flex justify-between text-sm"><span>{run.stage}</span><strong>{run.progress}%</strong></div><div className="h-2 overflow-hidden rounded bg-gray-200"><div className="h-full bg-teal-600" style={{ width: `${run.progress}%` }} /></div><p className="mt-3 !text-xs text-gray-500">Deneme {run.attempt}/{run.maxAttempts} · {run.workerId || 'Quality worker bekleniyor'}</p></div>
        : run.status === 'failed' ? <div className="flex gap-3 p-5 text-sm text-red-700"><CircleAlert className="h-5 w-5 shrink-0" /><div><strong>Agent QA tamamlanamadı</strong><p className="!text-sm">{run.errorMessage || 'Bilinmeyen kalite worker hatası.'}</p></div></div>
          : <QualityResult run={run} acting={acting} onFeedback={onFeedback} />}
  </section>;
}

function QualityResult({ run, acting, onFeedback }: { run: MediaQualityRun; acting: boolean; onFeedback: (input: { findingId?: string; decision: 'agree' | 'disagree' | 'override_accept' | 'request_repair' }) => void }) {
  const findings = run.findings || [];
  return <div>
    <div className="grid border-b border-gray-200 md:grid-cols-[220px_1fr]">
      <div className="flex items-center gap-4 border-b border-gray-200 p-5 md:border-b-0 md:border-r"><span className="!text-4xl font-semibold tabular-nums">{Math.round(run.overallScore || 0)}</span><div><p className="!text-sm font-medium">Genel skor</p><p className="!text-xs text-gray-500">{recommendationLabels[run.recommendation || ''] || run.recommendation}</p></div></div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 sm:grid-cols-5">{Object.entries(run.dimensionScores || {}).map(([key, value]) => <div key={key}><div className="mb-1 flex justify-between text-xs"><span>{dimensionLabels[key] || key}</span><strong>{Math.round(value)}</strong></div><div className="h-1.5 overflow-hidden rounded bg-gray-200"><div className="h-full bg-teal-600" style={{ width: `${value}%` }} /></div></div>)}</div>
    </div>
    <div className="border-b border-gray-200 px-5 py-4"><h3 className="!text-sm">Uzman değerlendirmeleri</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{(run.assessments || []).map((assessment) => <div key={assessment.id} className="border-l-2 border-teal-500 pl-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{agentLabels[assessment.agentType]}</span><strong className="text-sm">{Math.round(assessment.score)}</strong></div><p className="mt-1 !text-xs text-gray-600">{assessment.summary}</p><p className="mt-1 !text-[11px] text-gray-400">{assessment.provider} · {assessment.model} · {assessment.promptVersion}</p></div>)}</div></div>
    <div className="px-5 py-4"><div className="mb-3 flex items-center justify-between"><h3 className="!text-sm">Bulgular ({findings.length})</h3>{run.recommendation !== 'accept' && <Button size="sm" variant="outline" disabled={acting} onClick={() => onFeedback({ decision: 'override_accept' })}><Check className="mr-2 h-4 w-4" />İnsan review’a geçir</Button>}</div>{findings.length === 0 ? <p className="!text-sm text-gray-500">Açık kalite bulgusu yok.</p> : <div className="divide-y divide-gray-100">{findings.map((finding) => <div key={finding.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-0.5 text-xs font-medium ${severityStyle(finding.severity)}`}>{finding.severity}</span><span className="text-sm font-medium">{finding.category}</span>{finding.level && <span className="text-xs text-gray-500">{finding.level}</span>}{finding.sceneId && <span className="text-xs text-gray-500">{finding.sceneId}</span>}<span className="ml-auto text-xs text-gray-400">{agentLabels[finding.agentType]}</span></div><p className="mt-2 !text-sm text-gray-700">{finding.evidence}</p><p className="mt-1 !text-xs text-teal-700">Öneri: {finding.suggestedAction}</p><div className="mt-2 flex gap-1"><QualityAction label="Katılıyorum" icon={ThumbsUp} disabled={acting || finding.status !== 'open'} onClick={() => onFeedback({ findingId: finding.id, decision: 'agree' })} /><QualityAction label="Katılmıyorum" icon={ThumbsDown} disabled={acting || finding.status !== 'open'} onClick={() => onFeedback({ findingId: finding.id, decision: 'disagree' })} /><QualityAction label="Düzeltme iste" icon={Wrench} disabled={acting || finding.status !== 'open'} onClick={() => onFeedback({ findingId: finding.id, decision: 'request_repair' })} /></div></div>)}</div>}</div>
  </div>;
}

function QualityAction({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof Check; onClick: () => void; disabled: boolean }) {
  return <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label={label} disabled={disabled} onClick={onClick}><Icon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
