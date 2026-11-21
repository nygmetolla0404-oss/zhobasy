/* Economics page: investment structure, tourist-flow and NPV calculators with charts */
(function () {
  const E = (window.Econ = {});
  const fmt = (n, d = 0) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, ',');
  const S1 = '#3b7dd8', S2 = '#e2862f';
  let built = false;

  function slider(root, id, label, min, max, step, val, unit, onInput) {
    const d = document.createElement('div'); d.className = 'sl';
    d.innerHTML = `<label><span>${label}</span><b id="${id}V"></b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">`;
    root.appendChild(d);
    const inp = d.querySelector('input'), out = d.querySelector('b');
    const show = () => (out.textContent = (unit === '%' ? fmt(inp.value * 100, 0) + '%' : fmt(inp.value, step < 1 ? (step < 0.1 ? 2 : 1) : 0) + (unit ? ' ' + unit : '')));
    inp.addEventListener('input', () => { show(); onInput(); }); show();
    return { get v() { return +inp.value; }, set(v) { inp.value = v; show(); } };
  }

  E.build = function () {
    if (built) return; built = true;
    // split bar
    document.getElementById('splitBar').innerHTML = `<div style="flex:500;background:${S1}">Жеке инвесторлар · 500 млн ₸ (66,7%)</div><div style="flex:250;background:${S2}">Мемлекет · 250 млн ₸ (33,3%)</div>`;
    const max = Math.max(...DATA.costs.map((c) => c.v));
    let rows = DATA.costs.map((c) => `<tr><td>${c.name}<div class="bar ${c.src === 's' ? 'st' : ''}" style="width:${(c.v / max) * 100}%"></div></td><td>${c.v} млн ₸</td></tr>`).join('');
    rows += `<tr class="total"><td>Барлығы</td><td>${DATA.costs.reduce((a, c) => a + c.v, 0)} млн ₸</td></tr>`;
    document.getElementById('costTable').innerHTML = `<table class="cost-table">${rows}</table><div class="legend"><span><i style="background:${S1}"></i>Жеке инвестиция</span><span><i style="background:${S2}"></i>Мемлекеттік қолдау</span></div>`;

    // flow sliders
    const fs = document.getElementById('flowSliders'); const F = {};
    const uf = () => updateFlow(F);
    F.Nw = slider(fs, 'sNw', 'Қысқы сыйымдылық Nw', 500, 3000, 50, 1500, 'адам/күн', uf);
    F.Dw = slider(fs, 'sDw', 'Қысқы маусым ұзақтығы Dw', 60, 180, 1, 150, 'күн', uf);
    F.Kw = slider(fs, 'sKw', 'Қысқы жүктеме коэфф. Kw', 0.2, 1, 0.05, 0.6, '', uf);
    F.Ns = slider(fs, 'sNs', 'Жазғы сыйымдылық Ns', 500, 4000, 50, 2000, 'адам/күн', uf);
    F.Ds = slider(fs, 'sDs', 'Жазғы маусым ұзақтығы Ds', 100, 240, 1, 215, 'күн', uf);
    F.Ks = slider(fs, 'sKs', 'Жазғы жүктеме коэфф. Ks', 0.2, 1, 0.05, 0.5, '', uf);
    const rb = document.createElement('button'); rb.className = 'btn-ghost small reset'; rb.textContent = '↺ Жобадағы мәндер';
    rb.onclick = () => { F.Nw.set(1500); F.Dw.set(150); F.Kw.set(0.6); F.Ns.set(2000); F.Ds.set(215); F.Ks.set(0.5); uf(); }; fs.appendChild(rb);
    uf();

    // NPV sliders
    const ns = document.getElementById('npvSliders'); const N = {};
    const un = () => updateNpv(N);
    N.I = slider(ns, 'sI', 'Бастапқы инвестиция I₀', 300, 1500, 10, 750, 'млн ₸', un);
    N.CF = slider(ns, 'sCF', 'Жылдық таза ақша ағыны CF', 40, 300, 5, 120, 'млн ₸', un);
    N.r = slider(ns, 'sR', 'Дисконттау ставкасы r', 0.02, 0.25, 0.005, 0.1, '%', un);
    N.M = slider(ns, 'sM', 'Өңірлік мультипликатор M', 1, 2, 0.05, 1.4, '', un);
    N.n = slider(ns, 'sN', 'Уақыт горизонты n', 3, 15, 1, 8, 'жыл', un);
    const rb2 = document.createElement('button'); rb2.className = 'btn-ghost small reset'; rb2.textContent = '↺ Жобадағы мәндер';
    rb2.onclick = () => { N.I.set(750); N.CF.set(120); N.r.set(0.1); N.M.set(1.4); N.n.set(8); un(); }; ns.appendChild(rb2);
    un();

    document.getElementById('timeline').innerHTML = DATA.timeline.map(([d, t, r]) => `<div class="tl"><div class="d">${d}</div><p>${t}</p><div class="r">✓ ${r}</div></div>`).join('');
    document.getElementById('refs').innerHTML = DATA.refs.map((r) => `<li>${r}</li>`).join('');
    const pc = window.PHOTO_CREDITS || {}; document.getElementById('photoRefs').innerHTML = Object.keys(pc).map((k) => `<li>${pc[k].title.replace('File:', '')} — ${pc[k].artist || 'автор көрсетілмеген'} · ${pc[k].license} · <a href="${pc[k].page}" target="_blank" rel="noopener" style="color:#f6d488">Wikimedia Commons</a></li>`).join('');
  };

  function updateFlow(F) {
    const w = F.Nw.v * F.Dw.v * F.Kw.v, s = F.Ns.v * F.Ds.v * F.Ks.v, T = w + s;
    document.getElementById('flowCalc').innerHTML =
      `<div>T<sub>winter</sub> = ${fmt(F.Nw.v)} × ${F.Dw.v} × ${fmt(F.Kw.v, 2)} = <b>${fmt(w)}</b> адам/маусым</div>
       <div>T<sub>summer</sub> = ${fmt(F.Ns.v)} × ${F.Ds.v} × ${fmt(F.Ks.v, 2)} = <b>${fmt(s)}</b> адам/маусым</div>
       <div>T<sub>total</sub> = ${fmt(w)} + ${fmt(s)} =</div><span class="big">${fmt(T)} адам/жыл</span>
       <div style="font-size:13px;color:var(--muted)">+20% даму сценарийі (мультипликатор): <b>${fmt(T * 1.2)}</b> адам/жыл · гипотеза: ≥ 350 000 ${T >= 350000 ? '<span class="pos">✓ орындалады</span>' : '<span class="neg">✗ орындалмайды</span>'}</div>`;
    // bar chart (horizontal)
    const data = [['Қысқы маусым', w, S1], ['Жазғы маусым', s, S2]];
    const mx = Math.max(450000, T * 0.75), Wd = 520, bh = 34;
    let svg = `<svg viewBox="0 0 ${Wd} 110" role="img" aria-label="Маусымдық туристік ағым">`;
    data.forEach(([l, v, c], i) => {
      const y = 10 + i * 50, bw = Math.max(4, (v / mx) * (Wd - 190));
      svg += `<text x="0" y="${y + bh / 2 + 5}" fill="#c9cee3" font-size="13" font-weight="700">${l}</text>`;
      svg += `<rect class="hb" data-tip="${l}: <b>${fmt(v)}</b> адам" x="110" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${c}"/>`;
      svg += `<text x="${116 + bw}" y="${y + bh / 2 + 5}" fill="#f4f1ea" font-size="13" font-weight="800">${fmt(v)}</text>`;
    });
    svg += '</svg><div class="tip"></div>';
    const el = document.getElementById('flowChart'); el.innerHTML = svg; hoverTips(el);
  }

  function irr(I, cf, n) {
    let lo = -0.9, hi = 1.5;
    const f = (r) => { let s = -I; for (let t = 1; t <= n; t++) s += cf / Math.pow(1 + r, t); return s; };
    if (f(lo) < 0) return null;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function updateNpv(N) {
    const I = N.I.v, CF = N.CF.v, r = N.r.v, Mlt = N.M.v, n = N.n.v;
    const rows = []; let cum = 0, cumM = 0, dpp = null, dppBase = null;
    const cumArr = [{ t: 0, a: 0, b: 0 }];
    for (let t = 1; t <= n; t++) {
      const df = Math.pow(1 + r, t), pv = CF / df, pvm = pv * Mlt;
      const prevM = cumM, prev = cum; cum += pv; cumM += pvm;
      if (dpp == null && cumM >= I) dpp = t - 1 + (I - prevM) / pvm;
      if (dppBase == null && cum >= I) dppBase = t - 1 + (I - prev) / pv;
      rows.push([t, df, pv, cum, pvm, cumM]); cumArr.push({ t, a: cum, b: cumM });
    }
    const npv = cumM - I, npvBase = cum - I, pp = I / (CF * Mlt), ir = irr(I, CF * Mlt, n);
    document.getElementById('npvResult').innerHTML =
      `<div>Σ PV (${n} жыл) = <b>${fmt(cum * 1e6)}</b> ₸</div>
       <div>Нақты жиынтық PV = Σ PV × M = ${fmt(cum * 1e6)} × ${fmt(Mlt, 2)} = <b>${fmt(cumM * 1e6)}</b> ₸</div>
       <div>NPV = ${fmt(cumM * 1e6)} − ${fmt(I * 1e6)} =</div>
       <span class="big ${npv >= 0 ? 'pos' : 'neg'}">${npv >= 0 ? '+' : ''}${fmt(npv * 1e6)} ₸</span>
       <div>Қарапайым өтелу мерзімі PP = ${fmt(I)} / ${fmt(CF * Mlt, 0)} = <b>${fmt(pp, 2)} жыл</b></div>
       <div>Дисконтталған өтелу мерзімі (M ескерілген): <b>${dpp ? fmt(dpp, 1) + ' жыл' : n + ' жылдан артық'}</b></div>
       <div>Ішкі табыстылық нормасы IRR (${n} жыл, M ескерілген): <b>${ir != null ? fmt(ir * 100, 1) + '%' : '—'}</b></div>
       <div style="font-size:13px;color:var(--muted)">Мультипликаторсыз NPV: ${npvBase >= 0 ? '+' : ''}${fmt(npvBase * 1e6)} ₸ · жобадағы мән: NPV = +146 267 603 ₸, PP = 6,2 жыл, IRR = 14,5%</div>`;
    document.getElementById('npvTable').innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Жыл t</th><th>(1+r)<sup>t</sup></th><th>PV, ₸</th><th>Жиынтық PV, ₸</th><th>PV × M, ₸</th><th>Жиынтық PV × M, ₸</th></tr></thead><tbody>${rows.map(([t, df, pv, c, pm, cm]) => `<tr><td>${t}</td><td class="num">${fmt(df, 5)}</td><td class="num">${fmt(pv * 1e6)}</td><td class="num">${fmt(c * 1e6)}</td><td class="num">${fmt(pm * 1e6)}</td><td class="num">${fmt(cm * 1e6)}</td></tr>`).join('')}</tbody></table></div>`;
    drawNpvChart(cumArr, I, n);
  }
  function drawNpvChart(d, I, n) {
    const Wd = 900, Hd = 330, L = 64, R = 140, T = 18, B = 40;
    const ymax = Math.max(I * 1.15, d[d.length - 1].b * 1.08);
    const x = (t) => L + (t / n) * (Wd - L - R), y = (v) => T + (1 - v / ymax) * (Hd - T - B);
    let s = `<svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Жиынтық дисконтталған ақша ағыны">`;
    const step = ymax > 1200 ? 400 : ymax > 600 ? 200 : 100;
    for (let v = 0; v <= ymax; v += step) s += `<line x1="${L}" x2="${Wd - R}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.08)"/><text x="${L - 8}" y="${y(v) + 4}" fill="#8f97b8" font-size="12" text-anchor="end">${v}</text>`;
    for (let t = 0; t <= n; t++) s += `<text x="${x(t)}" y="${Hd - B + 20}" fill="#8f97b8" font-size="12" text-anchor="middle">${t}</text>`;
    s += `<text x="${L}" y="${Hd - 4}" fill="#8f97b8" font-size="12">жыл →</text><text x="4" y="12" fill="#8f97b8" font-size="12">млн ₸</text>`;
    s += `<line x1="${L}" x2="${Wd - R}" y1="${y(I)}" y2="${y(I)}" stroke="#c9cee3" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${Wd - R + 8}" y="${y(I) + 4}" fill="#c9cee3" font-size="12.5" font-weight="700">I₀ = ${I} млн</text>`;
    const path = (k) => d.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
    s += `<path d="${path('a')}" fill="none" stroke="${S1}" stroke-width="2"/><path d="${path('b')}" fill="none" stroke="${S2}" stroke-width="2"/>`;
    d.forEach((p) => { s += `<circle cx="${x(p.t)}" cy="${y(p.a)}" r="4" fill="${S1}" stroke="#1a244a" stroke-width="2"/><circle cx="${x(p.t)}" cy="${y(p.b)}" r="4" fill="${S2}" stroke="#1a244a" stroke-width="2"/>`; });
    const last = d[d.length - 1];
    s += `<text x="${x(n) + 8}" y="${y(last.a) + 4}" fill="#f4f1ea" font-size="12.5" font-weight="700">Σ PV</text><text x="${x(n) + 8}" y="${y(last.b) + 4}" fill="#f4f1ea" font-size="12.5" font-weight="700">Σ PV × M</text>`;
    s += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${Hd - B}" stroke="rgba(255,255,255,.35)" opacity="0"/>`;
    s += `<rect class="hit" x="${L}" y="${T}" width="${Wd - L - R}" height="${Hd - T - B}" fill="transparent"/></svg>`;
    s += `<div class="legend"><span><i style="background:${S1}"></i>Жиынтық PV (тікелей кіріс)</span><span><i style="background:${S2}"></i>Жиынтық PV × M (мультипликатормен)</span><span><i class="dash"></i>Бастапқы инвестиция I₀</span></div><div class="tip"></div>`;
    const el = document.getElementById('npvChart'); el.innerHTML = s;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh'), hit = el.querySelector('.hit');
    const move = (e) => {
      const r = svg.getBoundingClientRect(), sx = ((e.clientX - r.left) / r.width) * Wd;
      const t = Math.max(0, Math.min(n, Math.round(((sx - L) / (Wd - L - R)) * n))); const p = d[t];
      xh.setAttribute('x1', x(t)); xh.setAttribute('x2', x(t)); xh.setAttribute('opacity', 1);
      tip.innerHTML = `<b>${t}-жыл</b><br>Σ PV: <b>${fmt(p.a, 1)}</b> млн ₸<br>Σ PV × M: <b>${fmt(p.b, 1)}</b> млн ₸<br>I₀ дейін: ${fmt(Math.max(0, I - p.b), 1)} млн ₸`;
      const px = (x(t) / Wd) * r.width; tip.style.left = Math.min(r.width - 190, px + 12) + 'px'; tip.style.top = '10px'; tip.style.opacity = 1;
    };
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerleave', () => { tip.style.opacity = 0; xh.setAttribute('opacity', 0); });
  }
  function hoverTips(el) {
    const tip = el.querySelector('.tip');
    el.querySelectorAll('[data-tip]').forEach((n) => {
      n.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); tip.innerHTML = n.dataset.tip; tip.style.left = e.clientX - r.left + 12 + 'px'; tip.style.top = e.clientY - r.top - 36 + 'px'; tip.style.opacity = 1; });
      n.addEventListener('pointerleave', () => (tip.style.opacity = 0));
    });
  }
})();
