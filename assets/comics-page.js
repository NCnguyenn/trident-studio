/* Page-scoped book carousel; native links remain usable without JavaScript. */
(() => {
  const root = document.querySelector('[data-comics-carousel]');
  if (!root) return;
  const slides = [...root.querySelectorAll('[data-comic-slide]')];
  if (!slides.length) return;
  const dots = [...root.querySelectorAll('[data-comic-dot]')];
  const previews = [...document.querySelectorAll('[data-comic-preview]')];
  const toggle = root.querySelector('[data-comic-autoplay]');
  const timerFill = root.querySelector('[data-comic-timer]');
  const announcement = root.querySelector('[data-comic-announcement]');
  const dialog = document.querySelector('#comics-preview-dialog');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = Number(root.dataset.autoplayMs) || 7000;
  const pad = (value) => String(value).padStart(2, '0');
  let current = 0;
  let previewIndex = 0;
  let opener;
  let touchStart;
  let enabled = !motion.matches;
  let optedIn = false;
  let playingFromFocusedToggle = false;
  let inView = !('IntersectionObserver' in window);
  let hovered = root.matches(':hover');
  let timeout;
  let startedAt = 0;
  let remaining = duration;
  // Only an explicit Play activation may keep playback running under toggle focus.
  const focusPauses = () => root.contains(document.activeElement) && !(document.activeElement === toggle && playingFromFocusedToggle);

  function previewSource(index, original = false) {
    const data = slides[current].dataset;
    return `${data.previewBase}${original ? 'originals/' : ''}page-${pad(index + 1)}.${original ? data.originalExtension : 'jpg'}`;
  }

  function stopTimer(reset = false) {
    if (timeout) {
      clearTimeout(timeout);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
      timeout = undefined;
    }
    if (reset) {
      remaining = duration;
      if (timerFill) {
        timerFill.style.animation = 'none';
        void timerFill.offsetWidth;
        timerFill.style.animation = `comic-countdown ${duration}ms linear forwards`;
      }
    }
    if (timerFill) timerFill.style.animationPlayState = 'paused';
    root.dataset.playing = 'false';
  }

  function syncTimer() {
    const paused = !enabled || hovered || focusPauses() || dialog?.open || document.hidden || !inView;
    if (paused) {
      stopTimer();
      return;
    }
    if (timeout) return;
    startedAt = performance.now();
    root.dataset.playing = 'true';
    if (timerFill) timerFill.style.animationPlayState = 'running';
    timeout = setTimeout(() => {
      timeout = undefined;
      // Recheck focus/hover synchronously before hiding the current book.
      if (hovered || focusPauses() || dialog?.open || document.hidden || !inView || !enabled) {
        syncTimer();
        return;
      }
      select(current + 1, false);
    }, remaining);
  }

  function syncToggle() {
    toggle?.setAttribute('aria-pressed', String(enabled));
    const label = toggle?.querySelector('[data-autoplay-label]');
    const icon = toggle?.querySelector('[data-autoplay-icon]');
    if (label) label.textContent = `Tự động chuyển · ${enabled ? 'Bật' : 'Tắt'}`;
    if (icon) icon.textContent = enabled ? 'Ⅱ' : '▶';
  }

  function select(index, manual = true) {
    if (dialog?.open) return;
    const next = (index + slides.length) % slides.length;
    // A programmatic/manual change must also keep keyboard focus on a visible node.
    if (next !== current && slides[current].contains(document.activeElement)) {
      root.querySelector('[data-comic-next]')?.focus({ preventScroll: true });
    }
    current = next;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot) => dot.setAttribute('aria-current', String(Number(dot.dataset.comicDot) === current)));
    const count = root.querySelector('[data-comic-count]');
    if (count) count.textContent = `${pad(current + 1)} / ${pad(slides.length)}`;
    previews.forEach((button, i) => {
      button.dataset.full = previewSource(i, true);
      const image = button.querySelector('img');
      if (image) {
        image.src = previewSource(i);
        image.alt = `${slides[current].dataset.storyTitle} — Trang ${pad(i + 1)}`;
      }
      button.setAttribute('aria-label', `Xem ${slides[current].dataset.storyTitle}, trang ${i + 1}`);
    });
    const fullRead = document.querySelector('[data-comic-full-read]');
    if (fullRead) {
      fullRead.href = `${slides[current].dataset.bookHref}#reader`;
      fullRead.textContent = `Đọc trọn ${slides[current].dataset.totalPages} trang ↗`;
    }
    if (manual && announcement) announcement.textContent = `${current + 1} / ${slides.length} — ${slides[current].dataset.storyTitle}`;
    stopTimer(true);
    syncTimer();
  }

  function syncProgress() {
    let latest;
    slides.forEach((slide) => {
      const data = slide.dataset;
      const link = slide.querySelector('[data-comic-read]');
      const badge = slide.querySelector('[data-comic-progress]');
      if (link) {
        if (!link.dataset.initialLabel) link.dataset.initialLabel = link.textContent;
        if (!link.dataset.initialHref) link.dataset.initialHref = link.getAttribute('href');
        link.textContent = link.dataset.initialLabel;
        link.href = link.dataset.initialHref;
        link.removeAttribute('aria-label');
      }
      if (badge) badge.hidden = true;
      try {
        const saved = JSON.parse(localStorage.getItem(`trident_reader_v2_story_${data.storyId}`));
        const total = Number(data.totalPages);
        if (!saved || !Number.isInteger(saved.page) || saved.page < 0 || saved.page >= total || saved.total !== total) return;
        const page = saved.page + 1;
        const href = `${data.bookHref}?page=${page}#reader`;
        if (link) {
          link.href = href;
          link.textContent = `Đọc tiếp · ${pad(page)} ↗`;
          link.setAttribute('aria-label', `Đọc tiếp ${data.storyTitle} từ trang ${page}`);
        }
        if (badge) {
          badge.textContent = `Đang đọc · ${pad(page)}/${pad(total)}`;
          badge.hidden = false;
        }
        const updatedAt = Number.isFinite(saved.updatedAt) ? saved.updatedAt : 0;
        if (!latest || updatedAt > latest.updatedAt) latest = { href, page, title: data.storyTitle, updatedAt };
      } catch {
        // Storage may be unavailable for local files or disabled by the visitor.
      }
    });
    const resume = document.querySelector('[data-comics-resume]');
    if (resume) {
      resume.hidden = !latest;
      if (latest) {
        resume.href = latest.href;
        resume.setAttribute('aria-label', `Đọc tiếp ${latest.title} từ trang ${latest.page}`);
        const label = resume.querySelector('[data-comics-resume-label]');
        if (label) label.textContent = `Đọc tiếp · trang ${pad(latest.page)}`;
      }
    }
  }

  function showPreview(index) {
    previewIndex = (index + previews.length) % previews.length;
    const data = slides[current].dataset;
    const image = dialog.querySelector('[data-comic-dialog-image]');
    const title = dialog.querySelector('[data-comic-dialog-title]');
    const counter = dialog.querySelector('[data-comic-dialog-counter]');
    const read = dialog.querySelector('[data-comic-dialog-read]');
    if (image) {
      image.src = previewSource(previewIndex, true);
      image.alt = `${data.storyTitle} — Trang ${pad(previewIndex + 1)}`;
    }
    if (title) title.textContent = data.storyTitle;
    if (counter) counter.textContent = `${pad(previewIndex + 1)} / ${pad(previews.length)}`;
    if (read) read.href = `${data.bookHref}?page=${previewIndex + 1}#reader`;
  }

  root.querySelector('[data-comic-prev]')?.addEventListener('click', () => select(current - 1));
  root.querySelector('[data-comic-next]')?.addEventListener('click', () => select(current + 1));
  dots.forEach((dot) => dot.addEventListener('click', () => select(Number(dot.dataset.comicDot))));
  toggle?.addEventListener('click', () => {
    enabled = !enabled;
    optedIn = enabled;
    playingFromFocusedToggle = enabled && document.activeElement === toggle;
    syncToggle();
    stopTimer(true);
    syncTimer();
  });
  toggle?.addEventListener('blur', () => { playingFromFocusedToggle = false; });
  root.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    syncTimer();
  });
  root.addEventListener('pointerleave', () => { hovered = false; syncTimer(); });
  root.addEventListener('focusin', syncTimer);
  root.addEventListener('focusout', () => queueMicrotask(syncTimer));
  document.addEventListener('visibilitychange', syncTimer);
  window.addEventListener('pageshow', () => { syncProgress(); syncTimer(); });
  window.addEventListener('storage', syncProgress);
  motion.addEventListener('change', () => {
    if (motion.matches && !optedIn) enabled = false;
    syncToggle();
    syncTimer();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncTimer();
    }, { threshold: 0 });
    observer.observe(root);
  }

  if (dialog) {
    previews.forEach((button, i) => button.addEventListener('click', () => {
      opener = button;
      showPreview(i);
      if (!dialog.open) dialog.showModal();
      syncTimer();
    }));
    dialog.querySelector('[data-comic-dialog-prev]')?.addEventListener('click', () => showPreview(previewIndex - 1));
    dialog.querySelector('[data-comic-dialog-next]')?.addEventListener('click', () => showPreview(previewIndex + 1));
    dialog.querySelector('[data-comic-dialog-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      showPreview(previewIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    dialog.addEventListener('touchstart', (event) => {
      touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : undefined;
    }, { passive: true });
    dialog.addEventListener('touchend', (event) => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = undefined;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) showPreview(previewIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
    dialog.addEventListener('touchcancel', () => { touchStart = undefined; });
    dialog.addEventListener('close', () => {
      opener?.focus({ preventScroll: true });
      syncTimer();
    });
  }

  previews.forEach((button) => {
    const image = button.querySelector('img');
    image?.addEventListener('error', () => {
      const original = button.dataset.full;
      // Use the same page's original once; a failed original must not loop.
      if (original && image.getAttribute('src') !== original) image.src = original;
    });
  });

  syncProgress();
  syncToggle();
  select(0, false);
})();
