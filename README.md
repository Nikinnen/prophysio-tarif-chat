# PROphysio Tarif-Chat

Ein Chat für die Tarif-Seiten von PROphysio. Er beantwortet Fragen **nur aus dem hinterlegten Archiv** (PDFs und eure Website-Seiten), zeigt zu jeder Aussage die **wörtliche Textstelle** und verlinkt direkt aufs PDF (richtige Seite) oder auf den Abschnitt der Website.

Die Odoo-Website wird nicht verändert. Dort steht nur ein HTML-Schnipsel. Alles andere läuft auf Netlify.

```
archiv/de, fr, it   → PDFs (hier pflegst du das Archiv)
archiv/titel.txt    → Anzeigenamen der PDFs (optional)
archiv/seiten.txt   → Website-Seiten, die durchsucht werden
public/widget.js    → das Chat-Fenster
netlify/functions/  → Chat, Fragen-Export, nächtlicher Neuaufbau
scripts/            → baut das Archiv (läuft automatisch bei Netlify)
```

---

## Einrichtung (einmalig, ca. 30 Minuten)

### 1. Anthropic-API-Schlüssel
1. Auf **platform.claude.com** (Anthropic Console) mit deinem Konto anmelden. Die API wird separat vom Claude-Abo abgerechnet (Guthaben aufladen).
2. Empfehlung: einen eigenen **Workspace «PROphysio»** anlegen und dort ein **monatliches Ausgabenlimit** setzen (z. B. 50 USD).
3. **API Key** erstellen und kopieren (wird nur einmal angezeigt).

### 2. GitHub
1. Neues **privates** Repository anlegen, z. B. `prophysio-tarif-chat`.
2. «uploading an existing file» → den Inhalt dieses Ordners (ohne `node_modules`) hineinziehen → «Commit changes».

### 3. Netlify
1. «Add new site» → «Import an existing project» → GitHub → das Repository wählen. Die Build-Einstellungen kommen automatisch aus `netlify.toml`.
2. Unter **Site configuration → Environment variables** eintragen:

| Variable | Wert |
|---|---|
| `ANTHROPIC_API_KEY` | der Schlüssel aus Schritt 1 |
| `ADMIN_TOKEN` | ein langes, zufälliges Passwort (für den Fragen-Export) |
| `CONTACT_EMAIL` | z. B. `info@prophysioverband.ch` (wird genannt, wenn der Chat nichts findet) |
| `ALLOWED_ORIGINS` | `https://www.prophysioverband.ch,https://prophysioverband.ch` (Domains, auf denen der Chat laufen darf) |
| optional `MODEL` | Standard `claude-haiku-5-5` (schnell, günstig). Für anspruchsvollere Antworten `claude-sonnet-5-5` |
| optional `DAILY_LIMIT_PER_USER` | Standard 40 Fragen pro Person und Tag |
| optional `DAILY_LIMIT_TOTAL` | Standard 1500 Fragen pro Tag insgesamt |

3. **Deploys → Trigger deploy**. Nach 1–2 Minuten läuft der Chat auf der Testseite `https://<name>.netlify.app/`.
4. Für den täglichen Neuaufbau (damit Änderungen auf den Odoo-Seiten übernommen werden): **Site configuration → Build & deploy → Build hooks → Add build hook** und die URL als Variable `BUILD_HOOK_URL` eintragen.
5. Schöner, optional: eine eigene Adresse wie `chat.prophysioverband.ch` (Netlify → Domain management).

### 4. Odoo
Auf der gewünschten Seite den Baustein **«Code einbetten»** (Embed Code) einfügen:

```html
<div id="prophysio-tarif-chat"></div>
<script src="https://<name>.netlify.app/widget.js" defer></script>
```

Auf französischen und italienischen Seiten erscheint der Chat automatisch in der Sprache der Seite.

---

## Archiv pflegen

**Neues PDF:** In GitHub in den Ordner `archiv/de` (bzw. `fr`, `it`) → «Add file → Upload files» → Commit. Netlify baut automatisch neu, und nach ca. 2 Minuten ist das Dokument im Chat.

**PDF ersetzen:** Datei mit gleichem Namen hochladen. **Löschen:** Datei in GitHub öffnen → «…» → Delete.

**Schöne Titel:** In `archiv/titel.txt` eine Zeile `dateiname.pdf | Titel` ergänzen. Mit einem dritten Teil `| https://…` verlinkt der Chat auf das Original statt auf eine Kopie. Das ist sinnvoll für Dokumente von Dritten.

**Website-Seiten:** URL in `archiv/seiten.txt` eintragen. Damit der Chat direkt auf einen Abschnitt springt, im Odoo-Editor beim Block einen **Anker** setzen (Block anklicken → Einstellungen → Anker). Änderungen an den Seiten werden jede Nacht übernommen, oder sofort mit «Trigger deploy».

**Tipps für gute Antworten**
- PDFs mit echtem Text verwenden. Gescannte Bilder kann der Chat nicht lesen.
- Klare Zwischentitel (z. B. «4.1 Kapitel 100 – …») machen die Quellenangaben präziser.
- Entwürfe mit Notizen wie «[PRÜFEN]» nicht hochladen, sonst zitiert der Chat sie.

## Gestellte Fragen auswerten
`https://<name>.netlify.app/api/fragen?token=<ADMIN_TOKEN>` lädt alle Fragen als CSV (für Excel) herunter. Mit `&monat=2027-01` nur einen Monat. Gespeichert werden Frage, Antwort, Quellen, Sprache und Seite, **ohne IP und ohne Namen**. Die Spalte `ohne_quelle` zeigt, wo das Archiv noch Lücken hat. Das sind gute Kandidaten für neue FAQ-Einträge.

## Wie es funktioniert
1. Die Frage wird in Suchbegriffe auf DE/FR/IT umformuliert. So findet eine französische Frage auch deutsche Dokumente, und Rückfragen wie «und bei Kindern?» werden verstanden.
2. Eine Volltextsuche wählt die 12 passendsten Abschnitte aus dem Archiv.
3. Claude antwortet nur aus diesen Abschnitten und belegt jede Aussage (Zitierfunktion der API). Findet die Suche nichts, wird gar keine KI gefragt.

Kosten: mit Haiku ca. 0.5–1 Rappen pro Frage, mit Sonnet ca. 2–4 Rappen.

## Lokal testen (optional, für Entwickler)
```
npm install
npm run build              # Archiv aufbauen
npx netlify dev            # Chat lokal mit Testseite
node scripts/build-vorschau.mjs   # Vorschau mit Beispielantworten (vorschau.html)
```
