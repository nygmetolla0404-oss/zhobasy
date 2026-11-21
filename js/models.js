/* Low-poly models: horse, eagle, drone, e-car, people, yurts, dome complex, animals, trees */
(function () {
  const M = (window.Models = {});
  const mat = App.mat;
  function mesh(geo, m, x = 0, y = 0, z = 0, cast = true) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o;
  }
  M.mesh = mesh;
  const pivot = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

  /* ---------- textures ---------- */
  M.tex = {};
  M.tex.ornament = App.canvasTex(512, 64, (c, w, h) => {
    c.fillStyle = '#1f3a7a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8b85a'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const x = i * 64 + 32, y = h / 2;
      c.beginPath(); c.moveTo(x - 26, y);
      c.bezierCurveTo(x - 26, y - 22, x - 4, y - 22, x - 6, y - 4); c.stroke();
      c.beginPath(); c.moveTo(x + 26, y);
      c.bezierCurveTo(x + 26, y + 22, x + 4, y + 22, x + 6, y + 4); c.stroke();
      c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fillStyle = '#e8b85a'; c.fill();
    }
  }, [6, 1]);
  M.tex.redBand = App.canvasTex(512, 64, (c, w, h) => {
    c.fillStyle = '#b8322a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#f5e6c8'; c.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const x = i * 64 + 32, y = h / 2;
      c.beginPath(); c.moveTo(x - 24, y + 12); c.quadraticCurveTo(x - 24, y - 14, x - 8, y - 6); c.stroke();
      c.beginPath(); c.moveTo(x + 24, y + 12); c.quadraticCurveTo(x + 24, y - 14, x + 8, y - 6); c.stroke();
      c.beginPath(); c.moveTo(x, y - 18); c.lineTo(x, y + 18); c.stroke();
    }
  }, [5, 1]);
  M.tex.lattice = App.canvasTex(512, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d9b98a'); g.addColorStop(1, '#b8915e');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(90,58,26,.75)'; c.lineWidth = 3;
    for (let i = -16; i < 32; i++) {
      c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + h, h); c.stroke();
      c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 - h, h); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 300; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }, [8, 3]);
  M.tex.felt = App.canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#f4efe4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#b8322a'; c.fillRect(0, h * 0.18, w, 14);
    c.fillStyle = '#e8b85a'; c.fillRect(0, h * 0.18 + 14, w, 3);
    c.strokeStyle = '#f5e6c8'; c.lineWidth = 2;
    for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(i * 32 + 16, h * 0.18 + 7, 4, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.04)'; for (let i = 0; i < 400; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }, [4, 1]);
  M.tex.plaza = App.canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#d8d2c6'; c.fillRect(0, 0, w, h);
    const cx = w / 2;
    for (let r = 40; r < 512; r += 34) { c.strokeStyle = r % 68 ? 'rgba(120,110,95,.35)' : 'rgba(120,110,95,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.stroke(); }
    for (let a = 0; a < 48; a++) { c.beginPath(); c.moveTo(cx, cx); c.lineTo(cx + Math.cos(a / 48 * Math.PI * 2) * 512, cx + Math.sin(a / 48 * Math.PI * 2) * 512); c.strokeStyle = 'rgba(120,110,95,.2)'; c.stroke(); }
    // tekemet-like central medallion
    const rings = [['#e8b85a', 150], ['#c8352f', 128], ['#2f4f9a', 104], ['#e8b85a', 80], ['#c8352f', 40]];
    rings.forEach(([col, r]) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.fill(); });
    c.strokeStyle = '#f7ead0'; c.lineWidth = 6;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2; const x = cx + Math.cos(a) * 116, y = cx + Math.sin(a) * 116;
      c.beginPath(); c.arc(x, y, 10, a, a + Math.PI * 1.4); c.stroke();
    }
  });
  M.tex.carpet = App.canvasTex(512, 512, (c, w, h) => {
    const cx = w / 2;
    [['#e8b85a', 256], ['#2f4f9a', 220], ['#e8b85a', 196], ['#c8352f', 150], ['#e8b85a', 110], ['#2f4f9a', 70], ['#c8352f', 30]].forEach(([col, r]) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.fill(); });
    c.strokeStyle = '#f7ead0'; c.lineWidth = 5;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = cx + Math.cos(a) * 208, y = cx + Math.sin(a) * 208; c.beginPath(); c.arc(x, y, 9, a, a + 4); c.stroke(); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = cx + Math.cos(a) * 130, y = cx + Math.sin(a) * 130; c.beginPath(); c.arc(x, y, 12, a + 1, a + 5); c.stroke(); }
  });

  M.textSprite = function (text, o = {}) {
    const fs = o.size || 48, pad = 18;
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    ctx.font = `${o.weight || 900} ${fs}px Nunito, sans-serif`;
    const tw = ctx.measureText(text).width;
    c.width = Math.ceil(tw + pad * 2); c.height = fs + pad * 2;
    ctx.font = `${o.weight || 900} ${fs}px Nunito, sans-serif`;
    if (o.bg) { ctx.fillStyle = o.bg; const r = c.height / 2; ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(c.width, 0, c.width, c.height, r); ctx.arcTo(c.width, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r); ctx.arcTo(0, 0, c.width, 0, r); ctx.fill(); if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 4; ctx.stroke(); } }
    ctx.fillStyle = o.color || '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(text, pad, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    const k = (o.scale || 1) / fs;
    s.scale.set(c.width * k, c.height * k, 1);
    return s;
  };

  /* ---------- HORSE ---------- */
  M.horse = function (o = {}) {
    const g = new THREE.Group();
    const coat = mat(o.color || 0x8a4b22), dark = mat(o.mane || 0x2b1a10), hoof = mat(0x222222);
    const body = pivot(0, 0, 0); g.add(body);
    const torso = mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.5, 7), coat, 0, 1.38, 0); torso.rotation.x = Math.PI / 2; body.add(torso);
    body.add(mesh(new THREE.IcosahedronGeometry(0.5, 0), coat, 0, 1.42, 0.62));
    body.add(mesh(new THREE.IcosahedronGeometry(0.52, 0), coat, 0, 1.44, -0.62));
    const neck = pivot(0, 1.62, 0.78); body.add(neck); neck.rotation.x = 0.55;
    neck.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.95, 6), coat, 0, 0.42, 0));
    neck.add(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.22), dark, 0, 0.45, -0.18));
    const head = pivot(0, 0.88, 0.05); neck.add(head); head.rotation.x = 1.0;
    const hd = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.68, 6), coat, 0, 0.3, 0); head.add(hd);
    head.add(mesh(new THREE.ConeGeometry(0.06, 0.2, 4), coat, 0.1, -0.02, -0.1));
    head.add(mesh(new THREE.ConeGeometry(0.06, 0.2, 4), coat, -0.1, -0.02, -0.1));
    head.add(mesh(new THREE.SphereGeometry(0.04, 5, 4), mat(0x111111), 0.15, 0.12, 0.08));
    head.add(mesh(new THREE.SphereGeometry(0.04, 5, 4), mat(0x111111), -0.15, 0.12, 0.08));
    const tail = pivot(0, 1.62, -1.05); body.add(tail); tail.rotation.x = -0.5;
    { const _m = mesh(new THREE.ConeGeometry(0.14, 0.95, 5), dark, 0, -0.45, 0); _m.rotation.x = Math.PI; tail.add(_m); }
    const legs = [];
    [[0.22, 0.58, 0], [-0.22, 0.58, Math.PI], [0.22, -0.58, Math.PI], [-0.22, -0.58, 0]].forEach(([x, z, ph]) => {
      const L = pivot(x, 1.12, z); body.add(L);
      L.add(mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.58, 5), coat, 0, -0.29, 0));
      const knee = pivot(0, -0.56, 0); L.add(knee);
      knee.add(mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.48, 5), coat, 0, -0.24, 0));
      knee.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 5), hoof, 0, -0.5, 0));
      legs.push({ L, knee, ph, front: z > 0 });
    });
    if (o.saddle !== false) {
      body.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.8), mat(0xc8352f), 0, 1.82, 0.05));
      body.add(mesh(new THREE.BoxGeometry(0.6, 0.16, 0.62), mat(0x6b3a1c), 0, 1.9, 0.05));
      body.add(mesh(new THREE.BoxGeometry(0.97, 0.03, 0.82), mat(0xe8b85a), 0, 1.79, 0.05));
    }
    if (o.rider) {
      const r = M.person({ coat: o.riderCoat || 0x1f3a7a, hat: o.riderHat || 'kalpak', pose: 'ride', beard: o.beard });
      r.position.set(0, 1.55, 0.02); body.add(r); g.userData.rider = r;
    }
    g.userData.legs = legs; g.userData.body = body; g.userData.neck = neck; g.userData.tail = tail; g.userData.phase = Math.random() * 6;
    return g;
  };
  M.animateHorse = function (h, speed, dt) {
    const u = h.userData; const s = Math.min(1, Math.abs(speed));
    u.phase += dt * (3 + s * 9);
    const amp = 0.15 + s * 0.6;
    u.legs.forEach((l) => {
      const a = Math.sin(u.phase + l.ph + (l.front ? 0.6 : 0));
      l.L.rotation.x = a * amp;
      l.knee.rotation.x = Math.max(0, -Math.cos(u.phase + l.ph)) * amp * (l.front ? -1.2 : 1.2) * (s > 0.05 ? 1 : 0.1);
    });
    u.body.position.y = Math.abs(Math.sin(u.phase)) * 0.12 * s;
    u.body.rotation.x = Math.sin(u.phase) * 0.04 * s;
    u.neck.rotation.x = 0.55 + Math.sin(u.phase) * 0.08 * s;
    u.tail.rotation.x = -0.5 - s * 0.5 + Math.sin(u.phase * 0.7) * 0.1;
  };

  /* ---------- EAGLE ---------- */
  M.eagle = function () {
    const g = new THREE.Group();
    const brown = mat(0x6b4423), dbrown = mat(0x3d2614), white = mat(0xf3efe6), yellow = mat(0xf2b632);
    const body = mesh(new THREE.CylinderGeometry(0.32, 0.18, 1.5, 7), brown, 0, 0, 0); body.rotation.x = Math.PI / 2; g.add(body);
    g.add(mesh(new THREE.IcosahedronGeometry(0.34, 0), brown, 0, 0.02, 0.55));
    const head = mesh(new THREE.IcosahedronGeometry(0.27, 0), white, 0, 0.18, 0.95); g.add(head);
    const beak = mesh(new THREE.ConeGeometry(0.09, 0.32, 4), yellow, 0, 0.12, 1.25); beak.rotation.x = Math.PI / 2 + 0.3; g.add(beak);
    g.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), mat(0x111111), 0.15, 0.24, 1.05));
    g.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), mat(0x111111), -0.15, 0.24, 1.05));
    const tail = mesh(new THREE.ConeGeometry(0.4, 0.8, 4), white, 0, 0, -1.05); tail.rotation.x = -Math.PI / 2; tail.scale.set(1, 1, 0.25); g.add(tail);
    [0.12, -0.12].forEach((x) => { const t = mesh(new THREE.ConeGeometry(0.06, 0.25, 4), yellow, x, -0.28, -0.2); g.add(t); });
    const wings = [];
    [1, -1].forEach((side) => {
      const w = pivot(0.2 * side, 0.08, 0.15); g.add(w);
      const inner = mesh(new THREE.BoxGeometry(1.5, 0.08, 0.75), brown, 0.75 * side, 0, 0); w.add(inner);
      const outer = pivot(1.5 * side, 0, 0); w.add(outer);
      outer.add(mesh(new THREE.BoxGeometry(1.3, 0.06, 0.6), dbrown, 0.65 * side, 0, -0.05));
      for (let i = 0; i < 5; i++) {
        const f = mesh(new THREE.BoxGeometry(0.55, 0.04, 0.12), dbrown, (1.25 + i * 0.02) * side + 0.2 * side, 0, 0.18 - i * 0.14);
        f.rotation.y = -side * (0.15 + i * 0.12); outer.add(f);
      }
      wings.push({ w, outer, side });
    });
    g.userData.wings = wings; g.userData.phase = 0;
    return g;
  };
  M.animateEagle = function (e, flap, dt) {
    const u = e.userData; u.phase += dt * (2 + flap * 6);
    const a = Math.sin(u.phase) * (0.12 + flap * 0.5);
    u.wings.forEach((w) => { w.w.rotation.z = a * w.side; w.outer.rotation.z = Math.sin(u.phase - 0.8) * (0.1 + flap * 0.35) * w.side; });
  };

  /* ---------- DRONE ---------- */
  M.drone = function () {
    const g = new THREE.Group();
    const white = mat(0xf2f4f7, { r: 0.4 }), dark = mat(0x22262e, { r: 0.5 }), gold = mat(0xe8b85a, { m: 0.4, r: 0.4 });
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.24, 1.0), white, 0, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.12, 0.7), dark, 0, 0.17, 0));
    g.add(mesh(new THREE.SphereGeometry(0.15, 8, 6), dark, 0, -0.2, 0.42));
    g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x3b7dd8, { emissive: 0x3b7dd8, ei: 0.6 }), 0, -0.22, 0.55));
    const rotors = [];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
      const arm = mesh(new THREE.BoxGeometry(0.12, 0.08, 1.0), white, sx * 0.55, 0.02, sz * 0.55); arm.rotation.y = Math.atan2(sx, sz); g.add(arm);
      g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 8), dark, sx * 0.85, 0.08, sz * 0.85));
      { const _m = mesh(new THREE.TorusGeometry(0.42, 0.03, 4, 18), gold, sx * 0.85, 0.12, sz * 0.85); _m.rotation.x = Math.PI / 2; g.add(_m); }
      const r = pivot(sx * 0.85, 0.2, sz * 0.85); g.add(r);
      r.add(mesh(new THREE.BoxGeometry(0.8, 0.02, 0.09), mat(0x111111, { opacity: 0.8 }), 0, 0, 0, false));
      r.add(mesh(new THREE.BoxGeometry(0.09, 0.02, 0.8), mat(0x111111, { opacity: 0.8 }), 0, 0, 0, false));
      g.add(mesh(new THREE.SphereGeometry(0.04, 5, 4), mat(sz > 0 ? 0x33ff66 : 0xff3344, { emissive: sz > 0 ? 0x33ff66 : 0xff3344 }), sx * 0.85, -0.05, sz * 0.85));
      rotors.push(r);
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 4), dark, sx * 0.3, -0.24, sz * 0.3));
    });
    g.userData.rotors = rotors;
    return g;
  };
  M.animateDrone = function (d, dt) { d.userData.rotors.forEach((r, i) => (r.rotation.y += dt * (i % 2 ? 40 : -40))); };

  /* ---------- ELECTRIC CAR ---------- */
  M.car = function (color) {
    const g = new THREE.Group();
    const body = mat(color || 0x1e9bb0, { r: 0.35, m: 0.2 }), glass = mat(0x1b2b45, { r: 0.15, m: 0.5 }), black = mat(0x1a1a1a), white = mat(0xffffff, { emissive: 0xffffee, ei: 0.8 });
    const prof = new THREE.Shape();
    prof.moveTo(-2.1, 0.35); prof.lineTo(2.05, 0.35); prof.lineTo(2.15, 0.75); prof.lineTo(1.9, 1.0); prof.lineTo(0.9, 1.1);
    prof.lineTo(0.35, 1.75); prof.lineTo(-1.5, 1.78); prof.lineTo(-2.05, 1.25); prof.lineTo(-2.15, 0.7); prof.closePath();
    const ex = new THREE.ExtrudeGeometry(prof, { depth: 1.8, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
    ex.translate(0, 0, -0.9); ex.rotateY(-Math.PI / 2);
    g.add(mesh(ex, body));
    const w = new THREE.Shape();
    w.moveTo(0.82, 1.14); w.lineTo(0.32, 1.7); w.lineTo(-1.45, 1.72); w.lineTo(-1.95, 1.22); w.closePath();
    const wg = new THREE.ExtrudeGeometry(w, { depth: 1.86, bevelEnabled: false }); wg.translate(0, 0, -0.93); wg.rotateY(-Math.PI / 2);
    g.add(mesh(wg, glass));
    g.add(mesh(new THREE.BoxGeometry(1.7, 0.05, 1.6), mat(0x111111), 0, 1.84, -0.6));
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.08, 0.06), mat(0x5fe0ff, { emissive: 0x5fe0ff }), 0, 0.85, 2.17));
    [0.65, -0.65].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.4, 0.12, 0.06), white, x, 0.78, 2.17)));
    [0.65, -0.65].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), mat(0xff2a2a, { emissive: 0xff2a2a }), x, 0.95, -2.2)));
    const wheels = [];
    [[0.95, 1.3], [-0.95, 1.3], [0.95, -1.3], [-0.95, -1.3]].forEach(([x, z]) => {
      const wh = pivot(x, 0.42, z); g.add(wh);
      const t = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), black); t.rotation.z = Math.PI / 2; wh.add(t);
      const r = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 6), mat(0xd0d4da, { m: 0.6, r: 0.3 })); r.rotation.z = Math.PI / 2; wh.add(r);
      wheels.push(wh);
    });
    const sign = M.textSprite('EV', { size: 40, color: '#fff', bg: '#1b8a5a', scale: 0.5 }); sign.position.set(0, 1.25, -2.25); g.add(sign);
    g.userData.wheels = wheels;
    return g;
  };
  M.animateCar = function (c, speed, dt) { c.userData.wheels.forEach((w) => (w.rotation.x += speed * dt * 2.4)); };

  /* ---------- PEOPLE ---------- */
  const skins = [0xf3c9a5, 0xe8b893, 0xd9a47c, 0xf6d4b8];
  M.person = function (o = {}) {
    const g = new THREE.Group();
    const skin = mat(o.skin || skins[(Math.random() * skins.length) | 0]);
    const coat = mat(o.coat != null ? o.coat : 0x2f4f9a), pants = mat(o.pants || 0x2b2b33), boots = mat(0x1b1410), gold = mat(0xe8b85a, { m: 0.3, r: 0.5 });
    const legs = [], arms = [];
    [0.13, -0.13].forEach((x) => {
      const L = pivot(x, 0.62, 0); g.add(L);
      L.add(mesh(new THREE.BoxGeometry(0.18, 0.5, 0.2), pants, 0, -0.27, 0));
      L.add(mesh(new THREE.BoxGeometry(0.2, 0.14, 0.3), boots, 0, -0.56, 0.04));
      legs.push(L);
    });
    const torso = mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.8, 8), coat, 0, 0.98, 0); g.add(torso);
    g.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 8), gold, 0, 0.82, 0));
    if (o.trim !== false) g.add(mesh(new THREE.BoxGeometry(0.06, 0.8, 0.05), gold, 0, 0.98, 0.33));
    [0.36, -0.36].forEach((x) => {
      const A = pivot(x, 1.3, 0); g.add(A);
      A.add(mesh(new THREE.BoxGeometry(0.15, 0.55, 0.16), coat, 0, -0.26, 0));
      A.add(mesh(new THREE.SphereGeometry(0.08, 6, 5), skin, 0, -0.56, 0));
      arms.push(A);
    });
    const head = pivot(0, 1.62, 0); g.add(head);
    head.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), skin, 0, 0, 0));
    head.add(mesh(new THREE.SphereGeometry(0.035, 5, 4), mat(0x1a1a1a), 0.1, 0.03, 0.25));
    head.add(mesh(new THREE.SphereGeometry(0.035, 5, 4), mat(0x1a1a1a), -0.1, 0.03, 0.25));
    if (o.beard) { const b = mesh(new THREE.ConeGeometry(0.16, 0.3, 6), mat(o.beard === 'white' ? 0xeeeeee : 0x2a1a10), 0, -0.24, 0.17); b.rotation.x = Math.PI + 0.3; head.add(b); head.add(mesh(new THREE.BoxGeometry(0.22, 0.04, 0.05), mat(o.beard === 'white' ? 0xeeeeee : 0x2a1a10), 0, -0.08, 0.26)); }
    const hat = o.hat || 'none';
    if (hat === 'kalpak') {
      const c = mesh(new THREE.ConeGeometry(0.26, 0.42, 8), mat(0xf4f1ea), 0, 0.36, 0); head.add(c);
      const brim = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 8), mat(0x1a1a1a), 0, 0.2, 0); head.add(brim);
    } else if (hat === 'tymak') {
      head.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.3, 8), mat(0x6b4a2b), 0, 0.26, 0));
      head.add(mesh(new THREE.ConeGeometry(0.24, 0.2, 8), mat(0xc8352f), 0, 0.5, 0));
    } else if (hat === 'helmet') {
      head.add(mesh(new THREE.SphereGeometry(0.31, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.9), mat(o.helmet || 0xe8452f, { r: 0.3 }), 0, 0.04, 0));
      head.add(mesh(new THREE.BoxGeometry(0.42, 0.12, 0.1), mat(0x3bc6ff, { m: 0.6, r: 0.1 }), 0, 0.06, 0.24));
    } else if (hat === 'beanie') {
      head.add(mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(o.helmet || 0xe8b85a), 0, 0.05, 0));
      head.add(mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(0xffffff), 0, 0.36, 0));
    } else if (hat === 'scarf') {
      head.add(mesh(new THREE.SphereGeometry(0.31, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.7), mat(o.scarf || 0xffffff), 0, 0.02, -0.02));
      head.add(mesh(new THREE.ConeGeometry(0.3, 0.4, 8), mat(o.scarf || 0xffffff), 0, -0.2, -0.14));
    } else if (hat === 'cap') {
      head.add(mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(o.helmet || 0x2f4f9a), 0, 0.05, 0));
      head.add(mesh(new THREE.BoxGeometry(0.32, 0.04, 0.2), mat(o.helmet || 0x2f4f9a), 0, 0.08, 0.3));
    } else if (hat === 'hair') {
      head.add(mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.8), mat(0x2a1a10), 0, 0.04, -0.03));
    }
    if (o.backpack) g.add(mesh(new THREE.BoxGeometry(0.42, 0.55, 0.25), mat(o.backpack), 0, 1.05, -0.36));
    if (o.skis) {
      [0.14, -0.14].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.1, 0.04, 1.9), mat(o.skiColor || 0xe8452f), x, 0.02, 0.15)));
      [0.45, -0.45].forEach((x) => { const p = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), mat(0x333333), x, 0.6, -0.15); p.rotation.x = 0.35; g.add(p); });
    }
    if (o.board) g.add(mesh(new THREE.BoxGeometry(0.4, 0.05, 1.6), mat(o.skiColor || 0x7d3fae), 0, 0.02, 0)), (g.rotation.y = Math.PI / 2);
    const pose = o.pose || 'stand';
    if (pose === 'ride') { legs.forEach((L, i) => { L.rotation.x = -0.55; L.rotation.z = (i ? -1 : 1) * 0.75; }); arms.forEach((A) => (A.rotation.x = -0.9)); }
    if (pose === 'sit') { legs.forEach((L) => (L.rotation.x = -1.5)); arms.forEach((A) => (A.rotation.x = -0.6)); }
    if (pose === 'ski') { g.rotation.x = 0; legs.forEach((L) => (L.rotation.x = -0.35)); arms.forEach((A) => (A.rotation.x = -0.5)); torso.rotation.x = 0.25; }
    if (pose === 'arms') { arms.forEach((A, i) => (A.rotation.z = (i ? -1 : 1) * 1.1)); }
    g.userData = { legs, arms, head, phase: Math.random() * 6, pose };
    return g;
  };
  M.animatePerson = function (p, speed, dt) {
    const u = p.userData; u.phase += dt * (2 + speed * 6);
    if (u.pose === 'stand' || u.pose === 'walk') {
      const a = Math.sin(u.phase) * Math.min(0.7, speed * 0.6);
      u.legs[0].rotation.x = a; u.legs[1].rotation.x = -a; u.arms[0].rotation.x = -a; u.arms[1].rotation.x = a;
    }
    if (u.work) { u.arms[0].rotation.x = -0.8 + Math.sin(u.phase * 1.5) * 0.5; }
    u.head.rotation.y = Math.sin(u.phase * 0.23) * 0.3;
  };

  /* ---------- YURT ---------- */
  M.yurt = function (r = 4, o = {}) {
    const g = new THREE.Group();
    const wallH = r * 0.62;
    const fm = new THREE.MeshStandardMaterial({ map: M.tex.felt, flatShading: false, roughness: 0.95 });
    const wall = mesh(new THREE.CylinderGeometry(r, r, wallH, 20, 1, true), fm, 0, wallH / 2, 0); g.add(wall);
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(r * (1.03 - 0.85 * t), wallH + r * 0.62 * Math.sin(t * Math.PI / 2))); }
    const roof = mesh(new THREE.LatheGeometry(pts, 20), mat(o.roof || 0xf2ece0, { side: THREE.DoubleSide })); g.add(roof);
    const band = mesh(new THREE.CylinderGeometry(r * 0.9, r * 1.02, r * 0.14, 20, 1, true), new THREE.MeshStandardMaterial({ map: M.tex.redBand, roughness: 0.9 }), 0, wallH + r * 0.1, 0); g.add(band);
    { const _m = mesh(new THREE.TorusGeometry(r * 0.17, r * 0.035, 5, 14), mat(0x8a5a2b), 0, wallH + r * 0.62, 0); _m.rotation.x = Math.PI / 2; g.add(_m); }
    const door = mesh(new THREE.BoxGeometry(r * 0.38, wallH * 0.82, 0.12), mat(o.door || 0xd9822b), 0, wallH * 0.41, r - 0.02); g.add(door);
    door.add(mesh(new THREE.BoxGeometry(r * 0.3, 0.06, 0.04), mat(0xc8352f), 0, wallH * 0.2, 0.07));
    door.add(mesh(new THREE.BoxGeometry(r * 0.3, 0.06, 0.04), mat(0xc8352f), 0, -wallH * 0.2, 0.07));
    const snow = mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.x * 1.01, p.y + 0.05)).slice(0, 7), 20), mat(0xffffff, { side: THREE.DoubleSide }));
    snow.visible = false; g.add(snow); g.userData.snow = snow;
    return g;
  };

  /* ---------- DOME COMPLEX (yurt-shaped) ---------- */
  function dome(r, o = {}) {
    const g = new THREE.Group();
    const drumH = r * 0.42;
    const glass = mat(0x8fcbe6, { r: 0.08, m: 0.5, opacity: 0.82 });
    g.add(mesh(new THREE.CylinderGeometry(r, r, drumH, 32, 1, true), glass, 0, drumH / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, drumH, 24), mat(0xffe2a8, { emissive: 0xffc56b, ei: 0.25 }), 0, drumH / 2, 0, false));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.add(mesh(new THREE.BoxGeometry(0.22, drumH, 0.22), mat(0x7a5432), Math.cos(a) * r, drumH / 2, Math.sin(a) * r)); }
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.05, 0.35, 32), mat(0xeee6d6), 0, 0.17, 0));
    const dm = new THREE.MeshStandardMaterial({ map: M.tex.lattice, roughness: 0.75, flatShading: false });
    const d = mesh(new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), dm, 0, drumH, 0); d.scale.y = 0.82; g.add(d);
    for (let k = 0; k < 8; k++) {
      const rib = mesh(new THREE.TorusGeometry(r * 1.005, 0.13, 4, 28, Math.PI), mat(0x6b4423), 0, drumH, 0);
      rib.scale.y = 0.82; rib.rotation.y = (k / 8) * Math.PI; g.add(rib);
    }
    const band = mesh(new THREE.CylinderGeometry(r * 0.99, r * 1.025, r * 0.16, 40, 1, true), new THREE.MeshStandardMaterial({ map: M.tex.ornament, roughness: 0.7 }), 0, drumH + r * 0.08, 0); g.add(band);
    const topY = drumH + r * 0.82;
    { const _m = mesh(new THREE.TorusGeometry(r * 0.2, 0.22, 6, 20), mat(0x6b4423), 0, topY - 0.15, 0); _m.rotation.x = Math.PI / 2; g.add(_m); }
    g.add(mesh(new THREE.SphereGeometry(r * 0.2, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xbfe6f5, { r: 0.1, m: 0.5, opacity: 0.85 }), 0, topY - 0.2, 0));
    const snow = mesh(new THREE.SphereGeometry(r * 1.015, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), mat(0xffffff, { flat: false, r: 0.9 }), 0, drumH + 0.1, 0);
    snow.scale.y = 0.84; snow.visible = false; g.add(snow);
    // arch entrance
    const ar = o.arch || r * 0.32;
    const arch = new THREE.Group(); arch.position.set(0, 0, r + 0.6); g.add(arch);
    const fr = mesh(new THREE.TorusGeometry(ar, 0.35, 6, 16, Math.PI), mat(0x7a5432), 0, drumH * 0.55, 0); arch.add(fr);
    [ar, -ar].forEach((x) => arch.add(mesh(new THREE.BoxGeometry(0.7, drumH * 0.55, 0.7), mat(0x7a5432), x, drumH * 0.275, 0)));
    arch.add(mesh(new THREE.TorusGeometry(ar, 0.2, 4, 16, Math.PI), new THREE.MeshStandardMaterial({ map: M.tex.ornament }), 0, drumH * 0.55, 0.3));
    arch.add(mesh(new THREE.BoxGeometry(ar * 2, drumH * 0.55 + ar, 0.12), glass, 0, (drumH * 0.55 + ar) / 2, -0.3));
    g.userData.snow = snow;
    return g;
  }
  M.domeComplex = function () {
    const g = new THREE.Group();
    const plaza = mesh(new THREE.CircleGeometry(58, 64), new THREE.MeshStandardMaterial({ map: M.tex.plaza, roughness: 0.95 }), 0, 0.12, 0, false);
    plaza.rotation.x = -Math.PI / 2; g.add(plaza); g.userData.plaza = plaza;
    const ring = mesh(new THREE.RingGeometry(58, 63, 64), mat(0xbdb5a6), 0, 0.14, 0, false); ring.rotation.x = -Math.PI / 2; g.add(ring);
    const snowCaps = [];
    const center = dome(16, { arch: 4.4 }); center.position.set(0, 0, -8); g.add(center); snowCaps.push(center.userData.snow);
    center.userData.info = 'restaurant'; g.userData.domes = [{ obj: center, type: 'restaurant', r: 26 }];
    const cs = M.textSprite('🍽 Мейрамхана', { size: 48, color: '#fff', bg: '#c8352f', scale: 2 }); void cs;
    const sats = [[-26, -16, 0.6], [26, -16, -0.6], [-22, 10, 1.1], [22, 10, -1.1]];
    sats.forEach(([x, z, rot], si) => {
      const d = dome(10.5); d.position.set(x, 0, z); d.rotation.y = rot; g.add(d); snowCaps.push(d.userData.snow);
      const ty = ['hotel', 'info', 'rental', 'health'][si]; d.userData.info = ty; g.userData.domes.push({ obj: d, type: ty, r: 18 });
      const ds = M.textSprite(['🏨 Қонақүй', 'ℹ️ Ақпарат орталығы', '🎿 Прокат', '🌿 Сауықтыру'][si], { size: 44, color: '#fff', bg: ['#2f4f9a', '#1e2a55', '#3b7dd8', '#2fa36b'][si], scale: 1.5 }); void ds;
      const dx = -x, dz = -8 - z, len = Math.hypot(dx, dz) - 24;
      const cor = mesh(new THREE.BoxGeometry(4.5, 4.2, len), mat(0x8fcbe6, { r: 0.1, m: 0.5, opacity: 0.85 }), x + dx * 0.5, 2.1, z + dz * 0.5);
      cor.lookAt(0, 2.1, -8); g.add(cor);
      const roof = mesh(new THREE.BoxGeometry(5.2, 0.5, len), mat(0x7a5432), 0, 2.3, 0); cor.add(roof);
    });
    // fountain
    const f = new THREE.Group(); f.position.set(0, 0, 26); g.add(f);
    f.add(mesh(new THREE.CylinderGeometry(6, 6.4, 0.9, 24), mat(0xe9e2d3), 0, 0.45, 0));
    const water = mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.2, 24), mat(0x5fc0ea, { r: 0.1, m: 0.2, opacity: 0.85 }), 0, 0.85, 0); f.add(water); g.userData.fountainWater = water;
    f.add(mesh(new THREE.CylinderGeometry(0.6, 0.9, 2.6, 8), mat(0xe9e2d3), 0, 1.3, 0));
    { const _m = mesh(new THREE.TorusGeometry(1.4, 0.25, 6, 16), mat(0xe8b85a, { m: 0.5, r: 0.3 }), 0, 2.6, 0); _m.rotation.x = Math.PI / 2; f.add(_m); }
    // flower beds and benches
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + 0.2, R = 44;
      if (Math.abs(Math.sin(a) - 1) < 0.25) continue;
      const bed = mesh(new THREE.CylinderGeometry(4, 4, 0.5, 10), mat(0x4f9b3c), Math.cos(a) * R, 0.3, Math.sin(a) * R); g.add(bed);
      for (let k = 0; k < 6; k++) bed.add(mesh(new THREE.IcosahedronGeometry(0.6, 0), mat([0xe84d6b, 0xf2c032, 0xffffff, 0xb55ad6][k % 4]), Math.cos(k) * 2.4, 0.6, Math.sin(k) * 2.4));
      g.userData.beds = (g.userData.beds || []).concat(bed);
    }
    // lamp posts
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, R = 60;
      const lp = new THREE.Group(); lp.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.add(lp);
      lp.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 5, 6), mat(0x2b2b33), 0, 2.5, 0));
      lp.add(mesh(new THREE.SphereGeometry(0.5, 8, 6), mat(0xfff1c4, { emissive: 0xffd27a, ei: 0.9 }), 0, 5.2, 0, false));
    }
    const sign = M.textSprite('«ТЕКЕЛІЛІК-ҚОРА ЖАУҺАРЫ»', { size: 64, color: '#2a1d05', bg: '#f2c25b', border: '#ffffff', scale: 2.3 });
    sign.position.set(0, 38, -8); g.add(sign);
    g.userData.snowCaps = snowCaps;
    return g;
  };

  /* ---------- ANIMALS ---------- */
  M.sheep = function () {
    const g = new THREE.Group();
    { const _m = mesh(new THREE.IcosahedronGeometry(0.55, 1), mat(0xf4f1ea), 0, 0.75, 0); _m.scale.set(1, 0.85, 1.3); g.add(_m); }
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.32, 0.42), mat(0x2b2420), 0, 0.85, 0.72));
    [[0.2, 0.35], [-0.2, 0.35], [0.2, -0.35], [-0.2, -0.35]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x2b2420), x, 0.25, z)));
    g.userData.phase = Math.random() * 6; return g;
  };
  M.camel = function () {
    const g = new THREE.Group(); const c = mat(0xc49a63);
    { const _m = mesh(new THREE.CylinderGeometry(0.55, 0.6, 2, 7), c, 0, 2, 0); _m.rotation.x = Math.PI / 2; g.add(_m); }
    g.add(mesh(new THREE.IcosahedronGeometry(0.55, 0), c, 0, 2.6, 0.45));
    g.add(mesh(new THREE.IcosahedronGeometry(0.5, 0), c, 0, 2.55, -0.45));
    const n = mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.4, 6), c, 0, 2.6, 1.3); n.rotation.x = -0.6; g.add(n);
    g.add(mesh(new THREE.BoxGeometry(0.32, 0.32, 0.65), c, 0, 3.25, 1.75));
    [[0.3, 0.7], [-0.3, 0.7], [0.3, -0.7], [-0.3, -0.7]].forEach(([x, z]) => g.add(mesh(new THREE.CylinderGeometry(0.11, 0.09, 1.6, 5), c, x, 0.8, z)));
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.1, 1.2), mat(0xc8352f), 0, 3.05, 0));
    return g;
  };
  M.cow = function () {
    const g = new THREE.Group(); const c = mat(0x5a3a22), w = mat(0xf4f1ea);
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.8, 1.7), c, 0, 1.15, 0));
    g.add(mesh(new THREE.BoxGeometry(0.92, 0.4, 0.5), w, 0, 1.25, 0.2));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), c, 0, 1.4, 1.05));
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.3, 0.2), w, 0, 1.3, 1.38));
    [[0.3, 0.6], [-0.3, 0.6], [0.3, -0.6], [-0.3, -0.6]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.16, 0.75, 0.16), c, x, 0.37, z)));
    return g;
  };
  M.deer = function () {
    const g = new THREE.Group(); const c = mat(0xa0673a);
    { const _m = mesh(new THREE.CylinderGeometry(0.3, 0.32, 1.2, 6), c, 0, 1.3, 0); _m.rotation.x = Math.PI / 2; g.add(_m); }
    const n = mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 5), c, 0, 1.75, 0.6); n.rotation.x = 0.5; g.add(n);
    { const _m = mesh(new THREE.ConeGeometry(0.16, 0.5, 5), c, 0, 2.15, 0.85); _m.rotation.x = Math.PI / 2; g.add(_m); }
    [0.12, -0.12].forEach((x) => { const a = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), mat(0xd9c3a0), x, 2.5, 0.75); a.rotation.z = x * 3; g.add(a); });
    [[0.18, 0.45], [-0.18, 0.45], [0.18, -0.45], [-0.18, -0.45]].forEach(([x, z]) => g.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.1, 4), c, x, 0.55, z)));
    return g;
  };

  /* ---------- TREE GEOMETRIES (merged, vertex-colored) ---------- */
  M.geo = {};
  (function () {
    const tr = new THREE.CylinderGeometry(0.25, 0.35, 2, 5); tr.translate(0, 1, 0);
    const c1 = new THREE.ConeGeometry(2.2, 3.4, 7); c1.translate(0, 3.2, 0);
    const c2 = new THREE.ConeGeometry(1.7, 3, 7); c2.translate(0, 5.0, 0);
    const c3 = new THREE.ConeGeometry(1.1, 2.6, 7); c3.translate(0, 6.6, 0);
    M.geo.spruce = App.mergeColored([[tr, 0x5a3a22], [c1, 0x2f6b3f], [c2, 0x347544], [c3, 0x3a7f4a]]);
    const s1 = new THREE.ConeGeometry(1.5, 1.2, 7); s1.translate(0, 4.4, 0);
    const s2 = new THREE.ConeGeometry(1.15, 1.0, 7); s2.translate(0, 6.0, 0);
    const s3 = new THREE.ConeGeometry(0.75, 1.0, 7); s3.translate(0, 7.55, 0);
    M.geo.spruceSnow = App.mergeColored([[s1, 0xffffff], [s2, 0xffffff], [s3, 0xffffff]]);
    const t2 = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 5); t2.translate(0, 1.3, 0);
    const b1 = new THREE.CylinderGeometry(0.06, 0.09, 1.4, 4); b1.rotateZ(0.7); b1.translate(0.45, 2.6, 0);
    const b2 = new THREE.CylinderGeometry(0.06, 0.09, 1.3, 4); b2.rotateZ(-0.7); b2.translate(-0.4, 2.8, 0.1);
    M.geo.trunk = App.mergeColored([[t2, 0x6b4a32], [b1, 0x6b4a32], [b2, 0x6b4a32]]);
    const cr = new THREE.IcosahedronGeometry(1.7, 0); cr.translate(0, 3.6, 0);
    const cr2 = new THREE.IcosahedronGeometry(1.2, 0); cr2.translate(0.7, 4.4, 0.3);
    M.geo.crown = App.mergeColored([[cr, 0xffffff], [cr2, 0xf0f0f0]]);
    const rk = new THREE.DodecahedronGeometry(1, 0);
    M.geo.rock = App.mergeColored([[rk, 0x9a9a98]]);
    const fl = new THREE.ConeGeometry(0.25, 0.6, 5); fl.translate(0, 0.3, 0);
    M.geo.tuft = App.mergeColored([[fl, 0xffffff]]);
  })();

  /* ---------- SMALL PROPS ---------- */
  M.tent = function (color) {
    const g = new THREE.Group();
    const geo = new THREE.ConeGeometry(1.8, 2.4, 4); geo.rotateY(Math.PI / 4);
    g.add(mesh(geo, mat(color || 0xe86a2f), 0, 1.2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.8, 1.2, 0.05), mat(0x2b2b33), 0, 0.6, 1.25));
    return g;
  };
  M.campfire = function () {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) { const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 5), mat(0x5a3a22), 0, 0.15, 0); l.rotation.z = Math.PI / 2; l.rotation.y = i / 5 * Math.PI; g.add(l); }
    const fire = mesh(new THREE.ConeGeometry(0.4, 1.0, 6), mat(0xff8a1f, { emissive: 0xff6a00, ei: 1.2 }), 0, 0.6, 0, false); g.add(fire); g.userData.fire = fire;
    return g;
  };
  M.stall = function (label, color) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(3, 1.1, 1.4), mat(0x8a5a2b), 0, 0.55, 0));
    [[1.4, 0.65], [-1.4, 0.65], [1.4, -0.65], [-1.4, -0.65]].forEach(([x, z]) => g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), mat(0x6b4423), x, 1.3, z)));
    const roof = mesh(new THREE.BoxGeometry(3.4, 0.15, 1.8), mat(color || 0xc8352f), 0, 2.6, 0); roof.rotation.x = 0.12; g.add(roof);
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.4, 7), mat([0xf4f1ea, 0xe8d9b5, 0xd8c4a0, 0xffffff][i]), -1 + i * 0.66, 1.3, 0.2));
    const s = M.textSprite(label, { size: 44, color: '#2a1d05', bg: '#f2c25b', scale: 0.9 }); s.position.set(0, 3.3, 0); g.add(s);
    return g;
  };
  M.kazan = function () {
    const g = new THREE.Group();
    [0, 2.1, 4.2].forEach((a) => { const l = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 4), mat(0x333333), Math.cos(a) * 0.6, 0.7, Math.sin(a) * 0.6); l.rotation.z = Math.cos(a) * 0.3; l.rotation.x = -Math.sin(a) * 0.3; g.add(l); });
    g.add(mesh(new THREE.SphereGeometry(0.75, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x2b2b2b, { m: 0.6, r: 0.4, side: THREE.DoubleSide }), 0, 1.3, 0));
    const fire = M.campfire(); fire.scale.setScalar(0.8); g.add(fire); g.userData.fire = fire.userData.fire;
    return g;
  };
  M.dryingRack = function () {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), mat(0x8a5a2b), 0, 1.0, 0));
    [[1.1, 0.5], [-1.1, 0.5], [1.1, -0.5], [-1.1, -0.5]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.08, 1, 0.08), mat(0x6b4423), x, 0.5, z)));
    for (let i = 0; i < 18; i++) g.add(mesh(new THREE.SphereGeometry(0.1, 5, 4), mat(0xf6f0dc), -1 + (i % 6) * 0.4, 1.1, -0.4 + Math.floor(i / 6) * 0.4));
    return g;
  };
  M.snowCannon = function () {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 5), mat(0x444444), 0, 1.5, 0));
    const b = mesh(new THREE.CylinderGeometry(0.7, 0.55, 1.1, 10), mat(0xe8452f), 0, 3.1, 0.3); b.rotation.x = 1.1; g.add(b);
    return g;
  };
  M.flag = function (color) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4), mat(0xeeeeee), 0, 1.1, 0));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.6, 0.8), mat(color), 0, 1.85, 0.4));
    return g;
  };
  M.raft = function () {
    const g = new THREE.Group();
    const t = mesh(new THREE.TorusGeometry(1.1, 0.42, 6, 14), mat(0xf5a623), 0, 0.4, 0); t.rotation.x = Math.PI / 2; t.scale.set(1, 1.6, 1); g.add(t);
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.15, 2.6), mat(0x333333), 0, 0.2, 0));
    for (let i = 0; i < 4; i++) {
      const p = M.person({ coat: [0xe8452f, 0x3b7dd8, 0xf2c032, 0x2fa36b][i], hat: 'helmet', helmet: 0xffffff, pose: 'sit', trim: false });
      p.scale.setScalar(0.65); p.position.set(i % 2 ? 0.6 : -0.6, 0.15, i < 2 ? 0.7 : -0.7); p.rotation.y = i % 2 ? -0.3 : 0.3; g.add(p);
      const pad = mesh(new THREE.BoxGeometry(0.06, 0.06, 1.4), mat(0x222222), (i % 2 ? 1.1 : -1.1), 0.7, i < 2 ? 0.7 : -0.7); pad.rotation.x = 0.6; g.add(pad);
    }
    return g;
  };
  M.sled = function (kidColor) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.12, 1.5), mat(0xc8352f), 0, 0.25, 0));
    [0.35, -0.35].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 1.7), mat(0x333333), x, 0.08, 0.05)));
    const k = M.person({ coat: kidColor || 0x3b7dd8, hat: 'beanie', pose: 'sit', trim: false }); k.scale.setScalar(0.6); k.position.set(0, 0.25, -0.1); g.add(k);
    return g;
  };
  M.tube = function (kidColor) {
    const g = new THREE.Group();
    const t = mesh(new THREE.TorusGeometry(0.75, 0.3, 6, 14), mat(0x2fa3e8), 0, 0.3, 0); t.rotation.x = Math.PI / 2; g.add(t);
    const k = M.person({ coat: kidColor || 0xe8452f, hat: 'beanie', helmet: 0x7d3fae, pose: 'sit', trim: false }); k.scale.setScalar(0.6); k.position.set(0, 0.2, -0.1); g.add(k);
    return g;
  };
  M.gondola = function () {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4), mat(0x333333), 0, -1.1, 0));
    const cab = mesh(new THREE.BoxGeometry(1.8, 1.6, 1.8), mat(0xe8b85a, { r: 0.4, m: 0.3 }), 0, -2.9, 0); g.add(cab);
    cab.add(mesh(new THREE.BoxGeometry(1.84, 0.7, 1.4), mat(0x1b2b45, { r: 0.1, m: 0.5 }), 0, 0.2, 0));
    cab.add(mesh(new THREE.BoxGeometry(1.4, 0.7, 1.84), mat(0x1b2b45, { r: 0.1, m: 0.5 }), 0, 0.2, 0));
    cab.add(mesh(new THREE.BoxGeometry(1.9, 0.12, 1.9), mat(0x1e2a55), 0, 0.85, 0));
    return g;
  };
})();
