/* ==========================================================================
   TRIDENT STUDIO — Interactive UI, Artbook Reader & Brief Generator (V2)
   100% Vanilla ES6 · Offline file:// Ready (Zero fetch/CORS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initMobileNavAutoClose();
  initArtbookReader();
  initContactBriefForm();
  initHomeConveyor();
  initStudioInteractions();
  initComicsHub();
});

function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  document.documentElement.classList.add("js-reveal");

  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  ) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          setTimeout(() => entry.target.style.removeProperty("--delay"), 650);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

function initMobileNavAutoClose() {
  const details = document.querySelector(".mobile-nav");
  if (!details) return;
  document.addEventListener("click", (e) => {
    if (details.open && !details.contains(e.target)) {
      details.open = false;
    }
  });
}

function initArtbookReader() {
  const shell = document.querySelector("[data-artbook-reader]");
  if (!shell) return;

  const thumbs = Array.from(shell.querySelectorAll(".reader-thumb"));
  if (!thumbs.length) return;

  const mainImg = shell.querySelector("[data-reader-image]");
  const counterEl = shell.querySelector("[data-reader-counter]");
  const progressBar = shell.querySelector("[data-reader-progress]");
  const prevBtns = Array.from(shell.querySelectorAll("[data-reader-prev]"));
  const nextBtns = Array.from(shell.querySelectorAll("[data-reader-next]"));
  const focusBtn = shell.querySelector("[data-reader-focus]");
  const stage = shell.querySelector(".reader-stage");

  const total = thumbs.length;
  let current = 0;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function preloadNeighbor(idx) {
    if (idx >= 0 && idx < total) {
      const src = thumbs[idx].dataset.src;
      if (src) {
        const pre = new Image();
        pre.src = src;
      }
    }
  }

  function goToPage(index, scrollThumb = true) {
    const nextIdx = Math.max(0, Math.min(total - 1, index));
    current = nextIdx;
    const activeThumb = thumbs[current];
    const targetSrc = activeThumb.dataset.src;
    const targetAlt = activeThumb.dataset.alt || `Trang ${current + 1}`;

    if (mainImg.getAttribute("src") !== targetSrc) {
      mainImg.classList.add("is-switching");
      mainImg.onload = () => mainImg.classList.remove("is-switching");
      mainImg.src = targetSrc;
    }
    mainImg.alt = targetAlt;

    thumbs.forEach((btn, i) => {
      const isCurrent = i === current;
      btn.classList.toggle("active", isCurrent);
      btn.setAttribute("aria-selected", isCurrent ? "true" : "false");
    });

    if (scrollThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }

    if (counterEl) {
      counterEl.textContent = `TRANG ${pad(current + 1)} / ${pad(total)}`;
    }
    if (progressBar) {
      progressBar.style.width = `${((current + 1) / total) * 100}%`;
    }

    prevBtns.forEach((b) => (b.disabled = current === 0));
    nextBtns.forEach((b) => (b.disabled = current === total - 1));

    preloadNeighbor(current + 1);
  }

  function setFullscreen(enable) {
    shell.classList.toggle("is-fullscreen", enable);
    document.body.classList.toggle("reader-locked", enable);
    if (focusBtn) {
      focusBtn.textContent = enable ? "✕ ĐÓNG TOÀN MÀN HÌNH" : "⛶ CHẾ ĐỘ TẬP TRUNG";
      focusBtn.setAttribute("aria-pressed", enable ? "true" : "false");
    }
  }

  prevBtns.forEach((btn) =>
    btn.addEventListener("click", () => goToPage(current - 1))
  );
  nextBtns.forEach((btn) =>
    btn.addEventListener("click", () => goToPage(current + 1))
  );

  thumbs.forEach((btn, idx) =>
    btn.addEventListener("click", () => goToPage(idx))
  );

  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
      setFullscreen(!shell.classList.contains("is-fullscreen"));
    });
  }

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;

    if (e.key === "ArrowLeft") {
      goToPage(current - 1);
    } else if (e.key === "ArrowRight") {
      goToPage(current + 1);
    } else if (e.key === "Escape" && shell.classList.contains("is-fullscreen")) {
      setFullscreen(false);
    }
  });

  // Touch horizontal swipe support on mobile/tablet
  if (stage) {
    let startX = 0;
    let startY = 0;
    stage.addEventListener(
      "touchstart",
      (e) => {
        if (!e.changedTouches.length) return;
        startX = e.changedTouches[0].clientX;
        startY = e.changedTouches[0].clientY;
      },
      { passive: true }
    );
    stage.addEventListener(
      "touchend",
      (e) => {
        if (!e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) goToPage(current + 1);
          else goToPage(current - 1);
        }
      },
      { passive: true }
    );
  }

  goToPage(0, false);
}

function initContactBriefForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const letter = form.closest(".contact-letter");
  if (letter && "ResizeObserver" in window) {
    const syncLetterPosition = () => {
      const height = letter.offsetHeight;
      letter.style.setProperty("--letter-height", `${height}px`);
      letter.classList.toggle("is-viewport-sticky", height <= window.innerHeight - 32);
    };
    syncLetterPosition();
    new ResizeObserver(syncLetterPosition).observe(letter);
    window.addEventListener("resize", syncLetterPosition);
  }

  const copyBtn = document.getElementById("copy-message");
  const output = document.getElementById("form-output");
  const feedback = document.getElementById("form-feedback");
  const openDraft = document.getElementById("open-contact-draft");
  const actions = openDraft.parentElement;
  const message = form.elements.message;
  let draft = "";

  form.addEventListener("input", () => {
    message.setCustomValidity("");
    draft = "";
    actions.hidden = true;
    copyBtn.hidden = true;
    openDraft.removeAttribute("href");
    output.textContent = "";
    output.classList.remove("visible");
    feedback.textContent = "";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    message.setCustomValidity(message.value.trim().length < 10 ? "Vui lòng nhập lời nhắn ít nhất 10 ký tự." : "");
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const read = (k) => String(data.get(k) || "").trim();
    const subject = read("subject") || "Liên hệ Trident Studio";

    draft = [
      `Họ và tên: ${read("name")}`,
      `Email liên hệ: ${read("email")}`,
      "",
      read("message"),
    ].join("\n");

    openDraft.href = `${form.action}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft.replace(/\r?\n/g, "\r\n"))}`;
    output.textContent = draft;
    output.classList.add("visible");
    actions.hidden = false;
    copyBtn.hidden = false;
    feedback.textContent = "Nếu ứng dụng email chưa mở, bạn có thể sao chép lời nhắn bên dưới.";
    openDraft.click();
  });

  copyBtn.addEventListener("click", async () => {
    const text = draft;
    try {
      await navigator.clipboard.writeText(text);
      if (draft === text) feedback.textContent = "Đã sao chép lời nhắn.";
    } catch {
      if (draft === text) feedback.textContent = "Bạn có thể bôi đen và sao chép nội dung bản nháp bên dưới.";
    }
  });
}


function initHomeConveyor() {
  const shell = document.querySelector("[data-home-conveyor]");
  if (!shell) return;

  const cards = Array.from(shell.querySelectorAll("[data-conveyor-card]"));
  const panels = Array.from(shell.querySelectorAll("[data-conveyor-panel]"));
  const tabs = Array.from(shell.querySelectorAll("[data-conveyor-tab]"));
  const prevBtn = shell.querySelector("[data-conveyor-prev]");
  const nextBtn = shell.querySelector("[data-conveyor-next]");
  const counterEl = shell.querySelector("[data-conveyor-counter]");
  const progressBar = shell.querySelector("[data-conveyor-bar]");
  const viewport = shell.querySelector(".conveyor-viewport");
  const dialog = document.getElementById("preview-dialog");

  const total = cards.length;
  if (!total || panels.length !== total) return;

  shell.classList.add("is-ready");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const intervalMs = 5500;
  let current = 0;
  let paused = false;
  let elapsed = 0;
  let lastTick = performance.now();

  const pad = (n) => String(n).padStart(2, "0");

  function syncConveyor(index) {
    current = ((index % total) + total) % total;
    elapsed = 0;
    if (progressBar) progressBar.style.width = "0%";

    cards.forEach((card, i) => {
      const diff = (i - current + total) % total;
      const slot = diff === 0 ? "active" : diff === 1 ? "next" : "prev";
      card.setAttribute("data-slot", slot);
      card.setAttribute("aria-pressed", slot === "active" ? "true" : "false");
    });

    panels.forEach((panel, i) => {
      const active = i === current;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });

    tabs.forEach((tab, i) => {
      const active = i === current;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (counterEl) {
      counterEl.textContent = `${pad(current + 1)} / ${pad(total)}`;
    }
  }

  // Quick-peek <dialog> state
  let previewItems = [];
  let previewIdx = 0;
  const dialogTitle = dialog && dialog.querySelector("[data-dialog-title]");
  const dialogCounter = dialog && dialog.querySelector("[data-dialog-counter]");
  const dialogImg = dialog && dialog.querySelector("[data-dialog-image]");
  const dialogRead = dialog && dialog.querySelector("[data-dialog-read]");
  const dialogPrev = dialog && dialog.querySelector("[data-dialog-prev]");
  const dialogNext = dialog && dialog.querySelector("[data-dialog-next]");
  const dialogClose = dialog && dialog.querySelector("[data-dialog-close]");

  function renderDialogPage(idx) {
    if (!dialog || !previewItems.length) return;
    previewIdx = ((idx % previewItems.length) + previewItems.length) % previewItems.length;
    const item = previewItems[previewIdx];
    const panel = panels[current];
    const title = panel.dataset.storyTitle || "";
    const readUrl = panel.dataset.readUrl || "truyen-tranh.html";

    if (dialogTitle) dialogTitle.textContent = title;
    if (dialogCounter) {
      dialogCounter.textContent = `TRANG ${pad(previewIdx + 1)} / ${pad(previewItems.length)} · BẢN XEM TRƯỚC`;
    }
    if (dialogImg) {
      dialogImg.src = item.full;
      dialogImg.alt = `${title} — Trang ${pad(previewIdx + 1)}`;
    }
    if (dialogRead) dialogRead.href = readUrl;
  }

  function openPreview(storyIdx, pageIdx) {
    if (storyIdx !== current) syncConveyor(storyIdx);
    const panel = panels[current];
    if (!dialog || typeof dialog.showModal !== "function") {
      window.location.href = panel.dataset.readUrl || "truyen-tranh.html";
      return;
    }
    previewItems = Array.from(panel.querySelectorAll("[data-preview-open]")).map((btn) => ({
      full: btn.dataset.full || btn.querySelector("img")?.getAttribute("src") || "",
    }));
    renderDialogPage(pageIdx);
    if (!dialog.open) dialog.showModal();
  }

  cards.forEach((card, idx) => {
    card.addEventListener("click", () => {
      if (idx === current) openPreview(idx, 0);
      else syncConveyor(idx);
    });
  });

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => syncConveyor(idx));
  });

  if (prevBtn) prevBtn.addEventListener("click", () => syncConveyor(current - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => syncConveyor(current + 1));

  panels.forEach((panel, sIdx) => {
    panel.querySelectorAll("[data-preview-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openPreview(sIdx, Number(btn.dataset.previewOpen || 0));
      });
    });
  });

  if (dialog) {
    if (dialogClose) dialogClose.addEventListener("click", () => dialog.close());
    if (dialogPrev) dialogPrev.addEventListener("click", () => renderDialogPage(previewIdx - 1));
    if (dialogNext) dialogNext.addEventListener("click", () => renderDialogPage(previewIdx + 1));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (dialog && dialog.open) {
      if (e.key === "ArrowLeft") renderDialogPage(previewIdx - 1);
      else if (e.key === "ArrowRight") renderDialogPage(previewIdx + 1);
      return;
    }
    if (shell.contains(document.activeElement)) {
      if (e.key === "ArrowLeft") syncConveyor(current - 1);
      else if (e.key === "ArrowRight") syncConveyor(current + 1);
    }
  });

  if (viewport) {
    let startX = 0;
    let startY = 0;
    viewport.addEventListener(
      "touchstart",
      (e) => {
        if (!e.changedTouches.length) return;
        startX = e.changedTouches[0].clientX;
        startY = e.changedTouches[0].clientY;
        paused = true;
      },
      { passive: true }
    );
    viewport.addEventListener(
      "touchend",
      (e) => {
        paused = false;
        if (!e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          syncConveyor(dx < 0 ? current + 1 : current - 1);
        }
      },
      { passive: true }
    );
  }

  shell.addEventListener("mouseenter", () => (paused = true));
  shell.addEventListener("mouseleave", () => (paused = false));
  shell.addEventListener("focusin", () => (paused = true));
  shell.addEventListener("focusout", (e) => {
    if (!shell.contains(e.relatedTarget)) paused = false;
  });

  syncConveyor(0);

  if (!reducedMotion) {
    const step = (now) => {
      const dt = now - lastTick;
      lastTick = now;
      const dialogOpen = Boolean(dialog && dialog.open);
      if (!paused && !dialogOpen && !document.hidden) {
        elapsed += dt;
        if (progressBar) {
          progressBar.style.width = `${Math.min(100, (elapsed / intervalMs) * 100)}%`;
        }
        if (elapsed >= intervalMs) {
          syncConveyor(current + 1);
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}


function initStudioInteractions() {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // 1. Topsy interactive expression cards -> live companion quote
  const poseCards = Array.from(document.querySelectorAll("#topsy .pose-card[data-quote]"));
  const quoteEl = document.querySelector("[data-topsy-quote]");
  if (poseCards.length && quoteEl) {
    const activatePose = (activeCard) => {
      poseCards.forEach((card) => {
        const isCurrent = card === activeCard;
        card.classList.toggle("is-active", isCurrent);
        card.setAttribute("aria-pressed", isCurrent ? "true" : "false");
      });
      const nextQuote = activeCard.dataset.quote;
      if (nextQuote && quoteEl.textContent !== nextQuote) {
        quoteEl.textContent = nextQuote;
        if (!reducedMotionQuery.matches) {
          quoteEl.classList.remove("is-popping");
          void quoteEl.offsetWidth;
          quoteEl.classList.add("is-popping");
        }
      }
    };

    poseCards.forEach((card) => {
      card.addEventListener("mouseenter", () => activatePose(card));
      card.addEventListener("click", () => activatePose(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activatePose(card);
        }
      });
    });
  }

  // 2. Process progressive step timeline illumination
  const processWrap = document.querySelector("#process .process-steps");
  if (processWrap) {
    const steps = Array.from(processWrap.children);
    const lightUpTo = (activeIdx) => {
      steps.forEach((step, idx) => step.classList.toggle("is-lit", idx <= activeIdx));
    };
    steps.forEach((step, idx) => {
      step.addEventListener("mouseenter", () => lightUpTo(idx));
      step.addEventListener("focusin", () => lightUpTo(idx));
    });
    processWrap.addEventListener("mouseleave", () => lightUpTo(-1));
    processWrap.addEventListener("focusout", (e) => {
      if (!processWrap.contains(e.relatedTarget)) lightUpTo(-1);
    });
  }

  // 3. Team Creator ID Cards -> 3D tilt + parallax layers + radial glare
  const tiltCards = Array.from(document.querySelectorAll("[data-tilt-card]"));
  if (!tiltCards.length) return;

  const resetCard = (card) => {
    card.classList.remove("is-tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  };

  tiltCards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      if (reducedMotionQuery.matches || e.pointerType === "touch") {
        resetCard(card);
        return;
      }
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const rx = ((0.5 - py) * 7).toFixed(2);
      const ry = ((px - 0.5) * 8).toFixed(2);

      card.classList.add("is-tilting");
      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    });

    card.addEventListener("pointerleave", () => resetCard(card));
    card.addEventListener("pointercancel", () => resetCard(card));
  });

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", (e) => {
      if (e.matches) tiltCards.forEach(resetCard);
    });
  }
}


function initComicsHub() {
  if (!document.body.classList.contains("comics-page")) return;

  const pad = (n) => String(n).padStart(2, "0");
  const cards = Array.from(document.querySelectorAll(".comic-card[data-story-id]"));
  const filterBtns = Array.from(document.querySelectorAll("[data-genre-filter]"));

  // 1. Genre filter chips (spotlights matching cards while keeping 1-row 3-card grid intact)
  if (filterBtns.length && cards.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.genreFilter || "all";
        filterBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        cards.forEach((card) => {
          const match = target === "all" || card.dataset.genre === target;
          card.setAttribute("data-match", match ? "true" : "false");
        });
      });
    });
  }

  // 2. Card quick-peek <dialog>
  const dialog = document.getElementById("comics-preview-dialog");
  if (dialog && cards.length) {
    const dTitle = dialog.querySelector("[data-dialog-title]");
    const dCounter = dialog.querySelector("[data-dialog-counter]");
    const dImage = dialog.querySelector("[data-dialog-image]");
    const dRead = dialog.querySelector("[data-dialog-read]");
    const dPrev = dialog.querySelector("[data-dialog-prev]");
    const dNext = dialog.querySelector("[data-dialog-next]");
    const dClose = dialog.querySelector("[data-dialog-close]");

    let activeCard = cards[0];
    let items = [];
    let idx = 0;

    const renderPreview = (nextIdx) => {
      if (!items.length) return;
      idx = ((nextIdx % items.length) + items.length) % items.length;
      const title = activeCard.dataset.storyTitle || "";
      const readUrl = activeCard.dataset.readUrl || "truyen-01.html#reader";
      if (dTitle) dTitle.textContent = title;
      if (dCounter) dCounter.textContent = `Trang ${pad(idx + 1)} / ${pad(items.length)} · Xem trước`;
      if (dImage) {
        dImage.src = items[idx];
        dImage.alt = `${title} — Trang ${pad(idx + 1)}`;
      }
      if (dRead) dRead.href = readUrl;
    };

    cards.forEach((card) => {
      const thumbs = Array.from(card.querySelectorAll("[data-comics-preview]"));
      thumbs.forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCard = card;
          items = thumbs.map((b) => b.dataset.full || b.querySelector("img")?.getAttribute("src") || "");
          renderPreview(Number(btn.dataset.comicsPreview || 0));
          if (typeof dialog.showModal === "function" && !dialog.open) {
            dialog.showModal();
          }
        });
      });
    });

    dClose?.addEventListener("click", () => dialog.close());
    dPrev?.addEventListener("click", () => renderPreview(idx - 1));
    dNext?.addEventListener("click", () => renderPreview(idx + 1));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    document.addEventListener("keydown", (e) => {
      if (!dialog.open) return;
      if (e.key === "ArrowLeft") renderPreview(idx - 1);
      else if (e.key === "ArrowRight") renderPreview(idx + 1);
    });
  }

  // 3. Artbook Spread Spotlight (#spotlight)
  const spotlight = document.querySelector("[data-spread-spotlight]");
  if (spotlight) {
    const tabs = Array.from(spotlight.querySelectorAll("[data-spotlight-tab]"));
    const img = spotlight.querySelector("[data-spotlight-image]");
    const glow = spotlight.querySelector(".spotlight-glow");
    const badge = spotlight.querySelector("[data-spotlight-badge]");
    const title = spotlight.querySelector("[data-spotlight-title]");
    const author = spotlight.querySelector("[data-spotlight-author]");
    const note = spotlight.querySelector("[data-spotlight-note]");
    const lighting = spotlight.querySelector("[data-spotlight-lighting]");
    const framing = spotlight.querySelector("[data-spotlight-framing]");
    const link = spotlight.querySelector("[data-spotlight-link]");
    const panel = spotlight.querySelector('[role="tabpanel"]');

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
          t.tabIndex = active ? 0 : -1;
        });
        if (panel) panel.setAttribute("aria-labelledby", tab.id);
        if (img && tab.dataset.src && img.getAttribute("src") !== tab.dataset.src) {
          img.classList.add("is-switching");
          img.onload = () => img.classList.remove("is-switching");
          img.src = tab.dataset.src;
          img.alt = `Phân cảnh tiêu biểu: ${tab.dataset.title || ""}`;
        }
        if (glow && tab.dataset.ambient) {
          glow.style.backgroundImage = `url("${tab.dataset.ambient}")`;
        }
        if (badge) badge.textContent = tab.dataset.badge || "";
        if (title) title.textContent = tab.dataset.title || "";
        if (author) author.textContent = tab.dataset.author || "";
        if (note) note.textContent = tab.dataset.note || "";
        if (lighting) lighting.textContent = tab.dataset.lighting || "";
        if (framing) framing.textContent = tab.dataset.framing || "";
        if (link && tab.dataset.href) link.href = tab.dataset.href;
      });
      tab.addEventListener("keydown", (event) => {
        const index = tabs.indexOf(tab);
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
    });
  }

  // 4. Sync saved reading progress from localStorage onto cards & hero resume CTA
  const resumeBtn = document.querySelector("[data-comics-resume]");
  const resumeLabel = document.querySelector("[data-comics-resume-label]");
  let latest = null;

  cards.forEach((card) => {
    const id = card.dataset.storyId;
    try {
      const raw = localStorage.getItem(`trident_reader_v2_story_${id}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.page !== "number" || saved.page <= 0) return;

      const pageNum = saved.page + 1;
      const total = saved.total || 1;
      const badge = card.querySelector("[data-card-progress]");
      const readLink = card.querySelector(".read");
      const targetHref = `truyen-0${id}.html?page=${pageNum}#reader`;

      if (badge) {
        badge.textContent = `Đang đọc · ${pad(pageNum)}/${pad(total)}`;
        badge.hidden = false;
      }
      if (readLink) {
        readLink.href = targetHref;
        readLink.innerHTML = `Đọc tiếp · ${pad(pageNum)} <span aria-hidden="true">↗</span>`;
        readLink.setAttribute("aria-label", `Đọc tiếp ${card.dataset.storyTitle} từ trang ${pageNum}`);
      }
      if (!latest || (saved.updatedAt || 0) >= (latest.updatedAt || 0)) {
        latest = {
          id,
          pageNum,
          title: card.dataset.storyTitle || `Issue 0${id}`,
          href: targetHref,
          updatedAt: saved.updatedAt || 0,
        };
      }
    } catch {
      /* Ignore storage access restrictions */
    }
  });

  if (latest && resumeBtn) {
    resumeBtn.href = latest.href;
    resumeBtn.setAttribute("aria-label", `Đọc tiếp ${latest.title} từ trang ${latest.pageNum}`);
    if (resumeLabel) {
      resumeLabel.textContent = `Đọc tiếp · trang ${pad(latest.pageNum)}`;
    }
    resumeBtn.hidden = false;
  }
}
