/* Roots to Ventures — shared interactions */
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
      track.classList.toggle('no-anim', !anim || reduced);
      track.style.transform = `translate3d(${offset(i)}px,0,0)`;
      const real = (i - 1 + n) % n;
      dots.forEach((d, k) => d.classList.toggle('active', k === real));
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      if (!anim) { void track.offsetWidth; track.classList.remove('no-anim'); animating = false; }
    };
    const settle = () => {
      animating = false;
      if (i === n + 1) { i = 1; render(false); }
      else if (i === 0) { i = n; render(false); }
    };
    let settleTimer;
    const go = idx => {
      if (animating || idx === i || location.search.includes('static')) return;
      i = idx;
      if (reduced) { render(false); settle(); return; }
      animating = true; render(true);
      clearTimeout(settleTimer); settleTimer = setTimeout(() => { if (animating) settle(); }, 900);
    };
    track.addEventListener('transitionend', e => {
      if (e.target !== track || !animating) return;
      clearTimeout(settleTimer); settle();
    });
    const restart = () => { clearInterval(timer); if (!location.search.includes('static')) timer = setInterval(() => go(i + 1), interval); };
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
  const openTabFromHash = () => {
    const h = location.hash.slice(1);
    const t = h && $(`.tab[data-tab="${h}"]`);
    if (t) t.click();
  };
  openTabFromHash();
  addEventListener('hashchange', openTabFromHash);

  /* ---------- Venture.bot demo ---------- */
  const KB = [
    { k: ['problem', 'idea', 'ideation', 'solution'], r: "Let's use the <b>Problem → Solution</b> framework from Workshop 1 with Rithvik. First: who has this problem, how often, and what do they do about it today? Answer those three and your solution almost writes itself." },
    { k: ['customer', 'persona', 'audience', 'target'], r: "Good, customer clarity is where most Workshop 1 teams got stuck. Describe <b>one</b> person who has this problem: their age, where they live, what they do on a Saturday. Build for that person first, then widen." },
    { k: ['price', 'pricing', 'cost', 'finance', 'financial', 'burn', 'runway', 'revenue', 'profit', 'money', 'budget'], r: "From Workshop 2 (Finance &amp; Marketing): split your costs into <b>fixed</b> (things you pay no matter what) and <b>variable</b> (things that grow with each sale). Then price so one sale covers its variable cost with room left over. What does one unit cost you to deliver?" },
    { k: ['market', 'marketing', '4p', '4ps', 'promotion', 'go-to-market', 'gtm', 'social media', 'instagram'], r: "Let's build your marketing plan with the <b>4 Ps</b>: Product, Price, Place, Promotion. Where does your customer already spend time? Start there with one channel instead of five." },
    { k: ['pitch', 'deck', 'slide', 'present', 'story', 'investor'], r: "Sri's Workshop 3 structure: <b>Hook → Story → Ask</b>. Deck order: Problem, Solution, Customer, Business Model, Numbers, Team, Ask. Judges score idea, financial plan, and delivery, so give each one a slide that proves it." },
    { k: ['vc', 'vcs', 'demo day', 'simulation', 'simulate', 'practice', 'q&a', 'prep'], r: "Entering <b>VC prep</b> mode. I'll play an early-stage investor like the one the top 3 teams met. First question: <i>How many people have this problem, and how do you know?</i>" },
    { k: ['immigrant', 'visa', 'family', 'background', 'first-gen', 'first gen', 'parents'], r: "Your background is an asset, not a footnote. Founders who have watched a family start over spot gaps others miss, and that story belongs in your pitch. What did your family have to figure out that nobody taught them?" },
    { k: ['module', 'lesson', 'learn', 'course', 'curriculum', 'first', 'begin'], r: "Follow the workshop order: <b>1. Problem &amp; Solution</b>, <b>2. Finance &amp; Marketing</b>, <b>3. Pitch Development</b>. Each one builds on the last, the same way a real business gets built. Tell me where you are and I'll pick up from there." },
    { k: ['thank', 'thanks'], r: "Anytime. That's what co-founders are for. Keep building, and I'll be here between Saturdays." },
    { k: ['hello', 'hi', 'hey'], r: "Hey founder! I'm <b>Venture.bot</b>, your AI co-founder. I've learned from every Roots to Ventures workshop. Want to start with your <b>problem</b>, your <b>numbers</b>, or your <b>pitch</b>?" },
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
      const has = k => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${k.length > 3 ? '(?:e?s)?' : ''}(?![a-z0-9])`).test(low);
      const hit = KB.find(e => e.k.some(has));
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
    if (!f.reportValidity()) return;
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
