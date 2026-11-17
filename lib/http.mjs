// Gemeinsame Hilfen für die Netlify-Funktionen: erlaubte Domains (CORS) und JSON-Antworten.

const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://www.prophysioverband.ch,https://prophysioverband.ch,https://prophysio.odoo.com')
  .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);

export function cors(req) {
  const origin = req.headers.get('origin') || '';
  const ok = ALLOWED.includes('*') || ALLOWED.includes(origin) || origin.endsWith('.netlify.app') || origin.startsWith('http://localhost');
  if (origin && !ok) console.warn('Domain nicht erlaubt (in ALLOWED_ORIGINS ergänzen):', origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  };
}

export const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
