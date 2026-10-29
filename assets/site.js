/* ==========================================================================
   TRIDENT STUDIO — Interactive UI, Artbook Reader & Brief Generator (V2)
   100% Vanilla ES6 · Offline file:// Ready (Zero fetch/CORS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initMobileNavAutoClose();
  initArtbookReader();
  initContactBriefForm();
});

function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

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

  const copyBtn = document.getElementById("copy-message");
  const output = document.getElementById("form-output");
  const feedback = document.getElementById("form-feedback");
  let draft = "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const read = (k) => String(data.get(k) || "").trim();

    draft = [
      "TRIDENT STUDIO — CREATIVE BRIEF / LIÊN HỆ",
      "──────────────────────────────────────────",
      `Họ và tên : ${read("name")}`,
      `Email     : ${read("email")}`,
      `Hạng mục  : ${read("subject")}`,
      "",
      "Nội dung trao đổi:",
      read("message"),
    ].join("\n");

    output.textContent = draft;
    output.classList.add("visible");
    copyBtn.hidden = false;
    feedback.textContent =
      "Đã tạo phiếu nội dung bên dưới. Bấm 'Sao chép nội dung' để gửi nhanh qua kênh chính thức của Trident Studio.";
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(draft);
      feedback.textContent = "✓ Đã sao chép nội dung vào bộ nhớ tạm!";
    } catch {
      feedback.textContent =
        "Trình duyệt chặn sao chép tự động — bạn hãy bôi đen và copy khung bản nháp bên dưới nhé.";
    }
  });
}
