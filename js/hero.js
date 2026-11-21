/* Hero: floating island + orbiting mathematical model */
(function () {
  const H = (window.HeroScene = {});
  let built = false;
  H.build = function () {
    if (built) return; built = true;
    const scene = (H.scene = new THREE.Scene());
    const camera = (H.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 600));
    camera.position.set(0, 16, 46);
    scene.fog = new THREE.Fog(0x0f1838, 70, 160);
    // gradient sky dome
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { a: { value: new THREE.Color(0x24336e) }, b: { value: new THREE.Color(0x0b1230) } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ gl_FragColor = vec4(pow(mix(b,a,smoothstep(-.3,.6,p.y)),vec3(.4545)),1.); }' }));
    scene.add(sky);
    const sg = new THREE.BufferGeometry(); const sp = [];
    for (let i = 0; i < 900; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(150 + Math.random() * 100); if (v.y < -20) v.y *= -1; sp.push(v.x, v.y, v.z); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf6d488, size: 0.9, transparent: true, opacity: 0.75, fog: false })));
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2f55, 0.75));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.25); sun.position.set(20, 40, 25); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 120 }); scene.add(sun);

    const root = (H.root = new THREE.Group()); scene.add(root);
    const island = new THREE.Group(); root.add(island); H.island = island;
    // terrain disc
    const R = 15, geo = new THREE.PlaneGeometry(2 * R, 2 * R, 48, 48); geo.rotateX(-Math.PI / 2);
    const pa = geo.attributes.position, cols = [];
    const riverX = (z) => Math.sin(z * 0.25) * 1.6;
    for (let i = 0; i < pa.count; i++) {
      let x = pa.getX(i), z = pa.getZ(i); const r = Math.hypot(x, z);
      if (r > R) { x *= R / r; z *= R / r; }
      const d = Math.abs(x - riverX(z));
      let h = App.smooth(2.5, 9, d) * (2 + App.ridge(x * 0.12 + 3, z * 0.12) * 9) * App.smooth(-14, 4, -z * 0.6 + d * 0.4);
      h += App.fbm(x * 0.3, z * 0.3, 3) * 0.6;
      if (Math.hypot(x - 5, z - 4) < 5) h = App.lerp(h, 0.6, 1 - App.smooth(3.5, 5, Math.hypot(x - 5, z - 4)));
      if (d < 0.9) h -= 0.3;
      if (r > R - 0.3) h = Math.min(h, 0.3);
      pa.setXYZ(i, x, h, z);
      const c = new THREE.Color(h > 7 ? 0xffffff : h > 4.5 ? 0x8a8f9a : h > 1.6 ? 0x3f8a4a : 0x6cc256);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const terr = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
    terr.geometry.computeVertexNormals(); terr.receiveShadow = true; terr.castShadow = true; island.add(terr);
    const under = new THREE.Mesh(new THREE.ConeGeometry(R, 14, 14, 3), App.mat(0x8a5a35)); under.rotation.x = Math.PI; under.position.y = -7; island.add(under);
    const under2 = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.2, 28), App.mat(0x6e4425)); under2.position.y = -0.4; island.add(under2);
    // river
    const rpts = []; for (let z = -R; z <= R; z += 1) rpts.push(new THREE.Vector3(riverX(z), 0.05, z));
    const rc = new THREE.CatmullRomCurve3(rpts);
    const river = new THREE.Mesh(new THREE.TubeGeometry(rc, 60, 0.55, 4, false), App.mat(0x4fb6e8, { r: 0.2, m: 0.1 })); river.scale.y = 0.15; island.add(river);
    // mini complex
    const cx = Models.domeComplex(); cx.scale.setScalar(0.07); cx.position.set(5, 0.6, 4); island.add(cx);
    // trees
    const tm = new THREE.InstancedMesh(Models.geo.spruce, App.mat(0xffffff, { vc: true }), 140); let n = 0; const d = new THREE.Object3D();
    for (let i = 0; i < 800 && n < 140; i++) {
      const x = (Math.random() * 2 - 1) * R, z = (Math.random() * 2 - 1) * R; if (Math.hypot(x, z) > R - 1 || Math.abs(x - riverX(z)) < 1.6 || Math.hypot(x - 5, z - 4) < 4.5) continue;
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(terr)[0]; if (!hit || hit.point.y > 5.5) continue;
      d.position.set(x, hit.point.y, z); d.scale.setScalar(0.18 + Math.random() * 0.12); d.rotation.y = Math.random() * 6; d.updateMatrix(); tm.setMatrixAt(n++, d.matrix);
    }
    tm.count = n; tm.castShadow = true; island.add(tm);
    // gondola cable
    const cab = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(6, 2.5, 3), new THREE.Vector3(10, 8.5, -6)]), new THREE.LineBasicMaterial({ color: 0x222222 }));
    island.add(cab);

    // ---- math model orbit ----
    const orbit = (H.orbit = new THREE.Group()); root.add(orbit);
    const formulas = ['T = Nw·Dw·Kw + Ns·Ds·Ks', 'T = 135 000 + 215 000 = 350 000', 'NPV = Σ CF/(1+r)^t − I₀', 'NPV = +146 267 603 ₸', 'PP = 750 / 168 = 4,46 → 6,2 жыл', 'IRR = 14,5%', 'r = 10% · M = 1,4', 'I₀ = 500 + 250 = 750 млн ₸'];
    H.formulas = formulas.map((f, i) => {
      const s = Models.textSprite(f, { size: 40, color: '#f6d488', bg: 'rgba(20,30,70,0.88)', border: 'rgba(232,184,90,0.7)', scale: 0.62, weight: 800 });
      const a = (i / formulas.length) * Math.PI * 2; s.userData = { a, r: 21 + (i % 2) * 2.5, y: 1 + ((i * 37) % 9) - 3 };
      orbit.add(s); return s;
    });
    // Porter cluster graph
    const nodes = ['Қонақүйлер', 'Туроператорлар', 'Көлік', 'Тамақтану', 'Мемлекет', 'Жергілікті халық'];
    const graph = (H.graph = new THREE.Group()); graph.rotation.x = 0.35; root.add(graph);
    const npos = [];
    nodes.forEach((name, i) => {
      const a = i / nodes.length * Math.PI * 2, p = new THREE.Vector3(Math.cos(a) * 19, 0, Math.sin(a) * 19); npos.push(p);
      const sph = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), App.mat(0xe8b85a, { emissive: 0xb07a1a, ei: 0.6, m: 0.4, r: 0.3 })); sph.position.copy(p); graph.add(sph);
      const l = Models.textSprite(name, { size: 34, color: '#ffffff', scale: 0.6, weight: 800 }); l.position.copy(p).add(new THREE.Vector3(0, 1.6, 0)); graph.add(l);
    });
    const lp = [];
    npos.forEach((p, i) => { lp.push(p.x, p.y, p.z, 0, 0, 0); const q = npos[(i + 1) % npos.length]; lp.push(p.x, p.y, p.z, q.x, q.y, q.z); const r2 = npos[(i + 2) % npos.length]; lp.push(p.x, p.y, p.z, r2.x, r2.y, r2.z); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    graph.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x6fc6f2, transparent: true, opacity: 0.35 })));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(19, 0.06, 4, 120), new THREE.MeshBasicMaterial({ color: 0xe8b85a, transparent: true, opacity: 0.5 })); ring.rotation.x = Math.PI / 2; graph.add(ring);
    // PV bars
    const pv = [109.09, 99.17, 90.16, 81.96, 74.51, 67.74, 61.58, 55.98];
    const bars = (H.bars = new THREE.Group()); bars.position.set(4, 10, -26); bars.scale.setScalar(0.7); root.add(bars);
    pv.forEach((v, i) => {
      const h = v / 10, b = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.6), App.mat(i % 2 ? 0x3b7dd8 : 0x5a9be8, { emissive: 0x1a3a78, ei: 0.4, r: 0.4 }));
      b.position.set(-10.5 + i * 3, h / 2, 0); b.userData.h = h; bars.add(b);
      const t = Models.textSprite(Math.round(v) + '', { size: 30, color: '#c9cee3', scale: 0.7 }); t.position.set(-10.5 + i * 3, h + 0.9, 0); bars.add(t);
    });
    const bt = Models.textSprite('PV, млн ₸ · 1–8 жыл', { size: 36, color: '#f6d488', scale: 1 }); bt.position.set(0, -1.4, 0); bars.add(bt);
    const npvPts = []; let cum = 0; pv.forEach((v, i) => { cum += v; npvPts.push(new THREE.Vector3(-10.5 + i * 3, cum / 60, 1.2)); });
    bars.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(npvPts), new THREE.LineBasicMaterial({ color: 0xe2862f })));
    H.layout();
  };
  H.layout = function () {
    if (!H.root) return;
    const wide = innerWidth / innerHeight > 1.15;
    H.root.position.set(wide ? 17 : 0, wide ? -1 : 8, 0);
    H.camera.position.set(0, wide ? 15 : 22, wide ? 52 : 70);
    H.camera.lookAt(wide ? 6 : 0, wide ? 3 : 6, 0);
  };
  window.addEventListener('resize', () => H.layout());
  H.update = function (dt, t) {
    const inp = App.input;
    if (inp.dragging) H.island.rotation.y += inp.dx * 0.006; else H.island.rotation.y += dt * 0.12;
    H.island.position.y = Math.sin(t * 0.8) * 0.6;
    H.formulas.forEach((s) => { const u = s.userData; const a = u.a + t * 0.12; s.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.6, Math.sin(a) * u.r); s.material.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(a + Math.PI / 2)); });
    H.graph.rotation.y = -t * 0.07;
    H.bars.children.forEach((b, i) => { if (b.userData.h) b.scale.y = 0.9 + 0.1 * Math.sin(t * 1.5 + i * 0.6); });
  };
  H.ctrl = { get scene() { return H.scene; }, get camera() { return H.camera; }, update: (dt, t) => H.update(dt, t), labels: null };
})();
