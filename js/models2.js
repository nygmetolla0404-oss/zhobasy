/* Higher-quality horse & Bactrian camel (override), interior helpers */
(function () {
  const M = Models, mat = App.mat;
  const sm = (c, o = {}) => mat(c, Object.assign({ flat: false, r: 0.62 }, o));
  function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
  const pivot = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
  function ell(rx, ry, rz, m, x, y, z, seg = 20) { const o = mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), m, x, y, z); o.scale.set(rx, ry, rz); return o; }
  // cylinder between two points
  function beam(a, b, r1, r2, m, seg = 10) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = mesh(new THREE.CylinderGeometry(r2, r1, len, seg), m);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  M.beam = beam; M.ell = ell;

  const COATS = {
    bay: [0x7a3f1d, 0x1c120c], chestnut: [0xa5521f, 0x6b2e12], black: [0x1f1a17, 0x0d0b0a], grey: [0xd8d4cc, 0x9a958d],
    palomino: [0xd9a85c, 0xf4ead2], dun: [0xb98d5a, 0x3a2a1c], white: [0xf2efe8, 0xe0dcd2]
  };
  const coatByColor = (c) => { for (const k in COATS) if (COATS[k][0] === c) return COATS[k]; return null; };

  /* ---------------- HORSE ---------------- */
  M.horse = function (o = {}) {
    const g = new THREE.Group();
    let pal = o.coat ? COATS[o.coat] : null;
    if (!pal) { const legacy = { 0x8a4b22: 'bay', 0x3a2414: 'black', 0xf2efe6: 'grey', 0xb07a3a: 'dun', 0x6b6b6b: 'grey', 0x5a2e14: 'chestnut', 0xd9b48a: 'palomino' }; pal = COATS[legacy[o.color] || 'bay']; }
    const coat = sm(pal[0], { r: 0.55 }), hair = sm(o.mane || pal[1], { r: 0.8 }), hoof = sm(0x2a2420, { r: 0.5 }), white = sm(0xf4f1ea);
    const body = pivot(0, 0, 0); g.add(body);
    // torso
    body.add(ell(0.36, 0.4, 0.78, coat, 0, 1.36, 0));
    body.add(ell(0.37, 0.43, 0.42, coat, 0, 1.4, 0.55));   // chest/shoulder
    body.add(ell(0.37, 0.41, 0.44, coat, 0, 1.42, -0.5)); // haunch
    body.add(ell(0.3, 0.2, 0.55, coat, 0, 1.12, 0.02));    // belly
    // neck
    const neck = pivot(0, 1.55, 0.72); body.add(neck); neck.rotation.x = 0.62;
    neck.add(mesh(new THREE.CylinderGeometry(0.16, 0.29, 0.92, 16), coat, 0, 0.42, 0.02));
    neck.add(ell(0.15, 0.48, 0.2, coat, 0, 0.42, -0.06));
    // mane (strands)
    for (let i = 0; i < 10; i++) {
      const s = mesh(new THREE.BoxGeometry(0.07, 0.2, 0.2), hair, 0.05 * (i % 2 ? 1 : -1), 0.0 + i * 0.095, -0.22 + i * 0.012);
      s.rotation.z = (i % 2 ? 1 : -1) * 0.35; s.rotation.x = -0.2; neck.add(s);
    }
    // head
    const head = pivot(0, 0.86, 0.04); neck.add(head); head.rotation.x = 1.75;
    head.add(ell(0.15, 0.17, 0.16, coat, 0, 0.02, -0.02));                    // cheek / jaw
    head.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 14), coat, 0, 0.27, 0.0));
    head.add(ell(0.105, 0.09, 0.1, coat, 0, 0.52, 0.0));                      // muzzle
    [0.05, -0.05].forEach((x) => head.add(ell(0.022, 0.018, 0.03, sm(0x1a1a1a), x, 0.58, 0.04)));
    [0.105, -0.105].forEach((x) => { head.add(ell(0.03, 0.035, 0.03, sm(0x111111, { r: 0.2 }), x, 0.08, 0.07)); });
    [0.07, -0.07].forEach((x) => { const e = mesh(new THREE.ConeGeometry(0.045, 0.17, 8), coat, x, -0.12, -0.04); e.rotation.x = -2.6; e.rotation.z = x * 2; head.add(e); });
    if (o.blaze !== false && (pal === COATS.bay || pal === COATS.chestnut)) head.add(ell(0.035, 0.22, 0.02, white, 0, 0.28, 0.12));
    head.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 0.05), hair, 0, -0.08, 0.06)); // forelock
    // bridle
    const leather = sm(0x3a2416, { r: 0.4 }), gold = mat(0xe8b85a, { m: 0.6, r: 0.3, flat: false });
    if (o.saddle !== false) {
      const nb = mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 20), leather, 0, 0.42, 0); nb.rotation.x = Math.PI / 2; head.add(nb);
      const cb = mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20), leather, 0, 0.0, 0); cb.rotation.x = Math.PI / 2; cb.rotation.z = 0.3; head.add(cb);
      [0.11, -0.11].forEach((x) => head.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), gold, x, 0.42, 0)));
    }
    // tail
    const tail = pivot(0, 1.66, -0.9); body.add(tail); tail.rotation.x = -0.25;
    let prev = tail;
    for (let i = 0; i < 5; i++) { const seg = pivot(0, i === 0 ? 0 : -0.24, 0); prev.add(seg); seg.add(mesh(new THREE.CylinderGeometry(0.1 + i * 0.012, 0.08 + i * 0.015, 0.28, 8), hair, 0, -0.13, 0)); seg.rotation.x = 0.1; prev = seg; }
    tail.add(ell(0.07, 0.07, 0.07, coat, 0, 0.02, 0.02));
    // legs
    const legs = [];
    const defs = [[0.19, 0.56, 0, true], [-0.19, 0.56, Math.PI, true], [0.2, -0.56, Math.PI, false], [-0.2, -0.56, 0, false]];
    defs.forEach(([x, z, ph, front]) => {
      const L = pivot(x, 1.22, z); body.add(L);
      if (front) L.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 12), coat, 0, -0.22, 0));
      else { L.add(ell(0.14, 0.3, 0.18, coat, 0, -0.12, -0.03)); L.add(mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.3, 12), coat, 0, -0.38, -0.06)); }
      const knee = pivot(0, -0.5, front ? 0 : -0.06); L.add(knee);
      knee.add(mesh(new THREE.SphereGeometry(0.085, 12, 8), coat, 0, 0, 0));
      knee.add(mesh(new THREE.CylinderGeometry(0.058, 0.066, 0.44, 10), o.socks ? white : coat, 0, -0.22, 0));
      knee.add(mesh(new THREE.SphereGeometry(0.068, 10, 8), o.socks ? white : coat, 0, -0.46, 0.0));
      knee.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.1, 10), o.socks ? white : coat, 0, -0.53, 0.025));
      knee.add(mesh(new THREE.CylinderGeometry(0.07, 0.088, 0.1, 12), hoof, 0, -0.6, 0.035));
      legs.push({ L, knee, ph, front });
    });
    // Kazakh saddle (ер-тоқым)
    if (o.saddle !== false) {
      const sad = pivot(0, 1.76, 0.08); body.add(sad);
      const cloth = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.03, 24, 1, false, Math.PI * 0.5, Math.PI), sm(o.cloth || 0xb8322a), 0, -0.02, 0); cloth.scale.set(1, 1, 0.9); cloth.rotation.y = Math.PI / 2;
      const cloth2 = cloth.clone(); cloth2.rotation.y = -Math.PI / 2; sad.add(cloth); sad.add(cloth2);
      sad.add(mesh(new THREE.TorusGeometry(0.47, 0.015, 4, 40), gold, 0, 0, 0)).children; // trim
      sad.children[sad.children.length - 1].rotation.x = Math.PI / 2; sad.children[sad.children.length - 1].scale.set(1, 0.9, 1);
      [0.4, -0.4].forEach((x) => { const flap = mesh(new THREE.BoxGeometry(0.03, 0.4, 0.5), sm(o.cloth || 0xb8322a), x, -0.2, 0); flap.rotation.z = x > 0 ? -0.25 : 0.25; sad.add(flap); flap.add(mesh(new THREE.BoxGeometry(0.035, 0.08, 0.5), gold, 0, -0.18, 0)); });
      sad.add(ell(0.22, 0.07, 0.3, sm(0x6b3a1c, { r: 0.35 }), 0, 0.06, 0));
      const pommel = mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.2, 10), sm(0x6b3a1c, { r: 0.35 }), 0, 0.15, 0.28); pommel.rotation.x = -0.25; sad.add(pommel);
      pommel.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), gold, 0, 0.12, 0));
      const cantle = mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), sm(0x6b3a1c, { r: 0.35 }), 0, 0.13, -0.28); cantle.rotation.x = 0.3; sad.add(cantle);
      [0.27, -0.27].forEach((x) => {
        sad.add(beam(new THREE.Vector3(x * 0.8, 0.05, 0.02), new THREE.Vector3(x * 1.25, -0.55, 0.05), 0.012, 0.012, leather, 4));
        const st = mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 14), gold, x * 1.27, -0.6, 0.05); st.rotation.y = Math.PI / 2; sad.add(st);
      });
    }
    if (o.rider) {
      const r = M.person({ coat: o.riderCoat || 0x1f3a7a, hat: o.riderHat || 'kalpak', pose: 'ride', beard: o.beard });
      r.scale.setScalar(0.86); r.position.set(0, 1.28, 0.02); body.add(r); g.userData.rider = r;
    }
    g.userData.legs = legs; g.userData.body = body; g.userData.neck = neck; g.userData.tail = tail; g.userData.head = head; g.userData.phase = Math.random() * 6;
    g.userData.info = 'horse';
    return g;
  };
  M.animateHorse = function (h, speed, dt) {
    const u = h.userData; const s = Math.min(1, Math.abs(speed));
    u.phase += dt * (2.5 + s * 9);
    const amp = 0.12 + s * 0.62;
    u.legs.forEach((l) => {
      const a = Math.sin(u.phase + l.ph + (l.front ? 0.5 : 0));
      l.L.rotation.x = a * amp * (l.front ? 1 : 0.85);
      const bend = Math.max(0, Math.sin(u.phase + l.ph + (l.front ? 2.1 : 1.6)));
      l.knee.rotation.x = (l.front ? 1 : -1) * bend * amp * 1.3 * (s > 0.04 ? 1 : 0);
    });
    u.body.position.y = Math.abs(Math.sin(u.phase)) * 0.1 * s;
    u.body.rotation.x = Math.sin(u.phase) * 0.035 * s;
    u.neck.rotation.x = 0.55 + Math.sin(u.phase + 0.6) * 0.07 * s + (s < 0.04 ? Math.sin(u.phase * 0.15) * 0.25 + 0.15 : 0);
    u.tail.rotation.x = -0.25 - s * 0.7 + Math.sin(u.phase * 0.6) * 0.08;
    u.tail.rotation.z = Math.sin(u.phase * 0.4) * 0.12;
  };

  /* ---------------- BACTRIAN CAMEL ---------------- */
  M.camel = function () {
    const g = new THREE.Group();
    const c = sm(0xbf9461, { r: 0.85 }), wool = sm(0x8a5f36, { r: 1 }), dark = sm(0x2a1d14), pad = sm(0x6e5a48);
    g.add(ell(0.55, 0.5, 1.0, c, 0, 2.0, 0));
    g.add(ell(0.5, 0.45, 0.45, c, 0, 1.95, 0.7));
    g.add(ell(0.5, 0.47, 0.45, c, 0, 2.0, -0.72));
    // two humps with wool
    [0.42, -0.45].forEach((z) => {
      g.add(ell(0.32, 0.42, 0.34, c, 0, 2.55, z));
      for (let i = 0; i < 6; i++) g.add(ell(0.13, 0.12, 0.13, wool, (Math.random() - 0.5) * 0.25, 2.9 + Math.random() * 0.06, z + (Math.random() - 0.5) * 0.25, 8));
    });
    // saddle blanket between humps
    const bl = mesh(new THREE.BoxGeometry(1.2, 0.04, 0.5), sm(0xb8322a), 0, 2.48, 0); g.add(bl);
    [0.6, -0.6].forEach((x) => { const f = mesh(new THREE.BoxGeometry(0.04, 0.6, 0.5), sm(0xb8322a), x, 2.2, 0); g.add(f); f.add(mesh(new THREE.BoxGeometry(0.05, 0.08, 0.5), mat(0xe8b85a, { m: 0.5, flat: false }), 0, -0.26, 0)); });
    // curved neck (down then up)
    const pts = [new THREE.Vector3(0, 2.1, 0.95), new THREE.Vector3(0, 1.85, 1.35), new THREE.Vector3(0, 1.95, 1.75), new THREE.Vector3(0, 2.55, 1.98), new THREE.Vector3(0, 2.95, 2.05)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const ng = new THREE.TubeGeometry(curve, 24, 0.17, 12, false);
    g.add(mesh(ng, c));
    for (let i = 0; i < 8; i++) { const p = curve.getPoint(0.15 + i * 0.09); g.add(ell(0.15, 0.13, 0.12, wool, 0, p.y - 0.14, p.z - 0.02, 8)); } // throat wool
    // head
    const head = pivot(0, 3.0, 2.12); g.add(head); head.rotation.x = 0.25;
    head.add(ell(0.17, 0.19, 0.24, c, 0, 0, 0));
    head.add(ell(0.13, 0.13, 0.26, c, 0, -0.04, 0.3));
    head.add(ell(0.12, 0.06, 0.12, c, 0, -0.14, 0.42)); // droopy lip
    [0.15, -0.15].forEach((x) => { head.add(ell(0.035, 0.035, 0.03, sm(0x111111, { r: 0.2 }), x, 0.06, 0.12)); const e = mesh(new THREE.ConeGeometry(0.04, 0.12, 6), c, x * 0.85, 0.2, -0.08); e.rotation.z = -x * 4; head.add(e); });
    [0.05, -0.05].forEach((x) => head.add(ell(0.02, 0.015, 0.02, dark, x, -0.03, 0.55)));
    head.add(ell(0.16, 0.12, 0.14, wool, 0, 0.17, -0.06, 8)); // forelock wool
    // legs (long, knobby knees, padded feet)
    const legs = [];
    [[0.28, 0.72], [-0.28, 0.72], [0.28, -0.72], [-0.28, -0.72]].forEach(([x, z], i) => {
      const L = pivot(x, 1.72, z); g.add(L);
      L.add(mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.78, 10), c, 0, -0.39, 0));
      const k = pivot(0, -0.8, 0); L.add(k);
      k.add(ell(0.1, 0.1, 0.1, pad, 0, 0, 0.02));
      k.add(mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.72, 10), c, 0, -0.38, 0));
      k.add(ell(0.15, 0.06, 0.2, pad, 0, -0.76, 0.05));
      legs.push({ L, k, ph: i % 3 ? Math.PI : 0 });
    });
    const tail = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), c, 0, 1.95, -1.18); tail.rotation.x = 0.3; g.add(tail);
    tail.add(ell(0.06, 0.12, 0.06, wool, 0, -0.27, 0, 8));
    g.userData = { legs, head, phase: Math.random() * 6, info: 'camel' };
    return g;
  };
  M.animateCamel = function (cm, speed, dt) {
    const u = cm.userData; u.phase += dt * (1 + speed * 4);
    u.legs.forEach((l) => { l.L.rotation.x = Math.sin(u.phase + l.ph) * 0.35 * speed; l.k.rotation.x = Math.max(0, Math.sin(u.phase + l.ph + 1.4)) * 0.5 * speed; });
    u.head.rotation.y = Math.sin(u.phase * 0.3) * 0.25; u.head.rotation.x = 0.25 + Math.sin(u.phase * 0.5) * 0.06;
  };

  /* ---------------- interior textures ---------------- */
  M.tex.kerege = App.canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#efe4cf'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a2481f'; c.lineWidth = 7;
    for (let i = -10; i < 26; i++) { c.beginPath(); c.moveTo(i * 36, 0); c.lineTo(i * 36 + h, h); c.stroke(); c.beginPath(); c.moveTo(i * 36, 0); c.lineTo(i * 36 - h, h); c.stroke(); }
    c.fillStyle = '#e8b85a'; for (let i = -10; i < 26; i++) for (let j = 0; j < 8; j++) { c.beginPath(); c.arc(i * 36 + (j % 2) * 18, j * 36, 4, 0, 7); c.fill(); }
  }, [10, 1]);
  M.tex.wood = App.canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#9a6a3c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#8d5f34' : '#a8764a'; c.fillRect(0, i * 16, w, 15); }
    c.strokeStyle = 'rgba(60,35,15,.35)'; for (let i = 0; i < 60; i++) { c.beginPath(); const y = Math.random() * h; c.moveTo(0, y); c.bezierCurveTo(80, y + 6, 160, y - 6, w, y); c.stroke(); }
  }, [6, 6]);
  M.tex.tus = App.canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#8b1e1e'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e8b85a'; c.lineWidth = 8; c.strokeRect(14, 14, w - 28, h - 28);
    c.strokeStyle = '#f5e6c8'; c.lineWidth = 5;
    for (let i = 0; i < 4; i++) { const x = 70 + i * 124, y = h / 2; c.beginPath(); c.moveTo(x - 40, y); c.bezierCurveTo(x - 40, y - 60, x, y - 60, x, y - 10); c.bezierCurveTo(x, y - 60, x + 40, y - 60, x + 40, y); c.bezierCurveTo(x + 40, y + 60, x, y + 60, x, y + 10); c.bezierCurveTo(x, y + 60, x - 40, y + 60, x - 40, y); c.stroke(); }
    c.fillStyle = '#2f4f9a'; c.fillRect(0, h - 26, w, 12);
  });
})();
