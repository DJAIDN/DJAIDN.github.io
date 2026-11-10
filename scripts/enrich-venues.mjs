/* =========================================================
   enrich-venues.mjs — trouve tout seul le site / l'Instagram des lieux
   Lancé par GitHub Actions dès que dates.json change (voir .github/workflows/venues.yml).
   Écrit venues.json, que le site lit pour le lien de chaque date.

   Pour chaque lieu pas encore connu :
     1. recherche du lieu sur OpenStreetMap (Nominatim, gratuit, sans clé) ;
        on lit ses champs « website » et « instagram » s'ils existent ;
     2. s'il y a un site mais pas d'Instagram, on cherche un lien Instagram dans la page ;
     3. sinon on ne met rien : le site retombe sur la carte Google Maps.
   Un lieu trouvé n'est plus recherché ; un lieu introuvable est retenté après 30 jours.

   Corriger à la main : dans venues.json, mets "source": "manual" sur l'entrée
   et renseigne "instagram" et/ou "website" : ce script n'y touchera plus jamais.
   Pour un cas isolé, un champ "url" dans dates.json reste prioritaire sur tout.
   ========================================================= */
import { readFile, writeFile } from 'node:fs/promises';

const UA = 'djaidn.fr venue-enricher (contact@djaidn.fr)';
const CITY_NAMES = { SJDM: 'Saint-Jean-de-Monts' };   // abréviations -> nom complet, pour la recherche
const RETRY_DAYS = 30;

// même clé que script.js
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const keyOf = (venue, city) => `${slug(venue)}|${slug(city)}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const squash = s => slug(s).replace(/-/g, '');

const IG_SKIP = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv', 'direct',
  'share', 'sharer', 'about', 'legal', 'developer', 'privacy', 'web', 'static', 'oauth']);

export function instagramUrl(v) {
  if (!v) return null;
  let h = String(v).trim().replace(/^https?:\/\/(www\.)?/i, '');
  if (/^instagram\.com\//i.test(h)) h = h.replace(/^instagram\.com\//i, '').split(/[/?#]/)[0];
  h = h.replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{2,30}$/.test(h) || IG_SKIP.has(h.toLowerCase())) return null;
  return `https://www.instagram.com/${h}/`;
}

export function instagramFromHtml(html) {
  for (const m of String(html).matchAll(/instagram\.com\/([A-Za-z0-9._]{2,30})/gi)) {
    const url = instagramUrl(m[1]);
    if (url) return url;
  }
  return null;
}

const httpUrl = u => {
  try {
    const x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u);
    return /^https?:$/.test(x.protocol) ? x.href : null;
  } catch { return null; }
};

async function get(url, as = 'text') {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === 'json' ? r.json() : (await r.text()).slice(0, 600000);
}

async function lookup(venue, city) {
  const cityFull = CITY_NAMES[city] || city || '';
  const q = [venue, cityFull].filter(Boolean).join(', ');
  const results = await get(`https://nominatim.openstreetmap.org/search?format=jsonv2&extratags=1&limit=5&countrycodes=fr&q=${encodeURIComponent(q)}`, 'json');
  const want = squash(venue);
  // on n'accepte qu'un résultat dont le nom ressemble au lieu (évite de lier un mauvais établissement)
  const hit = results.find(r => {
    const got = squash(r.name || String(r.display_name || '').split(',')[0]);
    return got.length >= 3 && want.length >= 3 && (got.includes(want) || want.includes(got));
  });
  if (!hit) return { website: null, instagram: null, source: null };

  const t = hit.extratags || {};
  let website = httpUrl(t.website || t['contact:website'] || t.url || '');
  let instagram = instagramUrl(t.instagram || t['contact:instagram'] || t['social:instagram']);
  let source = instagram || website ? 'osm' : null;

  if (website && !instagram) {
    try {
      instagram = instagramFromHtml(await get(website));
      if (instagram) source = 'site';
    } catch { /* site injoignable : on garde au moins le site */ }
  }
  return { website, instagram, source };
}

async function main() {
  const dates = JSON.parse(await readFile('dates.json', 'utf8')).dates || [];
  let store = { version: 1, venues: {} };
  try { store = JSON.parse(await readFile('venues.json', 'utf8')); } catch { /* premier lancement */ }
  store.venues ||= {};

  const venues = new Map();
  for (const d of dates) if (d.venue) venues.set(keyOf(d.venue, d.city), d);

  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  for (const [key, d] of venues) {
    const cur = store.venues[key];
    if (cur?.source === 'manual') continue;
    if (cur && (cur.instagram || cur.website)) continue;
    if (cur && (Date.now() - Date.parse(cur.checked)) / 864e5 < RETRY_DAYS) continue;

    let found = { website: null, instagram: null, source: null };
    try { found = await lookup(d.venue, d.city); }
    catch (e) { console.warn(`Recherche impossible pour ${d.venue} : ${e.message}`); continue; }

    store.venues[key] = { name: d.venue, city: d.city || '', ...found, checked: today };
    console.log(`${d.venue} (${d.city}) ->`, found.instagram || found.website || 'rien trouvé');
    changed = true;
    await sleep(1100); // Nominatim : 1 requête par seconde maximum
  }

  if (changed) {
    const sorted = Object.fromEntries(Object.entries(store.venues).sort(([a], [b]) => a.localeCompare(b)));
    await writeFile('venues.json', JSON.stringify({ version: 1, venues: sorted }, null, 2) + '\n');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
