// Export der gestellten Fragen als CSV (für Excel):
//   https://<deine-seite>.netlify.app/api/fragen?token=<ADMIN_TOKEN>            → alle
//   https://<deine-seite>.netlify.app/api/fragen?token=<ADMIN_TOKEN>&monat=2027-01
import { getStore } from '@netlify/blobs';

const COLS = ['zeit', 'sprache', 'frage', 'antwort', 'feedback', 'kommentar', 'quellen', 'ohne_quelle', 'seite', 'ms'];
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default async (req) => {
  const url = new URL(req.url);
  const token = process.env.ADMIN_TOKEN;
  if (!token || url.searchParams.get('token') !== token) return new Response('Nicht berechtigt', { status: 401 });

  const store = getStore('fragen');
  const monat = url.searchParams.get('monat');
  const { blobs } = await store.list(monat ? { prefix: `${monat}/` } : {});
  const rows = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
  rows.sort((a, b) => (a.zeit < b.zeit ? 1 : -1));

  const csv = '﻿' + [COLS.join(';'), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(';'))].join('\r\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="tarif-chat-fragen${monat ? '-' + monat : ''}.csv"`,
    },
  });
};

export const config = { path: '/api/fragen' };
