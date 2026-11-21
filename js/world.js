/* The Kora gorge world: terrain, river, waterfall, cluster objects, seasons, life */
(function () {
  const W = (window.WorldScene = {});
  const V3 = THREE.Vector3, M = Models, mat = App.mat;
  const rx = (z) => 35 * Math.sin(z * 0.008) + 15 * Math.sin(z * 0.021 + 1);
  const floorH = (z) => 30 + (500 - z) * 0.07;
  W.rx = rx; W.floorH = floorH;

  /* ---------- ramps & flats ---------- */
  const RA = { ax: 175, az: 165, bx: 432, bz: -72 };
  RA.dx = RA.bx - RA.ax; RA.dz = RA.bz - RA.az; RA.len = Math.hypot(RA.dx, RA.dz); RA.ux = RA.dx / RA.len; RA.uz = RA.dz / RA.len; RA.px = -RA.uz; RA.pz = RA.ux;
  RA.ha = floorH(165) + 6; RA.hb = 335;
  const rampPoint = (t, off) => ({ x: RA.ax + RA.dx * t + RA.px * off, z: RA.az + RA.dz * t + RA.pz * off });
  const ramps = [
    { ax: RA.ax, az: RA.az, bx: RA.bx, bz: RA.bz, ha: RA.ha, hb: RA.hb, w0: 78, w1: 150 },
    { ax: 150, az: 284, bx: 206, bz: 238, ha: floorH(284) + 2, hb: floorH(238) + 16, w0: 15, w1: 32 }
  ];
  ramps.forEach((r) => { r.dx = r.bx - r.ax; r.dz = r.bz - r.az; r.l2 = r.dx * r.dx + r.dz * r.dz; });
  const flats = [
    { id: 'complex', x: 110, z: 200, r: 66, h: floorH(200) + 2 },
    { id: 'rink', x: 52, z: 120, r: 24, h: floorH(120) + 0.4 },
    { id: 'stable', x: -50, z: 300, r: 48, h: floorH(300) + 2 },
    { id: 'village', x: -66, z: -388, r: 52, h: floorH(-388) + 2 },
    { id: 'forest', x: 38, z: -250, r: 30, h: floorH(-250) + 6 },
    { id: 'buddha', x: -14, z: 20, r: 22, h: floorH(20) + 3 },
    { id: 'ges', x: 22, z: 400, r: 18, h: floorH(400) + 1 },
    { id: 'gate', x: rx(470) - 26, z: 470, r: 20, h: floorH(470) + 1 },
    { id: 'base', x: 160, z: 190, r: 16, h: floorH(190) + 3 },
    { id: 'top', x: 440, z: -82, r: 18, h: 338 }
  ];
  function natural(x, z) {
    const d = Math.abs(x - rx(z)), fl = floorH(z);
    const v = App.smooth(20, 210, d);
    const m = App.ridge(x * 0.0042 + 7.3, z * 0.0042 + 3.1, 5) * 300 + App.fbm(x * 0.011, z * 0.011, 3) * 45;
    let h = fl + v * v * m + App.fbm(x * 0.035, z * 0.035, 2) * 5 * v;
    h += App.smooth(-380, -540, z) * 170 * (0.55 + 0.45 * App.smooth(8, 60, d));
    h += App.smooth(-437, -452, z) * 72 * (1 - App.smooth(40, 120, d) * 0.3);
    if (d < 10) h -= (1 - d / 10) * 3.6;
    h += App.smooth(-500, -560, x) * 120 + App.smooth(500, 560, x) * 120 + App.smooth(-500, -560, z) * 80;
    return h;
  }
  function H(x, z) {
    let h = natural(x, z);
    for (const r of ramps) {
      const qx = x - r.ax, qz = z - r.az; const tu = (qx * r.dx + qz * r.dz) / r.l2; const t = Math.max(0, Math.min(1, tu));
      const pd = Math.hypot(x - (r.ax + r.dx * t), z - (r.az + r.dz * t));
      let m = 1 - App.smooth(r.w0, r.w1, pd); if (tu < 0) m *= App.smooth(-0.12, 0, tu); if (tu > 1) m *= App.smooth(1.12, 1, tu);
      if (m > 0) { const rh = App.lerp(r.ha, r.hb, Math.pow(t, 1.08)) + App.fbm(x * 0.02, z * 0.02, 2) * 4; h = App.lerp(h, rh, m); }
    }
    for (const f of flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r * 1.3) { const w = 1 - App.smooth(f.r * 0.78, f.r * 1.3, d); h = App.lerp(h, f.h, w); }
    }
    return h;
  }
  W.H = H;
  const slope = (x, z) => { const e = 2; return Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e); };
  const riverY = (z) => floorH(z) - 2.4;

  /* ---------- state ---------- */
  const groups = {};
  const movers = []; // {fn(dt,t)}
  const clickables = []; W.enterables = [];
  function clk(o, key) { o.userData.info = key; clickables.push(o); return o; }
  function enterable(o, type, r) { W.enterables.push({ obj: o, type, r, pos: new V3() }); }
  // individual, collapsible name label for an object (with an "enter" chip when it can be entered)
  function objLabel(o, icon, name, h, enter, maxDist = 240) {
    const html = `<i>${icon}</i><span class="t">${name}</span>${enter ? '<em class="go">🚪 Кіру</em>' : ''}`;
    return W.labels.add(o, html, 'obj', { offset: h, maxDist, collapsible: true,
      onClick: () => { const k = o.userData.info; if (k && W.onInfo) W.onInfo(k, o); },
      onEnter: () => App.enterInterior && App.enterInterior(enter) });
  }
  let season = 'winter';
  W.pos = {};

  W.build = function () {
    if (W.scene) return;
    const scene = (W.scene = new THREE.Scene());
    const camera = (W.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 2600));
    W.labels = new App.LabelSet();
    ['winter', 'warm', 'summer', 'spring', 'autumn', 'nonwinter', 'notsummer'].forEach((k) => { groups[k] = new THREE.Group(); scene.add(groups[k]); });
    const all = (W.all = new THREE.Group()); scene.add(all);

    // sky + lights
    W.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ gl_FragColor = vec4(pow(mix(bot,top,smoothstep(-.05,.55,p.y)),vec3(.4545)),1.); }' });
    W.sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 16), W.skyMat); scene.add(W.sky);
    scene.fog = new THREE.Fog(0xdfefff, 380, 1500);
    W.hemi = new THREE.HemisphereLight(0xffffff, 0x6b7a5a, 0.75); scene.add(W.hemi);
    const sun = (W.sun = new THREE.DirectionalLight(0xfff1dc, 1.35)); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 700 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    const sunVis = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })); sunVis.position.set(-900, 1000, 900); scene.add(sunVis);

    buildTerrain(); buildRiver(); buildWaterfall(); buildRoadAndTrails(); buildVegetation();
    buildComplex(); buildCable(); buildSki(); buildRink(); buildStable(); buildVillage(); buildCamps(); buildMisc(); buildClouds(); buildParticles();
    buildPOIs();

    W.travel = new Travel({
      scene, camera, scale: 1, ground: H,
      canGo: (x, z, m) => Math.abs(x) < 515 && Math.abs(z) < 515 && (m === 'car' ? z > -446 : z > -440 && slope(x, z) < 1.7),
      nearestGo: () => ({ x: rx(440) - 26, z: 440 }),
      start: { x: rx(445) - 26, z: 445, h: Math.PI },
      speeds: { horse: 28, car: 36, eagle: 48, drone: 30 },
      flyStart: 26, flyMax: 620, bounds: { minX: -520, maxX: 520, minZ: -520, maxZ: 520 },
      camMin: 14, overview: { target: new V3(70, H(70, 215), 215), dist: 260, yaw: -0.25, pitch: 0.62, minDist: 25, maxDist: 900, minPitch: 0.05 },
      overviewY: (x, z) => H(x, z)
    });
    W.setSeason('winter');
  };

  /* ---------- terrain ---------- */
  function buildTerrain() {
    const S = 1100, N = 190;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
    const ng = g.toNonIndexed(); ng.computeVertexNormals();
    ng.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count * 3), 3));
    W.terrain = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    W.terrain.receiveShadow = true; W.scene.add(W.terrain);
    // face info cache
    const pa = ng.attributes.position.array, na = ng.attributes.normal.array, nf = pa.length / 9;
    W.faces = new Float32Array(nf * 5);
    for (let f = 0; f < nf; f++) {
      const o = f * 9; const cx = (pa[o] + pa[o + 3] + pa[o + 6]) / 3, cy = (pa[o + 1] + pa[o + 4] + pa[o + 7]) / 3, cz = (pa[o + 2] + pa[o + 5] + pa[o + 8]) / 3;
      W.faces.set([cx, cy, cz, na[o + 1], App.noise2(cx * 0.02, cz * 0.02)], f * 5);
    }
  }
  const C = (h) => new THREE.Color(h);
  const PAL = {
    winter: { snow: C(0xf3f7fb), snow2: C(0xe2ecf5), rock: C(0x8d939e), grass: C(0xeef4f8), low: C(0xe9f1f7), line: -1e9 },
    spring: { snow: C(0xf6f9fb), snow2: C(0xe6eef3), rock: C(0x8b8f98), grass: C(0x7fcf5c), grass2: C(0x9bdc6a), low: C(0x8fd86a), line: 170 },
    summer: { snow: C(0xf6f9fb), snow2: C(0xe6eef3), rock: C(0x878b93), grass: C(0x4fa84a), grass2: C(0x7cbf55), low: C(0x5cb84f), line: 225 },
    autumn: { snow: C(0xf6f9fb), snow2: C(0xe6eef3), rock: C(0x8a8580), grass: C(0xc9a33c), grass2: C(0xd98a3a), low: C(0xb8a548), line: 190 }
  };
  function colorTerrain(s) {
    const P = PAL[s], col = W.terrain.geometry.attributes.color, arr = col.array, F = W.faces, nf = F.length / 5, c = new THREE.Color();
    for (let f = 0; f < nf; f++) {
      const x = F[f * 5], y = F[f * 5 + 1], z = F[f * 5 + 2], ny = F[f * 5 + 3], n = F[f * 5 + 4];
      const rel = y - floorH(z);
      if (s === 'winter') {
        if (ny < 0.62 && rel > 25) c.copy(P.rock).lerp(P.snow, 0.25 + n * 0.3); else c.copy(n > 0.55 ? P.snow : P.snow2);
      } else if (rel > P.line + (n - 0.5) * 60) c.copy(ny < 0.6 ? P.rock.clone().lerp(P.snow, 0.35) : P.snow);
      else if (ny < 0.6 && rel > 15) c.copy(P.rock).offsetHSL(0, 0, (n - 0.5) * 0.08);
      else {
        c.copy(rel < 20 ? P.low : P.grass).lerp(P.grass2, App.smooth(0.45, 0.8, n));
        if (rel > 130) c.lerp(P.rock, 0.25);
        c.offsetHSL(0, 0, (App.noise2(x * 0.15, z * 0.15) - 0.5) * 0.06);
      }
      for (let k = 0; k < 3; k++) { arr[f * 9 + k * 3] = c.r; arr[f * 9 + k * 3 + 1] = c.g; arr[f * 9 + k * 3 + 2] = c.b; }
    }
    col.needsUpdate = true;
  }

  /* ---------- helpers ---------- */
  function onGround(obj, x, z, yOff = 0) { obj.position.set(x, H(x, z) + yOff, z); return obj; }
  function add(obj, grp = 'all') { (grp === 'all' ? W.all : groups[grp]).add(obj); return obj; }
  function curveOn(pts, yOff = 0.6) { return new THREE.CatmullRomCurve3(pts.map(([x, z]) => new V3(x, H(x, z) + yOff, z))); }
  function ribbon(curve, width, material, yOff = 0.3, n = 200) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPointAt(t), tg = curve.getTangentAt(t); const px = -tg.z, pz = tg.x, l = Math.hypot(px, pz) || 1;
      for (const s of [-1, 1]) { const x = p.x + (px / l) * width * 0.5 * s, z = p.z + (pz / l) * width * 0.5 * s; pos.push(x, H(x, z) + yOff, z); uv.push(s < 0 ? 0 : 1, t * curve.getLength() / width); }
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material); m.receiveShadow = true; return m;
  }
  function follow(obj, curve, u, yOff = 0) {
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    obj.position.set(p.x, H(p.x, p.z) + yOff, p.z); obj.rotation.y = Math.atan2(t.x, t.z);
  }
  function npcLabel(obj, title, sub, h = 3.2) { W.labels.add(obj, `${title}${sub ? '<small>' + sub + '</small>' : ''}`, 'npc', { offset: h, maxDist: 75 }); }

  /* ---------- river ---------- */
  function buildRiver() {
    W.waterTex = App.canvasTex(64, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2f9cf0'); gr.addColorStop(0.5, '#1683e8'); gr.addColorStop(1, '#2f9cf0'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(220,240,255,${0.15 + Math.random() * 0.3})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 2); }
    }, [1, 1]);
    const pos = [], uv = [], idx = []; let n = 0;
    for (let z = 520; z >= -441; z -= 4) {
      const cx = rx(z), y = riverY(z), wdt = 9 + Math.sin(z * 0.05) * 1.5;
      pos.push(cx - wdt, y, z, cx + wdt, y, z); uv.push(0, (520 - z) / 18, 1, (520 - z) / 18);
      if (n) { const a = (n - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } n++;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    W.riverMat = new THREE.MeshStandardMaterial({ map: W.waterTex, color: 0xffffff, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.97, emissive: 0x0d5bb5, emissiveIntensity: 0.45 });
    W.river = new THREE.Mesh(g, W.riverMat); W.river.receiveShadow = true; W.scene.add(W.river);
    // river rocks
    for (let i = 0; i < 70; i++) {
      const z = 500 - Math.random() * 930, x = rx(z) + (Math.random() - 0.5) * 22;
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.8, 0), mat(0x8b8f98)); r.position.set(x, riverY(z) + 0.1, z); r.rotation.set(Math.random(), Math.random(), 0); r.castShadow = true; add(r);
    }
  }

  /* ---------- waterfall ---------- */
  function buildWaterfall() {
    const x0 = rx(-445), zTop = -452, top = H(x0, -456) + 1, bottom = riverY(-440);
    W.pos.waterfall = new V3(x0, bottom, -446);
    W.fallTex = App.canvasTex(64, 256, (c, w, h) => {
      c.fillStyle = 'rgba(60,160,240,.92)'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 110; i++) { c.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${235 + Math.random() * 20 | 0},255,${0.35 + Math.random() * 0.5})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 8 + Math.random() * 30); }
    }, [2, 2]);
    W.fallMat = new THREE.MeshStandardMaterial({ map: W.fallTex, transparent: true, opacity: 0.93, roughness: 0.2, side: THREE.DoubleSide, emissive: 0x1565c0, emissiveIntensity: 0.4 });
    const g = new THREE.Group(); W.scene.add(g); W.fallGroup = g; clk(g, 'waterfall');
    const steps = [top, App.lerp(top, bottom, 0.38), App.lerp(top, bottom, 0.7), bottom];
    for (let i = 0; i < 3; i++) {
      const h = steps[i] - steps[i + 1], w = 7 - i;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 4), W.fallMat); pl.position.set(x0 + i * 1.5, (steps[i] + steps[i + 1]) / 2, zTop + 4 + i * 4.5); pl.rotation.x = -0.12; g.add(pl);
      const ledge = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 0), mat(0xa48a7c)); ledge.scale.set(1.4, 0.5, 0.9); ledge.position.set(x0 + i * 1.5, steps[i + 1] - 1.5, zTop + 6 + i * 4.5); ledge.castShadow = true; g.add(ledge);
      const foam = new THREE.Mesh(new THREE.SphereGeometry(w * 0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd6eeff, { opacity: 0.75, flat: false })); foam.position.set(x0 + i * 1.5, steps[i + 1] + 0.2, zTop + 7 + i * 4.5); foam.scale.y = 0.5; g.add(foam); foam.userData.foam = true;
    }
    // pinkish cliff rocks
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI - Math.PI, r = 20 + Math.random() * 18;
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(5 + Math.random() * 8, 0), mat([0xb48e80, 0xa07a6e, 0x9a9590][i % 3]));
      const x = x0 + Math.cos(a) * r, z = zTop + 2 + Math.sin(a) * 10; rk.position.set(x, App.lerp(bottom, top, Math.random() * 0.9), z - 4); rk.rotation.set(Math.random(), Math.random(), 0); rk.castShadow = true; g.add(rk);
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(15, 20), W.riverMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x0 + 3, bottom + 0.05, -436); W.scene.add(pool);
    // ice for winter
    const ice = new THREE.Group(); groups.winter.add(ice);
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.2 + Math.random(), 18 + Math.random() * 16, 6), mat(0xd9f1ff, { opacity: 0.9, r: 0.2 })); c.rotation.x = Math.PI; c.position.set(x0 - 4 + i, top - 10 - Math.random() * 8, zTop + 4); ice.add(c); }
    W.mist = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.25, depthWrite: false })); W.mist.position.set(x0 + 4, bottom + 4, -438); W.scene.add(W.mist);
  }

  /* ---------- road & trails ---------- */
  function buildRoadAndTrails() {
    const rp = []; for (let z = 520; z >= -360; z -= 20) rp.push([rx(z) - 27 + Math.sin(z * 0.02) * 4, z]);
    rp.push([-50, -372]);
    W.roadCurve = curveOn(rp, 0.3);
    const roadTex = App.canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#4a4d55'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c25b'; c.fillRect(30, 0, 4, 64); c.fillStyle = '#eee'; c.fillRect(3, 0, 3, h); c.fillRect(w - 6, 0, 3, h); }, [1, 1]);
    W.road = ribbon(W.roadCurve, 9, new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }), 0.35, 500); W.scene.add(W.road);
    const trailMat = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    W.horseTrail = curveOn([[-50, 300], [-60, 220], [-45, 140], [-40, 70], [-22, 30], [-30, -40], [-60, -110], [-90, -160], [-80, -230], [-70, -300], [-66, -360], [-40, -405], [-18, -425]], 0.4);
    W.hikeTrail = curveOn([[150, 205], [130, 120], [95, 60], [80, -20], [70, -100], [55, -170], [40, -240], [20, -310], [10, -380], [12, -420]], 0.4);
    const t1 = ribbon(W.horseTrail, 3, trailMat, 0.32, 400); const t2 = ribbon(W.hikeTrail, 2.4, trailMat, 0.32, 400);
    groups.nonwinter.add(t1); groups.nonwinter.add(t2);
  }

  /* ---------- vegetation (instanced) ---------- */
  function buildVegetation() {
    const NS = 2200, ND = 420, NR = 260, NF = 1600;
    W.spruce = new THREE.InstancedMesh(M.geo.spruce, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), NS);
    W.spruceSnow = new THREE.InstancedMesh(M.geo.spruceSnow, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }), NS);
    W.trunks = new THREE.InstancedMesh(M.geo.trunk, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }), ND);
    W.crowns = new THREE.InstancedMesh(M.geo.crown, new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.9 }), ND);
    W.rocks = new THREE.InstancedMesh(M.geo.rock, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }), NR);
    W.flowers = new THREE.InstancedMesh(M.geo.tuft, new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }), NF);
    const d = new THREE.Object3D(); let ns = 0, nd = 0, nr = 0, nf = 0;
    const blocked = (x, z, pad) => {
      if (Math.abs(x - rx(z)) < 13 + pad) return true;
      for (const f of flats) if (Math.hypot(x - f.x, z - f.z) < f.r + pad) return true;
      const tu = ((x - RA.ax) * RA.dx + (z - RA.az) * RA.dz) / (RA.len * RA.len); if (tu > -0.05 && tu < 1.05) { const t = Math.max(0, Math.min(1, tu)); if (Math.hypot(x - (RA.ax + RA.dx * t), z - (RA.az + RA.dz * t)) < 82) return true; }
      if (Math.hypot(x - 178, z - 262) < 40) return true;
      if (z < -430 && Math.abs(x) < 70) return true;
      return false;
    };
    W.crownCols = [];
    for (let i = 0; i < 60000 && (ns < NS || nd < ND || nr < NR); i++) {
      const x = (App.rand() * 2 - 1) * 540, z = (App.rand() * 2 - 1) * 540;
      if (blocked(x, z, 2)) continue;
      const h = H(x, z), rel = h - floorH(z), sl = slope(x, z), n = App.fbm(x * 0.012 + 5, z * 0.012, 3);
      if (Math.abs(x - (rx(z) - 27)) < 7 && z > -380) continue;
      if (sl < 1.1 && rel > 12 && rel < 200 && n > 0.42 && ns < NS) {
        d.position.set(x, h - 0.3, z); d.rotation.set(0, App.rand() * 6, 0); d.scale.setScalar(1.2 + App.rand() * 1.4 + (rel < 60 ? 0.6 : 0)); d.updateMatrix();
        W.spruce.setMatrixAt(ns, d.matrix); W.spruceSnow.setMatrixAt(ns, d.matrix); ns++;
      } else if (sl < 0.6 && rel < 40 && n > 0.36 && nd < ND) {
        d.position.set(x, h - 0.2, z); d.rotation.set(0, App.rand() * 6, 0); d.scale.setScalar(1 + App.rand() * 0.9); d.updateMatrix();
        W.trunks.setMatrixAt(nd, d.matrix); W.crowns.setMatrixAt(nd, d.matrix); W.crownCols.push(App.rand()); nd++;
      } else if (sl > 0.5 && nr < NR && App.rand() < 0.08) {
        d.position.set(x, h - 0.5, z); d.rotation.set(App.rand(), App.rand() * 6, 0); d.scale.set(1.5 + App.rand() * 4, 1 + App.rand() * 2.5, 1.5 + App.rand() * 4); d.updateMatrix(); W.rocks.setMatrixAt(nr++, d.matrix);
      }
    }
    for (let i = 0; i < 30000 && nf < NF; i++) {
      const z = 480 - App.rand() * 900, x = rx(z) + (App.rand() * 2 - 1) * 140;
      if (blocked(x, z, 0)) continue; const h = H(x, z); if (h - floorH(z) > 60 || slope(x, z) > 0.7) continue;
      d.position.set(x, h, z); d.rotation.set(0, App.rand() * 6, 0); d.scale.set(0.35 + App.rand() * 0.3, 0.3 + App.rand() * 0.35, 0.35 + App.rand() * 0.3); d.updateMatrix(); W.flowers.setMatrixAt(nf, d.matrix);
      W.flowers.setColorAt(nf, new THREE.Color([0xe84d6b, 0xf2c032, 0xffffff, 0xb55ad6, 0xff8a3d, 0x5bb0ff][nf % 6])); nf++;
    }
    W.spruce.count = W.spruceSnow.count = ns; W.trunks.count = W.crowns.count = nd; W.rocks.count = nr; W.flowers.count = nf;
    [W.spruce, W.trunks, W.crowns, W.rocks].forEach((m) => { m.castShadow = true; m.receiveShadow = true; W.scene.add(m); });
    groups.winter.add(W.spruceSnow); W.scene.add(W.flowers);
    W.flowers.instanceColor.needsUpdate = true;
  }
  function colorCrowns(s) {
    const c = new THREE.Color();
    for (let i = 0; i < W.crowns.count; i++) {
      const r = W.crownCols[i];
      if (s === 'spring') c.set(r < 0.55 ? (r < 0.3 ? 0xf6b6cf : 0xfbe3ec) : 0x8fd46a);
      else if (s === 'summer') c.setHSL(0.27 + r * 0.07, 0.55, 0.35 + r * 0.12);
      else if (s === 'autumn') c.set([0xe8a23a, 0xd9682a, 0xf2c94c, 0xc8452f][(r * 4) | 0]);
      else c.set(r < 0.5 ? 0xf4f8fb : 0xe4edf3);
      W.crowns.setColorAt(i, c);
    }
    W.crowns.instanceColor.needsUpdate = true;
    W.flowers.visible = s === 'spring' || s === 'summer';
  }

  /* ---------- dome complex ---------- */
  function buildComplex() {
    const f = flats[0];
    const cx = (W.complex = M.domeComplex()); cx.position.set(f.x, f.h, f.z); cx.rotation.y = 0.35; add(cx);
    const DN = { restaurant: ['🍽', 'Мейрамхана', 31], hotel: ['🏨', 'Қонақүй', 22], info: ['ℹ️', 'Ақпарат орталығы', 22], rental: ['🎿', 'Прокат орталығы', 22], health: ['🌿', 'Сауықтыру орталығы', 22] };
    cx.userData.domes.forEach((d) => { clk(d.obj, d.type); enterable(d.obj, d.type, d.r); const n = DN[d.type]; objLabel(d.obj, n[0], n[1], n[2], d.type, 190); });
    W.pos.complex = new V3(f.x, f.h, f.z);
    // avenue to road
    const av = ribbon(curveOn([[f.x - 60 * Math.sin(0.35) * 0 - 15, f.z + 58], [60, 245], [rx(250) - 27, 250]], 0.25), 8, new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), 0.3, 60);
    add(av);
    // strolling tourists
    for (let i = 0; i < 14; i++) {
      const p = M.person({ coat: [0xe8452f, 0x3b7dd8, 0x2fa36b, 0xf2c032, 0x7d3fae, 0x1e2a55][i % 6], hat: ['beanie', 'cap', 'hair', 'scarf'][i % 4], helmet: [0xe8b85a, 0xffffff, 0x3b7dd8][i % 3], trim: false, backpack: i % 3 ? null : 0x2b2b33 });
      p.userData.pose = 'walk'; add(p); clk(p, 'tourists');
      const R = 34 + (i % 4) * 5, sp = (0.05 + (i % 5) * 0.012) * (i % 2 ? 1 : -1), a0 = i * 0.9;
      movers.push((dt, t) => { const a = a0 + t * sp; const x = f.x + Math.cos(a) * R, z = f.z + Math.sin(a) * R; p.position.set(x, f.h + 0.15, z); p.rotation.y = Math.atan2(-Math.sin(a) * sp, Math.cos(a) * sp) + Math.PI / 2 * 0 + (sp > 0 ? 0 : 0); p.rotation.y = a + (sp > 0 ? Math.PI : 0); M.animatePerson(p, 0.6, dt); });
    }
    const guide = M.person({ coat: 0xc8352f, hat: 'kalpak', beard: false }); guide.position.set(f.x + 6, f.h + 0.15, f.z + 36); guide.userData.pose = 'arms'; guide.rotation.y = 0.6; add(guide); clk(guide, 'guide');
    npcLabel(guide, 'Гид-нұсқаушы', 'ақпарат орталығы');
    // rental + medical signs
  }

  /* ---------- cable car ---------- */
  function buildCable() {
    const A = new V3(160, flats[8].h, 190), B = new V3(440, flats[9].h, -82);
    W.pos.cable = A.clone();
    const station = (p, rot) => {
      const g = new THREE.Group(); g.position.copy(p); g.rotation.y = rot; add(g); clk(g, 'station'); enterable(g, 'cable', 22);
      g.add(M.mesh(new THREE.BoxGeometry(18, 9, 14), mat(0xe9e2d3), 0, 4.5, 0));
      g.add(M.mesh(new THREE.BoxGeometry(20, 1.2, 16), mat(0x1e2a55), 0, 9.6, 0));
      g.add(M.mesh(new THREE.CylinderGeometry(4, 4, 2, 16), mat(0xe8b85a, { m: 0.4 }), 0, 11, 0));
      g.add(M.mesh(new THREE.BoxGeometry(18.2, 3, 14.2), mat(0x8fcbe6, { opacity: 0.85, m: 0.4, r: 0.1 }), 0, 5.5, 0));
      return g;
    };
    const rot = Math.atan2(B.x - A.x, B.z - A.z);
    objLabel(station(A, rot), '🚡', 'Төменгі гондола бекеті', 18, 'cable', 320); objLabel(station(B, rot), '🚡', 'Жоғарғы бекет · 3500 м', 22, 'cable', 420);
    const sgn = M.textSprite('Гондола · 15 км', { size: 40, color: '#2a1d05', bg: '#f2c25b', scale: 1.5 }); sgn.position.set(A.x, A.y + 24, A.z); add(sgn);
    // towers
    const nT = 9, pts = [new V3(A.x, A.y + 11, A.z)];
    for (let i = 1; i < nT; i++) {
      const t = i / nT, x = App.lerp(A.x, B.x, t), z = App.lerp(A.z, B.z, t), g = H(x, z), top = Math.max(g + 24, App.lerp(A.y + 11, B.y + 11, t) + 4);
      const tw = new THREE.Group(); tw.position.set(x, g, z); tw.rotation.y = rot; add(tw);
      tw.add(M.mesh(new THREE.CylinderGeometry(0.7, 1.2, top - g, 6), mat(0x9aa3b0, { m: 0.5, r: 0.4 }), 0, (top - g) / 2, 0));
      tw.add(M.mesh(new THREE.BoxGeometry(8, 0.8, 1.2), mat(0xe8b85a, { m: 0.4 }), 0, top - g, 0));
      pts.push(new V3(x, top, z));
    }
    pts.push(new V3(B.x, B.y + 11, B.z));
    const side = new V3(Math.cos(rot), 0, -Math.sin(rot)).multiplyScalar(3);
    const up = new THREE.CurvePath(), down = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) {
      up.add(new THREE.LineCurve3(pts[i].clone().add(side), pts[i + 1].clone().add(side)));
      down.add(new THREE.LineCurve3(pts[pts.length - 1 - i].clone().sub(side), pts[pts.length - 2 - i].clone().sub(side)));
    }
    const lm = new THREE.LineBasicMaterial({ color: 0x2b2b33 });
    add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(up.getPoints(4)), lm));
    add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(down.getPoints(4)), lm));
    W.cableUp = up; W.cableDown = down; W.cableRot = rot;
    const NG = 14;
    for (let i = 0; i < NG; i++) {
      const gd = M.gondola(); add(gd); clk(gd, 'gondola'); const path = i % 2 ? up : down, u0 = i / NG;
      movers.push((dt, t) => { const u = (u0 + t * 0.012) % 1; gd.position.copy(path.getPointAt(u)); gd.rotation.y = rot; });
    }
  }

  /* ---------- ski area ---------- */
  function buildSki() {
    const grp = groups.winter;
    const mkTrail = (fn, t0, t1, n = 40) => { const pts = []; for (let i = 0; i <= n; i++) { const t = App.lerp(t0, t1, i / n); const p = fn(t); pts.push([p.x, p.z]); } return curveOn(pts, 0.4); };
    W.proCurve = mkTrail((t) => rampPoint(t, -32 + Math.sin(t * 14) * 12), 0.97, 0.04);
    W.amCurve = mkTrail((t) => rampPoint(t, 36 + Math.sin(t * 10) * 16), 0.62, 0.04);
    W.parkCurve = mkTrail((t) => rampPoint(t, 2 + Math.sin(t * 8) * 6), 0.48, 0.1);
    const groom = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
    grp.add(ribbon(W.proCurve, 16, groom(0xffffff), 0.35, 300));
    grp.add(ribbon(W.amCurve, 22, groom(0xf7fbff), 0.35, 300));
    grp.add(ribbon(W.parkCurve, 18, groom(0xf9fcff), 0.35, 200));
    const flagAlong = (curve, colors, w) => { for (let i = 0; i <= 26; i++) { const u = i / 26, p = curve.getPointAt(u), tg = curve.getTangentAt(u); const s = i % 2 ? 1 : -1; const x = p.x - tg.z * w * s, z = p.z + tg.x * w * s; const f = M.flag(colors[i % colors.length]); onGround(f, x, z); grp.add(f); } };
    flagAlong(W.proCurve, [0x111111, 0xd9473c], 9);
    flagAlong(W.amCurve, [0x3b7dd8, 0x47b35a], 12);
    // snow cannons
    W.cannonSpray = [];
    for (let i = 0; i < 8; i++) {
      const u = 0.08 + i * 0.11, p = W.proCurve.getPointAt(u), tg = W.proCurve.getTangentAt(u);
      const c = M.snowCannon(); onGround(c, p.x - tg.z * 12, p.z + tg.x * 12); c.rotation.y = Math.atan2(tg.z, -tg.x); grp.add(c); clk(c, 'snow_cannon');
      const spray = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      spray.rotation.x = -Math.PI / 2 + 0.4; spray.position.set(0, 4.5, 4.5); c.add(spray); W.cannonSpray.push(spray);
    }
    // snow park jumps & rails
    [0.42, 0.34, 0.26, 0.18].forEach((t, i) => {
      const p = rampPoint(t, 2 + Math.sin(t * 8) * 6);
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(7, 0); sh.lineTo(7, 2.6); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 9, bevelEnabled: false }); geo.translate(-7, 0, -4.5); geo.rotateY(Math.PI / 2);
      const j = new THREE.Mesh(geo, mat(0xf4f9ff)); j.castShadow = true; onGround(j, p.x, p.z, -0.2); j.rotation.y = Math.atan2(-RA.ux, -RA.uz); grp.add(j);
      if (i % 2) { const rl = M.mesh(new THREE.BoxGeometry(0.3, 0.3, 10), mat(0xe8452f, { m: 0.5 }), 0, 1.4, 0); const rp = rampPoint(t - 0.035, 2); onGround(rl, rp.x + 6, rp.z + 6, 0); rl.rotation.y = Math.atan2(RA.ux, RA.uz); grp.add(rl); }
    });
    W.pos.jumps = [0.42, 0.34, 0.26, 0.18];
    // skiers
    const colors = [0xe8452f, 0x3b7dd8, 0xf2c032, 0x2fa36b, 0x7d3fae, 0xff7a1a, 0x1e2a55, 0xffffff];
    const spawn = (curve, n, opts, speed, sway) => {
      for (let i = 0; i < n; i++) {
        const p = M.person(Object.assign({ coat: colors[i % colors.length], hat: 'helmet', helmet: colors[(i + 3) % colors.length], pose: 'ski', trim: false, skiColor: colors[(i + 5) % colors.length] }, opts));
        grp.add(p); clk(p, opts.board ? 'snowpark' : 'skiers'); const u0 = i / n, sp = speed * (0.85 + Math.random() * 0.3), ph = Math.random() * 6;
        movers.push((dt, t) => {
          if (season !== 'winter') return;
          const u = (u0 + t * sp) % 1; const pp = curve.getPointAt(u), tg = curve.getTangentAt(u);
          const off = Math.sin(t * 2.2 + ph) * sway; const x = pp.x - tg.z * off, z = pp.z + tg.x * off;
          let y = H(x, z) + 0.05;
          if (opts.board) { for (const jt of W.pos.jumps) { const jp = rampPoint(jt, 2); const d = Math.hypot(x - jp.x, z - jp.z); if (d < 12) y += Math.max(0, Math.sin((1 - d / 12) * Math.PI)) * 4; } }
          p.position.set(x, y, z); p.rotation.y = Math.atan2(tg.x, tg.z) + Math.cos(t * 2.2 + ph) * 0.4 + (opts.board ? Math.PI / 2 : 0); p.rotation.z = Math.cos(t * 2.2 + ph) * 0.25;
        });
      }
    };
    spawn(W.proCurve, 9, {}, 0.018, 5);
    spawn(W.amCurve, 9, {}, 0.02, 7);
    spawn(W.parkCurve, 6, { board: true, skis: false, hat: 'beanie' }, 0.03, 3);
    // kids slope
    const kr = ramps[1];
    W.pos.kids = new V3(178, H(178, 262), 262);
    const conveyor = ribbon(curveOn([[kr.ax + 8, kr.az + 8], [kr.bx + 8, kr.bz + 8]], 0.4), 2, new THREE.MeshStandardMaterial({ color: 0x2b2b33, polygonOffset: true, polygonOffsetFactor: -3 }), 0.4, 20); grp.add(conveyor);
    const kidLanes = [-6, -2, 2, 6];
    for (let i = 0; i < 8; i++) {
      const k = i % 2 ? M.sled([0x3b7dd8, 0xe8452f, 0x2fa36b][i % 3]) : M.tube([0xf2c032, 0x7d3fae, 0xe8452f][i % 3]); grp.add(k); clk(k, 'kids');
      const lane = kidLanes[i % 4], u0 = i / 8;
      movers.push((dt, t) => { if (season !== 'winter') return; const u = (u0 + t * 0.07) % 1; const x = App.lerp(kr.bx, kr.ax, u) + kr.dz / Math.sqrt(kr.l2) * lane * -1, z = App.lerp(kr.bz, kr.az, u) + kr.dx / Math.sqrt(kr.l2) * lane; k.position.set(x, H(x, z) + 0.1, z); k.rotation.y = Math.atan2(-kr.dx, -kr.dz) + (i % 2 ? 0 : t * 2); });
    }
    const kidSign = M.textSprite('Балалар аймағы', { size: 40, color: '#fff', bg: '#7d3fae', scale: 1.4 }); kidSign.position.set(kr.bx, kr.hb + 7, kr.bz); grp.add(kidSign);
    // top station viewpoint flag
    const tp = M.textSprite('3500 м · көру алаңы', { size: 40, color: '#2a1d05', bg: '#ffffff', scale: 1.6 }); tp.position.set(440, flats[9].h + 18, -82); add(tp);
    // summer: mountain bikers / hikers on ramp
    for (let i = 0; i < 6; i++) {
      const h = M.person({ coat: colors[i], hat: 'cap', helmet: colors[(i + 2) % 8], backpack: 0x2fa36b, trim: false }); h.userData.pose = 'walk'; groups.warm.add(h); clk(h, 'hikers');
      const u0 = i / 6; movers.push((dt, t) => { if (season === 'winter') return; const u = 1 - ((u0 + t * 0.006) % 1); follow(h, W.amCurve, u); M.animatePerson(h, 0.5, dt); });
    }
  }

  /* ---------- ice rink ---------- */
  function buildRink() {
    const f = flats[1]; W.pos.rink = new V3(f.x, f.h, f.z);
    const grp = groups.winter;
    const ice = new THREE.Mesh(new THREE.CircleGeometry(15, 40), new THREE.MeshStandardMaterial({ color: 0xcfeeff, roughness: 0.05, metalness: 0.3 })); ice.scale.set(1.5, 1, 1); ice.rotation.x = -Math.PI / 2; ice.position.set(f.x, f.h + 0.15, f.z); grp.add(ice); clk(ice, 'rink');
    const board = new THREE.Mesh(new THREE.TorusGeometry(15, 0.45, 4, 40), mat(0x1e2a55)); board.scale.set(1.5, 1, 1); board.rotation.x = Math.PI / 2; board.position.set(f.x, f.h + 0.5, f.z); grp.add(board);
    const bulbs = [];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = f.x + Math.cos(a) * 25, z = f.z + Math.sin(a) * 17.5;
      const lp = new THREE.Group(); lp.position.set(x, f.h, z); grp.add(lp);
      lp.add(M.mesh(new THREE.CylinderGeometry(0.15, 0.2, 7, 6), mat(0x2b2b33), 0, 3.5, 0));
      const b = M.mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: [0xff4d6d, 0xffd34d, 0x4dc3ff, 0x6dff8a][i % 4], emissiveIntensity: 1 }), 0, 7.2, 0, false); lp.add(b); bulbs.push(b);
    }
    const note = M.textSprite('♪ ♫ ♪', { size: 50, color: '#e8b85a', scale: 1.4 }); note.position.set(f.x, f.h + 11, f.z); grp.add(note);
    movers.push((dt, t) => { if (season !== 'winter') return; bulbs.forEach((b, i) => (b.material.emissiveIntensity = 0.6 + 0.6 * Math.sin(t * 4 + i))); note.position.y = f.h + 11 + Math.sin(t * 2) * 0.8; });
    for (let i = 0; i < 12; i++) {
      const p = M.person({ coat: [0xe8452f, 0x3b7dd8, 0xf2c032, 0x2fa36b, 0x7d3fae, 0xffffff][i % 6], hat: 'beanie', helmet: [0xe8b85a, 0xc8352f, 0x3b7dd8][i % 3], pose: i % 3 ? 'arms' : 'stand', trim: false });
      if (i % 4 === 0) p.scale.setScalar(0.65);
      grp.add(p); clk(p, 'rink'); const R = 6 + (i % 4) * 2.2, sp = 0.35 + (i % 3) * 0.08, a0 = i;
      movers.push((dt, t) => { if (season !== 'winter') return; const a = a0 + t * sp; p.position.set(f.x + Math.cos(a) * R * 1.5, f.h + 0.2, f.z + Math.sin(a) * R); p.rotation.y = -a; p.rotation.z = 0.12; });
    }
    // summer: rafting pier on the same bank
    const pier = M.mesh(new THREE.BoxGeometry(14, 0.6, 5), mat(0x8a5a2b), rx(120) + 9, riverY(120) + 0.8, 120); groups.summer.add(pier);
  }

  /* ---------- stable / hippodrome ---------- */
  function buildStable() {
    const f = flats[2]; W.pos.stable = new V3(f.x, f.h, f.z);
    const track = new THREE.Mesh(new THREE.RingGeometry(22, 30, 48), new THREE.MeshStandardMaterial({ color: 0xc9a46c, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); track.scale.set(1.25, 1, 1); track.rotation.x = -Math.PI / 2; track.position.set(f.x, f.h + 0.2, f.z); add(track);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), mat(0xf4f1ea), 140); const d = new THREE.Object3D(); let n = 0;
    [30.5, 21.5].forEach((R) => { for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2; d.position.set(f.x + Math.cos(a) * R * 1.25, f.h + 0.8, f.z + Math.sin(a) * R); d.updateMatrix(); posts.setMatrixAt(n++, d.matrix); } });
    posts.castShadow = true; add(posts);
    [30.5, 21.5].forEach((R) => { const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 3, 70), mat(0xf4f1ea)); rail.scale.set(1.25, 1, 1); rail.rotation.x = Math.PI / 2; rail.position.set(f.x, f.h + 1.4, f.z); add(rail); });
    const barn = new THREE.Group(); barn.position.set(f.x - 8, f.h, f.z - 44 + 6); add(barn); clk(barn, 'stable'); enterable(barn, 'stable', 22); objLabel(barn, '🐎', 'Атшабар қорасы', 12, 'stable');
    barn.add(M.mesh(new THREE.BoxGeometry(30, 6, 10), mat(0xa0522d), 0, 3, 0));
    const roof = M.mesh(new THREE.CylinderGeometry(6.5, 6.5, 31, 3, 1), mat(0x5a3a22), 0, 7.2, 0); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI; roof.scale.set(1, 1, 0.9); barn.add(roof);
    for (let i = 0; i < 6; i++) barn.add(M.mesh(new THREE.BoxGeometry(3, 4, 0.2), mat(0xf4f1ea), -12.5 + i * 5, 2.2, 5.05));
    const s = M.textSprite('Атшабар · 25–30 тау аты', { size: 40, color: '#fff', bg: '#a0522d', scale: 1.6 }); s.position.set(f.x - 8, f.h + 13, f.z - 38); add(s);
    const coats = [0x8a4b22, 0x3a2414, 0xf2efe6, 0xb07a3a, 0x6b6b6b, 0x5a2e14, 0xd9b48a];
    for (let i = 0; i < 12; i++) {
      const h = M.horse({ saddle: i % 3 === 0, color: coats[i % coats.length] }); add(h); clk(h, 'horse');
      let x = f.x + (Math.random() - 0.5) * 30, z = f.z + (Math.random() - 0.5) * 22, hd = Math.random() * 6, tm = 0, mv = 0;
      movers.push((dt) => { tm -= dt; if (tm < 0) { tm = 2 + Math.random() * 4; mv = Math.random() < 0.5 ? 0 : 1.6; hd += (Math.random() - 0.5) * 2; } const nx = x + Math.sin(hd) * mv * dt, nz = z + Math.cos(hd) * mv * dt; if (((nx - f.x) / 25) ** 2 + ((nz - f.z) / 19) ** 2 < 1) { x = nx; z = nz; } else hd += Math.PI * dt * 2; h.position.set(x, f.h + 0.2, z); h.rotation.y = hd; M.animateHorse(h, mv / 5, dt); });
    }
    // a rider training on the track
    const tr = M.horse({ rider: true, riderCoat: 0xc8352f, riderHat: 'tymak', color: 0xf2efe6 }); add(tr); clk(tr, 'horse');
    movers.push((dt, t) => { const a = t * 0.35; tr.position.set(f.x + Math.cos(a) * 26 * 1.25, f.h + 0.25, f.z + Math.sin(a) * 26); tr.rotation.y = -a + Math.PI; M.animateHorse(tr, 1, dt); });
    const groom = M.person({ coat: 0x5a3a22, hat: 'tymak', beard: true }); groom.position.set(f.x + 4, f.h + 0.2, f.z - 30); add(groom); clk(groom, 'stable'); npcLabel(groom, 'Атбегі', 'жылқышы-нұсқаушы');
    // riders' caravan on the horse trail (warm seasons)
    for (let i = 0; i < 7; i++) {
      const r = M.horse({ rider: true, riderCoat: [0x3b7dd8, 0xe8452f, 0x2fa36b, 0xf2c032, 0x7d3fae, 0x1e2a55, 0xff7a1a][i], riderHat: i === 0 ? 'kalpak' : 'cap', color: coats[i] });
      groups.warm.add(r); clk(r, 'horse'); if (i === 0) npcLabel(r, 'Атты тур', 'Текелі — Бұрқан-бұлақ', 4.6);
      movers.push((dt, t) => {
        if (season === 'winter') return;
        const raw = (t * 0.004 + 0.3 - i * 0.012), u = ((raw % 2) + 2) % 2, uu = u < 1 ? u : 2 - u;
        follow(r, W.horseTrail, Math.min(0.999, Math.max(0, uu)), 0); if (u >= 1) r.rotation.y += Math.PI; M.animateHorse(r, 0.45, dt);
      });
    }
  }

  /* ---------- village ---------- */
  function buildVillage() {
    const f = flats[3]; W.pos.village = new V3(f.x, f.h, f.z);
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshStandardMaterial({ map: M.tex.carpet, polygonOffset: true, polygonOffsetFactor: -2 })); carpet.rotation.x = -Math.PI / 2; carpet.position.set(f.x, f.h + 0.2, f.z); add(carpet);
    W.yurts = [];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + 0.3, R = 24 + (i % 2) * 6;
      const y = M.yurt(4 + (i === 0 ? 1.5 : 0), { door: [0xd9822b, 0xc8352f, 0x2f4f9a][i % 3] }); y.position.set(f.x + Math.cos(a) * R, f.h, f.z + Math.sin(a) * R); y.rotation.y = -a - Math.PI / 2; add(y); W.yurts.push(y); clk(y, 'yurt'); enterable(y, 'yurt', 10); objLabel(y, '🛖', i === 0 ? 'Ақ орда · басты киіз үй' : 'Киіз үй №' + (i + 1), i === 0 ? 11 : 9, 'yurt', 150);
    }
    const sign = M.textSprite('«NOMAD VILLAGE» этно-ауылы', { size: 44, color: '#2a1d05', bg: '#f2c25b', scale: 1.8 }); sign.position.set(f.x, f.h + 15, f.z); add(sign);
    const kazan = M.kazan(); kazan.position.set(f.x + 4, f.h, f.z + 13); add(kazan); clk(kazan, 'kazan'); objLabel(kazan, '🍲', 'Қазан-ошақ', 3.5, null, 110); W.fires = [kazan.userData.fire];
    // stalls
    [['Қымыз', -0.4, 0xc8352f, 'kymyz'], ['Шұбат', 0.2, 0x2f4f9a, 'shubat'], ['Саумал', 0.8, 0x2fa36b, 'saumal'], ['Құрт · Ірімшік', 1.4, 0xd9822b, 'kurt'], ['Бесбармақ', 2.0, 0x7d3fae, 'beshbarmak']].forEach(([t, a, c, key]) => {
      const s = M.stall(t, c); clk(s, key); s.position.set(f.x + Math.cos(a) * 13, f.h, f.z + Math.sin(a) * 13); s.rotation.y = -a - Math.PI / 2; add(s);
      const seller = M.person({ coat: c, hat: a > 1 ? 'scarf' : 'kalpak', scarf: 0xffffff, beard: a < 0 }); seller.position.set(f.x + Math.cos(a) * 14.8, f.h, f.z + Math.sin(a) * 14.8); seller.rotation.y = -a - Math.PI / 2 + Math.PI; seller.userData.work = true; add(seller); clk(seller, key);
      movers.push((dt) => M.animatePerson(seller, 0, dt));
    });
    // locals
    const elder = M.person({ coat: 0x5a3a22, hat: 'tymak', beard: 'white' }); elder.position.set(f.x - 3, f.h + 0.2, f.z + 3); elder.rotation.y = 2; add(elder); clk(elder, 'aksakal'); npcLabel(elder, 'Ақсақал', 'дәстүр сақшысы');
    const hunter = M.person({ coat: 0x2f4f9a, hat: 'tymak', beard: true }); hunter.position.set(f.x - 12, f.h + 0.2, f.z - 8); hunter.userData.pose = 'arms'; hunter.rotation.y = 0.7; add(hunter); clk(hunter, 'eagle_hunter');
    const bird = M.eagle(); bird.scale.setScalar(0.35); bird.position.set(0.9, 1.5, 0.1); bird.userData.wings.forEach((w) => (w.w.rotation.z = 1.1 * w.side)); hunter.add(bird);
    npcLabel(hunter, 'Бүркітші', 'құсбегілік өнер');
    const kurtW = M.person({ coat: 0xc8352f, hat: 'scarf', scarf: 0xffffff }); kurtW.position.set(f.x + 18, f.h + 0.2, f.z - 14); kurtW.userData.work = true; kurtW.rotation.y = -0.8; add(kurtW); clk(kurtW, 'kurt'); npcLabel(kurtW, 'Құрт жаюшы', 'ірімшік, құрт, сары май');
    movers.push((dt) => M.animatePerson(kurtW, 0, dt));
    const rack = M.dryingRack(); rack.position.set(f.x + 20, f.h, f.z - 12); rack.rotation.y = 0.6; add(rack, 'nonwinter'); clk(rack, 'kurt');
    // mares on the zhели for saumal / kymyz
    const zx = f.x - 34, zz = f.z + 8;
    groups.nonwinter.add(M.mesh(new THREE.CylinderGeometry(0.08, 0.08, 22, 4), mat(0x5a3a22), zx, f.h + 1.3, zz)).children.slice(-1)[0].rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const m = M.horse({ saddle: false, color: [0x8a4b22, 0xf2efe6, 0xb07a3a, 0x3a2414, 0xd9b48a][i] }); m.position.set(zx + 2.5, f.h, zz - 9 + i * 4.5); m.rotation.y = -Math.PI / 2; groups.nonwinter.add(m); clk(m, 'milker'); movers.push((dt) => M.animateHorse(m, 0, dt)); }
    const milker = M.person({ coat: 0x2fa36b, hat: 'scarf', scarf: 0xf2c25b }); milker.position.set(zx + 4.5, f.h, zz); milker.rotation.y = -Math.PI / 2; milker.userData.work = true; groups.nonwinter.add(milker); clk(milker, 'milker'); npcLabel(milker, 'Сауыншы', 'бие сауу — саумал, қымыз');
    movers.push((dt) => M.animatePerson(milker, 0, dt));
    // camels
    for (let i = 0; i < 3; i++) { const c = M.camel(); c.position.set(f.x + 30 + i * 6, f.h, f.z + 22 - i * 3); c.rotation.y = 2.4 + i * 0.4; add(c); clk(c, 'camel'); movers.push((dt) => M.animateCamel(c, 0, dt)); if (!i) npcLabel(c, 'Бактриан түйесі', 'шұбат — түйе сүті', 3.6); }
    // sheep flock (warm)
    const flock = []; for (let i = 0; i < 16; i++) { const s = M.sheep(); groups.nonwinter.add(s); clk(s, 'sheep'); flock.push({ s, a: Math.random() * 6, r: 6 + Math.random() * 9 }); }
    const shepherd = M.horse({ rider: true, riderCoat: 0x5a3a22, riderHat: 'tymak', color: 0x3a2414 }); groups.nonwinter.add(shepherd); clk(shepherd, 'shepherd'); npcLabel(shepherd, 'Шопан', 'қой бағу', 4.6);
    movers.push((dt, t) => {
      if (season === 'winter') return;
      const cx = f.x + 70 + Math.sin(t * 0.03) * 20, cz = f.z + 40 + Math.cos(t * 0.03) * 15;
      flock.forEach((o, i) => { o.a += dt * 0.05 * (i % 2 ? 1 : -1); const x = cx + Math.cos(o.a) * o.r, z = cz + Math.sin(o.a) * o.r; o.s.position.set(x, H(x, z), z); o.s.rotation.y = o.a + (i % 2 ? 0 : Math.PI); });
      const x = cx + 18, z = cz; shepherd.position.set(x, H(x, z), z); shepherd.rotation.y = Math.sin(t * 0.2); M.animateHorse(shepherd, 0.1, dt);
    });
    // cows
    for (let i = 0; i < 3; i++) { const c = M.cow(); onGround(c, f.x - 20 + i * 5, f.z + 40); c.rotation.y = i; add(c, 'nonwinter'); clk(c, 'cow'); }
    // kids playing
    for (let i = 0; i < 3; i++) {
      const k = M.person({ coat: [0xf2c032, 0xe8452f, 0x3b7dd8][i], hat: 'hair', trim: false }); k.scale.setScalar(0.62); add(k); k.userData.pose = 'walk';
      movers.push((dt, t) => { const a = t * 0.8 + i * 2.1; k.position.set(f.x + Math.cos(a) * 5, f.h + 0.2 + Math.abs(Math.sin(t * 5 + i)) * 0.3, f.z + Math.sin(a) * 5); k.rotation.y = -a; M.animatePerson(k, 1, dt); });
    }
  }

  /* ---------- camps, buddha, aktas, ges, gate ---------- */
  function buildCamps() {
    // Buddha stone
    const b = flats[5]; W.pos.buddha = new V3(b.x, b.h, b.z);
    const btex = App.canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#7d7468'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 800; i++) { c.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0,.05)`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      c.strokeStyle = '#efe6d2'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(128, 70, 22, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(128, 92); c.bezierCurveTo(80, 110, 70, 170, 78, 190); c.lineTo(178, 190); c.bezierCurveTo(186, 170, 176, 110, 128, 92); c.stroke();
      c.beginPath(); c.ellipse(128, 200, 70, 16, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(128, 70, 40, Math.PI, 0); c.stroke();
      c.font = 'bold 22px serif'; c.fillStyle = '#efe6d2'; c.fillText('ༀ མ ཎི པ དྨེ ཧཱུྃ', 40, 240);
    });
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(7, 1), new THREE.MeshStandardMaterial({ map: btex, flatShading: true, roughness: 0.95 }));
    stone.scale.set(1, 1.2, 0.8); stone.position.set(b.x, b.h + 6, b.z); stone.rotation.y = 0.9; stone.castShadow = true; add(stone); clk(stone, 'buddha');
    const camp1 = new THREE.Group(); camp1.position.set(b.x + 12, b.h, b.z + 6); groups.nonwinter.add(camp1); clk(camp1, 'camp');
    [0xe86a2f, 0x2fa36b, 0x3b7dd8].forEach((c, i) => { const t = M.tent(c); t.position.set(i * 5, 0, (i % 2) * 4); t.rotation.y = i; camp1.add(t); });
    const cf = M.campfire(); cf.position.set(5, 0, -5); camp1.add(cf); W.fires.push(cf.userData.fire);
    // Forest camp, phyto-bar
    const f = flats[4]; W.pos.forest = new V3(f.x, f.h, f.z);
    const camp2 = new THREE.Group(); camp2.position.set(f.x, f.h, f.z); groups.nonwinter.add(camp2); clk(camp2, 'camp');
    for (let i = 0; i < 6; i++) { const t = M.tent([0xe86a2f, 0xf2c032, 0x2fa36b, 0x3b7dd8, 0xc8352f, 0x7d3fae][i]); const a = i / 6 * Math.PI * 2; t.position.set(Math.cos(a) * 12, 0, Math.sin(a) * 12); t.rotation.y = -a - Math.PI / 2; camp2.add(t); }
    const cf2 = M.campfire(); camp2.add(cf2); W.fires.push(cf2.userData.fire);
    const bar = new THREE.Group(); bar.position.set(f.x - 18, f.h, f.z + 14); add(bar); clk(bar, 'phyto'); objLabel(bar, '🌿', 'Фито-бар', 9, null, 200);
    bar.add(M.mesh(new THREE.CylinderGeometry(4, 4, 4, 8), mat(0x8a5a2b), 0, 2, 0));
    bar.add(M.mesh(new THREE.ConeGeometry(5.2, 3.5, 8), mat(0x2f6b3f), 0, 5.6, 0));
    const fs = M.textSprite('Фито-бар · орман терапиясы', { size: 40, color: '#fff', bg: '#2f6b3f', scale: 1.5 }); fs.position.set(f.x - 18, f.h + 10, f.z + 14); add(fs);
    // deer in forest
    for (let i = 0; i < 3; i++) { const d = M.deer(); add(d); clk(d, 'deer'); const a0 = i * 2; movers.push((dt, t) => { const a = a0 + t * 0.03; const x = f.x + 60 + Math.cos(a) * 25, z = f.z - 20 + Math.sin(a) * 25; d.position.set(x, H(x, z), z); d.rotation.y = -a; }); if (!i) npcLabel(d, 'Марал', 'орман белдеуі', 3.2); }
    // hikers
    for (let i = 0; i < 8; i++) {
      const h = M.person({ coat: [0xe8452f, 0x3b7dd8, 0xf2c032, 0x2fa36b][i % 4], hat: i % 2 ? 'cap' : 'hair', helmet: 0xffffff, backpack: [0x2b2b33, 0xc8352f, 0x1e2a55][i % 3], trim: false }); h.userData.pose = 'walk'; groups.warm.add(h); clk(h, 'hikers');
      if (!i) npcLabel(h, 'Жаяу туристер', 'треккинг соқпағы');
      movers.push((dt, t) => { if (season === 'winter') return; const raw = t * 0.003 + i * 0.02, u = raw % 2, uu = u < 1 ? u : 2 - u; follow(h, W.hikeTrail, Math.min(0.999, uu)); if (u >= 1) h.rotation.y += Math.PI; M.animatePerson(h, 0.6, dt); });
    }
    // winter ski-tourers on the hiking trail
    for (let i = 0; i < 4; i++) {
      const h = M.person({ coat: [0xe8452f, 0x3b7dd8, 0xf2c032, 0x2fa36b][i], hat: 'beanie', skis: true, pose: 'ski', backpack: 0x2b2b33, trim: false }); groups.winter.add(h); clk(h, 'hikers');
      movers.push((dt, t) => { if (season !== 'winter') return; const u = (t * 0.004 + i * 0.03) % 1; follow(h, W.hikeTrail, u); });
    }
  }
  function buildMisc() {
    // Aktas cliff
    const ax = -158, az = -150, ag = H(ax, az); W.pos.aktas = new V3(ax, ag, az);
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(70, 110, 26, 6, 10, 2), mat(0xc9c4ba));
    const cp = cliff.geometry.attributes.position; for (let i = 0; i < cp.count; i++) { cp.setX(i, cp.getX(i) + (App.noise2(cp.getY(i) * 0.08, cp.getZ(i) * 0.1) - 0.5) * 8); cp.setZ(i, cp.getZ(i) + (App.noise2(cp.getX(i) * 0.08, cp.getY(i) * 0.08) - 0.5) * 8); }
    cliff.geometry.computeVertexNormals(); cliff.position.set(ax - 8, ag + 50, az); cliff.rotation.y = 0.5; cliff.castShadow = true; cliff.receiveShadow = true; add(cliff); clk(cliff, 'climbers');
    W.pos.aktasTop = ag + 100;
    for (let i = 0; i < 4; i++) {
      const c = M.person({ coat: [0xe8452f, 0xf2c032, 0x3b7dd8, 0x2fa36b][i], hat: 'helmet', helmet: 0xffffff, backpack: 0x2b2b33, trim: false }); groups.warm.add(c); clk(c, 'climbers');
      const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xe8452f })); groups.warm.add(rope);
      const bx = ax - 8 + Math.cos(0.5) * (-14 + i * 9) + Math.sin(0.5) * 13.5, bz = az - Math.sin(0.5) * (-14 + i * 9) + Math.cos(0.5) * 13.5;
      movers.push((dt, t) => { if (season === 'winter') return; const y = ag + 4 + ((t * 0.9 + i * 17) % 60); c.position.set(bx, y, bz); c.rotation.y = 0.5 + Math.PI; c.userData.arms[0].rotation.x = -2.6 + Math.sin(t * 3 + i) * 0.4; c.userData.arms[1].rotation.x = -2.6 - Math.sin(t * 3 + i) * 0.4; const pa = rope.geometry.attributes.position; pa.setXYZ(0, bx, y + 1, bz); pa.setXYZ(1, bx, ag + 100, bz); pa.needsUpdate = true; });
      if (!i) npcLabel(c, 'Альпинистер', 'арқан · карабин', 2.8);
    }
    /* ---- winter alpinism: ice climbing on Aktas + a roped team on a snowy summit ---- */
    const axe = (arm) => { const a = new THREE.Group(); a.position.set(0, -0.58, 0.05); a.add(M.mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05), mat(0x2b2b33), 0, -0.2, 0.12)); a.add(M.mesh(new THREE.BoxGeometry(0.05, 0.08, 0.34), mat(0xc0c6cf, { m: 0.7, r: 0.3 }), 0, -0.5, 0.2)); arm.add(a); };
    const iceG = new THREE.Group(); iceG.position.copy(cliff.position); iceG.rotation.y = 0.5; groups.winter.add(iceG);
    const iceWall = new THREE.Mesh(new THREE.BoxGeometry(40, 78, 1.2, 4, 8, 1), mat(0xbfe6ff, { opacity: 0.88, r: 0.15 }));
    { const ip = iceWall.geometry.attributes.position; for (let i = 0; i < ip.count; i++) ip.setZ(i, ip.getZ(i) + Math.sin(ip.getY(i) * 0.3 + ip.getX(i)) * 0.6); iceWall.geometry.computeVertexNormals(); }
    iceWall.position.set(-1, -14, 13.9); iceG.add(iceWall); clk(iceWall, 'ice');
    for (let i = 0; i < 7; i++) { const ic = new THREE.Mesh(new THREE.ConeGeometry(0.9 + Math.random(), 8 + Math.random() * 8, 6), mat(0xd9f1ff, { opacity: 0.9 })); ic.rotation.x = Math.PI; ic.position.set(-16 + i * 5, 22 - Math.random() * 4, 14.6); iceG.add(ic); }
    const snowCap = new THREE.Mesh(new THREE.BoxGeometry(74, 3, 30), mat(0xf6faff)); snowCap.position.set(0, 56, 0); iceG.add(snowCap);
    for (let i = 0; i < 3; i++) {
      const c = M.person({ coat: [0xff7a1a, 0xe8452f, 0x3b7dd8][i], hat: 'helmet', helmet: [0xf2c032, 0xffffff, 0xe8452f][i], backpack: 0x2b2b33, trim: false }); groups.winter.add(c); clk(c, 'ice');
      c.userData.arms.forEach(axe);
      const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xf2c032 })); groups.winter.add(rope);
      const lx = -12 + i * 11, bx = ax - 8 + Math.cos(0.5) * lx + Math.sin(0.5) * 15.2, bz = az - Math.sin(0.5) * lx + Math.cos(0.5) * 15.2;
      movers.push((dt, t) => { if (season !== 'winter') return; const y = ag + 14 + ((t * 0.6 + i * 15) % 48); c.position.set(bx, y, bz); c.rotation.y = 0.5 + Math.PI; c.userData.arms[0].rotation.x = -2.7 + Math.sin(t * 2.4 + i) * 0.5; c.userData.arms[1].rotation.x = -2.7 - Math.sin(t * 2.4 + i) * 0.5; const pa = rope.geometry.attributes.position; pa.setXYZ(0, bx, y + 1, bz); pa.setXYZ(1, bx, ag + 100, bz); pa.needsUpdate = true; });
      if (!i) objLabel(c, '🧊', 'Мұзға өрмелеу · қысқы альпинизм', 2.6, null, 320);
    }
    // summit expedition near the upper cable station
    const B9 = flats[9]; let peak = { x: B9.x, z: B9.z, h: -1e9 };
    for (let a = 0; a < 48; a++) for (let r = 50; r <= 170; r += 12) { const x = B9.x + Math.cos(a / 48 * Math.PI * 2) * r, z = B9.z + Math.sin(a / 48 * Math.PI * 2) * r; if (x > 520 || z < -400) continue; const h = H(x, z); if (h > peak.h) peak = { x, z, h }; }
    const campX = App.lerp(B9.x, peak.x, 0.18), campZ = App.lerp(B9.z, peak.z, 0.18);
    const camp = new THREE.Group(); onGround(camp, campX, campZ); groups.winter.add(camp); clk(camp, 'alpine');
    [0xff7a1a, 0xf2c032, 0xe8452f].forEach((col, i) => { const tnt = M.tent(col); tnt.position.set(i * 4.5 - 4.5, 0, (i % 2) * 3); tnt.rotation.y = i * 0.7; camp.add(tnt); });
    objLabel(camp, '⛺', 'Альпинистер базалық лагері', 5, null, 360);
    const sumPts = []; for (let i = 0; i <= 14; i++) { const t = 0.2 + 0.8 * i / 14; sumPts.push([App.lerp(B9.x, peak.x, t) + Math.sin(t * 9) * 6, App.lerp(B9.z, peak.z, t)]); }
    const sumCurve = curveOn(sumPts, 0);
    const sflag = M.flag(0x00afca); sflag.scale.setScalar(3); onGround(sflag, peak.x, peak.z); groups.winter.add(sflag);
    const team = [], teamRope = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(5).fill(0).map(() => new V3())), new THREE.LineBasicMaterial({ color: 0xe8452f }));
    teamRope.frustumCulled = false; groups.winter.add(teamRope);
    for (let i = 0; i < 5; i++) {
      const c = M.person({ coat: [0xe8452f, 0xff7a1a, 0x3b7dd8, 0xf2c032, 0x2fa36b][i], hat: 'helmet', helmet: 0xffffff, backpack: [0x1e2a55, 0x2b2b33][i % 2], trim: false }); c.userData.pose = 'walk'; groups.winter.add(c); clk(c, 'alpine'); team.push(c);
      c.userData.arms[0].add(M.mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), mat(0x9aa3b0, { m: 0.6 }), 0, -0.6, 0.1));
    }
    objLabel(team[0], '🏔️', 'Қысқы альпинизм · шыңға өрлеу', 2.8, null, 520);
    movers.push((dt, t) => {
      if (season !== 'winter') return;
      const cyc = (t * 0.008) % 1.15, lead = Math.min(0.98, cyc);
      const pa = teamRope.geometry.attributes.position;
      team.forEach((c, i) => { const u = Math.max(0.001, lead - i * 0.035); follow(c, sumCurve, u, 0.05); M.animatePerson(c, cyc < 0.98 ? 0.35 : 0, dt); pa.setXYZ(i, c.position.x, c.position.y + 1.1, c.position.z); });
      pa.needsUpdate = true;
    });
    W.pos.alpine = new V3(peak.x, peak.h, peak.z);

    // GES
    const g = flats[6]; W.pos.ges = new V3(g.x, g.h, g.z);
    const ges = new THREE.Group(); ges.position.set(g.x, g.h, g.z); add(ges); clk(ges, 'ges');
    ges.add(M.mesh(new THREE.BoxGeometry(14, 8, 10), mat(0xe9e2d3), 0, 4, 0));
    ges.add(M.mesh(new THREE.BoxGeometry(14.4, 1, 10.4), mat(0x2f4f9a), 0, 8.4, 0));
    const pipe = M.mesh(new THREE.CylinderGeometry(1, 1, 40, 8), mat(0x6b7280, { m: 0.6 }), 10, 14, -10); pipe.rotation.x = 0.9; ges.add(pipe);
    ges.add(M.mesh(new THREE.BoxGeometry(2, 3, 2), mat(0xf2c032, { emissive: 0xf2a000, ei: 0.4 }), -8, 1.5, 0));
    const dam = M.mesh(new THREE.BoxGeometry(22, 4, 2.5), mat(0xbdb5a6), rx(410), riverY(410) + 1, 410); add(dam);
    const gs = M.textSprite('⚡ Текелі ГЭС', { size: 40, color: '#2a1d05', bg: '#f2c25b', scale: 1.4 }); gs.position.set(g.x, g.h + 13, g.z); add(gs);
    // gate
    const gt = flats[7]; W.pos.gate = new V3(gt.x, gt.h, gt.z);
    const gate = new THREE.Group(); gate.position.set(gt.x, gt.h, gt.z); add(gate); clk(gate, 'gate');
    [-7, 7].forEach((x) => { gate.add(M.mesh(new THREE.CylinderGeometry(1, 1.2, 12, 8), mat(0xe8b85a, { m: 0.4, r: 0.4 }), x, 6, 0)); gate.add(M.mesh(new THREE.ConeGeometry(1.6, 3, 8), mat(0x1e2a55), x, 13.5, 0)); });
    const arc = M.mesh(new THREE.TorusGeometry(7, 0.6, 6, 24, Math.PI), mat(0xe8b85a, { m: 0.4, r: 0.4 }), 0, 12, 0); gate.add(arc);
    gate.add(M.mesh(new THREE.TorusGeometry(7, 0.3, 4, 24, Math.PI), new THREE.MeshStandardMaterial({ map: M.tex.ornament }), 0, 12, 0.5));
    const gsn = M.textSprite('ҚОРА ЖАУҺАРЫ', { size: 48, color: '#2a1d05', bg: '#ffffff', border: '#e8b85a', scale: 1.8 }); gsn.position.set(0, 21, 0); gate.add(gsn);
    // e-cars on the road
    for (let i = 0; i < 3; i++) {
      const car = M.car([0xffffff, 0xe8452f, 0x2fa36b][i]); add(car); clk(car, 'ev');
      movers.push((dt, t) => { const raw = (t * 0.012 + i * 0.33) % 2, u = raw < 1 ? raw : 2 - raw; const uu = Math.min(0.995, Math.max(0.005, u)); const p = W.roadCurve.getPointAt(uu), tg = W.roadCurve.getTangentAt(uu); const side = raw < 1 ? 2 : -2; const x = p.x - tg.z * side, z = p.z + tg.x * side; car.position.set(x, H(x, z) + 0.3, z); car.rotation.y = Math.atan2(tg.x, tg.z) + (raw < 1 ? 0 : Math.PI); M.animateCar(car, 10, dt); });
    }
    // rafts (summer)
    for (let i = 0; i < 4; i++) {
      const r = M.raft(); groups.summer.add(r); clk(r, 'rafting'); if (!i) npcLabel(r, 'Рафтинг', 'нұсқаушымен', 3);
      movers.push((dt, t) => { if (season !== 'summer') return; const z = -300 + ((t * 9 + i * 160) % 760); const x = rx(z) + Math.sin(t + i) * 2; r.position.set(x, riverY(z) + Math.sin(t * 3 + i) * 0.15, z); r.rotation.y = Math.atan2(rx(z + 5) - rx(z), 5) + Math.sin(t * 1.3 + i) * 0.3; });
    }
    W.pos.rafting = new V3(rx(60), riverY(60), 60);
    // wild eagle circling
    const we = M.eagle(); we.scale.setScalar(1.4); add(we); clk(we, 'eagle');
    movers.push((dt, t) => { const a = t * 0.18; we.position.set(-90 + Math.cos(a) * 90, 260 + Math.sin(t * 0.4) * 10, -180 + Math.sin(a) * 90); we.rotation.order = 'YXZ'; we.rotation.y = -a; we.rotation.z = -0.35; M.animateEagle(we, 0.15, dt); });
  }
  function buildClouds() {
    W.clouds = [];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(14 + Math.random() * 12, 1), mat(0xffffff, { r: 1 })); s.position.set(k * 16 - 40, Math.random() * 8, (Math.random() - 0.5) * 20); g.add(s); }
      g.position.set(-600 + Math.random() * 1200, 420 + Math.random() * 140, -600 + Math.random() * 1200); g.userData.v = 4 + Math.random() * 5; W.scene.add(g); W.clouds.push(g);
    }
  }
  function buildParticles() {
    const N = 2500, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 220; pos[i * 3 + 1] = Math.random() * 90; pos[i * 3 + 2] = (Math.random() - 0.5) * 220; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sprite = App.canvasTex(32, 32, (c) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); });
    W.parts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.1, map: sprite, vertexColors: true, transparent: true, depthWrite: false }));
    W.parts.frustumCulled = false; W.scene.add(W.parts); W.partOrigin = new V3();
  }
  function colorParticles(s) {
    const c = W.parts.geometry.attributes.color, tmp = new THREE.Color(); const N = c.count;
    const pal = { winter: [0xffffff, 0xf0f6ff], spring: [0xffc0d9, 0xffffff, 0xff9fc4], summer: [0xfff3a0, 0xffffff], autumn: [0xf2a23a, 0xd9682a, 0xf2c94c] }[s];
    for (let i = 0; i < N; i++) { tmp.set(pal[i % pal.length]); c.setXYZ(i, tmp.r, tmp.g, tmp.b); }
    c.needsUpdate = true;
    W.parts.material.size = s === 'winter' ? 1.1 : s === 'summer' ? 0.5 : 1.3;
    W.parts.material.opacity = s === 'summer' ? 0.6 : 1;
    W.partCount = s === 'summer' ? 500 : s === 'winter' ? 2500 : 1300;
    W.parts.geometry.setDrawRange(0, W.partCount);
  }

  /* ---------- POIs ---------- */
  function buildPOIs() {
    const ap = rampPoint(0.45, 36), sp = rampPoint(0.32, 2), pp = rampPoint(0.78, -32);
    const P = {
      gate: [W.pos.gate, 24], ges: [W.pos.ges, 18], complex: [W.pos.complex, 42], cable: [W.pos.cable, 26], rink: [W.pos.rink, 12], kids: [W.pos.kids, 12],
      ski_amateur: [new V3(ap.x, H(ap.x, ap.z), ap.z), 10], snowpark: [new V3(sp.x, H(sp.x, sp.z), sp.z), 10], ski_pro: [new V3(pp.x, H(pp.x, pp.z), pp.z), 10],
      stable: [W.pos.stable, 18], rafting: [W.pos.rafting, 8], buddha: [W.pos.buddha, 18], forest: [W.pos.forest, 18], aktas: [W.pos.aktas, 108],
      village: [W.pos.village, 22], waterfall: [W.pos.waterfall, 82]
    };
    W.poiItems = {};
    DATA.pois.forEach((p) => {
      const [v, off] = P[p.id];
      const anchor = v.clone(); anchor.y += off;
      const it = W.labels.add(anchor, `<i>${p.icon}</i><span class="t">${p.title}</span>`, 'poi', { maxDist: 820, collapsible: true, onClick: () => W.openPoi(p.id, true) });
      it.poi = p; it.anchor = anchor; it.base = v; W.poiItems[p.id] = it;
    });
  }
  W.poiActive = (p, s = season) => p.seasons === 'all' || p.seasons.includes(s);
  W.poiFocus = function (id) {
    const it = W.poiItems[id]; const p = it.base.clone(); p.y += 4;
    const dist = { complex: 150, waterfall: 150, aktas: 190, ski_pro: 190, cable: 230, village: 110, stable: 120 }[id] || 90;
    const yaw = Math.atan2(W.travel.o.camera.position.x - p.x, W.travel.o.camera.position.z - p.z);
    W.travel.flyTo(p, dist, id === 'waterfall' ? 0 : yaw);
  };

  /* ---------- seasons ---------- */
  const SKY = { winter: [0x8fbde6, 0xe8f1fa, 0.85, 0xdde9f5], spring: [0x6ebff0, 0xe6f6ff, 1.25, 0xe2f2ff], summer: [0x3fa6ee, 0xd8f0ff, 1.45, 0xd6edff], autumn: [0x86b2d8, 0xf5e4c8, 1.1, 0xf0e2c8] };
  W.setSeason = function (s) {
    season = s; W.season = s;
    const [top, bot, sunI, fog] = SKY[s];
    W.skyMat.uniforms.top.value.set(top); W.skyMat.uniforms.bot.value.set(bot); W.scene.fog.color.set(fog); W.sun.intensity = sunI;
    W.hemi.groundColor.set(s === 'winter' ? 0xc8d4e0 : s === 'autumn' ? 0x8a6a40 : 0x5a7a40);
    colorTerrain(s); colorCrowns(s); colorParticles(s);
    groups.winter.visible = s === 'winter'; groups.warm.visible = s !== 'winter'; groups.summer.visible = s === 'summer';
    groups.spring.visible = s === 'spring'; groups.autumn.visible = s === 'autumn'; groups.nonwinter.visible = s !== 'winter'; groups.notsummer.visible = s !== 'summer';
    W.riverMat.color.set(s === 'winter' ? 0xb8e2fb : 0xffffff); W.riverMat.emissiveIntensity = s === 'winter' ? 0.15 : 0.45;
    W.fallMat.color.set(s === 'winter' ? 0xd9f1ff : 0xffffff); W.fallGroup.children.forEach((c) => { if (c.userData.foam) c.visible = s !== 'winter'; });
    W.mist.visible = s !== 'winter';
    const snow = s === 'winter';
    W.complex.userData.snowCaps.forEach((m) => (m.visible = snow));
    W.complex.userData.plaza.material.color.set(snow ? 0xf2f6fa : 0xffffff);
    (W.complex.userData.beds || []).forEach((b) => (b.visible = !snow));
    W.yurts.forEach((y) => (y.userData.snow.visible = snow));
    W.spruce.material.color.set(snow ? 0xc9d8d2 : s === 'autumn' ? 0xd8e0c8 : 0xffffff);
    if (W.poiItems) for (const id in W.poiItems) { const it = W.poiItems[id]; it.show = W.poiActive(it.poi, s); }
  };

  /* ---------- update ---------- */
  /* ---------- gondola ride (first-person inside a cabin) ---------- */
  W.startRide = function () {
    W.ride = { u: 0.04, dir: 1, yaw: 0, pitch: -0.22, fov: 62, pos: new V3() };
    if (!W.rideCab) {
      const cab = (W.rideCab = new THREE.Group()); W.scene.add(cab);
      const fm = mat(0xe8b85a, { m: 0.3, r: 0.4 });
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([x, z]) => cab.add(M.mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), fm, x * 1.05, 0, z * 1.05)));
      cab.add(M.mesh(new THREE.BoxGeometry(2.3, 0.12, 2.3), fm, 0, 0.98, 0));
      cab.add(M.mesh(new THREE.BoxGeometry(2.3, 0.5, 2.3), mat(0x1e2a55), 0, -1.15, 0));
      [[0, 1.08, 2.2, 0.06], [0, -1.08, 2.2, 0.06]].forEach(([x, z, w, d]) => { cab.add(M.mesh(new THREE.BoxGeometry(w, 0.06, d), fm, x, -0.5, z)); });
      [[1.08, 0], [-1.08, 0]].forEach(([x, z]) => cab.add(M.mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), fm, x, -0.5, z)));
    }
    W.rideCab.visible = true; W.travel.av[W.travel.mode] && (W.travel.av[W.travel.mode].visible = false);
  };
  W.stopRide = function () { if (!W.ride) return; W.ride = null; W.rideCab.visible = false; W.camera.fov = 55; W.camera.updateProjectionMatrix(); W.travel.setMode(W.travel.mode); };
  function updateRide(dt) {
    const r = W.ride, inp = App.input, cam = W.camera;
    r.u += dt * 0.012 * r.dir;
    if (r.u >= 0.96) { r.u = 0.96; r.dir = -1; } if (r.u <= 0.04 && r.dir < 0) { r.u = 0.04; r.dir = 1; }
    const path = r.dir > 0 ? W.cableUp : W.cableDown, uu = r.dir > 0 ? r.u : 1 - r.u;
    r.pos.copy(path.getPointAt(Math.min(0.9999, Math.max(0.0001, uu)))); r.pos.y -= 2.9;
    const tg = path.getTangentAt(Math.min(0.9999, Math.max(0.0001, uu)));
    W.rideCab.position.copy(r.pos); W.rideCab.rotation.y = W.cableRot;
    if (inp.dragging) { r.yaw -= inp.dx * 0.004; r.pitch = Math.max(-1.2, Math.min(0.8, r.pitch - inp.dy * 0.004)); }
    if (inp.wheel) { r.fov = Math.max(30, Math.min(80, r.fov + inp.wheel * 0.03)); cam.fov = r.fov; cam.updateProjectionMatrix(); }
    const k = inp.keys; if (k.KeyA || k.ArrowLeft) r.yaw += dt * 1.2; if (k.KeyD || k.ArrowRight) r.yaw -= dt * 1.2;
    const base = W.cableRot + Math.PI + 0.35 + r.yaw; void tg; // look down the valley towards the dome complex
    cam.position.copy(r.pos); cam.position.y += 0.3;
    cam.lookAt(cam.position.x + Math.sin(base) * Math.cos(r.pitch), cam.position.y + Math.sin(r.pitch), cam.position.z + Math.cos(base) * Math.cos(r.pitch));
    if (W.onRide) W.onRide(r.u, r.dir, r.pos.y);
  }
  W.update = function (dt, t) {
    if (W.ride) updateRide(dt); else W.travel.update(dt);
    const f = W.ride ? W.ride.pos : W.travel.focus();
    W.sun.position.set(f.x - 160, f.y + 260, f.z + 140); W.sun.target.position.copy(f); W.sun.target.updateMatrixWorld();
    W.sky.position.copy(W.camera.position);
    if (season !== 'winter') { W.waterTex.offset.y -= dt * 0.9; W.fallTex.offset.y += dt * 1.6; }
    W.mist.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    W.fires.forEach((fi, i) => { fi.scale.set(1, 0.8 + Math.sin(t * 9 + i) * 0.25, 1); });
    (W.cannonSpray || []).forEach((s, i) => { s.material.opacity = 0.3 + Math.sin(t * 6 + i) * 0.15; s.scale.setScalar(0.9 + Math.sin(t * 5 + i) * 0.1); });
    W.complex.userData.fountainWater.position.y = 0.85 + Math.sin(t * 2) * 0.05;
    W.clouds.forEach((c) => { c.position.x += c.userData.v * dt; if (c.position.x > 700) c.position.x = -700; });
    for (const m of movers) m(dt, t);
    // particles around camera
    const pa = W.parts.geometry.attributes.position, arr = pa.array, cp = W.camera.position, n = W.partCount;
    const fall = season === 'winter' ? 7 : season === 'summer' ? 0.4 : 3.5;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      arr[k + 1] -= fall * dt * (0.6 + (i % 7) * 0.08);
      arr[k] += Math.sin(t * 0.7 + i) * dt * (season === 'winter' ? 1.5 : 3);
      arr[k + 2] += Math.cos(t * 0.5 + i * 1.3) * dt * 1.5;
      if (season === 'summer') arr[k + 1] += Math.sin(t + i) * dt * 0.8;
      let x = arr[k] - cp.x, y = arr[k + 1] - cp.y, z = arr[k + 2] - cp.z;
      if (y < -40) y += 90; if (y > 50) y -= 90; if (x < -110) x += 220; if (x > 110) x -= 220; if (z < -110) z += 220; if (z > 110) z -= 220;
      arr[k] = x + cp.x; arr[k + 1] = y + cp.y; arr[k + 2] = z + cp.z;
    }
    pa.needsUpdate = true;
    if (W.onFrame) W.onFrame(dt, t);
    // proximity to enterable buildings
    let near = null;
    if (W.travel.mode !== 'overview' && !W.ride) {
      let best = 1e9; const p = W.travel.pos;
      for (const e of W.enterables) { if (!isVis(e.obj)) continue; e.obj.getWorldPosition(e.pos); const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); if (d < e.r && d < best) { best = d; near = e; } }
    }
    if (near !== W.near) { W.near = near; if (W.onNear) W.onNear(near); }
  };
  function isVis(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  W.pick = function (x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, W.camera);
    const hits = ray.intersectObjects(clickables, true);
    for (const h of hits) { let o = h.object, ok = true, key = null; let q = o; while (q) { if (!q.visible) { ok = false; break; } q = q.parent; } if (!ok) continue; while (o && !o.userData.info) o = o.parent; if (o) { key = o.userData.info; return { key, obj: o }; } }
    return null;
  };
  W.ctrl = {
    get scene() { return W.scene; }, get camera() { return W.camera; }, get labels() { return W.labels; },
    activate() { W.labels.setVisible(true); }, deactivate() { W.labels.setVisible(false); },
    update: (dt, t) => W.update(dt, t),
    onClick(x, y) { if (W.ride) return; const r = W.pick(x, y); if (r && W.onInfo) W.onInfo(r.key, r.obj); },
    onHover(x, y) { const now = performance.now(); if (now - (W._h || 0) < 110) return; W._h = now; App.canvas.style.cursor = W.pick(x, y) ? 'pointer' : ''; }
  };
})();
