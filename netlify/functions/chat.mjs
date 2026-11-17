// POST /api/chat  { question: "...", history: [{role, content}], page: "/tarif" }
// Antwortet als Stream (eine JSON-Zeile pro Ereignis), damit der Text Wort für Wort erscheint.
import { getStore } from '@netlify/blobs';
import { createHash, randomUUID } from 'node:crypto';
import index from '../../data/index.json' with { type: 'json' };
import { createChat } from '../../lib/chat-core.mjs';
import { cors, json } from '../../lib/http.mjs';

const env = (k, d) => process.env[k] ?? d;

const answer = createChat(index, {
  apiKey: env('ANTHROPIC_API_KEY'),
  model: env('MODEL', 'claude-haiku-5-5'),
  rewriteModel: env('REWRITE_MODEL', 'claude-haiku-5-5'),
  contact: env('CONTACT_EMAIL', ''),
});

export default async (req, context) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'json' }, 400, h); }
  const question = String(body.question || '').trim().slice(0, 800);
  if (question.length < 3) return json({ error: 'empty' }, 400, h);

  // Missbrauchsschutz: Anfragen pro Person (anonymisiert) und total pro Tag
  try {
    const day = new Date().toISOString().slice(0, 10);
    const limits = getStore('ratelimit');
    const who = createHash('sha256').update(`${context.ip}|${day}|${env('ADMIN_TOKEN', 'salt')}`).digest('hex').slice(0, 24);
    const [mine, total] = await Promise.all([
      limits.get(`${day}/${who}`, { type: 'json' }),
      limits.get(`${day}/__total`, { type: 'json' }),
    ]);
    if ((mine || 0) >= Number(env('DAILY_LIMIT_PER_USER', 40))) return json({ error: 'limit_user' }, 429, h);
    if ((total || 0) >= Number(env('DAILY_LIMIT_TOTAL', 1500))) return json({ error: 'limit_total' }, 429, h);
    await Promise.all([
      limits.setJSON(`${day}/${who}`, (mine || 0) + 1),
      limits.setJSON(`${day}/__total`, (total || 0) + 1),
    ]);
  } catch (e) {
    console.warn('Rate-Limit nicht prüfbar:', e.message);
  }

  const now = new Date().toISOString();
  const id = `${now.slice(0, 7)}/${now}-${randomUUID().slice(0, 8)}`;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'));
      const t0 = Date.now();
      send({ type: 'start', id });
      try {
        const result = await answer({ question, history: Array.isArray(body.history) ? body.history : [] }, send);
        send({ type: 'done', id, noSource: result.noSource, uncited: result.uncited });
        // Frage anonym protokollieren (ohne IP, ohne Namen) – Grundlage für neue FAQ-Einträge
        try {
          await getStore('fragen').setJSON(id, {
            zeit: now,
            sprache: result.lang,
            frage: question,
            antwort: result.segments.map((s) => s.text).join('').trim().slice(0, 3000),
            quellen: result.sources.map((s) => `${s.doc}${s.page ? ' S.' + s.page : ''}`).join('; '),
            ohne_quelle: result.noSource || result.uncited,
            seite: String(body.page || '').slice(0, 300),
            ms: Date.now() - t0,
          });
        } catch (e) { console.warn('Log fehlgeschlagen', e.message); }
      } catch (e) {
        console.error(e);
        send({ type: 'error', error: 'server' });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...h, 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' },
  });
};

export const config = { path: '/api/chat' };
