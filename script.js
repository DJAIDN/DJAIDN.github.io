/* =========================================================
   script.js — comportements principaux du presskit AïDN
   (nav mobile, hélice 3D, waveform, reveal, swipe hint,
   accordéon "Rider technique")
   La galerie / mur d'images est gérée séparément dans gallery.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  buildHelix();
  buildWaveform();
  initScrollReveal();
  initSwipeHint();
  initAccordions();
  initCopyEmail();
});

/* ---------- Nav mobile (menu plein écran) ---------- */
function initMobileNav() {
  const burger = document.getElementById('burger');
  const panel = document.getElementById('mobilePanel');
  if (!burger || !panel) return;

  const closePanel = () => {
    burger.classList.remove('open');
    panel.classList.remove('open');
  };

  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    panel.classList.toggle('open');
  });

  // Les liens d'ancre ferment le panneau ; le bouton Galerie ouvre la
  // galerie à la place (voir gallery.js), donc on ne le ferme pas ici.
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', closePanel));
}

/* ---------- Hélice ADN en 3D (CSS transforms) ---------- */
function buildHelix() {
  const helix = document.getElementById('helix');
  if (!helix) return;

  const RUNGS = 14;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < RUNGS; i++) {
    const rung = document.createElement('div');
    rung.className = 'rung';
    const angle = (360 / RUNGS) * i;
    const y = (i / (RUNGS - 1)) * 100 - 50; // -50% à 50%
    rung.style.transform = `translate(-50%, ${y * 4}px) rotateY(${angle}deg)`;
    rung.innerHTML = `<span class="node a"></span><span class="bar"></span><span class="node b"></span>`;
    frag.appendChild(rung);
  }
  helix.appendChild(frag);
}

/* ---------- Barres d'égaliseur animées (section Univers) ---------- */
function buildWaveform() {
  const wave = document.getElementById('wave');
  if (!wave) return;

  const BARS = 48;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < BARS; i++) {
    const bar = document.createElement('i');
    bar.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
    bar.style.animationDuration = (1.1 + Math.random() * 1.1).toFixed(2) + 's';
    frag.appendChild(bar);
  }
  wave.appendChild(frag);
}

/* ---------- Apparition au scroll ---------- */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: .15 });

  targets.forEach(el => io.observe(el));
}

/* ---------- Hint "Swipe" au-dessus des photos de la Bio ---------- */
function initSwipeHint() {
  const hint = document.getElementById('swipeHint');
  const scroller = document.querySelector('.bio-portrait .ph-label');
  if (!hint || !scroller) return;

  let hidden = false;
  scroller.addEventListener('scroll', () => {
    if (hidden) return;
    hidden = true;
    hint.classList.add('is-hidden');
  }, { passive: true });
}

/* ---------- Accordéon "Rider technique" (façon "DÉROULER ›" de SWOAK) ---------- */
function initAccordions() {
  const toggles = document.querySelectorAll('.accordion-toggle');

  toggles.forEach(btn => {
    const panelId = btn.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    const chevron = btn.querySelector('.chevron');
    if (!panel) return;

    // état initial fermé
    panel.style.maxHeight = null;

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        panel.style.maxHeight = null;
        btn.setAttribute('aria-expanded', 'false');
        if (chevron) chevron.innerHTML = 'Dérouler <i>›</i>';
      } else {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
        if (chevron) chevron.innerHTML = 'Replier <i>×</i>';
      }
    });
  });
}

/* ---------- Copier l'adresse mail (secours si mailto: n'ouvre rien) ---------- */
function initCopyEmail() {
  const btn = document.querySelector('.copy-email-btn');
  if (!btn) return;

  const email = btn.dataset.email;
  const original = btn.textContent;

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch (err) {
      // Fallback pour navigateurs sans API Clipboard
      const tmp = document.createElement('textarea');
      tmp.value = email;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
    }

    btn.textContent = 'Adresse copiée ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2200);
  });
}
