/* =========================================================
   gallery.js — Menu "Galerie" : mur d'images rangées par paquets,
   chaque image "pop" hors de sa case au clic (effet FLIP),
   le reste du site passe flou en arrière-plan.

   Tout le HTML de la galerie est généré ici en JS, rien n'est
   écrit à la main dans index.html.

   >>> POUR AJOUTER TES PHOTOS <<<
   Modifie simplement le tableau GALLERY_DATA ci-dessous :
   - "title"  : le nom du paquet (ex: "Live & Sets")
   - "items"  : liste de { src, alt }. Laisse "src: null" pour
     une case vide "à ajouter" en attendant tes photos.
   ========================================================= */

const GALLERY_DATA = [
  {
    title: 'Portraits',
    items: [
      { src: null, alt: 'Photo de portraits à venir' },
      { src: null, alt: 'Photo de portraits à venir' },
      { src: null, alt: 'Photo de portraits à venir' },
    ],
  },
  {
    title: 'Live & Sets',
    items: [
      { src: 'assets/Mousse1.jpg', alt: 'Portrait AIDN 1' },
      { src: 'assets/Mousse2.jpg', alt: 'Portrait AIDN 2' },
      { src: 'assets/Mousse3.jpg', alt: 'Portrait AIDN 3' },
    ],
  },
  {
    title: 'Backstage',
    items: [
      { src: null, alt: 'Photo backstage à venir' },
      { src: null, alt: 'Photo backstage à venir' },
    ],
  },
];

document.addEventListener('DOMContentLoaded', initGallery);

function initGallery() {
  const overlay = buildGalleryDOM();
  document.body.appendChild(overlay);

  const siteWrap = document.getElementById('siteWrap');
  const triggers = [
    document.getElementById('galleryTrigger'),
    document.getElementById('galleryTriggerMobile'),
  ].filter(Boolean);

  const closeBtn = overlay.querySelector('.gallery-close');
  const backdrop = overlay.querySelector('.gallery-backdrop');

  const openGallery = () => {
    // ferme le menu mobile s'il est ouvert
    document.getElementById('burger')?.classList.remove('open');
    document.getElementById('mobilePanel')?.classList.remove('open');

    overlay.classList.add('open');
    siteWrap?.classList.add('is-blurred');
    document.body.style.overflow = 'hidden';
    overlay.setAttribute('aria-hidden', 'false');
  };

  const closeGallery = () => {
    overlay.classList.remove('open');
    siteWrap?.classList.remove('is-blurred');
    document.body.style.overflow = '';
    overlay.setAttribute('aria-hidden', 'true');
    closeLightbox(overlay);
  };

  triggers.forEach(t => t.addEventListener('click', openGallery));
  closeBtn.addEventListener('click', closeGallery);
  backdrop.addEventListener('click', closeGallery);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (overlay.querySelector('.gallery-lightbox.active')) {
      closeLightbox(overlay);
    } else if (overlay.classList.contains('open')) {
      closeGallery();
    }
  });

  // Clic sur une case -> effet "pop"
  overlay.querySelectorAll('.gallery-tile.has-img').forEach(tile => {
    tile.addEventListener('click', () => openLightbox(overlay, tile));
  });
}

/* ---------- Construction du DOM de la galerie ---------- */
function buildGalleryDOM() {
  const overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'gallery-backdrop';
  overlay.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'gallery-panel';

  const header = document.createElement('div');
  header.className = 'gallery-header';
  header.innerHTML = `
    <div>
      <span class="eyebrow">Galerie</span>
      <h2>Le mur AIDN</h2>
    </div>
    <button type="button" class="gallery-close" aria-label="Fermer la galerie">
      <span></span><span></span>
    </button>
  `;
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'gallery-body';

  GALLERY_DATA.forEach(pack => {
    const packEl = document.createElement('section');
    packEl.className = 'gallery-pack';

    const title = document.createElement('h3');
    title.className = 'gallery-pack-title';
    title.textContent = pack.title;
    packEl.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';

    pack.items.forEach(item => {
      const tile = document.createElement('button');
      tile.type = 'button';

      if (item.src) {
        tile.className = 'gallery-tile has-img';
        tile.innerHTML = `<img src="${item.src}" alt="${item.alt}" loading="lazy">`;
        tile.dataset.src = item.src;
        tile.dataset.alt = item.alt;
      } else {
        tile.className = 'gallery-tile empty';
        tile.disabled = true;
        tile.innerHTML = `<span class="plus">+</span><span class="empty-label">À ajouter</span>`;
      }
      grid.appendChild(tile);
    });

    packEl.appendChild(grid);
    body.appendChild(packEl);
  });

  panel.appendChild(body);
  overlay.appendChild(panel);

  // Calque du lightbox (image qui "pop" hors de sa case)
  const lightbox = document.createElement('div');
  lightbox.className = 'gallery-lightbox';
  lightbox.innerHTML = `
    <div class="gallery-lightbox-backdrop"></div>
    <img class="gallery-lightbox-img" alt="">
  `;
  overlay.appendChild(lightbox);

  lightbox.querySelector('.gallery-lightbox-backdrop')
    .addEventListener('click', () => closeLightbox(overlay));

  return overlay;
}

/* ---------- Effet "pop" (FLIP) : l'image sort de sa case ---------- */
function openLightbox(overlay, tile) {
  const lightbox = overlay.querySelector('.gallery-lightbox');
  const lightboxImg = overlay.querySelector('.gallery-lightbox-img');
  const rect = tile.getBoundingClientRect();

  lightboxImg.src = tile.dataset.src;
  lightboxImg.alt = tile.dataset.alt || '';

  // Position de départ = exactement la case cliquée
  lightboxImg.style.transition = 'none';
  lightboxImg.style.top = rect.top + 'px';
  lightboxImg.style.left = rect.left + 'px';
  lightboxImg.style.width = rect.width + 'px';
  lightboxImg.style.height = rect.height + 'px';
  lightboxImg.style.borderRadius = '14px';

  lightbox.classList.add('active');
  // force reflow avant de lancer la transition vers la position finale
  void lightboxImg.offsetWidth;

  requestAnimationFrame(() => {
    lightboxImg.style.transition = 'all .45s cubic-bezier(.2,.8,.2,1)';
    const targetW = Math.min(window.innerWidth * .82, 760);
    const targetH = targetW * (rect.height / rect.width);
    lightboxImg.style.top = '50%';
    lightboxImg.style.left = '50%';
    lightboxImg.style.width = targetW + 'px';
    lightboxImg.style.height = targetH + 'px';
    lightboxImg.style.transform = 'translate(-50%, -50%)';
    lightboxImg.style.borderRadius = '18px';
  });
}

function closeLightbox(overlay) {
  const lightbox = overlay.querySelector('.gallery-lightbox');
  if (!lightbox || !lightbox.classList.contains('active')) return;
  lightbox.classList.remove('active');

  const lightboxImg = overlay.querySelector('.gallery-lightbox-img');
  lightboxImg.style.transition = 'none';
  lightboxImg.removeAttribute('style');
  lightboxImg.style.transition = '';
}
