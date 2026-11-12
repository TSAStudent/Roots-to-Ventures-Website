/* Root to Ventures — shared interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav ---------- */
  const nav = $('.nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 24);
    const prog = $('.scroll-progress');
    if (prog) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); document.body.style.overflow = '';
    }));
  }

  // Active link
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });

  /* ---------- Cursor glow ---------- */
  const glow = $('.glow-cursor');
  if (glow && !reduced) {
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const tick = () => { x += (tx - x) * 0.12; y += (ty - y) * 0.12; glow.style.transform = `translate(${x - 250}px, ${y - 250}px)`; requestAnimationFrame(tick); };
    tick();
  }

  /* ---------- Hero rotator ---------- */
  $$('[data-rotator]').forEach(root => {
    // Zenith-style carousel: slides translate horizontally with a gutter,
    // next slide peeks on the right, looping via cloned edge slides.
    const track = $('.carousel-track', root);
    const originals = $$('.hero-slide', track || root);
    const dotsWrap = $('.hero-dots', root);
    const interval = Number(root.dataset.interval || 7000);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!track || originals.length < 2) return;
    const n = originals.length;
    originals.forEach(s => { if (s.dataset.src) s.style.backgroundImage = `url("${s.dataset.src}")`; });
    const firstClone = originals[0].cloneNode(true), lastClone = originals[n - 1].cloneNode(true);
    firstClone.setAttribute('aria-hidden', 'true'); lastClone.setAttribute('aria-hidden', 'true');
    track.appendChild(firstClone); track.insertBefore(lastClone, originals[0]);
    const slides = $$('.hero-slide', track);
    let i = 1, timer, animating = false;
    const dots = originals.map((_, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', `Slide ${k + 1}`);
      b.addEventListener('click', () => { go(k + 1); restart(); });
      if (dotsWrap) dotsWrap.appendChild(b);
      return b;
    });
    const gap = () => parseFloat(getComputedStyle(track).gap) || 0;
    const offset = idx => -(idx * (slides[0].getBoundingClientRect().width + gap()));
    const render = anim => {
      track.classList.toggle('no-anim', !anim);
      track.style.transform = `translate3d(${offset(i)}px,0,0)`;
      const real = (i - 1 + n) % n;
      dots.forEach((d, k) => d.classList.toggle('active', k === real));
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      if (!anim) { void track.offsetWidth; track.classList.remove('no-anim'); animating = false; }
    };
    const go = idx => { if (animating || location.search.includes('static')) return; animating = true; i = idx; render(true); };
    track.addEventListener('transitionend', e => {
      if (e.target !== track) return;
      animating = false;
      if (i === n + 1) { i = 1; render(false); }
      else if (i === 0) { i = n; render(false); }
    });
    const restart = () => { clearInterval(timer); if (!reduced && !location.search.includes('static')) timer = setInterval(() => go(i + 1), interval); };
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', restart);
    let sx = 0;
    root.addEventListener('touchstart', e => { sx = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
    root.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); restart(); });
    addEventListener('resize', () => render(false));
    render(false);
    restart();
  });

  /* ---------- Reveal on scroll ---------- */
  $$('.reveal-words').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = tok; w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('w')) walk(child);
      });
    };
    walk(el);
    $$('.w span', el).forEach((s, idx) => s.style.transitionDelay = (idx * 0.04) + 's');
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  const staticMode = location.search.includes('static');
  if (staticMode) document.documentElement.classList.add('static');
  $$('.reveal, .reveal-words, [data-count], .bar').forEach(el => {
    if (staticMode) { el.classList.add('in'); if (el.hasAttribute('data-count')) el.textContent = (el.dataset.prefix||'') + parseFloat(el.dataset.count).toLocaleString() + (el.dataset.suffix||''); }
    else io.observe(el);
  });

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
    const dur = 1800, start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + (target * eased).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    if (reduced) { el.textContent = prefix + target.toLocaleString() + suffix; return; }
    requestAnimationFrame(step);
  }

  /* ---------- Marquee duplication ---------- */
  $$('.marquee-track').forEach(t => { t.innerHTML += t.innerHTML; });

  /* ---------- Accordion ---------- */
  $$('.acc-item').forEach(item => {
    const btn = $('.acc-btn', item), panel = $('.acc-panel', item);
    btn?.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Tabs ---------- */
  $$('[data-tabs]').forEach(group => {
    const tabs = $$('.tab', group);
    const panels = $$(`[data-tab-panel="${group.dataset.tabs}"]`);
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active')); t.classList.add('active');
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === t.dataset.tab));
      if (t.dataset.tab) history.replaceState(null, '', '#' + t.dataset.tab);
    }));
  });
  {
    const h = location.hash.slice(1);
    const t = h && $(`.tab[data-tab="${h}"]`);
    if (t) t.click();
  }

  /* ---------- Venture.bot demo ---------- */
  const KB = [
    { k: ['hello', 'hi', 'hey', 'start'], r: "Hey founder! I'm <b>Venture.bot</b>, your AI co-founder. I've been trained on every mentor session from the bootcamp. Want to start with your <b>problem statement</b>, your <b>finances</b>, or your <b>pitch</b>?" },
    { k: ['problem', 'idea', 'ideation', 'solution'], r: "Let's use the <b>Problem → Solution → Value</b> framework from Day 1. First: who has this problem, how often, and what do they do about it today? Tell me the problem in one sentence and I'll pressure-test it." },
    { k: ['customer', 'persona', 'audience', 'target'], r: "Great, customer clarity is where most Day 1 teams got stuck. Try the <b>STP</b> lens: Segment the market, Target one group you can reach this month, then Position your offer against what they use now. Who is the single most painful-to-ignore customer?" },
    { k: ['price', 'pricing', 'cost', 'finance', 'financial', 'burn', 'runway', 'revenue', 'profit', 'money'], r: "From Ross Gillispie's Day 2 session: split your costs into <b>fixed</b> (rent, software) and <b>variable</b> (per-unit). Then: Revenue − Costs = Profit, and Cash ÷ Monthly Burn = <b>Runway</b>. Give me your monthly costs and price and I'll compute your break-even." },
    { k: ['market', 'marketing', '4p', 'promotion', 'go-to-market', 'gtm'], r: "Let's build a go-to-market with the <b>4 Ps</b>: Product, Price, Place, Promotion. Where does your customer already spend attention? Start with one channel you can test for $0 this week, then measure." },
    { k: ['pitch', 'deck', 'slide', 'present', 'story', 'investor'], r: "Srinivas Maram's Day 3 structure: <b>Hook → Story → Ask</b>. Deck order: Intro, Problem, Solution, Market Size, Business Model, GTM, Competitors, Team, Financials, The Ask. Want me to draft your 30-second hook?" },
    { k: ['vc', 'demo day', 'simulation', 'simulate', 'practice', 'q&a'], r: "Entering <b>VC Simulation</b> mode. I'll play a Sierra Ventures partner. First question: <i>How big is this market really, and why are you the team to win it?</i> Answer in under 60 seconds." },
    { k: ['immigrant', 'visa', 'family', 'background', 'first-gen', 'first gen'], r: "Your background is an asset, not a footnote. Founders who've navigated a new country spot gaps others miss. Mr. Saxena said it best at Demo Day: he went from <b>nothing → something → everything</b>. Let's turn that lived experience into your unfair advantage." },
    { k: ['module', 'lesson', 'learn', 'course', 'curriculum'], r: "There are <b>16 modules</b>: from problem identification and business models through financial modeling, marketing, and investor relations. Each has a video, a guided reading, and a quiz. Want me to recommend where to start?" },
    { k: ['thank', 'thanks'], r: "Anytime. That's what co-founders are for. Keep building — I'll be here between sessions." },
  ];
  const FALLBACK = [
    "Interesting. Let's sharpen it: who feels this most, and what would they pay to make it go away?",
    "Got it. Which stage are you at — <b>idea</b>, <b>plan</b>, or <b>pitch</b>? I'll adapt.",
    "Noted. Quick coaching question: what's the one assumption that, if wrong, breaks this idea?",
  ];
  $$('[data-chat]').forEach(chat => {
    const scope = chat.closest('.phone-screen') || chat.parentElement;
    const body = chat.classList.contains('chat-body') ? chat : $('.chat-body', scope), form = $('.chat-input', scope), input = $('input', form);
    const stamp = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const add = (html, who) => {
      const m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html + `<span class="stamp">${stamp()}</span>`;
      body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
    };
    const reply = text => {
      const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); body.scrollTop = body.scrollHeight;
      const low = text.toLowerCase();
      const hit = KB.find(e => e.k.some(k => low.includes(k)));
      const r = hit ? hit.r : FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      setTimeout(() => { t.remove(); add(r, 'bot'); }, 900 + Math.min(1400, r.length * 6));
    };
    const send = text => { if (!text.trim()) return; add(text.replace(/</g, '&lt;'), 'me'); input.value = ''; reply(text); };
    form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
    $$('.chip', chat.closest('section') || document).forEach(c => c.addEventListener('click', () => send(c.dataset.prompt || c.textContent)));

    // Intro script
    const intro = JSON.parse(chat.dataset.intro || '[]');
    let delay = 600;
    intro.forEach(([who, html]) => {
      setTimeout(() => {
        if (who === 'bot') { const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); body.scrollTop = body.scrollHeight; setTimeout(() => { t.remove(); add(html, 'bot'); }, 900); }
        else add(html, 'me');
      }, delay);
      delay += who === 'bot' ? 1800 : 1100;
    });
  });

  /* ---------- Forms ---------- */
  $$('form[data-demo-form]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const ok = $(f.dataset.demoForm);
    f.style.display = 'none'; ok?.classList.add('show'); ok?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  /* ---------- Tilt on cards (subtle) ---------- */
  if (!reduced && matchMedia('(hover:hover)').matches) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
