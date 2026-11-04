/* Offline physical comic reader. Source metadata is captured once, before grouping thumbnails. */
(() => {
  'use strict';
  const shell = document.querySelector('.reader-shell');
  if (!shell) return;
  const find = selector => shell.querySelector(selector);
  const all = selector => [...shell.querySelectorAll(selector)];
  const image = find('.reader-image');
  const viewport = find('.page-viewport');
  const host = find('[data-flipbook]');
  const strip = find('.reader-strip');
  const pageSelect = find('#page-select');
  const mode = find('#reading-mode');
  const continuous = find('.continuous-pages');
  const feedback = find('.reader-feedback');
  const full = find('[data-fullscreen]');
  const resume = document.querySelector('[data-resume-reading]');
  const title = shell.dataset.storyTitle || image.dataset.title || '';
  const pages = all('.reader-thumb').map(thumb => ({
    source: thumb.dataset.source || thumb.querySelector('img').getAttribute('src'),
    preview: thumb.querySelector('img').getAttribute('src'),
    width: Number(thumb.dataset.width), height: Number(thumb.dataset.height)
  }));
  const total = pages.length;
  if (!total) return;
  const storageKey = `trident_reader_v2_story_${shell.dataset.storyId || '1'}`;
  const pad = value => String(value).padStart(2, '0');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const label = index => `${title} — Trang ${pad(index + 1)}/${pad(total)}`;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Restricted storage still permits reading. */ } };
  let current = 0;
  let zoom = 1;
  let book = null;
  let state = 'read';
  let exactTarget = null;
  let initialized = false;
  let resizing = false;
  let resizePending = false;
  let stripOrientation = '';
  let restoreFocus;
  let baseWidth = 0;
  let baseHeight = 0;
  const bookPages = [];
  const landscape = () => book && book.getOrientation() === 'landscape';
  const paired = () => mode.value === 'page' && landscape();
  const spreadStart = () => paired() ? current - current % 2 : current;
  const spreadEnd = () => Math.min(total - 1, spreadStart() + (paired() ? 1 : 0));
  const save = () => write(storageKey, JSON.stringify({ page: current, total, updatedAt: Date.now() }));

  // Each visible image has a bounded original -> optimized -> explicit retry path.
  function configureImage(img, index, original = true) {
    const metadata = pages[index];
    img.width = metadata.width;
    img.height = metadata.height;
    img.alt = label(index);
    img.draggable = false;
    img.decoding = 'async';
    img.dataset.index = String(index);
    img.addEventListener('error', () => {
      if (img.dataset.loadState === 'original' && metadata.preview !== metadata.source) {
        img.dataset.loadState = 'optimized';
        img.src = metadata.preview;
      } else if (img.dataset.loadState !== 'failed') {
        img.dataset.loadState = 'failed';
        const retry = img.parentElement.querySelector('[data-retry-image]');
        if (retry) retry.hidden = false;
        feedback.textContent = `Không tải được trang ${index + 1}. Chọn “Thử lại” để tải lại tranh.`;
        feedback.dataset.error = 'true';
        feedback.classList.add('is-error');
      }
    });
    img.addEventListener('load', () => {
      const retry = img.parentElement.querySelector('[data-retry-image]');
      if (retry) retry.hidden = true;
      if (!shell.querySelector('img[data-load-state="failed"]')) {
        feedback.classList.remove('is-error'); feedback.removeAttribute('data-error');
      }
    });
    if (original) loadOriginal(img);
  }
  function loadOriginal(img, retry = false) {
    if (!retry && img.dataset.loadState) return;
    img.dataset.loadState = 'original';
    img.src = pages[Number(img.dataset.index)].source;
  }
  function makePage(index, scrolling = false) {
    const page = document.createElement('div');
    page.className = scrolling ? 'continuous-page' : 'book-page';
    page.dataset.page = String(index);
    page.dataset.density = 'soft';
    const img = new Image();
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.dataset.retryImage = '';
    retry.className = 'book-retry';
    retry.textContent = `Thử lại trang ${index + 1}`;
    retry.hidden = true;
    retry.addEventListener('click', event => { event.stopPropagation(); retry.hidden = true; loadOriginal(img, true); });
    page.append(img, retry);
    configureImage(img, index, false);
    if (scrolling) { img.loading = 'lazy'; loadOriginal(img); }
    return page;
  }
  function loadNearby() {
    if (!book) return;
    const start = landscape() ? current - current % 2 : current;
    for (let i = Math.max(0, start - (landscape() ? 2 : 1)); i <= Math.min(total - 1, start + 3); i++) {
      loadOriginal(bookPages[i].querySelector('img'));
    }
  }
  function syncFallback() {
    const metadata = pages[current];
    image.dataset.index = String(current);
    image.dataset.loadState = 'original';
    image.width = metadata.width; image.height = metadata.height;
    image.alt = label(current); image.src = metadata.source;
    shell.style.setProperty('--page-ratio', metadata.width / metadata.height);
  }
  function rebuildStrip() {
    const orientation = paired() ? 'landscape' : 'portrait';
    if (stripOrientation === orientation) return;
    stripOrientation = orientation;
    const fragment = document.createDocumentFragment();
    const step = paired() ? 2 : 1;
    for (let i = 0; i < total; i += step) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'reader-thumb'; button.dataset.page = String(i);
      const previews = document.createElement('span'); previews.className = 'thumb-images';
      const last = Math.min(total - 1, i + step - 1);
      for (let j = i; j <= last; j++) {
        const img = new Image(); img.src = pages[j].preview; img.alt = ''; img.loading = 'lazy'; previews.append(img);
      }
      const count = document.createElement('span'); count.className = 'thumb-label';
      count.textContent = i === last ? pad(i + 1) : `${pad(i + 1)}–${pad(last + 1)}`;
      button.setAttribute('aria-label', `Đọc trang ${count.textContent}`);
      button.append(previews, count); button.addEventListener('click', () => go(i)); fragment.append(button);
    }
    strip.replaceChildren(fragment);
  }
  function update(scrollStrip = false) {
    shell.dataset.currentPage = String(current + 1);
    shell.dataset.bookState = state;
    shell.dataset.bookOrientation = landscape() ? 'landscape' : 'portrait';
    pageSelect.value = String(current);
    const end = spreadEnd();
    all('[data-prev]').forEach(button => { button.disabled = spreadStart() === 0 || state === 'flipping' || state === 'user_fold'; });
    all('[data-next]').forEach(button => { button.disabled = end === total - 1 || state === 'flipping' || state === 'user_fold'; });
    find('.reader-progress span').style.width = `${((end + 1) / total) * 100}%`;
    const first = spreadStart();
    const counter = first === end ? `TRANG ${pad(first + 1)} / ${pad(total)}` : `TRANG ${pad(first + 1)}–${pad(end + 1)} / ${pad(total)}`;
    if (find('[data-toolbar-counter]')) find('[data-toolbar-counter]').textContent = counter;
    rebuildStrip();
    all('.reader-thumb').forEach(button => {
      if (Number(button.dataset.page) === first) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (scrollStrip && !strip.hidden) {
      const active = find('.reader-thumb[aria-current]');
      if (active) strip.scrollTo({ left: Math.max(0, active.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2), behavior: reduced() ? 'instant' : 'smooth' });
    }
    const ambient = `url("${pages[current].preview}")`;
    shell.style.setProperty('--ambient-src', ambient);
    if (find('.stage-ambient')) find('.stage-ambient').style.backgroundImage = ambient;
    if (find('[data-reader-finisher]')) find('[data-reader-finisher]').hidden = end !== total - 1;
    if (!feedback.dataset.error) feedback.textContent = counter;
    loadNearby();
  }
  function go(index, options = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= total || state === 'flipping' || state === 'user_fold') return;
    const animated = options.animate && !reduced() && book && mode.value === 'page' && zoom === 1;
    const previousSpread = spreadStart();
    const nextSpread = paired() ? index - index % 2 : index;
    feedback.removeAttribute('data-error');
    feedback.classList.remove('is-error');
    exactTarget = index;
    if (animated && previousSpread !== nextSpread) {
      loadNearbyTarget(index);
      viewport.dataset.turn = index > current ? 'next' : 'prev';
      book.flip(index, 'bottom');
      return;
    }
    current = index;
    if (book && mode.value === 'page') book.turnToPage(index);
    else if (!book) syncFallback();
    exactTarget = null;
    update(options.scrollStrip !== false);
    if (options.save !== false) save();
    if (mode.value === 'scroll' && continuous.children[index]) {
      const target = continuous.children[index];
      continuous.scrollTo({ top: target.offsetTop - continuous.offsetTop, behavior: 'instant' });
    }
  }
  function loadNearbyTarget(index) {
    if (!book) return;
    const start = landscape() ? index - index % 2 : index;
    for (let i = Math.max(0, start - (landscape() ? 2 : 1)); i <= Math.min(total - 1, start + 3); i++) loadOriginal(bookPages[i].querySelector('img'));
  }
  function next(direction) {
    const target = direction > 0 ? spreadEnd() + 1 : spreadStart() - (paired() ? 2 : 1);
    go(target, { animate: true });
  }
  function fitBook() {
    if (!host || !book || mode.value === 'scroll') return;
    if (state === 'flipping' || state === 'user_fold') { resizePending = true; return; }
    const css = getComputedStyle(viewport);
    const available = Math.max(100, viewport.clientWidth - parseFloat(css.paddingLeft || 0) - parseFloat(css.paddingRight || 0));
    const paired = innerWidth >= 1000;
    const ratio = pages[0].width / pages[0].height;
    const maxHeight = Math.max(140, Math.min(650, innerHeight * (shell.classList.contains('is-fullscreen') ? .7 : .64)));
    baseWidth = Math.min(available, maxHeight * ratio * (paired ? 2 : 1));
    baseHeight = baseWidth / ((paired ? 2 : 1) * ratio);
    host.style.width = `${baseWidth}px`; host.style.height = `${baseHeight}px`;
    // The engine uses its configured minimum page width as its portrait threshold.
    book.getSettings().minWidth = paired ? Math.max(1, baseWidth / 2 - 1) : baseWidth;
    // Upstream scales duration by pixel distance below 1000px. Normalize a full
    // turn so a phone's smaller page still takes approximately one second.
    const turnFrames = Math.floor(baseWidth / (paired ? 2 : 1) * 2 - baseHeight / 10) + 1;
    book.getSettings().flippingTime = 1000000 / Math.min(1000, turnFrames);
    resizing = true; book.update(); book.turnToPage(current); resizing = false;
    update();
  }
  function setZoom(value) {
    if (state === 'flipping' || state === 'user_fold') return;
    zoom = Math.max(1, Math.min(4, Math.round(value * 100) / 100));
    viewport.classList.toggle('is-zoomed', zoom > 1);
    shell.dataset.bookZoom = String(zoom);
    if (book) host.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
    else image.style.width = `${zoom * 100}%`;
    continuous.querySelectorAll('img').forEach(img => { img.style.width = `${zoom * 100}%`; });
    all('[data-zoom-display], [data-zoom-reset]').forEach(element => { element.textContent = `${Math.round(zoom * 100)}%`; });
    find('[data-zoom-out]').disabled = zoom === 1; find('[data-zoom-in]').disabled = zoom === 4;
    if (zoom === 1) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
  }
  function cinema(enabled, persist = false) {
    shell.classList.toggle('is-cinema', enabled);
    const button = find('[data-cinema-toggle]');
    if (button) { button.setAttribute('aria-pressed', String(enabled)); button.innerHTML = enabled ? '☾ <span>Đèn rạp: Bật</span>' : '☀ <span>Đèn sáng</span>'; }
    if (persist) write('trident_reader_v2_cinema', enabled ? '1' : '0');
  }
  all('[data-prev]').forEach(button => button.addEventListener('click', () => next(-1)));
  all('[data-next]').forEach(button => button.addEventListener('click', () => next(1)));
  pageSelect.addEventListener('change', () => go(Number(pageSelect.value)));
  find('[data-zoom-in]').addEventListener('click', () => setZoom(zoom + .25));
  find('[data-zoom-out]').addEventListener('click', () => setZoom(zoom - .25));
  find('[data-zoom-reset]').addEventListener('click', () => setZoom(1));
  find('[data-cinema-toggle]')?.addEventListener('click', () => cinema(!shell.classList.contains('is-cinema'), true));
  find('[data-restart-book]')?.addEventListener('click', () => go(0));
  find('[data-thumbnails]').addEventListener('click', event => {
    strip.hidden = !strip.hidden; event.currentTarget.setAttribute('aria-expanded', String(!strip.hidden));
  });
  viewport.addEventListener('dblclick', event => {
    if (mode.value !== 'page') return;
    const box = viewport.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    setZoom(zoom > 1 ? 1 : 2);
    if (zoom > 1) { viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) * x; viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) * y; }
  });
  // Capture prevents the engine seeing pointer input while the reader is zoomed,
  // in scroll mode or reduced motion. Reduced motion still retains native swipes.
  let swipe = null;
  for (const type of ['mousedown', 'touchstart', 'mousemove', 'touchmove', 'mouseup', 'touchend']) {
    viewport.addEventListener(type, event => {
      if (zoom > 1 || mode.value !== 'page' || reduced() || state === 'flipping') event.stopPropagation();
      if (book && (type === 'mousedown' || type === 'touchstart') && mode.value === 'page' && zoom === 1) {
        const point = type === 'touchstart' ? event.touches[0] : event;
        const rect = host.getBoundingClientRect();
        const backwards = point && point.clientX - rect.left < rect.width * (landscape() ? .5 : .4);
        // Upstream leaves user_fold active when a boundary drag has no target.
        if ((backwards && spreadStart() === 0) || (!backwards && spreadEnd() === total - 1)) event.stopPropagation();
      }
      if (type === 'touchstart' && event.touches.length === 1) swipe = { x:event.touches[0].clientX, y:event.touches[0].clientY };
      if (type === 'touchend' && (reduced() || !book) && swipe && zoom === 1 && event.changedTouches.length) {
        const dx = event.changedTouches[0].clientX - swipe.x; const dy = event.changedTouches[0].clientY - swipe.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) next(dx < 0 ? 1 : -1);
        swipe = null;
      }
    }, { capture:true, passive:true });
  }
  let drag;
  viewport.addEventListener('pointerdown', event => {
    if (zoom <= 1 || event.button !== 0 || event.pointerType === 'touch') return;
    drag = { x:event.clientX, y:event.clientY, left:viewport.scrollLeft, top:viewport.scrollTop };
    viewport.classList.add('is-dragging'); event.preventDefault();
  });
  window.addEventListener('pointermove', event => { if (drag) { viewport.scrollLeft = drag.left - event.clientX + drag.x; viewport.scrollTop = drag.top - event.clientY + drag.y; } });
  const endDrag = () => { drag = null; viewport.classList.remove('is-dragging'); };
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);

  mode.addEventListener('change', () => {
    if (state === 'flipping' || state === 'user_fold') { mode.value = 'page'; return; }
    const scrolling = mode.value === 'scroll';
    if (scrolling && !continuous.children.length) pages.forEach((_, index) => continuous.append(makePage(index, true)));
    find('.reader-stage').hidden = scrolling; continuous.hidden = !scrolling;
    setZoom(1); if (!scrolling) fitBook();
    go(current, { save:false, scrollStrip:false });
  });
  continuous.addEventListener('scroll', () => {
    if (mode.value !== 'scroll') return;
    const top = continuous.getBoundingClientRect().top;
    let nearest = 0, distance = Infinity;
    [...continuous.children].forEach((element, index) => { const delta = Math.abs(element.getBoundingClientRect().top - top); if (delta < distance) { distance=delta; nearest=index; } });
    if (continuous.scrollTop > 0 && continuous.scrollTop + continuous.clientHeight >= continuous.scrollHeight - 2) nearest = total - 1;
    if (current !== nearest) { current=nearest; update(true); save(); }
  }, {passive:true});
  function fullscreen(enabled) {
    shell.classList.toggle('is-fullscreen', enabled); document.body.classList.toggle('reader-locked', enabled);
    full.setAttribute('aria-pressed', String(enabled)); full.innerHTML = enabled ? '✕ <span>Thoát toàn màn hình</span>' : '⛶ <span>Toàn màn hình</span>';
    if (enabled) full.focus(); else restoreFocus?.focus({preventScroll:true});
    requestAnimationFrame(fitBook);
  }
  full.addEventListener('click', async () => {
    if (shell.classList.contains('is-fullscreen')) {
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { fullscreen(false); } }
      else fullscreen(false);
    } else {
      restoreFocus = document.activeElement;
      try { await shell.requestFullscreen(); } catch { /* iPhone/unsupported element fullscreen uses CSS. */ }
      fullscreen(true);
    }
  });
  document.addEventListener('fullscreenchange', () => fullscreen(document.fullscreenElement === shell));
  document.addEventListener('keydown', event => {
    const isFull = shell.classList.contains('is-fullscreen');
    if (event.key === 'Escape' && isFull) { if (document.fullscreenElement) document.exitFullscreen().catch(() => fullscreen(false)); else fullscreen(false); return; }
    if (isFull && event.key === 'Tab') {
      const controls = all('button,select,summary,a[href],[tabindex="0"]').filter(el => !el.disabled && el.getClientRects().length);
      const first=controls[0], last=controls[controls.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (/INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY/.test(event.target.tagName) || event.target.isContentEditable || zoom !== 1 || mode.value !== 'page') return;
    const box = shell.getBoundingClientRect();
    if (!isFull && (box.top > innerHeight*.5 || box.bottom < innerHeight*.5)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); next(event.key === 'ArrowRight' ? 1 : -1); }
  });
  document.addEventListener('click', event => { const mobile=document.querySelector('.mobile-nav'); if (mobile?.open && !mobile.contains(event.target)) mobile.open=false; });
  document.querySelector('.start-reading')?.addEventListener('click', () => shell.focus({preventScroll:true}));
  image.addEventListener('error', () => {
    const metadata = pages[Number(image.dataset.index) || 0];
    if (image.dataset.loadState !== 'optimized') { image.dataset.loadState='optimized'; image.src=metadata.preview; }
    else { feedback.dataset.error='true'; feedback.classList.add('is-error'); feedback.textContent='Không tải được trang truyện. Hãy chọn lại trang để thử lại.'; }
  });
  image.addEventListener('dragstart', event => event.preventDefault());

  let savedPage = 0;
  try { const parsed=JSON.parse(read(storageKey)); if (parsed && Number.isInteger(parsed.page) && parsed.page >= 0 && parsed.page < total && parsed.total === total) savedPage=parsed.page; } catch { /* Malformed bookmarks are ignored. */ }
  const rawPage = new URLSearchParams(location.search).get('page');
  const queryPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
  const hasQuery = Number.isInteger(queryPage) && queryPage >= 1 && queryPage <= total;
  current = hasQuery ? queryPage - 1 : 0;
  cinema(read('trident_reader_v2_cinema') !== '0');
  strip.hidden = innerWidth < 1000;
  find('[data-thumbnails]').setAttribute('aria-expanded', String(!strip.hidden));
  shell.dataset.bookEngine = 'fallback'; shell.dataset.bookOrientation = 'portrait'; shell.dataset.bookState = 'read';
  if (host && window.St?.PageFlip) {
    try {
      pages.forEach((_, index) => { const page=makePage(index); bookPages.push(page); host.append(page); });
      const ratio=pages[0].width/pages[0].height;
      const available=Math.max(100, viewport.clientWidth - 24);
      host.style.width=`${available}px`; host.style.height=`${available / ((innerWidth >= 1000 ? 2 : 1)*ratio)}px`;
      book = new St.PageFlip(host, { width:600, height:600/ratio, size:'stretch', minWidth:innerWidth >= 1000 ? Math.max(1,available/2-1) : available,
        maxWidth:2000, minHeight:70, maxHeight:1500, autoSize:false, usePortrait:true, showCover:false, drawShadow:true,
        maxShadowOpacity:.28, flippingTime:1000, mobileScrollSupport:true, useMouseEvents:true, showPageCorners:false, disableFlipByClick:true, startPage:current });
      book.on('flip', event => {
        // Upstream also emits flip while re-laying out a spread. That event may
        // report the pair's first page rather than the explicitly linked page.
        if (resizing || !initialized || (state === 'read' && exactTarget === null)) return;
        current = exactTarget !== null ? exactTarget : event.data;
        exactTarget=null; update(true); save();
      });
      book.on('changeState', event => {
        state=event.data; shell.dataset.bookState=state;
        if (state === 'user_fold') loadNearbyTarget(Math.min(total-1, spreadEnd()+2));
        update();
        if (state === 'read' && resizePending) { resizePending=false; requestAnimationFrame(fitBook); }
      });
      book.on('changeOrientation', () => { if (initialized && !resizing) update(); });
      book.loadFromHTML(bookPages);
      // Upstream marks an unpaired last page hard; all comic pages remain soft paper.
      for (let i=0;i<total;i++) book.getPage(i).setDensity('soft');
      shell.dataset.bookEngine='stpageflip'; shell.classList.add('has-flipbook');
      initialized=true; fitBook(); image.hidden=true;
      window.addEventListener('resize', () => requestAnimationFrame(fitBook));
      if (window.ResizeObserver) new ResizeObserver(() => { if (zoom === 1) requestAnimationFrame(fitBook); }).observe(viewport);
    } catch (error) {
      book=null; host.hidden=true; image.hidden=false; shell.classList.remove('has-flipbook');
      shell.dataset.bookEngine='fallback';
    }
  }
  if (!book) { if (host) host.hidden=true; syncFallback(); }
  setZoom(1); update(); shell.dataset.bookReady='true';
  if (hasQuery) save();
  if (!hasQuery && resume && savedPage > 0) {
    resume.textContent=`ĐỌC TIẾP TRANG ${pad(savedPage+1)} / ${pad(total)} ↓`; resume.hidden=false;
    resume.addEventListener('click', () => { go(savedPage); resume.hidden=true; shell.scrollIntoView({behavior:reduced()?'instant':'smooth',block:'start'}); shell.focus({preventScroll:true}); });
  }
})();
