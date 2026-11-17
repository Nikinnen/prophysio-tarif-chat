// Baut das Such-Archiv: liest alle PDFs in archiv/<sprache>/ und alle Seiten aus archiv/seiten.txt
// und schreibt data/index.json. Kopiert die PDFs nach public/archiv/, damit Links (#page=N) funktionieren.
//
// Aufruf: node scripts/build-index.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIV = path.join(ROOT, 'archiv');
const PUBLIC_ARCHIV = path.join(ROOT, 'public', 'archiv');
const OUT = path.join(ROOT, 'data', 'index.json');
const LANGS = ['de', 'fr', 'it'];
const MAX_CHUNK = 1400;

// Öffentliche Basis-URL dieser Netlify-Seite (Netlify setzt URL automatisch beim Build).
const SITE_URL = (process.env.PUBLIC_BASE_URL || process.env.URL || 'http://localhost:8888').replace(/\/$/, '');

// ---------- Hilfsfunktionen ----------

const clean = (s) => s.replace(/­/g, '').replace(/[ \t ]+/g, ' ').trim();

function isHeading(line) {
  const l = line.trim();
  if (l.length < 4 || l.length > 110) return false;
  if (/\.{5,}/.test(l)) return false; // Inhaltsverzeichnis-Zeile
  if (/^(\d+\.)+\d*\s+\p{L}/u.test(l) || /^\d+\.\s+\p{L}/u.test(l)) return true; // 4.1 Kapitel …
  if (/^(Beispiel|Exemple|Esempio)\s+\d+/i.test(l)) return true;
  if (/^(Kapitel|Chapitre|Capitolo)\s+\d+/i.test(l)) return true;
  return false;
}

// Text in Abschnitte ≤ MAX_CHUNK zerlegen, an Zeilengrenzen, bevorzugt vor Überschriften.
function chunkLines(lines, startHeading) {
  const chunks = [];
  let cur = [];
  let len = 0;
  let heading = startHeading;
  let chunkHeading = startHeading;
  const flush = () => {
    const text = cur.join('\n').trim();
    if (text.length > 30) chunks.push({ heading: chunkHeading, text });
    cur = [];
    len = 0;
    chunkHeading = heading;
  };
  for (const line of lines) {
    if (isHeading(line)) {
      if (len > 350) flush();
      heading = line.trim();
      if (cur.length === 0) chunkHeading = heading;
    }
    if (len + line.length > MAX_CHUNK && len > 0) flush();
    cur.push(line);
    len += line.length + 1;
  }
  flush();
  return { chunks, lastHeading: heading };
}

// ---------- PDF ----------

async function pdfPages(file) {
  const data = new Uint8Array(await fs.readFile(file));
  const doc = await getDocument({ data, verbosity: 0, isEvalSupported: false }).promise;
  let meta = {};
  try { meta = (await doc.getMetadata()).info || {}; } catch {}
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    // Zeilen über die y-Position rekonstruieren (gibt bei Tabellen Zeilen statt Spaltensalat)
    const rows = new Map();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: it.transform[4], w: it.width || 0, s: it.str });
    }
    // Teilstücke nur dann mit Leerzeichen verbinden, wenn im PDF wirklich ein Abstand ist
    const joinRow = (items) => {
      items.sort((a, b) => a.x - b.x);
      let out = '';
      let end = null;
      for (const i of items) {
        const gap = end === null ? 0 : i.x - end;
        if (end !== null && (gap > 0.6 || (/\d$/.test(out) && /^\p{L}/u.test(i.s) && gap > -0.5)) && !out.endsWith(' ') && !i.s.startsWith(' ')) out += gap > 25 ? '  ' : ' ';
        out += i.s;
        end = i.x + i.w;
      }
      return out;
    };
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => clean(joinRow(items)))
      .filter((l) => l && !/^\d+\s*\/\s*\d+$/.test(l) && !/\.{5,}/.test(l)); // Seitenzahlen «2/4» und Inhaltsverzeichnis weg
    pages.push(lines);
  }
  return { pages, title: meta.Title };
}

function prettyTitle(file) {
  return path.basename(file, '.pdf').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// archiv/titel.txt:  datei.pdf | Titel | optional: externer Link statt Kopie
async function readTitles() {
  const map = {};
  try {
    const txt = await fs.readFile(path.join(ARCHIV, 'titel.txt'), 'utf8');
    for (const raw of txt.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [file, title, link] = line.split('|').map((s) => s && s.trim());
      if (file) map[file] = { title: title || null, link: link || null };
    }
  } catch {}
  return map;
}

async function indexPdfs(titles) {
  const chunks = [];
  const docs = [];
  for (const lang of LANGS) {
    const dir = path.join(ARCHIV, lang);
    let files = [];
    try { files = (await fs.readdir(dir)).filter((f) => f.toLowerCase().endsWith('.pdf')); } catch { continue; }
    for (const f of files.sort()) {
      const full = path.join(dir, f);
      const t = titles[f] || {};
      const title = t.title || prettyTitle(f);
      let baseUrl;
      if (t.link) {
        baseUrl = t.link;
      } else {
        await fs.mkdir(path.join(PUBLIC_ARCHIV, lang), { recursive: true });
        await fs.copyFile(full, path.join(PUBLIC_ARCHIV, lang, f));
        baseUrl = `${SITE_URL}/archiv/${lang}/${encodeURIComponent(f)}`;
      }
      try {
        const { pages } = await pdfPages(full);
        let heading = null;
        let n = 0;
        pages.forEach((lines, i) => {
          const page = i + 1;
          const res = chunkLines(lines, heading);
          heading = res.lastHeading;
          for (const c of res.chunks) {
            chunks.push({
              id: `${lang}/${f}#${page}-${n++}`,
              type: 'pdf',
              lang,
              doc: title,
              heading: c.heading,
              page,
              url: `${baseUrl}#page=${page}`,
              text: c.text,
            });
          }
        });
        docs.push({ lang, title, file: f, pages: pages.length, url: baseUrl });
        console.log(`  PDF  ${lang}  ${f}  (${pages.length} S.)`);
      } catch (e) {
        console.warn(`  ⚠ PDF konnte nicht gelesen werden: ${lang}/${f}: ${e.message}`);
      }
    }
  }
  return { chunks, docs };
}

// ---------- Website-Seiten (Odoo) ----------

function langFromUrl(u) {
  const p = new URL(u).pathname;
  if (/^\/fr(_[A-Z]{2})?(\/|$)/.test(p)) return 'fr';
  if (/^\/it(_[A-Z]{2})?(\/|$)/.test(p)) return 'it';
  return 'de';
}

async function indexPages() {
  const chunks = [];
  const docs = [];
  let urls = [];
  try {
    urls = (await fs.readFile(path.join(ARCHIV, 'seiten.txt'), 'utf8'))
      .split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  } catch {}
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'PROphysio-Tarif-Chat-Indexer' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);
      const lang = ($('html').attr('lang') || '').slice(0, 2).toLowerCase() || langFromUrl(url);
      const pageTitle = clean($('h1').first().text()) || clean($('title').text()) || url;
      const main = $('#wrap').length ? $('#wrap') : $('main').length ? $('main') : $('body');
      main.find('script, style, noscript, nav, header, footer, .o_footer, form').remove();

      // Abschnitte: Odoo-Blöcke sind <section>. Ein im Editor gesetzter Anker erscheint als id.
      let sections = main.find('section').filter((_, el) => $(el).parents('section').length === 0).toArray();
      if (sections.length === 0) sections = [main.get(0)];
      let n = 0;
      for (const el of sections) {
        const $el = $(el);
        const id = $el.attr('id') || $el.find('[id]').filter((_, e) => /^h[1-4]$/i.test(e.tagName)).first().attr('id');
        const heading = clean($el.find('h1,h2,h3,h4').first().text()) || null;
        // Text mit Zeilenumbrüchen pro Block-Element
        $el.find('br').replaceWith('\n');
        $el.find('p,li,h1,h2,h3,h4,h5,h6,div,td,th,summary,button').each((_, b) => { $(b).append('\n'); });
        const lines = $el.text().split('\n').map(clean).filter(Boolean);
        if (lines.join(' ').length < 30) continue;
        const res = chunkLines(lines, heading);
        const link = id ? `${url.split('#')[0]}#${id}` : url;
        for (const c of res.chunks) {
          chunks.push({ id: `web:${url}#${n++}`, type: 'web', lang, doc: pageTitle, heading: c.heading, url: link, text: c.text });
        }
      }
      docs.push({ lang, title: pageTitle, url, type: 'web' });
      console.log(`  WEB  ${lang}  ${url}`);
    } catch (e) {
      console.warn(`  ⚠ Seite nicht lesbar: ${url}: ${e.message}`);
    }
  }
  return { chunks, docs };
}

// ---------- Main ----------

const titles = await readTitles();
console.log('Archiv wird aufgebaut …');
await fs.rm(PUBLIC_ARCHIV, { recursive: true, force: true });
const pdf = await indexPdfs(titles);
const web = await indexPages();
const index = {
  built: new Date().toISOString(),
  docs: [...pdf.docs, ...web.docs],
  chunks: [...pdf.chunks, ...web.chunks],
};
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(index));
console.log(`Fertig: ${index.docs.length} Quellen, ${index.chunks.length} Abschnitte → data/index.json`);
