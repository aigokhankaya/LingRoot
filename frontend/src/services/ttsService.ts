export async function getTtsAudio(input: string, level: string): Promise<string> {
  const res = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, level, type: 'text' })
  });
  if (!res.ok) throw new Error('Ses oluşturulamadı.');
  const data = await res.json();
  return data.audioUrl as string;
} 