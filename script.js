document.getElementById('year').textContent = new Date().getFullYear();

const FADE_MS = 260;

// Crossfade helper: fades `fromEl` out, swaps `hidden` on both, fades `toEl` in.
function crossfade(fromEl, toEl) {
  if (fromEl === toEl || !fromEl || !toEl) return;

  fromEl.classList.add('is-fading');

  window.setTimeout(() => {
    fromEl.hidden = true;
    fromEl.classList.remove('is-fading');

    toEl.hidden = false;
    toEl.classList.add('is-fading');
    // force a reflow so the browser registers the starting (faded) state
    // before we remove the class, otherwise it just skips straight to opacity:1
    void toEl.offsetWidth;
    toEl.classList.remove('is-fading');
  }, FADE_MS);
}

// Plays a quick "gather" effect on a poster-wall's images: each one flies in
// from a random direction and scale, staggered slightly, so the whole grid
// looks like it's converging into place.
//
// Tracks the pending "remove is-grouping" cleanup per wall so that replaying
// the effect twice in quick succession (e.g. clicking the same category
// button back-to-back) doesn't leave the *previous* call's cleanup timeout
// running — that stale timeout would fire mid-animation and cut the new
// replay short, making it look abruptly faster than the first play.
const groupEffectTimeouts = new WeakMap();

function playGroupEffect(wallEl) {
  if (!wallEl) return;
  const imgs = wallEl.querySelectorAll('img');

  const pendingCleanup = groupEffectTimeouts.get(wallEl);
  if (pendingCleanup) window.clearTimeout(pendingCleanup);

  wallEl.classList.remove('is-grouping');
  void wallEl.offsetWidth; // force reflow so the animation can replay

  imgs.forEach((img, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 30;
    img.style.setProperty('--group-tx', `${Math.cos(angle) * distance}px`);
    img.style.setProperty('--group-ty', `${Math.sin(angle) * distance}px`);
    img.style.animationDelay = `${(i % 6) * 40}ms`;
  });

  wallEl.classList.add('is-grouping');

  const cleanupId = window.setTimeout(() => {
    wallEl.classList.remove('is-grouping');
    groupEffectTimeouts.delete(wallEl);
  }, 900);
  groupEffectTimeouts.set(wallEl, cleanupId);
}

// Plays a soft, discreet "landing" reveal on a poster-wall's images — a
// gentle blurred drift-down-and-clear, like a cloud settling into place.
// A light, capped stagger keeps it from looking either perfectly flat or
// like a slow top-to-bottom cascade. Used once for the very first mosaic
// the visitor sees on page load.
function playLandingEffect(wallEl) {
  if (!wallEl) return;
  const imgs = wallEl.querySelectorAll('img');

  wallEl.classList.remove('is-landing');
  void wallEl.offsetWidth; // force reflow so the animation can replay

  imgs.forEach((img, i) => {
    img.style.animationDelay = `${(i % 5) * 18}ms`;
  });

  wallEl.classList.add('is-landing');

  window.setTimeout(() => {
    wallEl.classList.remove('is-landing');
  }, 1300);
}

// --- Hero categories: Cinéma / Documentaires ---
const categoryButtons = document.querySelectorAll('.hero__category');
const panels = document.querySelectorAll('.hero__panel');
const tabGroups = document.querySelectorAll('.hero__tabs[data-owner]');

// Switches the visible top-level panel (Cinéma / Documentaires / Séries / Clips).
// Each category's own sub-tab group (if any) is shown only while that
// category is active; every other sub-tab group stays hidden.
function setCategory(target, { animate = true } = {}) {
  const currentPanel = Array.from(panels).find((p) => !p.hidden);
  const nextPanel = Array.from(panels).find((p) => p.dataset.panel === target);

  categoryButtons.forEach((b) => {
    const active = b.dataset.category === target;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  tabGroups.forEach((g) => {
    g.hidden = g.dataset.owner !== target;
  });

  // Entering Documentaires (via the top-level category button, whether or
  // not it was already showing) always resets to the combined "all" wall —
  // Séries/Unitaires only filter once the visitor explicitly picks one.
  if (target === 'docs') {
    const docsTabButtons = document.querySelectorAll('.hero__tabs[data-owner="docs"] .hero__tab');
    docsTabButtons.forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-selected', 'false');
    });
    const allWall = document.getElementById('wall-docs-all');
    const docsWalls = [allWall, document.getElementById('wall-docs-series'), document.getElementById('wall-docs-unitaire')].filter(Boolean);
    const currentDocsWall = docsWalls.find((w) => !w.hidden);
    // Smoothly crossfade out of whichever filtered wall was showing (rather
    // than hard-cutting every wall's hidden state at once, which caused a
    // jarring flash when coming from Séries/Unitaires back to Documentaires).
    if (currentDocsWall && currentDocsWall !== allWall) {
      crossfade(currentDocsWall, allWall);
    } else if (allWall) {
      allWall.hidden = false;
    }
    window.setTimeout(() => playGroupEffect(allWall), FADE_MS);
  }

  // Séries, Clips and Cinéma each replay the gather effect on their mosaic
  // every time their top-level category tab is clicked. The same FADE_MS
  // lead-in as a crossfade is used even when the panel was already active
  // (no real crossfade happens then), so the effect always feels the same
  // pace as switching Longs-métrages <-> Courts-métrages.
  if (target === 'series') {
    window.setTimeout(() => playGroupEffect(document.getElementById('wall-series')), FADE_MS);
  }
  if (target === 'clips') {
    window.setTimeout(() => playGroupEffect(document.getElementById('wall-clips')), FADE_MS);
  }
  if (target === 'cinema') {
    const cinemaPanel = document.querySelector('.hero__panel[data-panel="cinema"]');
    const activeCinemaWall = cinemaPanel && Array.from(cinemaPanel.querySelectorAll('.poster-wall')).find((w) => !w.hidden);
    window.setTimeout(() => playGroupEffect(activeCinemaWall), FADE_MS);
  }

  if (!currentPanel || currentPanel === nextPanel || !nextPanel) {
    if (nextPanel) nextPanel.hidden = false;
    return;
  }

  if (animate) {
    crossfade(currentPanel, nextPanel);
  } else {
    currentPanel.hidden = true;
    nextPanel.hidden = false;
  }
}

categoryButtons.forEach((btn) => {
  btn.addEventListener('click', () => setCategory(btn.dataset.category));
});

// The "Films" nav link should always land the visitor on the Longs-métrages
// mosaic specifically — not just scroll to the top while leaving whatever
// category/tab was last active (Documentaires, Séries, a Courts filter...)
// on screen.
function resetToHome() {
  setCategory('cinema', { animate: true });
  const longsBtn = document.querySelector('.hero__tab[data-target="wall-longs"]');
  const coursBtn = document.querySelector('.hero__tab[data-target="wall-courts"]');
  const wallLongs = document.getElementById('wall-longs');
  const wallCourts = document.getElementById('wall-courts');
  if (longsBtn) {
    longsBtn.classList.add('is-active');
    longsBtn.setAttribute('aria-selected', 'true');
  }
  if (coursBtn) {
    coursBtn.classList.remove('is-active');
    coursBtn.setAttribute('aria-selected', 'false');
  }
  if (wallLongs) wallLongs.hidden = false;
  if (wallCourts) wallCourts.hidden = true;

  // setCategory's own cinema-effect logic runs before this reset, so it can
  // end up targeting whichever wall (longs/courts) was active beforehand —
  // if that wall is now hidden, its effect plays invisibly and the visitor
  // just sees wall-longs pop in with no animation at all, feeling abrupt.
  // Explicitly replay the effect on wall-longs here, at the same pace.
  window.setTimeout(() => playGroupEffect(wallLongs), FADE_MS);
}

const navFilmsLink = document.getElementById('navFilmsLink');
if (navFilmsLink) {
  navFilmsLink.addEventListener('click', resetToHome);
}

const navNameLink = document.getElementById('navNameLink');
if (navNameLink) {
  navNameLink.addEventListener('click', resetToHome);
}

// --- Hero tabs: Longs-métrages / Courts-métrages (Cinéma only) ---
const tabButtons = document.querySelectorAll('.hero__tab');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.hero__tabs');
    const groupButtons = group.querySelectorAll('.hero__tab');
    const targetId = btn.dataset.target;

    groupButtons.forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    // Each tab group only ever applies to its own category panel (cinema's
    // Longs/Courts, docs' Séries/Unitaires). If that category isn't currently
    // showing, snap to it instantly first (no fade) so the fade the user
    // actually sees is the mosaic swap within the group.
    const owner = group.dataset.owner;
    const ownerPanel = owner && document.querySelector(`.hero__panel[data-panel="${owner}"]`);
    if (ownerPanel && ownerPanel.hidden) setCategory(owner, { animate: false });

    // Tab buttons and poster-walls are siblings under the same .hero__panel,
    // not nested. The currently visible wall isn't necessarily one of this
    // group's own targets (e.g. docs shows a combined "all" wall until a
    // filter is picked), so look at every poster-wall inside the owning
    // panel rather than just this group's buttons' data-target list.
    const panelEl = ownerPanel || group.closest('.hero__panel');
    const wallsInPanel = panelEl ? Array.from(panelEl.querySelectorAll('.poster-wall')) : [];
    const currentWall = wallsInPanel.find((w) => !w.hidden);
    const nextWall = document.getElementById(targetId);

    crossfade(currentWall, nextWall);
    playGroupEffect(nextWall);
  });
});

// --- Language toggle: FR / EN ---
const langButtons = document.querySelectorAll('.nav__lang-btn');
const translatable = document.querySelectorAll('[data-en]');

const pageMeta = {
  title: {
    el: document.getElementById('pageTitle'),
    fr: document.getElementById('pageTitle') ? document.getElementById('pageTitle').textContent : '',
    en: 'Thomas Van Pottelberge — Sound Recordist · Sound Editor',
  },
  description: {
    el: document.getElementById('pageDescription'),
    fr: document.getElementById('pageDescription') ? document.getElementById('pageDescription').getAttribute('content') : '',
    en: 'Thomas Van Pottelberge, sound recordist and sound editor for narrative film and documentary. Little Jaffna, Les Meutes, Freda.',
  },
};

// Cache the original French markup once so we can always switch back to it,
// even after the English version has overwritten an element's innerHTML.
translatable.forEach((el) => {
  el.dataset.fr = el.innerHTML;
});

function setLanguage(lang) {
  document.documentElement.lang = lang;

  translatable.forEach((el) => {
    el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.fr;
  });

  langButtons.forEach((b) => {
    b.classList.toggle('is-active', b.dataset.lang === lang);
  });

  if (pageMeta.title.el) pageMeta.title.el.textContent = lang === 'en' ? pageMeta.title.en : pageMeta.title.fr;
  if (pageMeta.description.el) pageMeta.description.el.setAttribute('content', lang === 'en' ? pageMeta.description.en : pageMeta.description.fr);

  try {
    localStorage.setItem('site-lang', lang);
  } catch (e) {
    // localStorage unavailable (private browsing, etc.) — language just won't persist
  }
}

langButtons.forEach((btn) => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

let initialLang = 'fr';
try {
  initialLang = localStorage.getItem('site-lang') || 'fr';
} catch (e) {
  initialLang = 'fr';
}
if (initialLang === 'en') setLanguage('en');

// --- Landing effect: softly reveal the whole hero on page load ---
function playTextLandingEffect(elements, { baseDelay = 0, stagger = 55 } = {}) {
  elements.forEach((el, i) => {
    if (!el) return;
    el.classList.remove('landing-el');
    void el.offsetWidth; // force reflow so the animation can replay
    el.style.animationDelay = `${baseDelay + i * stagger}ms`;
    el.classList.add('landing-el');
  });
}

// Run the landing effect as soon as this script executes (the DOM already
// exists by then, since this file is loaded at the end of <body>) rather
// than waiting on window's "load" event. Waiting for full page load (all
// images, fonts, etc. — which can take a while on a slow/uncached first
// visit) meant the hero sat fully visible and static for that whole time,
// then suddenly snapped invisible/blurred before replaying the reveal —
// a visible flicker. Running immediately means the reveal is effectively
// the very first thing the visitor sees, with no static flash beforehand.
requestAnimationFrame(() => {
  playTextLandingEffect(categoryButtons, { baseDelay: 0 });
  playTextLandingEffect(
    document.querySelectorAll('.hero__tabs[data-owner="cinema"] .hero__tab'),
    { baseDelay: 120 }
  );
  playLandingEffect(document.getElementById('wall-longs'));
});

// --- Lightbox: click a "Photos de tournage" thumbnail to see it full-size,
// with prev/next navigation to browse the rest of the gallery ---
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxCaption = document.getElementById('lightboxCaption');
const galleryImgs = Array.from(document.querySelectorAll('.apropos__gallery img'));

let lightboxIndex = -1;

function showLightboxImage(index) {
  const img = galleryImgs[index];
  if (!img || !lightboxImg) return;
  lightboxIndex = index;
  // Prefer the full-resolution original (data-full) over the cropped
  // thumbnail shown in the grid, so browsing really shows each photo in
  // its original format rather than just a bigger version of the crop.
  lightboxImg.src = img.dataset.full || img.src;
  lightboxImg.alt = img.alt || '';

  // The caption lives in the thumbnail's own <figcaption> (shown on hover
  // in the grid) — reuse that same text below the enlarged photo.
  if (lightboxCaption) {
    const figcaption = img.closest('figure') && img.closest('figure').querySelector('figcaption');
    lightboxCaption.textContent = figcaption ? figcaption.textContent.trim() : '';
  }
}

function openLightbox(index) {
  if (!lightbox || !lightboxImg || galleryImgs.length === 0) return;
  showLightboxImage(index);
  lightbox.hidden = false;
  void lightbox.offsetWidth; // force reflow so the fade-in actually plays
  lightbox.classList.add('is-visible');
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('is-visible');
  window.setTimeout(() => {
    lightbox.hidden = true;
  }, 300);
}

function showNext() {
  if (lightboxIndex < 0) return;
  showLightboxImage((lightboxIndex + 1) % galleryImgs.length);
}

function showPrev() {
  if (lightboxIndex < 0) return;
  showLightboxImage((lightboxIndex - 1 + galleryImgs.length) % galleryImgs.length);
}

galleryImgs.forEach((img, i) => {
  img.addEventListener('click', () => openLightbox(i));
});

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxNext) lightboxNext.addEventListener('click', showNext);
if (lightboxPrev) lightboxPrev.addEventListener('click', showPrev);
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}
document.addEventListener('keydown', (e) => {
  if (lightbox && lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') showNext();
  if (e.key === 'ArrowLeft') showPrev();
});

// --- Video lightbox: click a poster in the mosaic to watch the trailer
// directly on the site (YouTube embed) instead of leaving to youtube.com.
const videoLightbox = document.getElementById('videoLightbox');
const videoLightboxIframe = document.getElementById('videoLightboxIframe');
const videoLightboxClose = document.getElementById('videoLightboxClose');

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function openVideoLightbox(videoId) {
  if (!videoLightbox || !videoLightboxIframe) return;
  videoLightboxIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  videoLightbox.hidden = false;
  void videoLightbox.offsetWidth;
  videoLightbox.classList.add('is-visible');
}

function closeVideoLightbox() {
  if (!videoLightbox || !videoLightboxIframe) return;
  videoLightbox.classList.remove('is-visible');
  window.setTimeout(() => {
    videoLightbox.hidden = true;
    videoLightboxIframe.src = '';
  }, 300);
}

document.querySelectorAll('.poster-link').forEach((link) => {
  const videoId = getYouTubeId(link.getAttribute('href') || '');
  if (!videoId) return; // non-YouTube links (Facebook, Arte...) keep their normal behaviour
  link.addEventListener('click', (e) => {
    e.preventDefault();
    openVideoLightbox(videoId);
  });
});

if (videoLightboxClose) videoLightboxClose.addEventListener('click', closeVideoLightbox);
if (videoLightbox) {
  videoLightbox.addEventListener('click', (e) => {
    if (e.target === videoLightbox) closeVideoLightbox();
  });
}
document.addEventListener('keydown', (e) => {
  if (videoLightbox && videoLightbox.hidden) return;
  if (e.key === 'Escape') closeVideoLightbox();
});
