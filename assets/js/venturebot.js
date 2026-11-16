/* Venture.bot app: full chat (chat.html) and Business Plan Grader (grader.html) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const md = text => {
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
    const out = []; let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    String(text).split(/\n/).forEach(raw => {
      const line = raw.trim();
      const ul = line.match(/^[-*•]\s+(.*)/), ol = line.match(/^\d+[.)]\s+(.*)/);
      if (ul || ol) {
        const t = ul ? 'ul' : 'ol';
        if (list !== t) { close(); out.push(`<${t}>`); list = t; }
        out.push(`<li>${inline((ul || ol)[1])}</li>`);
      } else if (!line) close();
      else { close(); out.push(`<p>${inline(line)}</p>`); }
    });
    close();
    return out.join('');
  };

  const api = async (path, body) => {
    if (location.protocol === 'file:') throw new Error('Venture.bot needs the site to run on a server (python3 server.py).');
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let data = {};
    try { data = await r.json(); } catch (e) { /* non-JSON */ }
    if (!r.ok) throw new Error(data.error || `Venture.bot is unavailable right now (error ${r.status}).`);
    return data;
  };

  /* ================= CHAT ================= */
  const chatApp = $('[data-vb-chat]');
  if (chatApp) {
    const thread = $('[data-vb-thread]', chatApp), form = $('[data-vb-form]', chatApp), box = $('textarea', form), sendBtn = $('button', form);
    const SUGGEST = {
      '': [['Start from zero', 'I want to start a business but I don’t have an idea yet. Where do I begin?'], ['Price my product', 'How do I figure out what to charge for my product?'], ['First customers', 'How do I get my first 10 customers with no money for ads?'], ['Pitch Day', 'What do Pitch Day judges look for?']],
      idea: [['Test my idea', 'I want to sell healthy homemade snacks to students at my school. Is this a real problem?'], ['Problem statement', 'Help me write a strong problem statement.'], ['Find problems', 'How do I find problems worth solving in my own community?'], ['Validate it', 'How can I check that people actually want my idea before building it?']],
      plan: [['Break-even', 'We sell henna kits for $12 and each kit costs us $4.50 to make. A booth at the Diwali mela costs $90. How many kits do we need to sell to break even?'], ['Startup budget', 'Help me make a simple startup budget for a tutoring business.'], ['Marketing plan', 'Build me a marketing plan for my first 50 customers on a $0 budget.'], ['Fixed vs variable', 'What is the difference between fixed and variable costs?']],
      pitch: [['Structure', 'How should I structure a 3-minute pitch?'], ['Opening hook', 'Give me ideas for a strong opening hook for my pitch about a bilingual tutoring app.'], ['Nerves', 'How do I stop getting nervous when I pitch?'], ['The ask', 'What should I ask the judges for at the end of my pitch?']],
      vc: [['Start the sim', 'Start the VC simulation. My business is a bilingual tutoring service for immigrant families.'], ['Toughest questions', 'What are the toughest questions investors ask high school founders?'], ['Market size', 'How do I answer “how big is your market?”'], ['Competition', 'An investor says a big company could copy me. How do I respond?']],
    };
    let mode = new URLSearchParams(location.search).get('mode') || '';
    if (!(mode in SUGGEST)) mode = '';
    let history = [], busy = false;

    const scroll = () => { thread.scrollTop = thread.scrollHeight; };
    const addMsg = (who, html, cls = '') => {
      const m = document.createElement('div');
      m.className = `vb-msg ${who} ${cls}`.trim();
      m.innerHTML = `<div class="av">${who === 'me' ? 'Y' : 'V'}</div><div><div class="who">${who === 'me' ? 'You' : 'Venture.bot'}</div><div class="bubble">${html}</div></div>`;
      $('.vb-empty', thread)?.remove();
      thread.appendChild(m); scroll(); return m;
    };
    const empty = () => {
      const s = SUGGEST[mode];
      thread.innerHTML = `<div class="vb-empty"><div class="vb-logo">V</div><h3>What are we building today?</h3><p>${esc($(`.vb-mode[data-mode="${mode}"]`).dataset.desc)}. Pick a starter or type your own question.</p><div class="vb-suggest">${s.map(([t, q]) => `<button type="button" data-q="${esc(q)}"><b>${esc(t)}</b>${esc(q)}</button>`).join('')}</div></div>`;
      $$('.vb-suggest button', thread).forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
    };
    const setMode = m => {
      mode = m; history = [];
      $$('.vb-mode', chatApp).forEach(b => b.classList.toggle('active', b.dataset.mode === m));
      const b = $(`.vb-mode[data-mode="${m}"]`, chatApp);
      $('[data-vb-mode-name]', chatApp).textContent = b.dataset.name;
      $('[data-vb-mode-desc]', chatApp).textContent = b.dataset.desc;
      empty();
    };
    const send = async text => {
      text = (text || '').trim();
      if (!text || busy) return;
      busy = true; sendBtn.disabled = true;
      addMsg('me', esc(text).replace(/\n/g, '<br>'));
      history.push({ role: 'user', content: text });
      box.value = ''; box.style.height = '';
      const t = addMsg('bot', '<span class="vb-typing"><i></i><i></i><i></i></span>');
      $('.bubble', t).style.padding = '0';
      try {
        const { reply } = await api('/api/chat', { messages: history, mode: mode || null });
        history.push({ role: 'assistant', content: reply });
        $('.bubble', t).style.padding = ''; $('.bubble', t).innerHTML = md(reply);
      } catch (e) {
        history.pop();
        t.classList.add('err'); $('.bubble', t).style.padding = ''; $('.bubble', t).textContent = e.message;
      }
      scroll(); busy = false; sendBtn.disabled = false; box.focus();
    };

    $$('.vb-mode', chatApp).forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('[data-vb-new]', chatApp).addEventListener('click', () => setMode(mode));
    form.addEventListener('submit', e => { e.preventDefault(); send(box.value); });
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(box.value); } });
    box.addEventListener('input', () => { box.style.height = 'auto'; box.style.height = Math.min(box.scrollHeight, 160) + 'px'; });
    setMode(mode);
    const q = new URLSearchParams(location.search).get('q');
    if (q) send(q);
    window.VentureBotChat = { send, setMode };
  }

  /* ================= GRADER ================= */
  const grader = $('[data-grader]');
  if (grader) {
    const QUESTIONS = [
      { id: 'pitch', label: 'Your business', q: "What's your business called, and what does it do in one sentence?", hint: 'Name + what you sell + who it’s for. Example: “SnackSmart sells healthy after-school snacks to students at Ranchview.”' },
      { id: 'problem', label: 'Problem', q: "What problem are you solving, and who has it? How do you know it's a real problem?", hint: 'Describe who struggles, how often, and your evidence: conversations, a survey, your own experience.' },
      { id: 'solution', label: 'Solution', q: 'How does your product or service solve it, and what makes it better than what people use today?', hint: 'Explain how it works and what customers use now instead. Why would they switch?' },
      { id: 'market', label: 'Target market', q: 'Who is your first customer? About how many of them are there, and where do you find them?', hint: 'Be specific: age, location, situation. A rough count and the places they already spend time.' },
      { id: 'revenue', label: 'Revenue & pricing', q: 'How will you make money? What will you charge, and what does it cost you to deliver one unit or one customer?', hint: 'Give real numbers: price, cost per unit, and what you keep per sale.' },
      { id: 'funding', label: 'Costs & funding', q: 'What do you need to launch, how much will it cost, and how would you use $100 of seed money?', hint: 'List your startup costs with dollar amounts and say exactly where seed money goes.' },
      { id: 'marketing', label: 'Marketing', q: 'How will your first 50 customers hear about you and decide to buy?', hint: 'Name the channels (places, groups, platforms) and the reason someone would say yes.' },
      { id: 'execution', label: 'Team & next steps', q: "Who's on your team, why are you the right people, and what will you get done in the next 30 days?", hint: 'Roles, relevant skills or experience, and 2–3 measurable goals for the next month.' },
    ];
    const SAMPLE = {
      pitch: 'LinguaLink Tutoring connects immigrant families in Irving with bilingual high school tutors who teach math and reading in the family’s home language.',
      problem: 'Many immigrant parents in our area want to help their kids with homework but don’t speak English well enough, and big tutoring centers cost $150–$250 a month. We surveyed 42 families at our temple and outside Patel Brothers, and 31 said they had skipped tutoring because of the cost or the language barrier.',
      solution: 'Families book 1-hour sessions with trained high school tutors who speak Hindi, Telugu, Urdu, Spanish or Vietnamese, at the public library or over Zoom. Tutors also send parents a short weekly progress update in their own language, which no big tutoring center does.',
      market: 'Our first customers are immigrant parents of K–8 students in Irving and Coppell. Irving ISD has about 30,000 K–8 students and over 40% are English learners, so even 1% of them is 120+ families. We’ll find them through temples, mosques, churches, cultural associations and ESL classes.',
      revenue: 'We charge $15 per session or $50 for a pack of 4. Tutors get $10 per session, and booking software and Zoom cost about $1 per session, so we keep about $4 per session.',
      funding: 'We need about $180 to launch: $60 for flyers in 5 languages, $40 for a simple website, $50 for tutor training materials and $30 for background checks. We’d use $100 of seed money for the flyers and our first two tutor trainings.',
      marketing: 'We’ll put translated flyers at 6 temples, mosques and grocery stores, post in parent WhatsApp groups, and give every family a free first session. Families who refer a friend get a free session.',
      execution: 'We are three Ranchview juniors. Priya speaks Telugu and Hindi and has tutored for two years, Diego handles Spanish-speaking families and our website, and I manage the finances. In the next 30 days we’ll recruit 6 tutors, run 3 free pilot sessions and sign up our first 10 paying families.',
    };
    const STORE = 'vb-plan-answers';
    let answers = {};
    try { answers = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { answers = {}; }
    let cur = 0;
    const el = n => $(`[data-pg-${n}]`, grader);
    const input = el('input');
    const words = s => (s.trim().match(/\S+/g) || []).length;
    const save = () => { try { localStorage.setItem(STORE, JSON.stringify(answers)); } catch (e) { /* ignore */ } };

    const renderSteps = () => {
      const n = QUESTIONS.filter(q => (answers[q.id] || '').trim()).length;
      el('count').textContent = `${n} of ${QUESTIONS.length} answered`;
      el('bar').style.width = (n / QUESTIONS.length * 100) + '%';
      el('steps').innerHTML = QUESTIONS.map((q, i) => `<li class="${(answers[q.id] || '').trim() ? 'done' : ''} ${i === cur ? 'cur' : ''}"><button type="button" data-i="${i}"><span class="n">${(answers[q.id] || '').trim() && i !== cur ? '✓' : i + 1}</span><span class="lbl">${esc(q.label)}</span></button></li>`).join('');
      $$('button', el('steps')).forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
    };
    const go = i => {
      cur = Math.max(0, Math.min(QUESTIONS.length - 1, i));
      const q = QUESTIONS[cur];
      el('num').textContent = `Question ${cur + 1} of ${QUESTIONS.length}`;
      el('q').textContent = q.q; el('hint').textContent = q.hint;
      input.value = answers[q.id] || '';
      el('words').textContent = `${words(input.value)} words`;
      el('back').style.visibility = cur ? 'visible' : 'hidden';
      el('next').textContent = cur === QUESTIONS.length - 1 ? 'Grade my plan' : 'Next question';
      el('error').hidden = true;
      renderSteps();
    };
    input.addEventListener('input', () => {
      answers[QUESTIONS[cur].id] = input.value; save();
      el('words').textContent = `${words(input.value)} words`; renderSteps();
    });
    el('back').addEventListener('click', () => go(cur - 1));
    el('next').addEventListener('click', () => (cur === QUESTIONS.length - 1 ? grade() : go(cur + 1)));
    el('sample').addEventListener('click', () => { answers = { ...SAMPLE }; save(); go(cur); });
    el('edit').addEventListener('click', () => { el('results').hidden = true; el('quiz').hidden = false; go(0); grader.scrollIntoView({ behavior: 'smooth' }); });

    const color = s => s >= 8 ? '#6f9a3b' : s >= 6 ? '#e2a72e' : s >= 4 ? '#ce7942' : '#c8553d';
    const track = s => s >= 8 ? '#e6f0d6' : s >= 6 ? '#fbefcf' : s >= 4 ? '#f7e3d5' : '#f6dcd5';
    const ring = (score, size, stroke, cls, label) => {
      const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - score / 10);
      return `<div class="ring ${cls}" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${track(score)}" stroke-width="${stroke}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color(score)}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}"/></svg><span class="num">${label}</span></div>`;
    };
    const curve = (overall, pct) => {
      const W = 460, H = 210, P = 28, mean = 5.4, sd = 1.5;
      const X = v => P + (v - 1) / 9 * (W - 2 * P), pdf = v => Math.exp(-((v - mean) ** 2) / (2 * sd * sd));
      const Y = v => H - 34 - pdf(v) * (H - 64);
      const pts = []; for (let v = 1; v <= 10.001; v += 0.1) pts.push([X(v), Y(v)]);
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const fillPts = pts.filter(p => p[0] <= X(overall));
      const area = `M${X(1)} ${H - 34} ` + fillPts.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ` L${X(overall).toFixed(1)} ${Y(overall).toFixed(1)} L${X(overall).toFixed(1)} ${H - 34} Z`;
      let grid = '';
      for (let v = 1; v <= 10; v++) grid += `<line x1="${X(v)}" y1="18" x2="${X(v)}" y2="${H - 34}" stroke="#f0ece4"/><text x="${X(v)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#8a8a94">${v}</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Score distribution"><defs><linearGradient id="pgfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#95ae53" stop-opacity=".55"/><stop offset="1" stop-color="#95ae53" stop-opacity=".12"/></linearGradient></defs>${grid}<line x1="${P}" y1="${H - 34}" x2="${W - P}" y2="${H - 34}" stroke="#d9d3c6"/><path d="${area}" fill="url(#pgfill)"/><path d="${line}" fill="none" stroke="#15423d" stroke-width="2.5"/><line x1="${X(overall)}" y1="18" x2="${X(overall)}" y2="${H - 34}" stroke="#ce7942" stroke-width="2" stroke-dasharray="5 4"/><circle cx="${X(overall)}" cy="${Y(overall)}" r="6" fill="#ce7942" stroke="#fff" stroke-width="2"/><rect x="${Math.min(W - P - 92, Math.max(P, X(overall) - 46))}" y="0" width="92" height="22" rx="11" fill="#15423d"/><text x="${Math.min(W - P - 46, Math.max(P + 46, X(overall)))}" y="15" text-anchor="middle" font-size="11.5" font-weight="600" fill="#fff">You: ${overall.toFixed(1)}</text></svg>`;
    };
    const highlight = (text, hs) => {
      let html = esc(text);
      hs.forEach((h, i) => {
        const q = esc(h.quote), at = html.indexOf(q);
        if (at > -1) html = html.slice(0, at) + `<mark class="${h.type}" title="${esc(h.comment)}">${q}</mark>` + html.slice(at + q.length);
      });
      return html;
    };

    const show = res => {
      const cats = res.categories;
      el('title').textContent = (answers.pitch || '').split(/[.,—–-]| connects | is | helps /)[0].trim().slice(0, 60) || 'Your business plan';
      el('overall').innerHTML = ring(res.overall, 170, 14, 'big', `${res.overall.toFixed(1)}<small>/10</small>`) + `<span class="lbl">Overall score</span><span class="sub">Average of 6 categories</span>`;
      el('rings').innerHTML = cats.map(c => `<div class="pg-ring"><span class="name">${esc(c.name)}</span>${ring(c.score, 74, 7, 'sm', c.score)}</div>`).join('');
      el('curve').innerHTML = curve(res.overall, res.percentile);
      el('curve-text').innerHTML = `Stronger than about <b>${res.percentile}%</b> of first-time student business plans.<small>Estimate based on Venture.bot’s scoring scale for high school founders.</small>`;
      el('fb-overall').textContent = res.overall_feedback;
      el('fb-honest').textContent = res.brutally_honest;
      el('fb-strengths').innerHTML = (res.strengths || []).map(s => `<li>${esc(s)}</li>`).join('');
      el('fb-suggest').innerHTML = (res.suggestions || []).map(s => `<li>${esc(s)}</li>`).join('');
      el('cats').innerHTML = cats.map(c => `<div class="pg-cat">${ring(c.score, 62, 6, 'sm', c.score)}<div><h5>${esc(c.name)}</h5><p>${esc(c.comment)}</p></div></div>`).join('');
      const byQ = {};
      (res.highlights || []).forEach(h => (byQ[h.question_id] = byQ[h.question_id] || []).push(h));
      el('lines').innerHTML = QUESTIONS.filter(q => byQ[q.id] && (answers[q.id] || '').trim()).map(q => `<div class="pg-line"><div class="q">${esc(q.label)}</div><div class="a">${highlight(answers[q.id], byQ[q.id])}</div><ul class="pg-notes">${byQ[q.id].map(h => `<li><span class="tag ${h.type}">${h.type === 'strength' ? 'Strength' : 'Fix'}</span><span><i>“${esc(h.quote)}”</i> — ${esc(h.comment)}</span></li>`).join('')}</ul></div>`).join('') || '<p style="color:var(--muted)">No line-by-line comments for this plan.</p>';
      el('loading').hidden = true; el('quiz').hidden = true; el('results').hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring .val', grader).forEach(c => { c.style.strokeDashoffset = c.dataset.off; })));
    };

    const LOADING = ['Reading your answers', 'Checking your problem and customer', 'Running the numbers', 'Scoring against the Pitch Day rubric', 'Writing your feedback'];
    const grade = async () => {
      const filled = QUESTIONS.filter(q => (answers[q.id] || '').trim()).length;
      if (filled < 3) { el('error').textContent = 'Answer at least 3 questions to get a grade.'; el('error').hidden = false; return; }
      el('quiz').hidden = true; el('loading').hidden = false; el('results').hidden = true;
      grader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      let i = 0; el('loading-text').textContent = LOADING[0];
      const tick = setInterval(() => { i = (i + 1) % LOADING.length; el('loading-text').textContent = LOADING[i]; }, 2200);
      try {
        const payload = {}; QUESTIONS.forEach(q => { payload[q.id] = answers[q.id] || ''; });
        const res = await api('/api/grade', { answers: payload });
        clearInterval(tick); show(res);
        window.VentureBotLastGrade = res;
      } catch (e) {
        clearInterval(tick);
        el('loading').hidden = true; el('quiz').hidden = false;
        el('error').textContent = e.message; el('error').hidden = false;
      }
    };
    go(0);
    window.VentureBotGrader = { grade, show, sample: () => el('sample').click() };
  }
})();
