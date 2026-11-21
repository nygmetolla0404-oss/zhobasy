/* Core: renderer, scene switching, labels, input, noise, helpers */
(function () {
  const App = (window.App = {});
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  App.renderer = renderer;
  App.canvas = canvas;
  App.clock = new THREE.Clock();
  App.active = null; // active 3D scene controller
  App.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (App.isTouch) document.body.classList.add('touch');

  App.setScene = function (ctrl) {
    if (App.active === ctrl) return;
    if (App.active && App.active.deactivate) App.active.deactivate();
    App.active = ctrl;
    if (ctrl && ctrl.activate) ctrl.activate();
    App.onResize();
  };
  App.onResize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    if (App.active && App.active.camera) {
      App.active.camera.aspect = w / h;
      App.active.camera.updateProjectionMatrix();
    }
  };
  window.addEventListener('resize', App.onResize);

  let paused = false;
  App.pause = (p) => { paused = p; };
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(App.clock.getDelta(), 0.05);
    const t = App.clock.elapsedTime;
    if (paused || !App.active) return;
    App.active.update(dt, t);
    renderer.render(App.active.scene, App.active.camera);
    if (App.active.labels) App.active.labels.update(App.active.camera);
    App.input.dx = App.input.dy = App.input.wheel = 0;
  }
  requestAnimationFrame(loop);

  /* ---------------- Labels (HTML over 3D) ---------------- */
  const labelRoot = document.getElementById('labels');
  const _v = new THREE.Vector3();
  class LabelSet {
    constructor() { this.items = []; this.visible = true; }
    add(target, html, cls, o = {}) {
      const el = document.createElement('div');
      el.className = 'lbl ' + (cls || '');
      el.innerHTML = html;
      el.style.display = 'none';
      labelRoot.appendChild(el);
      const it = { target, el, offset: o.offset || 0, maxDist: o.maxDist || Infinity, minDist: o.minDist || 0, show: true, scaleDist: o.scaleDist || 0 };
      if (o.onClick) { el.addEventListener('click', (e) => { e.stopPropagation(); o.onClick(); }); el.addEventListener('pointerdown', (e) => e.stopPropagation()); }
      this.items.push(it);
      return it;
    }
    setVisible(v) { this.visible = v; if (!v) this.items.forEach((i) => (i.el.style.display = 'none')); }
    update(camera) {
      if (!this.visible) return;
      const w = window.innerWidth, h = window.innerHeight;
      const cp = camera.position;
      for (const it of this.items) {
        let show = it.show;
        if (show) {
          if (it.target.isObject3D) { if (!isVisibleDeep(it.target)) show = false; else it.target.getWorldPosition(_v); }
          else _v.copy(it.target);
        }
        if (show && App.labelMode && App.labelMode !== 'all') { const c = it.el.classList; if (App.labelMode === 'none' ? !c.contains('portal') : c.contains('npc')) show = false; }
        if (show) {
          _v.y += it.offset;
          const d = _v.distanceTo(cp);
          if (d > it.maxDist || d < it.minDist) show = false;
          else {
            _v.project(camera);
            if (_v.z > 1 || _v.x < -1.2 || _v.x > 1.2 || _v.y < -1.2 || _v.y > 1.2) show = false;
            else {
              const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
              let s = 1;
              if (it.scaleDist) s = Math.max(0.55, Math.min(1.1, it.scaleDist / d));
              it.el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
              it.el.style.zIndex = String(100000 - Math.round(d));
              if (it.maxDist !== Infinity) it.el.style.opacity = String(Math.min(1, (it.maxDist - d) / (it.maxDist * 0.25)));
            }
          }
        }
        it.el.style.display = show ? '' : 'none';
      }
    }
  }
  function isVisibleDeep(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  App.LabelSet = LabelSet;

  /* ---------------- Input ---------------- */
  const input = (App.input = { keys: {}, dx: 0, dy: 0, wheel: 0, dragging: false, joy: { x: 0, y: 0 }, fly: 0 });
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    input.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && (document.body.dataset.screen === 'map' || document.body.dataset.screen === 'world')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });
  window.addEventListener('blur', () => { input.keys = {}; });
  let px = 0, py = 0, downX = 0, downY = 0, pid = null;
  canvas.addEventListener('pointerdown', (e) => {
    pid = e.pointerId; input.dragging = true; px = downX = e.clientX; py = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (input.dragging && e.pointerId === pid) { input.dx += e.clientX - px; input.dy += e.clientY - py; px = e.clientX; py = e.clientY; }
    if (App.active && App.active.onHover) App.active.onHover(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pid) return;
    input.dragging = false;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6 && App.active && App.active.onClick) App.active.onClick(e.clientX, e.clientY);
  });
  canvas.addEventListener('wheel', (e) => { input.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
  // pinch zoom
  let pinch = 0;
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) input.wheel += (pinch - d) * 3;
      pinch = d;
    }
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch = 0; });

  // virtual joystick
  const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob');
  let jid = null;
  function joyMove(e) {
    const r = joy.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    input.joy.x = x; input.joy.y = y;
    knob.style.transform = `translate(${x * 35}px,${y * 35}px)`;
  }
  joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); joyMove(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== jid) return; jid = null; input.joy.x = input.joy.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
  document.querySelectorAll('#flyBtns button').forEach((b) => {
    const v = b.dataset.fly === 'up' ? 1 : -1;
    b.addEventListener('pointerdown', () => (input.fly = v));
    b.addEventListener('pointerup', () => (input.fly = 0));
    b.addEventListener('pointerleave', () => (input.fly = 0));
  });

  /* ---------------- Noise ---------------- */
  function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  App.noise2 = noise2;
  App.fbm = function (x, y, oct = 5) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
  App.ridge = function (x, y, oct = 5) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { const r = 1 - Math.abs(noise2(x * f, y * f) * 2 - 1); s += a * r * r; n += a; a *= 0.5; f *= 2.1; } return s / n; };
  let seed = 12345;
  App.rand = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  App.smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  App.lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Material cache ---------------- */
  const matCache = {};
  App.mat = function (color, o = {}) {
    const key = color + JSON.stringify(o);
    if (matCache[key]) return matCache[key];
    const m = new THREE.MeshStandardMaterial({ color, flatShading: o.flat !== false, roughness: o.r != null ? o.r : 0.85, metalness: o.m || 0,
      transparent: !!o.opacity, opacity: o.opacity != null ? o.opacity : 1, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei || 1, side: o.side || THREE.FrontSide, map: o.map || null, vertexColors: !!o.vc });
    matCache[key] = m;
    return m;
  };
  App.canvasTex = function (w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  };
  // merge non-indexed geometries with vertex colors
  App.mergeColored = function (parts) {
    let pos = [], nor = [], col = [];
    for (const [g0, color] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0;
      g.computeVertexNormals();
      const c = new THREE.Color(color);
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  };
  App.toast = function (msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(App._tt); App._tt = setTimeout(() => t.classList.remove('on'), 2200);
  };
  App.ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
})();
