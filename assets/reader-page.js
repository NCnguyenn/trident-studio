/* Shared reader for the three static artbooks. No remote requests or storage. */
(() => {
  const shell = document.querySelector('.reader-shell');
  if (!shell) return;
  const thumbs = [...shell.querySelectorAll('.reader-thumb')];
  const image = shell.querySelector('.reader-image');
  const viewport = shell.querySelector('.page-viewport');
  const pageSelect = shell.querySelector('#page-select');
  const mode = shell.querySelector('#reading-mode');
  const strip = shell.querySelector('.reader-strip');
  const toggle = shell.querySelector('[data-thumbnails]');
  const full = shell.querySelector('[data-fullscreen]');
  const continuous = shell.querySelector('.continuous-pages');
  const feedback = shell.querySelector('.reader-feedback');
  let current = 0, zoom = 1, restoreFocus;
  const title = image.dataset.title;
  const total = thumbs.length;
  const source = i => thumbs[i].dataset.source || thumbs[i].querySelector('img').getAttribute('src');
  const label = i => `${title} — Trang ${String(i+1).padStart(2,'0')}/${total}`;

  function setZoom(value) {
    zoom = Math.max(1, Math.min(4, Math.round(value*100)/100));
    image.style.width = `${zoom*100}%`;
    continuous.querySelectorAll('img').forEach(el => el.style.width = `${zoom*100}%`);
    shell.querySelector('[data-zoom-reset]').textContent = `${Math.round(zoom*100)}%`;
    shell.querySelector('[data-zoom-out]').disabled = zoom === 1;
    shell.querySelector('[data-zoom-in]').disabled = zoom === 4;
    if (zoom === 1) viewport.scrollLeft = 0;
  }
  function update() {
    pageSelect.value = String(current);
    shell.querySelectorAll('[data-prev]').forEach(b => b.disabled = current === 0);
    shell.querySelectorAll('[data-next]').forEach(b => b.disabled = current === total-1);
    shell.querySelector('.reader-progress span').style.width = `${(current+1)/total*100}%`;
    thumbs.forEach((t,i) => {
      if (i === current) t.setAttribute('aria-current','page');
      else t.removeAttribute('aria-current');
    });
    feedback.textContent = `Trang ${current+1} / ${total}`;
  }
  function go(index) {
    current = Math.max(0, Math.min(total-1, index));
    image.src = source(current);
    image.width = Number(thumbs[current].dataset.width);
    image.height = Number(thumbs[current].dataset.height);
    shell.style.setProperty('--page-ratio', image.width/image.height);
    image.alt = label(current);
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
    update();
    if (mode.value === 'scroll') {
      const target = continuous.children[current];
      continuous.scrollTo({top:target.offsetTop-continuous.offsetTop,behavior:'instant'});
    }
    if (current+1 < total) {const pre = new Image();pre.src = source(current+1);}
  }
  image.addEventListener('error', () => feedback.textContent = 'Không tải được trang truyện. Hãy thử chọn lại trang.');
  shell.querySelectorAll('[data-prev]').forEach(b => b.addEventListener('click',()=>go(current-1)));
  shell.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click',()=>go(current+1)));
  thumbs.forEach((b,i) => b.addEventListener('click',()=>go(i)));
  pageSelect.addEventListener('change',()=>go(Number(pageSelect.value)));
  shell.querySelector('[data-zoom-in]').addEventListener('click',()=>setZoom(zoom+.25));
  shell.querySelector('[data-zoom-out]').addEventListener('click',()=>setZoom(zoom-.25));
  shell.querySelector('[data-zoom-reset]').addEventListener('click',()=>setZoom(1));
  toggle.addEventListener('click',()=>{
    strip.hidden = !strip.hidden;
    toggle.setAttribute('aria-expanded',String(!strip.hidden));
  });
  mode.addEventListener('change',()=>{
    const scrolling = mode.value === 'scroll';
    if (scrolling && !continuous.children.length) thumbs.forEach((_,i)=>{
      const img = new Image();img.width=Number(thumbs[i].dataset.width);img.height=Number(thumbs[i].dataset.height);img.src=source(i);img.alt=label(i);img.loading='lazy';continuous.append(img);
    });
    shell.querySelector('.reader-stage').hidden = scrolling;
    continuous.hidden = !scrolling;
    setZoom(1);
    go(current);
  });
  // Track the page nearest the top of the scrolling reader without moving focus.
  continuous.addEventListener('scroll',()=>{
    const top = continuous.getBoundingClientRect().top;
    let nearest = 0, distance = Infinity;
    [...continuous.children].forEach((el,i)=>{
      const d = Math.abs(el.getBoundingClientRect().top-top);
      if(d<distance){distance=d;nearest=i;}
    });
    if(continuous.scrollTop>0 && continuous.scrollTop+continuous.clientHeight>=continuous.scrollHeight-2)nearest=total-1;
    if(current!==nearest){current=nearest;image.src=source(current);image.alt=label(current);update();}
  },{passive:true});
  function syncFullscreen(enabled) {
    shell.classList.toggle('is-fullscreen',enabled);
    document.body.classList.toggle('reader-locked',enabled);
    full.setAttribute('aria-pressed',String(enabled));
    full.innerHTML = enabled ? '✕ <span>Thoát toàn màn hình</span>' : '⛶ <span>Toàn màn hình</span>';
    if(enabled) full.focus(); else restoreFocus?.focus({preventScroll:true});
  }
  full.addEventListener('click',async()=>{
    if(shell.classList.contains('is-fullscreen')) {
      if(document.fullscreenElement) await document.exitFullscreen();
      else syncFullscreen(false);
    } else {
      restoreFocus=document.activeElement;
      try {await shell.requestFullscreen();} catch { /* CSS fullscreen for unsupported browsers. */ }
      syncFullscreen(true);
    }
  });
  document.addEventListener('fullscreenchange',()=>syncFullscreen(document.fullscreenElement===shell));
  document.addEventListener('keydown',e=>{
    const fullscreen=shell.classList.contains('is-fullscreen');
    if(e.key==='Escape'&&fullscreen){
      if(document.fullscreenElement) document.exitFullscreen().catch(()=>syncFullscreen(false));
      else syncFullscreen(false);
      return;
    }
    if(fullscreen&&e.key==='Tab'){
      const controls=[...shell.querySelectorAll('button,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;
    const r=shell.getBoundingClientRect();
    if(!fullscreen&&(r.top>innerHeight*.5||r.bottom<innerHeight*.5))return;
    if(zoom!==1||mode.value!=='page')return;
    if(e.key==='ArrowLeft'){e.preventDefault();go(current-1);}
    if(e.key==='ArrowRight'){e.preventDefault();go(current+1);}
  });
  let start;
  viewport.addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
  viewport.addEventListener('touchend',e=>{
    if(!start||zoom!==1||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)go(current+(dx<0?1:-1));
    start=null;
  },{passive:true});
  const mobile=document.querySelector('.mobile-nav');
  document.addEventListener('click',e=>{if(mobile?.open&&!mobile.contains(e.target))mobile.open=false;});
  document.querySelector('.start-reading').addEventListener('click',()=>shell.focus({preventScroll:true}));
  strip.hidden = innerWidth<1200;
  toggle.setAttribute('aria-expanded',String(!strip.hidden));
  setZoom(1);go(0);
})();
