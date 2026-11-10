/* =========================================================
   script.js — AIDN · homepage (JS vanilla, aucune dépendance)
   ========================================================= */

// Signale au CSS que le JS tourne (sinon les .reveal restent visibles)
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initDates();
  initMarquee();
  setTimeout(initMediaWallSlideshow, 0);
  initNavScroll();
  initReveal();
  initPauseOffscreen();
  initPlayer();
  initDownloadGate();
});

/* Bandeau : on duplique le contenu pour une boucle sans coupure
   (le CSS décale la piste de -50%) */
function initMarquee() {
  const track = document.getElementById('track');
  if (track) track.innerHTML += track.innerHTML;
}

/* Mur d'images : toutes les 3 s, une photo est remplacée par une autre de la galerie.
   La nouvelle photo remonte par-dessus l'ancienne avec un bord de papier déchiré (voir .mw-next en CSS). */
function initMediaWallSlideshow() {
  const wall = document.getElementById('galleryTriggerMobile');
  if (!wall || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cells = [...wall.querySelectorAll('.mw-cell')];
  const photos = [...new Set(
    [...document.querySelectorAll('.gallery-tile.has-img')]
      .map(tile => tile.dataset.src)
      .filter(Boolean)
      .map(src => new URL(src, document.baseURI).href)
  )];
  if (!cells.length || photos.length <= cells.length) return;

  let timer = null;
  let wallIsVisible = false;
  let isChanging = false;

  const stop = () => {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  };

  const syncTimer = () => {
    if (!wallIsVisible || document.hidden) {
      stop();
    } else if (timer === null) {
      timer = window.setInterval(showRandomPhoto, 3200);
    }
  };

  function showRandomPhoto() {
    if (isChanging) return;

    const displayed = new Set(cells.map(c => new URL(c.querySelector('img').src).href));
    const available = photos.filter(src => !displayed.has(src));
    if (!available.length) return;

    const cell = cells[Math.floor(Math.random() * cells.length)];
    const base = cell.querySelector('img');
    const nextSrc = available[Math.floor(Math.random() * available.length)];
    const preload = new Image();
    isChanging = true;

    preload.onload = () => {
      const next = document.createElement('img');
      next.className = 'mw-next';
      next.alt = '';
      next.decoding = 'async';
      next.src = nextSrc;
      cell.append(next);

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        base.src = nextSrc;                               // la photo de base prend la place...
        (base.decode ? base.decode() : Promise.resolve())
          .catch(() => {})
          .then(() => { next.remove(); isChanging = false; }); // ...puis on retire le calque sans à-coup
      };
      next.addEventListener('animationend', finish, { once: true });
      window.setTimeout(finish, 1300);                    // filet de sécurité
    };

    preload.onerror = () => {
      console.error(`Impossible de charger la photo du mur d'images : ${nextSrc}`);
      isChanging = false;
    };
    preload.src = nextSrc;
  }

  new IntersectionObserver(([entry]) => {
    wallIsVisible = entry.isIntersecting;
    syncTimer();
  }).observe(wall);
  document.addEventListener('visibilitychange', syncTimer);
}

/* Nav : se compacte + progression du scroll (1 mise à jour max par image) */
function initNavScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('scrolled', window.scrollY > 40);
    nav.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(3) : 0);
    ticking = false;
  };
  update();
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
}

/* Apparition douce des sections au scroll */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: .15 });
  items.forEach(el => {
    [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
    io.observe(el);
  });
}

/* Lecteur audio : un seul <audio> partagé, un seul titre joué à la fois */
function initPlayer() {
  if (!document.querySelector('.track')) return; // page sans lecteur
  const audio = new Audio();
  audio.preload = 'metadata';
  let current = null;
  const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';

  document.querySelectorAll('.track').forEach(track => {
    const btn = track.querySelector('.t-play');
    const seek = track.querySelector('.t-seek');
    const time = track.querySelector('.t-time');
    const src = track.querySelector('.t-dl').getAttribute('href');

    btn.addEventListener('click', () => {
      if (current === track) { audio.paused ? audio.play() : audio.pause(); return; }
      if (current) reset(current);
      current = track;
      audio.src = src;
      audio.play();
    });
    seek.addEventListener('input', () => {
      if (current === track && audio.duration) audio.currentTime = audio.duration * seek.value / 100;
    });
  });

  function reset(t) {
    t.classList.remove('playing');
    t.querySelector('.t-play').textContent = '▶';
    t.querySelector('.t-seek').value = 0;
    t.querySelector('.t-time').textContent = '0:00';
  }
  const ui = () => current && (
    current.classList.toggle('playing', !audio.paused),
    current.querySelector('.t-play').textContent = audio.paused ? '▶' : '❚❚'
  );
  audio.addEventListener('play', ui);
  audio.addEventListener('pause', ui);
  audio.addEventListener('ended', () => current && reset(current));
  audio.addEventListener('timeupdate', () => {
    if (!current || !audio.duration) return;
    current.querySelector('.t-seek').value = audio.currentTime / audio.duration * 100;
    current.querySelector('.t-time').textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
  });
}

/* Téléchargement : confirmation « DJ uniquement » avant de lancer le fichier */
function initDownloadGate() {
  const dlg = document.getElementById('dlDialog');
  const ok = document.getElementById('dlOk');
  const go = document.getElementById('dlGo');
  if (!dlg || typeof dlg.showModal !== 'function') return; // sans <dialog>, le lien reste direct
  let pending = null;

  document.querySelectorAll('.t-dl').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    pending = a;
    ok.checked = false;
    go.disabled = true;
    dlg.showModal();
  }));
  ok.addEventListener('change', () => { go.disabled = !ok.checked; });
  go.addEventListener('click', () => {
    if (!pending) return;
    const l = document.createElement('a');
    l.href = pending.href; l.download = '';
    l.click();
  });
}

/* Pause des animations infinies quand l'élément n'est pas à l'écran */
function initPauseOffscreen() {
  const els = document.querySelectorAll('.marquee, .bio-star, .history-marquee');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle('is-paused', !e.isIntersecting));
  });
  els.forEach(el => io.observe(el));
}

/* Loader : affiché une seule fois par session (l'état « loading » est posé
   dans le <head> avant le premier rendu). Dure au moins ~1,6 s, reste à 90 %
   tant que la page n'est pas totalement chargée, coupe à 5 s max.
   Sortie animée (~1,2 s) : le hero démarre pendant que le rideau monte. */
function initLoader() {
  const el = document.getElementById('loader');
  const root = document.documentElement;
  if (!el) { root.classList.add('ready'); return; }
  if (!root.classList.contains('loading')) {
    el.remove();
    root.classList.add('ready');
    return;
  }

  const counters = el.querySelectorAll('.ld-n');
  const MIN = 1400, start = performance.now();
  let loaded = document.readyState === 'complete';
  window.addEventListener('load', () => { loaded = true; });

  const paint = p => {
    el.style.setProperty('--p', p.toFixed(3));
    const label = String(Math.round(p * 100)).padStart(3, '0');
    counters.forEach(c => { c.textContent = label; });
  };

  (function tick(now) {
    const t = Math.min((now - start) / MIN, 1);
    const eased = 1 - Math.pow(1 - t, 2);              // démarre vite, termine doucement
    const p = loaded ? eased : Math.min(eased, .9);    // reste à 90 % tant que la page charge
    paint(p);
    if (p < 1 && now - start < 5000) return requestAnimationFrame(tick);

    paint(1);
    el.classList.add('done');                           // le mot passe au rose
    setTimeout(() => el.classList.add('out'), 220);     // les deux volets s'ouvrent
    setTimeout(() => root.classList.add('ready'), 520); // le hero entre pendant l'ouverture
    setTimeout(() => {                                  // fin : on nettoie et on libère le scroll
      root.classList.remove('loading');
      el.remove();
    }, 1300);
    try { sessionStorage.setItem('aidn-seen', '1'); } catch (e) {}
  })(start);
}

/* Dates : lues depuis dates.json (modifiable sans toucher au code). */
/* Horaires d'une date. Format écrit par AIDN Studio : time = "22:00" (heure de début)
   et duration = 360 (durée du set en MINUTES). L'ancien format duration = "22:00 - 04:00"
   reste accepté, et chaque champ est optionnel (une date sans horaires s'affiche quand même). */
function getHours(x) {
  const pad = n => String(n).padStart(2, '0');
  const fmtLen = min => min < 60
    ? `${min} min de set`
    : `${Math.floor(min / 60)} h${min % 60 ? ' ' + pad(min % 60) : ''} de set`;

  // ancien format "22:00 - 04:00" dans duration
  const range = typeof x.duration === 'string'
    ? /(\d{1,2})[:h](\d{2})\s*[-–—]\s*(\d{1,2})[:h](\d{2})/.exec(x.duration)
    : null;
  if (range) {
    let d = (+range[3] * 60 + +range[4]) - (+range[1] * 60 + +range[2]);
    if (d <= 0) d += 24 * 60;
    return { label: `${pad(range[1])}:${range[2]} – ${pad(range[3])}:${range[4]}`, length: fmtLen(d) };
  }

  const hm = /^(\d{1,2})[:h](\d{2})$/.exec(String(x.time || '').trim());
  const start = hm ? +hm[1] * 60 + +hm[2] : null;
  const dur = Number(x.duration);
  const hasDur = x.duration !== undefined && x.duration !== null && x.duration !== '' && Number.isFinite(dur) && dur > 0;

  if (start !== null && hasDur) {              // début + durée -> heure de fin calculée (passe minuit)
    const end = (start + dur) % (24 * 60);
    return { label: `${pad(hm[1])}:${hm[2]} – ${pad(Math.floor(end / 60))}:${pad(end % 60)}`, length: fmtLen(dur) };
  }
  if (start !== null) return { label: `${pad(hm[1])}:${hm[2]}`, length: 'Début du set' };
  if (hasDur) return { label: '', length: fmtLen(dur) };
  return { label: '', length: '' };
}

/* Lien d'une date, par ordre de priorité :
   1. un champ « url » sur la date dans dates.json ;
   2. le lien du lieu, rempli à la main dans venues.json (un lien par lieu, valable pour toutes ses dates) ;
   3. à défaut, la recherche Google Maps du lieu.
   Dans venues.json : "Nom du lieu": "https://www.instagram.com/xxx/" (ou "@xxx", ou l'adresse d'un site).
   Le nom est comparé sans tenir compte des majuscules, accents ni ponctuation. */
const CITY_NAMES = { SJDM: 'Saint-Jean-de-Monts' };
let VENUES = {};
const slugKey = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function cleanLink(v) {   // "@pseudo" -> Instagram ; "site.fr" -> https://site.fr ; autre chose que http(s) -> ignoré
  let s = String(v || '').trim();
  if (!s) return null;
  if (/^@[\w.]{2,30}$/.test(s)) s = 'https://www.instagram.com/' + s.slice(1) + '/';
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  if (!/^https?:\/\//i.test(s)) return null;
  return { url: s, label: /instagram\.com/i.test(s) ? 'Instagram' : 'Site' };
}
function venueLink(x) {
  const own = cleanLink(x.url);
  if (own) return own;
  const known = VENUES[slugKey(x.venue)];
  if (known) return known;
  const q = [x.venue, CITY_NAMES[x.city] || x.city].filter(Boolean).join(' ');
  return { url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), label: 'Carte' };
}

async function initDates() {
  const list = document.getElementById('dates-list');
  const head = document.getElementById('dates-head');
  const note = document.getElementById('dates-note');
  const historyWrap = document.getElementById('dates-history');
  const historyBox = document.getElementById('history-marquee');
  if (!list) return;
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;   // textContent : le JSON ne peut pas injecter de HTML
    if (cls) n.className = cls;
    return n;
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* Une date = un seul <a> cliquable de bout en bout.
     next : bandeau « Prochaine date » — past : carte compacte de l'historique
     (dup : copie du défilement, ignorée du clavier et des lecteurs d'écran). */
  const buildCard = (x, { next = false, past = false, dup = false } = {}) => {
    const d = new Date(x.date + 'T12:00');
    const venueName = String(x.venue || '');

    const card = el('a', '', 'date-card' + (next ? ' is-next' : '') + (past ? ' is-past' : ''));
    const link = venueLink(x);
    card.href = link.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    if (dup) card.tabIndex = -1;

    // rail : texte lisible pour la prochaine date, simple hachure décorative sinon
    const rail = next ? el('span', 'Prochaine date', 'dc-rail dc-flag') : el('span', '', 'dc-rail');
    if (!next) rail.setAttribute('aria-hidden', 'true');

    const time = el('time', '', 'dc-date');
    time.dateTime = x.date;
    const month = cap(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''));
    const tail = past ? String(d.getFullYear()) : cap(d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));
    time.append(el('b', String(d.getDate()).padStart(2, '0')), el('span', month + ' / ' + tail));

    // nom du lieu : 2 copies pour la boucle du marquee (la 2e est masquée aux lecteurs d'écran)
    const marq = el('span', '', 'dc-marq');
    marq.style.setProperty('--len', venueName.length);
    const ghost = el('span', venueName);
    ghost.setAttribute('aria-hidden', 'true');
    marq.append(el('span', venueName), ghost);
    const name = el('strong', '', 'dc-name');
    name.append(marq);
    const venue = el('div', '', 'dc-venue');
    venue.append(name, el('span', x.city, 'dc-city'));

    const arrow = el('i', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    const label = el('span', link.label, 'dc-go-l');
    label.append(' ', arrow);
    const go = el('span', '', 'dc-go');
    go.append(label);

    card.append(rail, time, venue);

    // horaires : uniquement pour les dates à venir (l'historique reste compact)
    if (!past) {
      const hours = getHours(x);
      const mid = el('div', '', 'dc-hours');
      if (hours.label) mid.append(el('b', hours.label));
      if (hours.length) mid.append(el('span', hours.length));
      if (!hours.label && !hours.length) mid.append(el('b', '—'));
      // Une date à venir est forcément confirmée : seul « À confirmer » mérite une pastille
      if (x.status === 'pending') mid.append(el('span', 'À confirmer', 'dc-pending'));
      card.append(mid);
    }

    card.append(go, el('span', ', ouvrir le lieu sur Google Maps (nouvel onglet)', 'sr'));
    const li = el('li', '', dup ? 'h-dup' : '');
    if (dup) li.setAttribute('aria-hidden', 'true');
    li.append(card);
    return li;
  };

  try {
    const res = await fetch('dates.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    try {   // liens des lieux (venues.json) : facultatif, sans lui on retombe sur Google Maps
      const vr = await fetch('venues.json', { cache: 'no-cache' });
      if (vr.ok) {
        for (const [name, v] of Object.entries(await vr.json())) {
          const link = cleanLink(v);
          if (link) VENUES[slugKey(name)] = link;
        }
      }
    } catch (e) { /* ignoré */ }
    const t = new Date();
    const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

    // Tri chronologique (ancien -> récent) : la 1re date à venir est bien la prochaine
    const allDates = (data.dates || [])
      .filter(x => x.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));

    const upcoming = allDates.filter(x => x.date >= today);
    const historical = allDates.filter(x => x.date < today).reverse(); // la plus récente d'abord

    upcoming.forEach((x, i) => list.append(buildCard(x, { next: i === 0 })));
    if (head) head.hidden = !upcoming.length;

    injectEventSchema(upcoming);
    note.textContent = upcoming.length ? "D'autres dates sont à venir" : 'Aucune date annoncée pour le moment.';

    // Historique : bande en défilement continu, aucune donnée chiffrée affichée
    if (historical.length) {
      // Peu de dates : on répète la série pour que la bande remplisse toute la largeur
      const CARD = 280; // largeur carte + gap (px), à garder aligné sur dates.css
      const reps = Math.max(1, Math.ceil(2400 / (historical.length * CARD)));
      const makeGroup = (isCopy) => {
        const ul = el('ul', '', 'archive-group');
        if (isCopy) ul.setAttribute('aria-hidden', 'true');
        for (let r = 0; r < reps; r++) {
          historical.forEach(x => ul.append(buildCard(x, { past: true, dup: isCopy || r > 0 })));
        }
        return ul;
      };

      const track = el('div', '', 'archive-track');
      track.style.setProperty('--dur', Math.max(24, Math.round(historical.length * reps * CARD / 45)) + 's'); // ~45 px/s
      track.append(makeGroup(false), makeGroup(true));
      historyBox.append(track);
      historyWrap.hidden = false;
    }
  } catch (err) {
    note.textContent = 'Dates momentanément indisponibles. Contacte-moi pour connaître mes disponibilités.';
  }
}

/* SEO : les prochaines dates sont aussi publiées en données structurées (schema.org/MusicEvent),
   générées depuis dates.json : rien à écrire à la main, AIDN Studio reste la seule source. */
function injectEventSchema(upcoming) {
  const CITY = { SJDM: 'Saint-Jean-de-Monts' };
  const pad = n => String(n).padStart(2, '0');
  const events = upcoming.filter(x => x.status === 'confirmed').map(x => {
    const hm = /^(\d{1,2})[:h](\d{2})$/.exec(String(x.time || '').trim());
    const [y, m, d] = x.date.split('-').map(Number);
    const ev = {
      '@type': 'MusicEvent',
      name: `AIDN en DJ set - ${x.venue}, ${CITY[x.city] || x.city}`,
      startDate: x.date,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: x.venue,
        address: { '@type': 'PostalAddress', addressLocality: CITY[x.city] || x.city, addressCountry: 'FR' }
      },
      performer: { '@type': 'Person', name: 'AIDN', url: 'https://djaidn.fr/' },
      image: 'https://djaidn.fr/assets/og-aidn.jpg',
      url: 'https://djaidn.fr/#dates'
    };
    if (hm) {
      const start = Date.UTC(y, m - 1, d, +hm[1], +hm[2]);   // heure locale du lieu, sans fuseau
      const iso = t => { const u = new Date(t); return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}T${pad(u.getUTCHours())}:${pad(u.getUTCMinutes())}`; };
      ev.startDate = iso(start);
      const dur = Number(x.duration);
      if (Number.isFinite(dur) && dur > 0) ev.endDate = iso(start + dur * 60000);
    }
    return ev;
  });
  if (!events.length) return;
  const tag = document.createElement('script');
  tag.type = 'application/ld+json';
  tag.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': events });
  document.head.appendChild(tag);
}
