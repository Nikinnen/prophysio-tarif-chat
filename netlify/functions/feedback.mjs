// POST /api/feedback  { id, wert: "gut" | "schlecht", kommentar?: "..." }
// Speichert die Bewertung direkt beim protokollierten Eintrag der Frage.
import { getStore } from '@netlify/blobs';
import { cors, json } from '../../lib/http.mjs';

export default async (req) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'json' }, 400, h); }
  const id = String(b.id || '');
  const wert = b.wert === 'gut' || b.wert === 'schlecht' ? b.wert : null;
  if (!/^\d{4}-\d{2}\/[\w:.\-]+$/.test(id) || !wert) return json({ error: 'invalid' }, 400, h);

  const store = getStore('fragen');
  // Der Eintrag wird am Ende der Antwort gespeichert – kurz warten, falls das Feedback sehr schnell kommt
  let entry = await store.get(id, { type: 'json' });
  for (let i = 0; !entry && i < 3; i++) {
    await new Promise((r) => setTimeout(r, 700));
    entry = await store.get(id, { type: 'json' });
  }
  if (!entry) return json({ error: 'unknown' }, 404, h);

  entry.feedback = wert;
  if (typeof b.kommentar === 'string' && b.kommentar.trim()) entry.kommentar = b.kommentar.trim().slice(0, 500);
  await store.setJSON(id, entry);
  return json({ ok: true }, 200, h);
};

export const config = { path: '/api/feedback' };
