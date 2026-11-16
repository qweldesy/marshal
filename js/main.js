/* Маршал — интерактив: шапка, меню, появление секций, счётчики, лайтбокс. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var M = window.Motion || null;

  /* ---------- Год в подвале ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Шапка при прокрутке ---------- */
  var header = document.getElementById('siteHeader');
  var navLinks = [].slice.call(document.querySelectorAll('.nav__link'));
  var lastState = null;
  function onScroll() {
    var scrolled = window.scrollY > 24;
    if (scrolled !== lastState) {
      header.classList.toggle('is-scrolled', scrolled);
      lastState = scrolled;
    }
    if (window.scrollY < 240) {
      navLinks.forEach(function (link) { link.classList.remove('is-active'); });
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var panel = document.getElementById('mobilePanel');
  var lastFocus = null;

  function setMenu(open) {
    if (!burger || !panel) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    panel.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) {
      lastFocus = document.activeElement;
      var first = panel.querySelector('a');
      if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    } else if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  if (burger && panel) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960 && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* ---------- Активный пункт меню ---------- */
  var sections = navLinks
    .map(function (a) {
      var id = a.getAttribute('href');
      return id && id.length > 1 ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* ---------- Появление секций ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (M && !reduced) {
    revealEls.forEach(function (el, i) {
      var siblings = [].slice.call(el.parentElement.children).filter(function (c) {
        return c.hasAttribute('data-reveal');
      });
      var idx = Math.max(0, siblings.indexOf(el));
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
      el.style.willChange = 'opacity, transform';

      M.inView(el, function () {
        M.animate(el, { opacity: [0, 1], y: [26, 0] }, {
          duration: 0.85,
          delay: Math.min(idx, 4) * 0.07,
          ease: [0.22, 1, 0.36, 1]
        }).finished.then(function () {
          el.style.willChange = 'auto';
        }).catch(function () {});
      }, { amount: 0.12, margin: '0px 0px -6% 0px' });
    });
  }

  /* ---------- Счётчики и полосы ---------- */
  var statValues = [].slice.call(document.querySelectorAll('.stat__value'));
  if (M && !reduced && statValues.length) {
    var statsBox = document.querySelector('.service__stats');
    M.inView(statsBox, function () {
      statValues.forEach(function (el) {
        var target = Number(el.getAttribute('data-count')) || 0;
        M.animate(0, target, {
          duration: 1.1,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: function (v) { el.textContent = Math.round(v) + '%'; }
        });
      });
      [].slice.call(document.querySelectorAll('.stat__bar > span')).forEach(function (bar, i) {
        var target = Number(bar.getAttribute('data-bar')) || 0;
        M.animate(bar, { width: ['0%', target + '%'] }, {
          duration: 1.2,
          delay: i * 0.1,
          ease: [0.22, 1, 0.36, 1]
        });
      });
    }, { amount: 0.3 });
  }

  /* ---------- Первый экран ---------- */
  if (M && !reduced) {
    M.animate('.hero__media img', { scale: [1.06, 1] }, { duration: 1.7, ease: [0.22, 1, 0.36, 1] });
    M.animate('.hero__title', { opacity: [0, 1], y: [22, 0] }, { duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] });
    M.animate('.hero__content > :not(.hero__title)', { opacity: [0, 1], y: [18, 0] }, {
      duration: 0.8,
      delay: M.stagger(0.07, { start: 0.3 }),
      ease: [0.22, 1, 0.36, 1]
    });
  }

  /* ---------- Лайтбокс ---------- */
  var dialog = document.getElementById('lightbox');
  var img = document.getElementById('lightboxImg');
  var caption = document.getElementById('lightboxCaption');
  var counter = document.getElementById('lightboxCount');
  var btnClose = document.getElementById('lightboxClose');
  var btnPrev = document.getElementById('lightboxPrev');
  var btnNext = document.getElementById('lightboxNext');
  var triggers = [].slice.call(document.querySelectorAll('.gallery__btn'));
  var current = 0;
  var scrollLock = 0;
  var lastTrigger = null;

  function render(index) {
    if (!triggers.length) return;
    current = (index + triggers.length) % triggers.length;
    var btn = triggers[current];
    img.src = btn.getAttribute('data-full');
    img.alt = btn.getAttribute('data-caption') || '';
    caption.textContent = btn.getAttribute('data-caption') || '';
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(triggers.length).padStart(2, '0');
  }

  function openLightbox(index) {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    render(index);
    lastTrigger = triggers[index] || null;
    scrollLock = window.scrollY;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    if (btnClose) btnClose.focus();
  }

  function closeLightbox() {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  triggers.forEach(function (btn, i) {
    btn.addEventListener('click', function () { openLightbox(i); });
  });

  if (dialog) {
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closeLightbox();
    });
    dialog.addEventListener('close', function () {
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollLock);
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus({ preventScroll: true });
      }
    });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); render(current + 1); }
    });
    if (btnClose) btnClose.addEventListener('click', closeLightbox);
    if (btnPrev) btnPrev.addEventListener('click', function () { render(current - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { render(current + 1); });
  }
})();
