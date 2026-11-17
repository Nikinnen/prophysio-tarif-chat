/*!
 * PROphysio Tarif-Chat – Widget
 * Einbinden in Odoo (Baustein «Code einbetten» / HTML):
 *   <div id="prophysio-tarif-chat"></div>
 *   <script src="https://DEINE-SEITE.netlify.app/widget.js" defer></script>
 * Optional am <script>-Tag: data-lang="fr" (sonst Sprache der Seite), data-height="560"
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var API = (script && script.getAttribute('data-api')) || (script && script.src ? new URL(script.src).origin : '');
  var pageLang = ((script && script.getAttribute('data-lang')) || document.documentElement.lang || 'de').slice(0, 2).toLowerCase();
  var LANG = ['de', 'fr', 'it'].indexOf(pageLang) >= 0 ? pageLang : 'de';
  var HEIGHT = parseInt((script && script.getAttribute('data-height')) || '580', 10);

  var T = {
    de: {
      title: 'Tarif-Chat KVG 2027',
      placeholder: 'Deine Frage zum neuen KVG-Tarif …',
      send: 'Senden',
      sources: 'Quellen',
      page: 'S.',
      open: 'Öffnen',
      none: 'Dazu habe ich in unseren Dokumenten nichts gefunden. Versuch es mit anderen Begriffen, z. B. einer Tarifziffer.',
      error: 'Da ist etwas schiefgelaufen. Bitte versuch es nochmals.',
      limit: 'Für heute sind die Fragen aufgebraucht. Bitte versuch es morgen wieder.',
      copy: 'Kopieren', copied: 'Kopiert', helpful: 'Hilfreich?', yes: 'Hilfreich', no: 'Nicht hilfreich', missing: 'Was hat gefehlt? (optional)', fbsend: 'Senden', thanks: 'Danke für dein Feedback!',
      uncited: 'Hinweis: Zu dieser Antwort konnten keine Textstellen zugeordnet werden. Bitte im Dokument prüfen.',
      disclaimer: 'Keine Rechtsberatung. Massgebend ist der Vertragstext. Fragen werden anonym gespeichert, um die FAQ zu verbessern. Bitte keine Patientendaten eingeben.',
    },
    fr: {
      title: 'Chat tarifaire LAMal 2027',
      placeholder: 'Votre question sur le nouveau tarif LAMal …',
      send: 'Envoyer',
      sources: 'Sources',
      page: 'p.',
      open: 'Ouvrir',
      none: 'Je n’ai rien trouvé à ce sujet dans nos documents. Essayez d’autres termes, p. ex. un numéro de position tarifaire.',
      error: 'Une erreur s’est produite. Veuillez réessayer.',
      limit: 'Le nombre de questions pour aujourd’hui est atteint. Veuillez réessayer demain.',
      copy: 'Copier', copied: 'Copié', helpful: 'Utile ?', yes: 'Utile', no: 'Pas utile', missing: 'Qu’est-ce qui manquait ? (facultatif)', fbsend: 'Envoyer', thanks: 'Merci pour votre retour !',
      uncited: 'Remarque : aucun passage n’a pu être associé à cette réponse. Veuillez vérifier dans le document.',
      disclaimer: 'Pas de conseil juridique. Seul le texte contractuel fait foi. Les questions sont enregistrées de manière anonyme pour améliorer la FAQ. Merci de ne saisir aucune donnée de patient.',
    },
    it: {
      title: 'Chat tariffale LAMal 2027',
      placeholder: 'La sua domanda sulla nuova tariffa LAMal …',
      send: 'Invia',
      sources: 'Fonti',
      page: 'p.',
      open: 'Apri',
      none: 'Non ho trovato nulla a riguardo nei nostri documenti. Provi con altri termini, ad es. un numero di posizione tariffale.',
      error: 'Si è verificato un errore. Riprovi, per favore.',
      limit: 'Il numero di domande per oggi è esaurito. Riprovi domani.',
      copy: 'Copia', copied: 'Copiato', helpful: 'Utile?', yes: 'Utile', no: 'Non utile', missing: 'Cosa mancava? (facoltativo)', fbsend: 'Invia', thanks: 'Grazie per il suo feedback!',
      uncited: 'Nota: non è stato possibile associare passaggi a questa risposta. La verifichi nel documento.',
      disclaimer: 'Nessuna consulenza legale. Fa stato il testo contrattuale. Le domande vengono salvate in forma anonima per migliorare le FAQ. Non inserisca dati dei pazienti.',
    },
  }[LANG];

  var CSS = `
  :host{all:initial;display:block;font-family:inherit;color:#0b1033}
  *{box-sizing:border-box}
  .wrap{font-family:inherit;font-size:15px;line-height:1.5;border-radius:18px;overflow:hidden;background:#fff;
    box-shadow:0 6px 30px rgba(0,0,128,.12);border:1px solid #e3e6f3;display:flex;flex-direction:column;max-width:820px;margin:0 auto}
  .msgs:empty{display:none}
  .msgs{position:relative;max-height:${HEIGHT}px;overflow-y:auto;padding:18px 14px;background:#f3f5fb;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
  .row{display:flex}
  .row.me{justify-content:flex-end}
  .bubble{max-width:86%;padding:10px 14px;border-radius:16px;word-wrap:break-word}
  .me .bubble{background:#9ff18b;color:#000040;border-bottom-right-radius:4px}
  .bot .bubble{background:#fff;color:#0b1033;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,64,.08)}
  .bubble p{margin:0 0 6px}.bubble p:last-child{margin:0}
  .bubble ul{margin:4px 0 6px;padding-left:20px}
  .cite{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin:0 1px;border-radius:9px;
    background:#000080;color:#fff;font-size:11px;font-weight:700;cursor:pointer;vertical-align:2px;border:0;font-family:inherit}
  .cite:hover{background:#9284ff}
  .srcs{margin-top:10px;border-top:1px solid #e8ebf5;padding-top:8px}
  .srcs h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#5a5f86}
  .src{display:block;text-decoration:none;color:inherit;border:1px solid #e3e6f3;border-radius:10px;padding:8px 10px;margin-bottom:6px;transition:.15s;background:#fafbff}
  .src:hover,.src.hl{border-color:#000080;background:#f0f2ff}
  .src .t{display:flex;gap:8px;align-items:baseline;font-weight:600;font-size:13.5px;color:#000080}
  .src .n{flex:0 0 auto;min-width:20px;height:20px;border-radius:10px;background:#000080;color:#fff;font-size:11px;display:inline-flex;align-items:center;justify-content:center}
  .src .m{font-weight:400;color:#5a5f86;font-size:12.5px}
  .src q{display:block;margin:6px 0 0 28px;padding-left:8px;border-left:3px solid #59d5bf;font-size:13px;color:#30355a;quotes:"«" "»"}
  .src .go{margin-left:auto;font-size:12px;font-weight:600;color:#000080;white-space:nowrap}
  .acts{display:flex;align-items:center;gap:2px;margin-top:10px;padding-top:6px;border-top:1px solid #e8ebf5;font-size:12.5px;color:#5a5f86}
  .act{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:#5a5f86;padding:5px 7px;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px}
  .act:hover:not(:disabled){background:#f0f2ff;color:#000080}
  .act:disabled{cursor:default;opacity:.55}
  .act.on{opacity:1;color:#000080;background:#e6f9e0}
  .act.down.on{color:#9a1c1c;background:#ffeceb}
  .sp{flex:1}
  .fbq{margin-right:2px}
  .fbform{display:flex;gap:6px;margin-top:6px}
  .fbform input{flex:1;min-width:0;border:1px solid #cfd4ea;border-radius:8px;padding:6px 9px;font:inherit;font-size:13px;color:#0b1033}
  .fbform input:focus{outline:none;border-color:#000080;box-shadow:0 0 0 3px rgba(0,0,128,.1)}
  .fbform button{border:0;background:#000080;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px}
  .fbthx{font-size:12.5px;color:#2f7a2a;margin-top:6px}
  [hidden]{display:none !important}
  .typing{display:inline-flex;gap:4px;padding:4px 2px}
  .typing i{width:7px;height:7px;border-radius:50%;background:#9284ff;animation:b 1s infinite ease-in-out}
  .typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
  @keyframes b{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
  .msgs:empty + form{border-top:0}
  form{display:flex;gap:8px;padding:10px;border-top:1px solid #e3e6f3;background:#fff;align-items:flex-end}
  textarea{flex:1;resize:none;border:1px solid #cfd4ea;border-radius:20px;padding:9px 14px;font:inherit;font-size:15px;max-height:120px;outline:none;color:#0b1033}
  textarea:focus{border-color:#000080;box-shadow:0 0 0 3px rgba(0,0,128,.1)}
  button.send{width:42px;height:42px;border-radius:50%;border:0;background:#000080;color:#9ff18b;cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center}
  button.send:disabled{opacity:.4;cursor:default}
  .warn{font-size:12.5px;color:#7a4a00;background:#fff6e0;border-radius:8px;padding:6px 9px;margin-top:8px !important}
  .foot{font-size:11px;color:#6b7096;padding:0 14px 10px;background:#fff}
  @media (max-width:560px){.wrap{border-radius:12px}.msgs{max-height:${Math.max(420, HEIGHT - 80)}px}.bubble{max-width:94%}}
  `;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  // Antwort-Segmente (Text + Zitatnummern) in HTML mit Absätzen und Listen umwandeln
  function renderAnswer(segments) {
    var html = '';
    segments.forEach(function (s) {
      var marks = (s.cites || []).map(function (n) { return '\u0000' + n + '\u0001'; }).join('');
      html += s.text + marks;
    });
    var blocks = html.split(/\n{2,}/);
    var out = blocks.map(function (b) {
      var lines = b.split('\n');
      var isList = lines.every(function (l) { return /^\s*([-•*]|\d+\.)\s+/.test(l) || !l.trim(); });
      var fmt = function (t) {
        return inline(t).replace(/\u0000(\d+)\u0001/g, '<button class="cite" data-n="$1" aria-label="Quelle $1">$1</button>');
      };
      if (isList) return '<ul>' + lines.filter(function (l) { return l.trim(); }).map(function (l) { return '<li>' + fmt(l.replace(/^\s*([-•*]|\d+\.)\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + lines.map(fmt).join('<br>') + '</p>';
    });
    return out.join('');
  }

  function renderSources(sources, id) {
    if (!sources || !sources.length) return '';
    return '<div class="srcs"><h4>' + T.sources + '</h4>' + sources.map(function (s) {
      var meta = [s.page ? T.page + ' ' + s.page : '', s.heading || ''].filter(Boolean).join(' · ');
      var samePage = false;
      try { var u = new URL(s.url, location.href); samePage = u.origin === location.origin && u.pathname === location.pathname; } catch (e) {}
      return '<a class="src" id="' + id + '-s' + s.n + '" href="' + esc(s.url) + '"' + (samePage ? '' : ' target="_blank" rel="noopener"') + '>' +
        '<span class="t"><span class="n">' + s.n + '</span><span>' + esc(s.doc) + (meta ? ' <span class="m">– ' + esc(meta) + '</span>' : '') + '</span><span class="go">' + T.open + ' ↗</span></span>' +
        (s.quotes || []).map(function (q) { return '<q>' + esc(q) + '</q>'; }).join('') + '</a>';
    }).join('') + '</div>';
  }

  function mount() {
    var host = document.getElementById('prophysio-tarif-chat');
    if (!host) { host = document.createElement('div'); host.id = 'prophysio-tarif-chat'; script.parentNode.insertBefore(host, script); }
    if (host.__mounted) return; host.__mounted = true;
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<div class="wrap" role="region" aria-label="' + esc(T.title) + '">' +
      '<div class="msgs" aria-live="polite"></div>' +
      '<form><textarea rows="1" placeholder="' + esc(T.placeholder) + '" aria-label="' + esc(T.placeholder) + '"></textarea>' +
      '<button class="send" type="submit" aria-label="' + esc(T.send) + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.6 2-12.6 2z"/></svg></button></form>' +
      '<div class="foot">' + esc(T.disclaimer) + '</div></div>';

    var msgs = root.querySelector('.msgs');
    var form = root.querySelector('form');
    var ta = root.querySelector('textarea');
    var btn = root.querySelector('.send');
    var history = [];
    var busy = false;
    var count = 0;

    function add(cls, html) {
      var row = document.createElement('div');
      row.className = 'row ' + cls;
      row.innerHTML = '<div class="bubble">' + html + '</div>';
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;
      return row;
    }

    msgs.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('.cite');
      if (!c) return;
      var bubble = c.closest('.bubble');
      var card = bubble && bubble.querySelector('.src[id$="-s' + c.getAttribute('data-n') + '"]');
      if (card) { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); card.classList.add('hl'); setTimeout(function () { card.classList.remove('hl'); }, 1400); }
    });

    // Fragt den Server und meldet jedes Ereignis des Antwort-Streams an onEvent.
    function request(question, onEvent) {
      if (window.PROPHYSIO_CHAT_DEMO) {
        return Promise.resolve(window.PROPHYSIO_CHAT_DEMO(question, LANG)).then(function (d) {
          onEvent({ type: 'start', id: null });
          (d.sources || []).forEach(function (s) { onEvent({ type: 'source', source: s }); });
          (d.segments || []).forEach(function (s, i) {
            onEvent({ type: 'text', i: i, t: s.text });
            (s.cites || []).forEach(function (n) { onEvent({ type: 'cite', i: i, n: n }); });
          });
          onEvent({ type: 'done', id: null, noSource: !(d.segments || []).length, uncited: false });
        });
      }
      return fetch(API + '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: question, history: history.slice(-6), page: location.pathname }),
      }).then(function (r) {
        var ct = r.headers.get('content-type') || '';
        if (!r.ok || ct.indexOf('ndjson') < 0) {
          return r.json().catch(function () { return {}; }).then(function (d) { var e = new Error(d.error || 'http'); e.code = d.error; throw e; });
        }
        var each = function (line) { if (line.trim()) onEvent(JSON.parse(line)); };
        if (!r.body || !r.body.getReader) return r.text().then(function (t) { t.split('\n').forEach(each); });
        var reader = r.body.getReader();
        var dec = new TextDecoder();
        var buf = '';
        var pump = function () {
          return reader.read().then(function (x) {
            if (x.done) { each(buf); return; }
            buf += dec.decode(x.value, { stream: true });
            var i;
            while ((i = buf.indexOf('\n')) >= 0) { var line = buf.slice(0, i); buf = buf.slice(i + 1); each(line); }
            return pump();
          });
        };
        return pump();
      });
    }

    var ICON_COPY = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
    var ICON_THUMB = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 10v11H3V10h4zm0 0 4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7"/></svg>';

    function actionsHtml() {
      return '<div class="acts">' +
        '<button class="act copy" type="button">' + ICON_COPY + '<span>' + esc(T.copy) + '</span></button>' +
        '<span class="sp"></span><span class="fbq">' + esc(T.helpful) + '</span>' +
        '<button class="act up" type="button" aria-label="' + esc(T.yes) + '" title="' + esc(T.yes) + '">' + ICON_THUMB + '</button>' +
        '<button class="act down" type="button" aria-label="' + esc(T.no) + '" title="' + esc(T.no) + '"><span style="display:inline-flex;transform:rotate(180deg)">' + ICON_THUMB + '</span></button>' +
        '</div>' +
        '<form class="fbform" hidden><input type="text" maxlength="500" placeholder="' + esc(T.missing) + '"><button type="submit">' + esc(T.fbsend) + '</button></form>' +
        '<div class="fbthx" hidden>' + esc(T.thanks) + '</div>';
    }

    function copyText(text, done) {
      var fallback = function () {
        var t = document.createElement('textarea');
        t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    }

    function sendFeedback(id, wert, kommentar) {
      if (!id || window.PROPHYSIO_CHAT_DEMO) return;
      fetch(API + '/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: id, wert: wert, kommentar: kommentar || '' }),
      }).catch(function () {});
    }

    function wireActions(bubble, st, plain) {
      var copyBtn = bubble.querySelector('.act.copy');
      var up = bubble.querySelector('.act.up');
      var down = bubble.querySelector('.act.down');
      var form = bubble.querySelector('.fbform');
      var thx = bubble.querySelector('.fbthx');
      if (!copyBtn) return;
      copyBtn.addEventListener('click', function () {
        var src = st.sources.map(function (s) {
          return '[' + s.n + '] ' + s.doc + (s.page ? ', ' + T.page + ' ' + s.page : '') + ' – ' + s.url;
        }).join('\n');
        copyText(plain + (src ? '\n\n' + T.sources + ':\n' + src : ''), function () {
          copyBtn.querySelector('span').textContent = T.copied;
          setTimeout(function () { copyBtn.querySelector('span').textContent = T.copy; }, 1800);
        });
      });
      var vote = function (wert) {
        if (st.voted) return;
        st.voted = wert;
        (wert === 'gut' ? up : down).classList.add('on');
        up.disabled = true; down.disabled = true;
        sendFeedback(st.id, wert);
        if (wert === 'gut') { thx.hidden = false; } else { form.hidden = false; form.querySelector('input').focus(); }
      };
      up.addEventListener('click', function () { vote('gut'); });
      down.addEventListener('click', function () { vote('schlecht'); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var k = form.querySelector('input').value.trim();
        if (k) sendFeedback(st.id, 'schlecht', k);
        form.hidden = true; thx.hidden = false;
      });
    }

    function ask(q) {
      q = (q || '').trim();
      if (!q || busy) return;
      busy = true; btn.disabled = true;
      var qRow = add('me', '<p>' + esc(q) + '</p>');
      var wait = add('bot', '<span class="typing"><i></i><i></i><i></i></span>');
      var bubble = wait.querySelector('.bubble');
      var mid = 'm' + (++count);
      var st = { id: null, segs: {}, order: [], sources: [], done: false, noSource: false, uncited: false, voted: null };
      var raf = 0;
      var scrolled = false;
      var seg = function (i) {
        if (!st.segs[i]) { st.segs[i] = { text: '', cites: [] }; st.order.push(i); st.order.sort(function (a, b) { return a - b; }); }
        return st.segs[i];
      };
      var draw = function () {
        raf = 0;
        var segs = st.order.map(function (i) { return st.segs[i]; });
        var hasText = segs.some(function (s) { return s.text.trim(); });
        if (!hasText && !st.done) return; // Tipp-Animation stehen lassen, bis Text kommt
        if (st.done && (st.noSource || !hasText)) { bubble.innerHTML = '<p>' + esc(T.none) + '</p>'; return; }
        bubble.innerHTML = renderAnswer(segs) +
          (st.done && st.uncited ? '<p class="warn">' + esc(T.uncited) + '</p>' : '') +
          renderSources(st.sources, mid) +
          (st.done ? actionsHtml() : '');
        if (!scrolled) { scrolled = true; msgs.scrollTop = Math.max(0, qRow.offsetTop - 10); }
      };
      var schedule = function () { if (!raf) raf = (window.requestAnimationFrame || setTimeout)(draw); };

      request(q, function (ev) {
        if (ev.type === 'start') st.id = ev.id;
        else if (ev.type === 'text') seg(ev.i).text += ev.t;
        else if (ev.type === 'cite') { var s = seg(ev.i); if (s.cites.indexOf(ev.n) < 0) s.cites.push(ev.n); }
        else if (ev.type === 'source') { var src = JSON.parse(JSON.stringify(ev.source)); src.quotes = src.quotes || []; st.sources.push(src); }
        else if (ev.type === 'quote') { var so = st.sources[ev.n - 1]; if (so && so.quotes.indexOf(ev.q) < 0) so.quotes.push(ev.q); }
        else if (ev.type === 'done') { st.done = true; st.noSource = ev.noSource; st.uncited = ev.uncited; st.id = ev.id || st.id; }
        else if (ev.type === 'error') { var err = new Error(ev.error || 'server'); err.code = ev.error; throw err; }
        schedule();
      }).then(function () {
        if (!st.done) { var e = new Error('incomplete'); throw e; }
        if (raf) { (window.cancelAnimationFrame || clearTimeout)(raf); raf = 0; }
        draw();
        var plain = st.order.map(function (i) { return st.segs[i].text; }).join('').replace(/\*\*/g, '').trim();
        if (!st.noSource && plain) wireActions(bubble, st, plain);
        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: plain || T.none });
      }).catch(function (e) {
        if (raf) { (window.cancelAnimationFrame || clearTimeout)(raf); raf = 0; }
        bubble.innerHTML = '<p>' + esc(/limit/.test(e.code || '') ? T.limit : T.error) + '</p>';
      }).then(function () {
        busy = false; btn.disabled = false;
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); var q = ta.value; ta.value = ''; ta.style.height = ''; ask(q); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); } });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
