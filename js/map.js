/* 3D map of Kazakhstan with Zhetysu region and a portal into the Kora gorge */
(function () {
  const MS = (window.MapScene = {});
  const K = 1.6, COS = Math.cos(48 * Math.PI / 180), LAND = 1.2, WATER = 0.3;
  const px = (lon) => (lon - 67) * K * COS, pz = (lat) => -(lat - 48) * K;
  MS.proj = (lat, lon) => new THREE.Vector3(px(lon), LAND, pz(lat));
  let poly = [];
  function inside(x, z) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  }
  MS.inside = inside;
  const ground = (x, z) => (inside(x, z) ? LAND : WATER);

  MS.build = function () {
    if (MS.scene) return;
    const scene = (MS.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x8fd3f5);
    scene.fog = new THREE.Fog(0x8fd3f5, 60, 130);
    const camera = (MS.camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 400));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a7a50, 0.8));
    const sun = new THREE.DirectionalLight(0xfff4dd, 1.3); sun.position.set(-20, 40, 18); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 26, bottom: -26, near: 1, far: 120 }); sun.shadow.bias = -0.0005;
    scene.add(sun);
    MS.labels = new App.LabelSet();

    poly = KZ_BORDER.map(([lon, lat]) => [px(lon), pz(lat)]);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    const shape = new THREE.Shape();
    KZ_BORDER.forEach(([lon, lat], i) => { const x = px(lon), y = (lat - 48) * K; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); i ? shape.lineTo(x, y) : shape.moveTo(x, y); });
    // biome texture mapped over the bounding box
    const W = maxX - minX, Hh = maxY - minY;
    const tex = App.canvasTex(1024, 600, (c, w, h) => {
      for (let yy = 0; yy < h; yy += 4) for (let xx = 0; xx < w; xx += 4) {
        const x = minX + (xx / w) * W, y = maxY - (yy / h) * Hh;
        const lon = x / (K * COS) + 67, lat = y / K + 48;
        const n = App.fbm(lon * 0.4, lat * 0.4, 4);
        let col;
        if (lat > 51.2 + n) col = [92, 178, 80];
        else if (lat > 49 + n * 1.5) col = [128, 196, 86];
        else if (lon < 62.5 + n * 3 && lat < 47.8) col = [222, 205, 140];
        else if (lat < 45.8 && lon > 73.5) col = [96, 178, 84];
        else if (lat < 46 + n && lon < 70) col = [210, 200, 128];
        else col = [170, 200, 96];
        const v = (App.noise2(xx * 0.08, yy * 0.08) - 0.5) * 18;
        c.fillStyle = `rgb(${col[0] + v | 0},${col[1] + v | 0},${col[2] + v * 0.6 | 0})`; c.fillRect(xx, yy, 4, 4);
      }
      for (let i = 0; i < 2500; i++) { c.fillStyle = ['rgba(255,255,255,.5)', 'rgba(240,90,110,.55)', 'rgba(250,210,60,.6)', 'rgba(180,110,220,.5)'][i % 4]; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1 / W, 1 / Hh); tex.offset.set(-minX / W, -minY / Hh);
    const land = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: LAND, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 1, curveSegments: 1 }),
      [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), App.mat(0x9a6438)]);
    land.geometry.rotateX(-Math.PI / 2); land.geometry.translate(0, -0.15, 0);
    land.receiveShadow = true; land.castShadow = true; scene.add(land);
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }), App.mat(0x7a4a28));
    base.geometry.rotateX(-Math.PI / 2); base.position.y = -1.2; scene.add(base);
    // water
    MS.waterMat = new THREE.ShaderMaterial({ fog: true, uniforms: Object.assign({ t: { value: 0 } }, THREE.UniformsLib.fog),
      vertexShader: '#include <fog_pars_vertex>\nvarying vec2 vp; void main(){ vp = position.xy; vec4 mvPosition = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mvPosition; \n#include <fog_vertex>\n}',
      fragmentShader: '#include <fog_pars_fragment>\nuniform float t; varying vec2 vp; void main(){ float w = sin(vp.x*.9+t*1.2)*sin(vp.y*.7-t)*.5+.5; float s = smoothstep(.985,1.,sin(vp.x*1.3+vp.y*1.7+t*.8+sin(vp.y*.9)*2.)); vec3 c = mix(vec3(.32,.72,.93),vec3(.40,.78,.96),w)+s*.07; gl_FragColor = vec4(c,1.);\n#include <fog_fragment>\n}' });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), MS.waterMat); water.rotation.x = -Math.PI / 2; water.position.y = WATER; scene.add(water);

    // lakes
    const lakes = {
      'Балқаш көлі': [[73.6, 46.3], [74.5, 46.85], [75.8, 46.75], [77, 46.6], [78.2, 46.75], [79.2, 46.65], [79.3, 46.35], [78.3, 46.35], [77.2, 46.2], [76.2, 46.25], [75.0, 45.95], [74.0, 45.95]],
      'Арал теңізі': [[59.6, 46.6], [61.1, 46.75], [61.7, 46.2], [61.2, 45.3], [60.2, 44.75], [59.3, 44.9], [58.9, 45.5], [59.0, 46.2]],
      'Алакөл': [[81.4, 46.3], [82.0, 46.4], [81.95, 45.9], [81.5, 45.95]],
      'Зайсан': [[83.5, 48.05], [84.6, 48.05], [84.6, 47.8], [83.6, 47.75]],
      'Қапшағай': [[76.9, 43.92], [77.6, 44.02], [77.7, 43.86], [77.0, 43.8]]
    };
    for (const name in lakes) {
      const s = new THREE.Shape(); lakes[name].forEach(([lon, lat], i) => (i ? s.lineTo(px(lon), (lat - 48) * K) : s.moveTo(px(lon), (lat - 48) * K)));
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), MS.waterMat); m.geometry.rotateX(-Math.PI / 2); m.position.y = LAND + 0.02; scene.add(m);
      const c = lakes[name].reduce((a, [lo, la]) => [a[0] + lo / lakes[name].length, a[1] + la / lakes[name].length], [0, 0]);
      if (name.length > 7) MS.labels.add(new THREE.Vector3(px(c[0]), LAND, pz(c[1])), name, 'sea', { maxDist: 90 });
    }
    MS.labels.add(new THREE.Vector3(px(50), WATER, pz(44.2)), 'Каспий теңізі', 'sea', { maxDist: 100 });

    // Zhetysu region highlight
    const jet = [[75.0, 45.0], [75.0, 45.9], [76.2, 46.25], [78.3, 46.35], [79.3, 46.35], [80.5, 46.45], [81.5, 46.6], [82.6, 45.6], [82.3, 45.2], [80.3, 45.0], [80.2, 44.6], [79.6, 44.2], [78.5, 44.3], [77.6, 44.3], [76.5, 44.6], [75.6, 44.8]];
    const js = new THREE.Shape(); jet.forEach(([lon, lat], i) => (i ? js.lineTo(px(lon), (lat - 48) * K) : js.moveTo(px(lon), (lat - 48) * K)));
    MS.jetFill = new THREE.Mesh(new THREE.ShapeGeometry(js), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.28, depthWrite: false }));
    MS.jetFill.geometry.rotateX(-Math.PI / 2); MS.jetFill.position.y = LAND + 0.04; scene.add(MS.jetFill);
    const jl = jet.map(([lon, lat]) => new THREE.Vector3(px(lon), LAND + 0.08, pz(lat))); jl.push(jl[0].clone());
    MS.jetLine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(jl, true), 200, 0.06, 4, true), new THREE.MeshBasicMaterial({ color: 0xffc23d }));
    scene.add(MS.jetLine);
    MS.labels.add(new THREE.Vector3(px(77.6), LAND + 0.3, pz(45.75)), 'ЖЕТІСУ ӨҢІРІ', 'city cap', { maxDist: 90 });

    // mountains
    const mt = new THREE.Group(); scene.add(mt);
    const ranges = [[75.2, 43.15, 79.2, 43.05, 18, 'Іле Алатауы'], [78.2, 45.0, 81.8, 45.25, 16, 'Жетісу Алатауы'], [80.2, 47.2, 83.4, 47.1, 9], [83.4, 49.0, 86.6, 49.8, 14, 'Алтай'], [68.4, 43.4, 70.6, 44.2, 8, 'Қаратау'], [70.5, 42.5, 74.5, 42.85, 10, 'Тянь-Шань'], [72, 49.5, 76, 49.9, 6]];
    const tek = [px(78.82), pz(44.83)];
    ranges.forEach(([lo1, la1, lo2, la2, n, name]) => {
      for (let i = 0; i < n * 2; i++) {
        const t = Math.random(), lon = App.lerp(lo1, lo2, t) + (Math.random() - 0.5) * 0.9, lat = App.lerp(la1, la2, t) + (Math.random() - 0.5) * 0.7;
        const x = px(lon), z = pz(lat); if (!inside(x, z) || Math.hypot(x - tek[0], z - tek[1]) < 0.9) continue;
        const h = 0.8 + Math.random() * 1.6, r = h * 0.75;
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), App.mat(0x7f8792)); c.position.set(x, LAND + h / 2 - 0.05, z); c.rotation.y = Math.random() * 3; c.castShadow = true; mt.add(c);
        if (h > 1.3) { const sc = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.38, 6), App.mat(0xffffff)); sc.position.set(x, LAND + h - h * 0.19 - 0.04, z); sc.rotation.y = c.rotation.y; mt.add(sc); }
      }
      if (name) MS.labels.add(new THREE.Vector3(px((lo1 + lo2) / 2), LAND + 2.4, pz((la1 + la2) / 2)), name, 'sea', { maxDist: 70 });
    });

    // trees, yurts, herds
    const sp = new THREE.InstancedMesh(Models.geo.spruce, App.mat(0xffffff, { vc: true }), 700);
    const cr = new THREE.InstancedMesh(Models.geo.crown, App.mat(0x66b84a), 400);
    const tr = new THREE.InstancedMesh(Models.geo.trunk, App.mat(0xffffff, { vc: true }), 400);
    let ns = 0, nc = 0; const d = new THREE.Object3D();
    for (let i = 0; i < 9000 && (ns < 700 || nc < 400); i++) {
      const lon = 47 + Math.random() * 40, lat = 41 + Math.random() * 14.5, x = px(lon), z = pz(lat);
      if (!inside(x, z) || Math.hypot(x - tek[0], z - tek[1]) < 0.9) continue;
      const forest = lat > 50.5 || (lat < 45.6 && lon > 74) || lon > 82;
      if (!forest && Math.random() > 0.06) continue;
      d.position.set(x, LAND - 0.02, z); d.rotation.y = Math.random() * 6; d.scale.setScalar(0.05 + Math.random() * 0.04); d.updateMatrix();
      if ((lat > 52 || lon > 80 || Math.random() < 0.4) && ns < 700) sp.setMatrixAt(ns++, d.matrix);
      else if (nc < 400) { cr.setMatrixAt(nc, d.matrix); tr.setMatrixAt(nc, d.matrix); cr.setColorAt(nc, new THREE.Color().setHSL(0.27 + Math.random() * 0.08, 0.55, 0.38 + Math.random() * 0.12)); nc++; }
    }
    sp.count = ns; cr.count = nc; tr.count = nc;
    [sp, cr, tr].forEach((m) => { m.castShadow = true; scene.add(m); });
    [[70, 50.5], [63, 49], [75, 47.5], [58, 48], [67, 46.5], [80, 48.5], [73, 52]].forEach(([lon, lat]) => {
      const y = Models.yurt(4); y.scale.setScalar(0.05); y.position.set(px(lon), LAND, pz(lat)); scene.add(y);
      for (let k = 0; k < 4; k++) { const h = Models.horse({ saddle: false, color: [0x8a4b22, 0xf2efe6, 0x3a2414, 0xb07a3a][k] }); h.scale.setScalar(0.07); h.position.set(px(lon) + 0.3 + k * 0.12, LAND, pz(lat) + 0.2 + (k % 2) * 0.15); h.rotation.y = k; scene.add(h); }
    });
    // clouds
    MS.clouds = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random() * 0.9, 1), App.mat(0xffffff, { r: 1 })); s.position.set(k * 1.1 - 2.2, Math.random() * 0.5, (Math.random() - 0.5) * 1.2); g.add(s); }
      g.position.set(-35 + Math.random() * 70, 10 + Math.random() * 3, -22 + Math.random() * 44); g.userData.v = 0.3 + Math.random() * 0.4; g.scale.setScalar(0.4 + Math.random() * 0.35);
      scene.add(g); MS.clouds.push(g);
    }
    // cities
    DATA.cities.forEach(([name, lat, lon, cap]) => {
      const p = new THREE.Vector3(px(lon), LAND, pz(lat));
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 8), App.mat(cap ? 0xc8352f : 0xffffff)); m.position.copy(p).y += 0.06; scene.add(m);
      MS.labels.add(p.clone().setY(LAND + 0.35), (cap ? '★ ' : '') + name, 'city' + (cap ? ' cap' : ''), { maxDist: 80 });
    });
    // routes to Tekeli
    const T = new THREE.Vector3(px(78.82), LAND, pz(44.83));
    [['Алматы · 300 км', 43.24, 76.89], ['Талдықорған · 40 км', 45.02, 78.37], ['«Алтын-Емел» · 150 км', 44.05, 78.05]].forEach(([lab, lat, lon]) => {
      const A = new THREE.Vector3(px(lon), LAND, pz(lat)), mid = A.clone().lerp(T, 0.5); mid.y += A.distanceTo(T) * 0.35 + 0.3;
      const curve = new THREE.QuadraticBezierCurve3(A, mid, T);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineDashedMaterial({ color: 0xc8352f, dashSize: 0.18, gapSize: 0.12 }));
      line.computeLineDistances(); scene.add(line);
      MS.labels.add(curve.getPoint(0.5), lab, 'npc', { maxDist: 26 });
    });

    // portal
    const portal = (MS.portal = new THREE.Group()); portal.position.copy(T); scene.add(portal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 8, 40), App.mat(0xf2c25b, { m: 0.6, r: 0.25, emissive: 0xb07a1a, ei: 0.7 })); ring.position.y = 0.95; portal.add(ring);
    MS.portalMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float t; varying vec2 vu; void main(){ vec2 p = vu-.5; float r = length(p)*2.; float a = atan(p.y,p.x); float s = sin(a*5.+r*14.-t*4.)*.5+.5; vec3 c = mix(vec3(1.,.85,.45),vec3(.35,.75,1.),s*r); float al = smoothstep(1.,.85,r); gl_FragColor = vec4(c+ (1.-r)*.6, al*.92); }' });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.66, 40), MS.portalMat); disc.position.y = 0.95; portal.add(disc);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 4.6; portal.add(beam);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.12, 24), App.mat(0x1e2a55)); pad.position.y = 0.06; portal.add(pad);
    const padR = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 4, 30), new THREE.MeshBasicMaterial({ color: 0xffd36b })); padR.rotation.x = Math.PI / 2; padR.position.y = 0.13; portal.add(padR);
    MS.ring = ring; MS.disc = disc; MS.beam = beam;
    MS.portalHit = [ring, disc, pad, beam];
    MS.labels.add(new THREE.Vector3(T.x, LAND + 2.1, T.z), '✦ Текелілік-Қора жауһары', 'portal', { onClick: () => MS.onEnter && MS.onEnter() });
    // mini dome complex next to portal
    const mc = Models.domeComplex(); mc.scale.setScalar(0.012); mc.position.set(T.x + 1.2, LAND, T.z + 0.4); scene.add(mc);

    MS.travel = new Travel({
      scene, camera, scale: 0.12, ground, canGo: inside,
      nearestGo: () => ({ x: px(77.6), z: pz(45.3) }),
      start: { x: px(77.2), z: pz(45.6), h: 0.9 },
      speeds: { horse: 32, car: 40, eagle: 50, drone: 36 },
      flyStart: 12, flyMax: 16, bounds: { minX: -36, maxX: 36, minZ: -26, maxZ: 26 },
      overview: { target: new THREE.Vector3(px(70), LAND, pz(47.6)), dist: 46, yaw: 0, pitch: 0.95, minDist: 3, maxDist: 75 }
    });
    MS.armed = true;
  };

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, MS.camera); return ray.intersectObjects(MS.portalHit, false).length > 0; }
  MS.ctrl = {
    get scene() { return MS.scene; }, get camera() { return MS.camera; }, get labels() { return MS.labels; },
    activate() { MS.labels.setVisible(true); }, deactivate() { MS.labels.setVisible(false); },
    update(dt, t) {
      MS.waterMat.uniforms.t.value = t; MS.portalMat.uniforms.t.value = t;
      MS.ring.rotation.y = t * 0.8; MS.disc.rotation.y = t * 0.8; MS.beam.material.opacity = 0.18 + Math.sin(t * 3) * 0.06;
      MS.jetFill.material.opacity = 0.2 + Math.sin(t * 2) * 0.08;
      MS.clouds.forEach((c) => { c.position.x += c.userData.v * dt; if (c.position.x > 40) c.position.x = -40; });
      MS.travel.update(dt);
      const tr = MS.travel;
      if (tr.mode !== 'overview') {
        const d = Math.hypot(tr.pos.x - MS.portal.position.x, tr.pos.z - MS.portal.position.z);
        if (d > 1.6) MS.armed = true;
        if (MS.armed && d < 0.75 && MS.onEnter) { MS.armed = false; MS.onEnter(); }
      }
    },
    onClick(x, y) { if (pick(x, y) && MS.onEnter) MS.onEnter(); },
    onHover(x, y) { App.canvas.style.cursor = pick(x, y) ? 'pointer' : ''; }
  };
  MS.focusJetisu = function () { MS.travel.flyTo(new THREE.Vector3(px(78.6), LAND, pz(45.0)), 9, 0.2); };
})();
