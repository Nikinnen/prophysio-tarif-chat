// Einfache, schnelle Volltextsuche (BM25) über Wörter + Wortteile.
// Wortteile (5er-Zeichenfolgen) helfen bei deutschen Komposita: «Wechselzeit» findet «Wechselzeiten»,
// «Tarifstruktur» findet «Tarifstrukturvertrag».

const STOP = {
  de: 'der die das und oder ist sind ein eine einer eines den dem des im in am an auf für mit von zu zum zur bei wie was wer wann wo ich wir sie es nicht auch kann können muss wird werden noch nur als bis über unter nach vor aus welche welcher welches gibt mehr man darf sich'.split(' '),
  fr: 'le la les un une des du de et ou est sont en au aux pour par avec dans sur ce cette ces qui que quoi quand comment je nous vous il elle on ne pas plus peut peuvent doit être faut'.split(' '),
  it: 'il lo la i gli le un una uno di del della dei degli delle e o è sono in nel nella per con su da che chi cosa quando come io noi voi lui lei non più può possono deve essere'.split(' '),
};
const STOPSET = new Set([...STOP.de, ...STOP.fr, ...STOP.it]);

export function normalize(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
}

function stem(w) {
  if (/^\d/.test(w) || w.length <= 4) return w;
  return w.replace(/(ungen|ungen|innen|ern|en|er|es|em|e|n|s)$/, '').replace(/(ions|ion|ent|es|e|s|i|a|o)$/, (m) => (w.length > 6 ? '' : m)) || w;
}

export function words(s) {
  return (normalize(s).match(/[a-z0-9]+(?:[.,][0-9]+)?/g) || []).filter((w) => w.length > 1 && !STOPSET.has(w));
}

function terms(s) {
  const out = [];
  for (const w of words(s)) {
    out.push('w:' + stem(w));
    if (w.length >= 7 && !/^\d/.test(w)) for (let i = 0; i + 5 <= w.length; i++) out.push('g:' + w.slice(i, i + 5));
  }
  return out;
}

export function detectLang(s) {
  const ws = normalize(s).match(/[a-z]+/g) || [];
  const score = { de: 0, fr: 0, it: 0 };
  for (const w of ws) for (const l of ['de', 'fr', 'it']) if (STOP[l].includes(w)) score[l]++;
  if (/[äöü]/i.test(s)) score.de += 2;
  if (/[àâçéèêëîïôûù]/i.test(s) && !/[àìò]/i.test(s)) score.fr += 1;
  if (/\b(è|perché|più)\b/i.test(s)) score.it += 2;
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'de';
}

export function buildSearcher(chunks) {
  const docs = chunks.map((c) => {
    const tf = new Map();
    // Überschrift und Dokumenttitel zählen mit
    for (const t of terms(`${c.doc} ${c.heading || ''} ${c.heading || ''} ${c.text}`)) tf.set(t, (tf.get(t) || 0) + 1);
    let len = 0;
    for (const v of tf.values()) len += v;
    return { tf, len };
  });
  const N = docs.length || 1;
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avg = docs.reduce((a, d) => a + d.len, 0) / N;
  const k1 = 1.2, b = 0.75;

  return function search(query, { k = 12, lang = 'de' } = {}) {
    const q = [...new Set(terms(query))];
    if (q.length === 0) return [];
    const scores = docs.map((d, i) => {
      let s = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        const w = t.startsWith('g:') ? 0.35 : 1;
        s += w * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avg)));
      }
      if (s > 0 && chunks[i].lang === lang) s *= 1.4; // Sprache der Frage bevorzugen
      return { i, s };
    });
    scores.sort((a, b2) => b2.s - a.s);
    const top = scores[0]?.s || 0;
    return scores
      .filter((x) => x.s > 0 && x.s >= top * 0.2)
      .slice(0, k)
      .map((x) => ({ ...chunks[x.i], score: x.s }));
  };
}
