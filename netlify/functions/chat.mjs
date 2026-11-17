// POST /api/chat  { question: "...", history: [{role, content}] }
import { getStore } from '@netlify/blobs';
import { createHash, randomUUID } from 'node:crypto';
import index from '../../data/index.json' with { type: 'json' };
import { createChat } from '../../lib/chat-core.mjs';

const env = (k, d) => process.env[k] ?? d;

const answer = createChat(index, {
  apiKey: env('ANTHROPIC_API_KEY'),
  model: env('MODEL', 'claude-haiku-5-5'),
  rewriteModel: env('REWRITE_MODEL', 'claude-haiku-5-5'),
  contact: env('CONTACT_EMAIL', ''),
});

const ALLOWED = env('ALLOWED_ORIGINS', 'https://www.prophysioverband.ch,https://prophysioverband.ch,https://prophysio.odoo.com')
  .split(',').map((s) => s.trim()).filter(Boolean);

function cors(req) {
  const origin = req.headers.get('origin') || '';
  const ok = ALLOWED.includes('*') || ALLOWED.includes(origin) || origin.endsWith('.netlify.app') || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  };
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

export default async (req, context) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'json' }, 400, h); }
  const question = String(body.question || '').trim().slice(0, 800);
  if (question.length < 3) return json({ error: 'empty' }, 400, h);

  // Missbrauchsschutz: Anfragen pro Person (anonymisiert) und total pro Tag
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

  try {
    const t0 = Date.now();
    const result = await answer({ question, history: Array.isArray(body.history) ? body.history : [] });
    // Frage anonym protokollieren (ohne IP, ohne Namen) – Grundlage für neue FAQ-Einträge
    const answerText = result.segments.map((s) => s.text).join('').trim();
    try {
      await getStore('fragen').setJSON(`${new Date().toISOString().slice(0, 7)}/${new Date().toISOString()}-${randomUUID().slice(0, 8)}`, {
        zeit: new Date().toISOString(),
        sprache: result.lang,
        frage: question,
        antwort: answerText.slice(0, 3000),
        quellen: result.sources.map((s) => `${s.doc}${s.page ? ' S.' + s.page : ''}`).join('; '),
        ohne_quelle: result.noSource,
        seite: String(body.page || '').slice(0, 300),
        ms: Date.now() - t0,
      });
    } catch (e) { console.warn('Log fehlgeschlagen', e.message); }
    delete result.usage;
    return json(result, 200, h);
  } catch (e) {
    console.error(e);
    return json({ error: 'server' }, 500, h);
  }
};

export const config = { path: '/api/chat' };
