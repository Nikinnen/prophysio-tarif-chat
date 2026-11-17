// Baut das Archiv jede Nacht neu auf, damit Änderungen an den Odoo-Seiten automatisch im Chat landen.
// Voraussetzung: In Netlify einen «Build hook» erstellen und als Umgebungsvariable BUILD_HOOK_URL eintragen.
export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) return new Response('BUILD_HOOK_URL fehlt', { status: 200 });
  await fetch(hook, { method: 'POST' });
  return new Response('ok');
};

export const config = { schedule: '0 2 * * *' }; // täglich 02:00 UTC
