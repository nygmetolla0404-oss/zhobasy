/* App: routing, UI wiring, portal transition, world panel, tour, minimap */
(function () {
  const body = document.body, $ = (s) => document.querySelector(s), $$ = (s) => document.querySelectorAll(s);
  let mode = 'overview', screen = null, mapIntroDone = false, tour = null;
  const SEASON_NAMES = { winter: 'Қыс', spring: 'Көктем', summer: 'Жаз', autumn: 'Күз' };

  function travel() { return screen === 'map' ? MapScene.travel : screen === 'world' ? WorldScene.travel : null; }
  function setMode(m, speak) {
    mode = m;
    $$('#modeBar button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    $('#controlsHint').innerHTML = MODE_HINTS[m];
    const tr = travel(); if (tr && tr.mode !== m) tr.setMode(m);
    if (speak) Guide.say('mode_' + m);
  }

  function go(s, opts = {}) {
    if (s !== 'world') stopTour();
    if (body.classList.contains('inside')) { body.classList.remove('inside'); $('#poiCard').classList.add('hidden'); }
    screen = s; body.dataset.screen = s;
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.go === s));
    $('#nav').classList.remove('open');
    try { history.replaceState(null, '', '#' + s); } catch (e) {}
    if (s === 'hero') { HeroScene.build(); App.pause(false); App.setScene(HeroScene.ctrl); if (!opts.silent) Guide.say('intro'); }
    else if (s === 'map') {
      MapScene.build(); App.pause(false); App.setScene(MapScene.ctrl); setMode(mode);
      if (!opts.silent) Guide.say('map');
      if (!mapIntroDone) { mapIntroDone = true; setTimeout(() => { if (screen === 'map' && MapScene.travel.mode === 'overview') MapScene.focusJetisu(); }, 2600); }
    } else if (s === 'world') {
      const enter = () => { App.pause(false); App.setScene(WorldScene.ctrl); setMode(mode); renderWorldUI(); App._applySprites && App._applySprites(); if (!opts.silent) Guide.say('world'); };
      if (!WorldScene.scene) {
        $('#loader').classList.add('on');
        setTimeout(() => { try { WorldScene.build(); } catch (e) { console.error(e); } $('#loader').classList.remove('on'); enter(); }, 60);
      } else enter();
    } else {
      Econ.build(); App.pause(true); App.setScene(null);
      const pg = $('#screen-' + s); if (pg) pg.scrollTop = 0;
      if (!opts.silent) Guide.say(s);
    }
  }
  App.go = go;

  // nav
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => { Guide.unlock(); go(b.dataset.go); }));
  $('#navToggle').addEventListener('click', () => $('#nav').classList.toggle('open'));
  $('#startBtn').addEventListener('click', () => { Guide.unlock(); go('map'); });
  $$('#modeBar button').forEach((b) => b.addEventListener('click', () => { Guide.unlock(); stopTour(); setMode(b.dataset.mode, true); }));

  // portal
  function enterPortal() {
    if (screen !== 'map') return;
    Guide.unlock();
    const fx = $('#portalFx'); fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on');
    Guide.say('portal', { onEnd: () => { if (screen === 'world') Guide.say('world'); } });
    setTimeout(() => go('world', { silent: true }), 800);
    setTimeout(() => fx.classList.remove('on'), 2000);
  }
  MapScene.onEnter = enterPortal;
  $('#enterPortalBtn').addEventListener('click', enterPortal);

  /* ---------- world UI ---------- */
  function renderWorldUI() {
    const s = WorldScene.season;
    $$('#seasonBar button').forEach((b) => b.classList.toggle('active', b.dataset.season === s));
    const d = DATA.seasons[s], T = d.N * d.D * d.K;
    $('#wpSeasonKicker').textContent = d.kicker;
    $('#seasonStats').innerHTML = `
      <div class="st"><span>Күндік сыйымдылық N</span><b>${d.N.toLocaleString('ru-RU')} адам</b></div>
      <div class="st"><span>Маусым ұзақтығы D</span><b>${d.D} күн</b></div>
      <div class="st"><span>Жүктеме коэфф. K</span><b>${String(d.K).replace('.', ',')}</b></div>
      <div class="st"><span>Температура</span><b>${d.temp}</b></div>
      <div class="st wide"><span>${s === 'winter' ? 'Қысқы' : 'Жазғы'} маусымның туристік ағымы${s === 'spring' || s === 'autumn' ? ' (жазғы маусым құрамында)' : ''}</span><b>${T.toLocaleString('ru-RU')} адам</b><em>T = ${d.N} × ${d.D} × ${String(d.K).replace('.', ',')} · жылына барлығы 350 000</em></div>`;
    $('#poiList').innerHTML = DATA.pois.map((p) => `<button data-poi="${p.id}" class="${WorldScene.poiActive(p, s) ? '' : 'off'}"><i>${p.icon}</i><span>${p.title}</span></button>`).join('');
    $$('#poiList button').forEach((b) => b.addEventListener('click', () => { stopTour(); openPoi(b.dataset.poi, true, true); if (innerWidth < 900) $('#worldPanel').classList.remove('show'); }));
  }
  function setSeason(s, speak = true) {
    WorldScene.setSeason(s); renderWorldUI();
    if (speak) Guide.say('season_' + s);
    const open = $('#poiCard').dataset.id; if (open && $('#poiCard').dataset.kind === 'poi' && !$('#poiCard').classList.contains('hidden')) fillCard(open);
  }
  $$('#seasonBar button').forEach((b) => b.addEventListener('click', () => { Guide.unlock(); stopTour(); setSeason(b.dataset.season); }));
  window.addEventListener('keydown', (e) => {
    if (screen !== 'world') return;
    const map = { Digit1: 'winter', Digit2: 'spring', Digit3: 'summer', Digit4: 'autumn' };
    if (map[e.code]) setSeason(map[e.code]);
  });

  function fillCard(id) {
    const p = DATA.pois.find((x) => x.id === id), s = WorldScene.season, active = WorldScene.poiActive(p, s);
    const when = p.seasons === 'all' ? 'жыл бойы' : p.seasons.map((x) => SEASON_NAMES[x]).join(', ');
    $('#pcKicker').innerHTML = active ? `✓ Жұмыс істейді · ${when}` : `⏸ ${SEASON_NAMES[s]} мезгілінде жабық · ${when}`;
    $('#pcTitle').textContent = p.icon + ' ' + p.title;
    $('#pcStats').innerHTML = p.stats.map((x) => `<span>${x}</span>`).join('');
    $('#pcText').textContent = NARRATION['poi_' + id];
    setPhoto(POI_PHOTO[id]);
    const card = $('#poiCard'); card.dataset.kind = 'poi'; $('#pcEnter').style.display = 'none'; $('#pcGo').style.display = '';
  }
  function setPhoto(p) {
    const box = $('#pcPhotoBox'), img = $('#pcImg'), cr = $('#pcCredit');
    if (!p) { box.classList.add('none'); return; }
    box.classList.remove('none');
    if (p === '@concept') { img.src = 'assets/img/complex-concept.png'; cr.textContent = 'Жоба концепциясы · киіз үй пішіндес күмбезді кешен'; return; }
    img.onerror = () => box.classList.add('none');
    img.src = 'assets/photos/' + p + '.jpg';
    const c = (window.PHOTO_CREDITS || {})[p];
    cr.textContent = c ? `Нақты фото (мысал): ${c.artist || 'автор'} · ${c.license || ''} · Wikimedia Commons` : 'Нақты фото (мысал) · Wikimedia Commons';
  }
  let infoObj = null;
  function showInfo(key, obj) {
    const d = INFO[key]; if (!d) return;
    stopTour(); infoObj = obj || null;
    const card = $('#poiCard'); card.dataset.kind = 'obj'; card.dataset.id = key;
    $('#pcKicker').textContent = d.enter ? (body.classList.contains('inside') ? 'Ішкі көрініс' : 'Ішіне кіруге болады') : 'Нысан туралы';
    $('#pcTitle').textContent = d.i + ' ' + d.t;
    $('#pcStats').innerHTML = '';
    $('#pcText').textContent = NARRATION['obj_' + key] || '';
    setPhoto(d.p);
    $('#pcEnter').style.display = d.enter && !body.classList.contains('inside') ? '' : 'none';
    $('#pcGo').style.display = obj && !body.classList.contains('inside') ? '' : 'none';
    card.classList.remove('hidden');
    Guide.unlock(); Guide.say('obj_' + key);
  }
  App.showInfo = showInfo;
  function openPoi(id, speak, fly) {
    const p = DATA.pois.find((x) => x.id === id);
    if (!WorldScene.poiActive(p)) { setSeason(p.seasons[0], false); App.toast(`${SEASON_NAMES[p.seasons[0]]} мезгіліне ауыстырылды`); }
    const card = $('#poiCard'); card.dataset.id = id; fillCard(id); card.classList.remove('hidden');
    if (fly) WorldScene.poiFocus(id);
    if (speak) Guide.say('poi_' + id, tour ? { onEnd: tourNext } : {});
  }
  WorldScene.openPoi = (id, speak) => { stopTour(); openPoi(id, speak, true); };
  $('#poiClose').addEventListener('click', () => $('#poiCard').classList.add('hidden'));
  $('#pcListen').addEventListener('click', () => { Guide.unlock(); const c = $('#poiCard'); Guide.say((c.dataset.kind === 'obj' ? 'obj_' : 'poi_') + c.dataset.id); });
  $('#pcGo').addEventListener('click', () => {
    const c = $('#poiCard');
    if (c.dataset.kind === 'poi') WorldScene.poiFocus(c.dataset.id);
    else if (infoObj) { const p = new THREE.Vector3(); infoObj.getWorldPosition(p); WorldScene.travel.flyTo(p, 30); }
  });
  $('#pcEnter').addEventListener('click', () => { const d = INFO[$('#poiCard').dataset.id]; if (d && d.enter) enterInterior(d.enter); });

  /* ---------- interiors ---------- */
  function fade(fn) { const f = $('#fade'); f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 80); }, 360); }
  function enterInterior(type) {
    if (screen !== 'world') return;
    stopTour(); Guide.unlock();
    fade(() => {
      Interior.enter(type, WorldScene.season);
      body.classList.add('inside'); $('#insideName').textContent = INTERIOR_NAMES[type];
      $('#poiCard').classList.add('hidden'); $('#enterPrompt').classList.remove('on');
      applySprites();
      Guide.say('in_' + type);
    });
  }
  function exitInterior() {
    if (!body.classList.contains('inside')) return;
    fade(() => { body.classList.remove('inside'); $('#poiCard').classList.add('hidden'); App.setScene(WorldScene.ctrl); Guide.stop(); });
  }
  App.enterInterior = enterInterior;
  Interior.onInfo = (k) => showInfo(k);
  WorldScene.onInfo = (k, o) => showInfo(k, o);
  let nearEntry = null;
  WorldScene.onNear = (e) => {
    nearEntry = e;
    if (e && !body.classList.contains('inside')) { $('#enterName').textContent = INTERIOR_NAMES[e.type]; $('#enterPrompt').classList.add('on'); }
    else $('#enterPrompt').classList.remove('on');
  };
  $('#enterBtn').addEventListener('click', () => nearEntry && enterInterior(nearEntry.type));
  $('#exitBtn').addEventListener('click', exitInterior);
  window.addEventListener('keydown', (e) => {
    if (screen !== 'world') return;
    if (e.code === 'Escape') { if (body.classList.contains('inside')) exitInterior(); else $('#poiCard').classList.add('hidden'); }
    if (e.code === 'KeyF' && nearEntry && !body.classList.contains('inside')) enterInterior(nearEntry.type);
  });

  /* ---------- toolbar: collapse labels / panels ---------- */
  const LM = ['all', 'poi', 'none'], LMN = { all: 'Барлығы', poi: 'Негізгі', none: 'Жасырын' };
  App.labelMode = 'all';
  try { App.labelMode = localStorage.getItem('labelMode') || 'all'; } catch (e) {}
  function applySprites() {
    const sc = App.active && App.active.scene; if (!sc || screen === 'hero') return;
    sc.traverse((o) => { if (o.isSprite) o.visible = App.labelMode !== 'none'; });
  }
  function setLabelMode(m) {
    App.labelMode = m; try { localStorage.setItem('labelMode', m); } catch (e) {}
    const b = $('#tbLabels'); b.querySelector('span').textContent = LMN[m]; b.classList.toggle('off', m === 'none');
    applySprites();
  }
  setLabelMode(App.labelMode);
  $('#tbLabels').addEventListener('click', () => { setLabelMode(LM[(LM.indexOf(App.labelMode) + 1) % 3]); App.toast('Белгілер: ' + LMN[App.labelMode]); });
  const tog = (cls, btn) => { body.classList.toggle(cls); $(btn).classList.toggle('off', body.classList.contains(cls)); };
  $('#tbPanel').addEventListener('click', () => tog('hide-panel', '#tbPanel'));
  $('#tbMini').addEventListener('click', () => tog('hide-mini', '#tbMini'));
  $('#tbHint').addEventListener('click', () => tog('hide-hint', '#tbHint'));
  App._applySprites = applySprites;
  $('#panelToggle').addEventListener('click', () => $('#worldPanel').classList.toggle('show'));

  /* ---------- auto tour ---------- */
  function tourNext() {
    if (!tour) return;
    clearTimeout(tour.timer);
    tour.timer = setTimeout(() => {
      if (!tour) return;
      tour.i++;
      if (tour.i >= tour.list.length) { stopTour(); App.toast('Автотур аяқталды'); return; }
      const id = tour.list[tour.i]; openPoi(id, true, true);
      if (Guide.isMuted()) tour.timer = setTimeout(tourNext, 9000);
    }, 1400);
  }
  function startTour() {
    Guide.unlock(); setMode('overview');
    tour = { list: DATA.pois.filter((p) => WorldScene.poiActive(p)).map((p) => p.id), i: -1, timer: null };
    $('#tourBtn').textContent = '■ Турды тоқтату';
    tourNext();
  }
  function stopTour() { if (!tour) return; clearTimeout(tour.timer); tour = null; Guide.onEnd = null; $('#tourBtn').textContent = '▶ Автотур'; }
  $('#tourBtn').addEventListener('click', () => (tour ? stopTour() : startTour()));

  /* ---------- minimap ---------- */
  const mm = $('#minimap'), mctx = mm.getContext('2d'); let mmImg = null, mmSeason = null, mmT = 0;
  const S = 550, toC = (v) => ((v + S) / (2 * S)) * 200;
  function buildMini() {
    const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d'); const W = WorldScene, s = W.season;
    for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) {
      const wx = -S + (i + 0.5) * (2 * S / 100), wz = -S + (j + 0.5) * (2 * S / 100), rel = W.H(wx, wz) - W.floorH(wz);
      let col;
      if (s === 'winter') col = rel > 120 ? '#e8eef5' : '#f4f8fb';
      else if (rel > (s === 'summer' ? 225 : 180)) col = '#f4f6f8';
      else if (rel > 120) col = '#9aa09c';
      else col = s === 'autumn' ? (rel > 40 ? '#b8963a' : '#c9b04a') : rel > 40 ? '#3f8f45' : '#6cc256';
      x.fillStyle = col; x.fillRect(i * 2, j * 2, 2, 2);
    }
    x.strokeStyle = s === 'winter' ? '#9fd0ee' : '#3b9fdc'; x.lineWidth = 3; x.beginPath();
    for (let z = 520; z >= -440; z -= 10) { const px = toC(W.rx(z)), pz = toC(z); z === 520 ? x.moveTo(px, pz) : x.lineTo(px, pz); } x.stroke();
    x.strokeStyle = '#555'; x.lineWidth = 1.5; x.beginPath(); W.roadCurve.getPoints(60).forEach((p, i) => (i ? x.lineTo(toC(p.x), toC(p.z)) : x.moveTo(toC(p.x), toC(p.z)))); x.stroke();
    mmImg = c; mmSeason = s;
  }
  WorldScene.onFrame = function (dt) {
    mmT += dt; if (mmT < 0.1) return; mmT = 0;
    if (mmSeason !== WorldScene.season) buildMini();
    mctx.clearRect(0, 0, 200, 200); mctx.save(); mctx.beginPath(); mctx.arc(100, 100, 100, 0, Math.PI * 2); mctx.clip();
    mctx.drawImage(mmImg, 0, 0);
    for (const id in WorldScene.poiItems) { const it = WorldScene.poiItems[id]; if (!it.show) continue; mctx.fillStyle = '#e8b85a'; mctx.strokeStyle = '#1e2a55'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(toC(it.base.x), toC(it.base.z), 4, 0, Math.PI * 2); mctx.fill(); mctx.stroke(); }
    const tr = WorldScene.travel, f = tr.focus(), cam = WorldScene.camera;
    const dir = new THREE.Vector3(); cam.getWorldDirection(dir); const a = Math.atan2(dir.x, dir.z);
    const px = toC(f.x), pz = toC(f.z);
    mctx.fillStyle = 'rgba(255,255,255,.25)'; mctx.beginPath(); mctx.moveTo(px, pz); mctx.arc(px, pz, 34, Math.PI / 2 - a - 0.5, Math.PI / 2 - a + 0.5); mctx.fill();
    mctx.save(); mctx.translate(px, pz); mctx.rotate(-(tr.mode === 'overview' ? a : tr.heading) + Math.PI);
    mctx.fillStyle = '#c8352f'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(0, -9); mctx.lineTo(6, 7); mctx.lineTo(0, 3); mctx.lineTo(-6, 7); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
    mctx.restore();
    mctx.fillStyle = '#fff'; mctx.font = 'bold 11px Nunito'; mctx.fillText('С', 96, 12);
  };
  mm.addEventListener('click', (e) => {
    const r = mm.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * 2 * S - S, z = ((e.clientY - r.top) / r.height) * 2 * S - S;
    WorldScene.travel.flyTo(new THREE.Vector3(x, WorldScene.H(x, z), z), 160);
  });

  /* ---------- boot ---------- */
  const hash = (location.hash || '').replace('#', '');
  const [scr, q] = hash.split('?');
  const params = new URLSearchParams(q || '');
  if (params.get('mode')) mode = params.get('mode');
  const valid = ['hero', 'map', 'world', 'econ', 'about', 'authors'];
  const first = valid.includes(scr) ? scr : 'hero';
  go(first);
  if (first === 'world' && params.get('season')) setTimeout(() => setSeason(params.get('season'), false), 200);
  if (first === 'world' && params.get('poi')) setTimeout(() => openPoi(params.get('poi'), false, true), 400);
  if (first === 'world' && params.get('enter')) setTimeout(() => enterInterior(params.get('enter')), 500);
  if (first === 'world' && params.get('info')) setTimeout(() => showInfo(params.get('info')), 500);
})();
