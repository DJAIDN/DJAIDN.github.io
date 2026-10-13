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

  const bar = el.querySelector('.ld-bar i');
  const pct = el.querySelector('.ld-pct');
  const MIN = 1600, start = performance.now();
  let loaded = document.readyState === 'complete';
  window.addEventListener('load', () => { loaded = true; });

  (function tick(now) {
    const t = Math.min((now - start) / MIN, 1);
    const p = loaded ? t : Math.min(t, .9);
    bar.style.transform = `scaleX(${p})`;
    pct.textContent = Math.round(p * 100) + '%';
    if (p < 1 && now - start < 5000) return requestAnimationFrame(tick);

    el.classList.add('out');                           // lance l'animation de sortie
    setTimeout(() => root.classList.add('ready'), 650); // le hero entre pendant la montée du rideau
    setTimeout(() => {                                  // fin : on nettoie et on libère le scroll
      root.classList.remove('loading');
      el.remove();
    }, 1250);
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

async function initDates() {
  const list = document.getElementById('dates-list');
  const note = document.getElementById('dates-note');
  const historyWrap = document.getElementById('dates-history');
  const historyBox = document.getElementById('history-marquee');
  const historyCount = document.getElementById('history-count');
  if (!list) return;
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;   // textContent : le JSON ne peut pas injecter de HTML
    if (cls) n.className = cls;
    return n;
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // Une date à venir est forcément confirmée : seul « À confirmer » mérite une pastille
  const STATUS = { pending: 'À confirmer' };

  try {
    const res = await fetch('dates.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const t = new Date();
    const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

    // Tri chronologique (ancien -> récent) : la 1re date à venir est bien la prochaine
    const allDates = (data.dates || [])
      .filter(x => x.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));

    const upcoming = allDates.filter(x => x.date >= today);
    const historical = allDates.filter(x => x.date < today).reverse(); // la plus récente d'abord

    upcoming.forEach((x, i) => {
      const d = new Date(x.date + 'T12:00');
      const hours = getHours(x);

      const time = el('time');
      time.dateTime = x.date;
      time.append(
        el('b', String(d.getDate()).padStart(2, '0')),
        el('span', cap(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')) + ' · ' + cap(d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')))
      );
      const venue = el('div', '', 'd-venue');
      venue.append(el('strong', x.venue), el('span', x.city));
      const left = el('div', '', 'd-left');
      left.append(time, venue);

      const mid = el('div', '', 'd-hours');
      if (hours.label) mid.append(el('b', hours.label));
      if (hours.length) mid.append(el('span', hours.length));

      const right = el('div', '', 'd-right');
      if (i === 0) right.append(el('span', 'Prochaine date', 'badge spray'));
      if (STATUS[x.status]) right.append(el('span', STATUS[x.status], 'badge'));

      const li = el('li');
      li.append(left, mid, right);
      list.append(li);
    });

    injectEventSchema(upcoming);
    note.textContent = upcoming.length ? "D'autres dates arrivent." : 'Aucune date annoncée pour le moment.';

    if (historical.length) {
      const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      const makeCard = (x, dup) => {
        const li = el('li', '', 'history-card' + (dup ? ' h-dup' : ''));
        if (dup) li.setAttribute('aria-hidden', 'true');
        const time = el('time', fmt.format(new Date(x.date + 'T12:00')).replace('.', ''));
        time.dateTime = x.date;
        li.append(time, el('strong', x.venue), el('span', x.city));
        return li;
      };

      // Peu de dates : on répète la série pour que la bande remplisse toute la largeur
      const CARD = 252; // largeur carte + gap (px)
      const reps = Math.max(1, Math.ceil(1500 / (historical.length * CARD)));
      const makeGroup = (isCopy) => {
        const ul = el('ul', '', 'history-group');
        if (isCopy) ul.setAttribute('aria-hidden', 'true');
        for (let r = 0; r < reps; r++) historical.forEach(x => ul.append(makeCard(x, isCopy || r > 0)));
        return ul;
      };

      const track = el('div', '', 'history-track');
      track.style.setProperty('--dur', Math.max(20, Math.round(historical.length * reps * CARD / 45)) + 's'); // ~45 px/s
      track.append(makeGroup(false), makeGroup(true));
      historyBox.append(track);
      historyCount.textContent = `${historical.length} date${historical.length > 1 ? 's' : ''} passée${historical.length > 1 ? 's' : ''}`;
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
