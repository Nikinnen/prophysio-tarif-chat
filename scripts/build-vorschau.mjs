// Erzeugt vorschau.html: das echte Widget mit drei Beispielantworten (ohne KI-Aufruf).
// Alle Zitate werden gegen das Archiv geprüft – steht ein Zitat nicht wörtlich im Archiv, bricht das Script ab.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index.json'), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function src(n, docPart, page, quotes) {
  const c = idx.chunks.filter((c) => c.doc.includes(docPart) && c.page === page);
  if (!c.length) throw new Error(`Kein Abschnitt: ${docPart} S.${page}`);
  const pageText = norm(c.map((x) => x.text).join(' '));
  for (const q of quotes) if (!pageText.includes(norm(q))) throw new Error(`Zitat nicht gefunden (${docPart} S.${page}): ${q}`);
  return { n, doc: c[0].doc, page, heading: c[0].heading, url: c[0].url.replace(/^https?:\/\/[^/]+/, ''), quotes };
}

const DEMO = [
  {
    match: /wechsel/i,
    segments: [
      { text: 'Die Wechselzeit zählt zur Behandlungszeit und wird grundsätzlich dem vorangegangenen Termin verrechnet.', cites: [1, 2] },
      { text: '\n\n- Dazu gehören Lüften, Desinfizieren, Aufräumen, Patientenwechsel und Terminplanung.', cites: [1] },
      { text: '\n- Patientenspezifische Vorbereitung gehört zur Behandlung, für die sie nötig ist. Dieselbe Wechselzeit darf nie doppelt verrechnet werden.', cites: [1] },
      { text: '\n- Beispiel: 35 Min. Therapie plus 3 Min. Wechselzeit werden auf 40 Min. aufgerundet, also 8 × Position 27110 = 58.88 TP.', cites: [3] },
    ],
    sources: [
      src(1, 'Leitfaden', 6, ['Für Vorbereitung und Abschluss des Behandlungsraums zwischen zwei Terminen wird Wechselzeit berücksichtigt; dazu zählen Lüften, Desinfizieren, Aufräumen, Patientenwechsel und Terminplanung.', 'Dieselbe Wechselzeit darf nie doppelt verrechnet werden.']),
      src(2, 'Merkblatt', 3, ['Die Wechselzeit zählt zur Behandlungszeit und wird grundsätzlich dem vorgängigen Patienten bzw. der vor vorgängigen Patientin in Rechnung gestellt, ausgenommen ist spezifischer Vorbereitungsaufwand.']),
      src(3, 'Leitfaden', 8, ['8 × Position 27110 = 8 × 7.36 TP = 58.88 TP']),
    ],
  },
  {
    match: /abwesen/i,
    segments: [
      { text: 'Leistungen in Abwesenheit waren bisher in der Behandlungspauschale enthalten. Neu werden sie separat abgerechnet (Kapitel 700).', cites: [1, 2] },
      { text: '\n\n- **27710**: 7.19 TP pro 5 Min., max. 60 Min. pro 9 Sitzungen. Für Kinder bis und mit 12 Jahren gilt **27720** mit max. 75 Min.', cites: [3] },
      { text: '\n- Abrechenbar ist z. B. der therapierelevante Austausch mit Fachpersonen, inklusive Organisation und Durchführung.', cites: [4] },
    ],
    sources: [
      src(1, 'Merkblatt', 3, ['Leistungen in Abwesenheit wurden bisher über die Behandlungspauschale mitvergütet.']),
      src(2, 'Leitfaden', 5, ['Im neuen Modell können notwendige Leistungen in Abwesenheit gesondert abgerechnet werden.']),
      src(3, 'Merkblatt', 4, ['27710 Leistung in Abwesenheit des Patienten pro 5 Min. 7.19']),
      src(4, 'Leitfaden', 13, ['Abrechenbare Leistungen in Abwesenheit umfassen den therapierelevanten Austausch mit Fachpersonen einschliesslich Organisation und Durchführung.']),
    ],
  },
  {
    match: /domizil|altersheim|pflegeheim|heim/i,
    segments: [
      { text: 'Ja. Alters- und Pflegeheime gelten als Domizil. Die Wegzeitentschädigung darfst du dort verrechnen, solange mit der Institution keine Leistungs­vereinbarung besteht.', cites: [1, 2] },
      { text: '\n\nDie Wegzeit läuft über Position **27810**: 2.38 TP pro km, max. 25 km.', cites: [3] },
    ],
    sources: [
      src(1, 'Leitfaden', 7, ['Als Domizil gilt die private Wohnadresse. Dazu zählen auch Alters- und Pflegeheime.']),
      src(2, 'Merkblatt', 3, ['Die Position für die Wegzeitentschädigung kann neu auch bei Behandlungen in Alters- und Wohnheimen abgerechnet werden, sofern mit der Institution keine Vereinbarung besteht.']),
      src(3, 'Merkblatt', 4, ['27810 Wegzeitentschädigung für verordnete Domizilbehandlung pro km 2.38 Max. 25 km']),
    ],
  },
];

const widget = fs.readFileSync(path.join(ROOT, 'public/widget.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const demoJs = `
window.PROPHYSIO_CHAT_DEMO = function (q) {
  var D = ${JSON.stringify(DEMO.map((d) => ({ match: d.match.source, segments: d.segments, sources: d.sources })))};
  for (var i = 0; i < D.length; i++) if (new RegExp(D[i].match, 'i').test(q)) {
    return new Promise(function (r) { setTimeout(function () { r({ segments: D[i].segments, sources: D[i].sources }); }, 900); });
  }
  return new Promise(function (r) { setTimeout(function () { r({ segments: [{ text: 'In dieser Vorschau sind nur die drei Beispielfragen hinterlegt. In der echten Version beantworte ich hier jede Frage aus dem Archiv – mit Quellen.', cites: [] }], sources: [] }); }, 600); });
};`;

const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vorschau Tarif-Chat PROphysio</title>
<style>
body{margin:0;font-family:"Helvetica Neue",Arial,sans-serif;background:#fff;color:#0b1033}
.hero{background:#000080;color:#fff;padding:48px 24px 40px}
.in{max-width:880px;margin:0 auto}
.tag{display:inline-block;background:#9ff18b;color:#000080;font-weight:700;font-size:13px;padding:4px 10px;border-radius:12px;margin-bottom:14px}
h1{margin:0 0 10px;font-size:34px;line-height:1.15}
.hero p{margin:0;max-width:640px;opacity:.9;font-size:17px;line-height:1.5}
.note{background:#f0f2ff;border:1px dashed #9284ff;color:#30355a;border-radius:10px;padding:10px 14px;font-size:13.5px;margin:24px auto 18px;max-width:820px}
section{padding:8px 16px 48px}
h2{max-width:820px;margin:0 auto 12px;font-size:22px;color:#000080}
</style></head><body>
<div class="hero"><div class="in"><span class="tag">Gültig ab 1.1.2027</span><h1>Die neue KVG-Tarifstruktur</h1><p>Alles, was du für die Umstellung wissen musst – und ein Chat, der deine Fragen direkt aus den Dokumenten beantwortet.</p></div></div>
<section id="tarif-chat">
<div class="note"><b>Vorschau:</b> Die Antworten sind drei hinterlegte Beispiele mit echten Zitaten aus euren Dokumenten. Probier die Vorschläge im Chat. Die Quellen-Links öffnen in der echten Version das PDF auf der richtigen Seite.</div>
<h2>Frag den Tarif-Chat</h2>
<div id="prophysio-tarif-chat"></div>
</section>
<script>${demoJs}</script>
<script>${widget}</script>
</body></html>`;

fs.writeFileSync(path.join(ROOT, 'vorschau.html'), html);
console.log('vorschau.html geschrieben – alle Zitate im Archiv gefunden.');
