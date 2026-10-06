/* =========================================================
   script.js — AIDN · homepage (JS vanilla, aucune dépendance)
   ========================================================= */

// Signale au CSS que le JS tourne (sinon les .reveal restent visibles)
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initDates();
  initMarquee();
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
  const els = document.querySelectorAll('.marquee, .bio-star');
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
  if (!list) return;
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;   // textContent : le JSON ne peut pas injecter de HTML
    if (cls) n.className = cls;
    return n;
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const STATUS = { confirmed: 'Confirmé', pending: 'À confirmer' };

  try {
    const res = await fetch('dates.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const t = new Date();
    const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const upcoming = (data.dates || [])
      .filter(x => x.date >= today && x.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));

    upcoming.forEach((x, i) => {
      const d = new Date(x.date + 'T12:00');
      const hours = getHours(x);

      // gauche : date + lieu
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

      // centre : horaires du set
      const mid = el('div', '', 'd-hours');
      if (hours.label) mid.append(el('b', hours.label));
      if (hours.length) mid.append(el('span', hours.length));

      // droite : prochaine date + statut
      const right = el('div', '', 'd-right');
      if (i === 0) right.append(el('span', 'Prochaine date', 'badge spray'));
      if (STATUS[x.status]) right.append(el('span', STATUS[x.status], 'badge'));

      const li = el('li');
      li.append(left, mid, right);
      list.append(li);
    });
    note.textContent = upcoming.length ? "D'autres dates arrivent." : 'Aucune date annoncée pour le moment.';
  } catch (err) {
    note.textContent = 'Dates momentanément indisponibles. Contacte-moi pour connaître mes disponibilités.';
  }
}
