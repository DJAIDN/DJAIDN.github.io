/* =========================================================
   script.js — AÏDN · homepage (JS vanilla, aucune dépendance)
   ========================================================= */

// Signale au CSS que le JS tourne (sinon les .reveal restent visibles)
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
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
