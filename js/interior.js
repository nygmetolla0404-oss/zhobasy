/* Interiors: first-person walkable rooms (yurt, restaurant, hotel, info, rental, health, stable) */
(function () {
  const I = (window.Interior = {});
  const M = Models, mat = App.mat, V3 = THREE.Vector3;
  const cache = {};
  let cur = null;
  const sm = (c, o = {}) => mat(c, Object.assign({ flat: false, r: 0.7 }, o));
  function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
  function tag(obj, info) { obj.userData.info = info; return obj; }

  function room(type) {
    const r = { type, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 400), labels: new App.LabelSet(), click: [], movers: [], R: 6, rect: null, yaw: 0, pitch: -0.05, pos: new V3(0, 1.65, 4) };
    r.camera.rotation.order = 'YXZ';
    r.labels.setVisible(false);
    r.add = (o, info) => { r.scene.add(o); if (info) { tag(o, info); r.click.push(o); } return o; };
    r.label = (o, text, h = 0.6) => r.labels.add(o, text, 'npc', { offset: h, maxDist: 14 });
    return r;
  }
  function person(o, x, y, z, ry, pose) { const p = M.person(Object.assign({ pose: pose || 'stand' }, o)); p.position.set(x, y, z); p.rotation.y = ry || 0; return p; }

  /* ---------- panorama outside glass ---------- */
  function panoTex(season) {
    const pal = { winter: ['#9cc4ea', '#eef4fa', '#f4f8fb', '#dfe9f2'], spring: ['#6ebff0', '#e6f6ff', '#8fd86a', '#6a9a5a'], summer: ['#3fa6ee', '#d8f0ff', '#5cb84f', '#4a7a4a'], autumn: ['#86b2d8', '#f5e4c8', '#c9a33c', '#8a6a40'] }[season];
    return App.canvasTex(2048, 512, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h * 0.7); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const ridge = (base, amp, col, snow, seed) => {
        c.beginPath(); c.moveTo(0, h);
        const pts = []; for (let x = 0; x <= w; x += 16) { const y = base - Math.abs(Math.sin(x * 0.004 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.4); pts.push([x, y]); c.lineTo(x, y); }
        c.lineTo(w, h); c.closePath(); c.fillStyle = col; c.fill();
        if (snow) { c.fillStyle = '#fbfdff'; pts.forEach(([x, y]) => { if (y < base - amp * 0.7) c.fillRect(x, y, 16, (base - amp * 0.7 - y) * 0.6 + 6); }); }
      };
      ridge(h * 0.55, 160, '#8b93a3', true, 1); ridge(h * 0.68, 90, pal[3], false, 3); ridge(h * 0.8, 40, pal[2], false, 5);
      c.fillStyle = pal[2]; c.fillRect(0, h * 0.8, w, h * 0.2);
      for (let i = 0; i < 140; i++) { const x = Math.random() * w, y = h * 0.62 + Math.random() * h * 0.22; c.fillStyle = season === 'winter' ? '#cfdcd6' : '#2f6b3f'; c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x - 8, y); c.lineTo(x + 8, y); c.fill(); }
    });
  }
  function hall(r, R, o = {}) {
    r.R = R;
    const drumH = o.drumH || 5.5;
    r.scene.add(mesh(new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: M.tex.wood, roughness: 0.6 })));
    r.pano = mesh(new THREE.CylinderGeometry(70, 70, 70, 48, 1, true), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }), 0, 22, 0); r.scene.add(r.pano);
    r.scene.add(mesh(new THREE.CircleGeometry(80, 24).rotateX(-Math.PI / 2), mat(0xcfd8c0), 0, -0.3, 0));
    r.scene.add(mesh(new THREE.CylinderGeometry(R, R, drumH, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.4, side: THREE.DoubleSide }), 0, drumH / 2, 0));
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; r.scene.add(mesh(new THREE.BoxGeometry(0.18, drumH, 0.18), sm(0x7a5432), Math.cos(a) * R, drumH / 2, Math.sin(a) * R)); }
    const dm = new THREE.MeshStandardMaterial({ map: M.tex.lattice, side: THREE.BackSide, roughness: 0.8 });
    const d = mesh(new THREE.SphereGeometry(R, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2), dm, 0, drumH, 0); d.scale.y = 0.82; r.scene.add(d);
    for (let k = 0; k < 8; k++) { const rib = mesh(new THREE.TorusGeometry(R * 0.995, 0.12, 6, 40, Math.PI), sm(0x6b4423), 0, drumH, 0); rib.scale.y = 0.82; rib.rotation.y = k / 8 * Math.PI; r.scene.add(rib); }
    r.scene.add(mesh(new THREE.CylinderGeometry(R * 0.99, R * 0.99, 0.8, 48, 1, true), new THREE.MeshStandardMaterial({ map: M.tex.ornament, side: THREE.BackSide }), 0, drumH + 0.4, 0));
    const top = drumH + R * 0.82;
    const sh = mesh(new THREE.TorusGeometry(R * 0.2, 0.16, 8, 32), sm(0xe8b85a, { m: 0.5, r: 0.3, emissive: 0xffc56b, ei: 0.5 }), 0, top - 0.4, 0); sh.rotation.x = Math.PI / 2; r.add(sh, 'shanyrak');
    r.scene.add(mesh(new THREE.CircleGeometry(R * 0.19, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8f6ff }), 0, top - 0.2, 0));
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = Math.cos(a) * R * 0.45, z = Math.sin(a) * R * 0.45, y = drumH + 1.4;
      r.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(x, y, z), new V3(x, top - 1.5, z)]), new THREE.LineBasicMaterial({ color: 0x3a2a1a })));
      r.scene.add(mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffd27a, emissiveIntensity: 1 }), x, y, z));
    }
    r.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7050, 0.9));
    const pl = new THREE.PointLight(0xffe0b0, 0.8, R * 3); pl.position.set(0, drumH + 2, 0); r.scene.add(pl);
    const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(-20, 30, 15); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R }); r.scene.add(sun);
    r.pos.set(0, 1.65, R - 2);
    const carpet = mesh(new THREE.CircleGeometry(o.carpet || 4, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: M.tex.carpet }), 0, 0.02, 0); r.scene.add(carpet);
  }
  function table(r, x, z, guests) {
    const g = new THREE.Group(); g.position.set(x, 0, z); r.scene.add(g);
    g.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 24), sm(0xf4efe4), 0, 0.76, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.3, 0.75, 10), sm(0x5a3a22), 0, 0.37, 0));
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI * 2 + 0.4, cx = Math.cos(a) * 1.25, cz = Math.sin(a) * 1.25;
      const ch = new THREE.Group(); ch.position.set(cx, 0, cz); ch.rotation.y = -a - Math.PI / 2; g.add(ch);
      ch.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), sm(0x7a1f1f), 0, 0.46, 0));
      ch.add(mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), sm(0x6b4423), 0, 0.78, -0.24));
      [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]].forEach(([lx, lz]) => ch.add(mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), sm(0x5a3a22), lx, 0.22, lz)));
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.03, 16), sm(0xffffff), Math.cos(a) * 0.55, 0.81, Math.sin(a) * 0.55));
      if (guests && k < guests) {
        const p = person({ coat: [0xe8452f, 0x3b7dd8, 0x2fa36b, 0xf2c032, 0x7d3fae, 0x1e2a55][(x * 7 + k) & 5 | 0], hat: ['hair', 'scarf', 'cap', 'hair'][k], trim: false }, cx, -0.12, cz, -a - Math.PI / 2 + Math.PI, 'sit');
        p.rotation.y = Math.atan2(-cx, -cz); g.add(p); r.click.push(tag(p, 'tourists'));
      }
    }
    for (let i = 0; i < 7; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), sm(0xd99a3a), (Math.random() - 0.5) * 0.3, 0.84, (Math.random() - 0.5) * 0.3));
    return g;
  }
  function sign(r, text, x, y, z, bg) { const s = M.textSprite(text, { size: 44, color: '#2a1d05', bg: bg || '#f2c25b', scale: 0.38 }); s.position.set(x, y, z); r.scene.add(s); }
  function plant(r, x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 10), sm(0xc9a46c), 0, 0.25, 0)); g.add(mesh(new THREE.IcosahedronGeometry(0.55, 1), mat(0x3f8f45), 0, 0.95, 0)); r.scene.add(g); }

  /* ---------- builders ---------- */
  const B = {};
  B.yurt = function () {
    const r = room('yurt'), R = 6, wallH = 1.8, topY = 4.05; r.R = R;
    r.scene.background = new THREE.Color(0x2a1d14);
    r.scene.add(mesh(new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2), sm(0xcdb68e)));
    r.scene.add(mesh(new THREE.CircleGeometry(3.4, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: M.tex.carpet }), 0, 0.01, 0));
    r.scene.add(mesh(new THREE.CylinderGeometry(R, R, wallH, 56, 1, true), new THREE.MeshStandardMaterial({ map: M.tex.kerege, side: THREE.BackSide, roughness: 0.9 }), 0, wallH / 2, 0));
    r.scene.add(mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.22, 56, 1, true), new THREE.MeshStandardMaterial({ map: M.tex.redBand, side: THREE.BackSide }), 0, wallH - 0.05, 0));
    r.scene.add(mesh(new THREE.CylinderGeometry(0.95, R + 0.08, topY - wallH + 0.05, 56, 1, true), sm(0xf1e7d4, { side: THREE.BackSide }), 0, (topY + wallH) / 2 + 0.03, 0));
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; r.scene.add(M.beam(new V3(Math.cos(a) * (R - 0.05), wallH, Math.sin(a) * (R - 0.05)), new V3(Math.cos(a) * 0.9, topY, Math.sin(a) * 0.9), 0.04, 0.035, sm(0xc4572b), 6)); }
    const sh = new THREE.Group(); sh.position.y = topY; r.add(sh, 'shanyrak');
    const ring = mesh(new THREE.TorusGeometry(0.92, 0.09, 8, 32), sm(0x8a4a22)); ring.rotation.x = Math.PI / 2; sh.add(ring);
    for (let k = 0; k < 3; k++) { const a = mesh(new THREE.TorusGeometry(0.9, 0.045, 6, 20, Math.PI), sm(0x8a4a22)); a.scale.y = 0.35; a.rotation.y = k / 3 * Math.PI; sh.add(a); }
    sh.add(mesh(new THREE.CircleGeometry(0.88, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdff2ff }), 0, 0.3, 0));
    r.label(sh, 'Шаңырақ', 0.3);
    const shaft = mesh(new THREE.CylinderGeometry(0.85, 1.7, topY, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0, topY / 2, 0); shaft.castShadow = false; r.scene.add(shaft);
    // door
    r.scene.add(mesh(new THREE.PlaneGeometry(1.0, 1.6), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }), 0, 0.8, R - 0.06)).rotation.y = 0;
    r.scene.children[r.scene.children.length - 1].rotation.y = Math.PI;
    // tor: sandyks + jük
    const jk = new THREE.Group(); jk.position.set(0, 0, -R + 0.85); r.add(jk, 'sandyk');
    [-0.75, 0.75].forEach((x) => { const s = mesh(new THREE.BoxGeometry(1.3, 0.65, 0.7), new THREE.MeshStandardMaterial({ map: M.tex.ornament })); s.position.set(x, 0.33, 0); jk.add(s); });
    [0xc8352f, 0x2f4f9a, 0x2fa36b, 0xe8b85a, 0x7d3fae, 0xf4f1ea].forEach((c, i) => jk.add(mesh(new THREE.BoxGeometry(2.7, 0.14, 0.75), sm(c, { r: 0.95 }), 0, 0.72 + i * 0.14, 0)));
    r.label(jk, 'Сандық · жүк', 1.7);
    const tus = mesh(new THREE.PlaneGeometry(3.2, 1.3), new THREE.MeshStandardMaterial({ map: M.tex.tus, side: THREE.DoubleSide }), -R + 0.32, 1.05, -0.4); tus.rotation.y = Math.PI / 2; r.add(tus, 'tuskiiz'); r.label(tus, 'Тұскиіз', 0.8);
    const dom = new THREE.Group(); dom.position.set(R - 0.35, 1.15, -1.2); dom.rotation.y = -Math.PI / 2; dom.rotation.z = 0.35; r.add(dom, 'dombra');
    const db = mesh(new THREE.SphereGeometry(0.22, 16, 10), sm(0xb0702f, { r: 0.4 })); db.scale.set(1, 1.4, 0.45); dom.add(db);
    dom.add(mesh(new THREE.BoxGeometry(0.06, 0.95, 0.04), sm(0x7a4a22), 0, 0.75, 0));
    dom.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), sm(0x2a1a10), 0, 0.05, 0.1)).children;
    r.label(dom, 'Домбыра', 0.9);
    // dastarkhan
    const t = new THREE.Group(); r.scene.add(t);
    t.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.3, 32), sm(0x6b4423), 0, 0.15, 0));
    t.add(mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.02, 32), sm(0xffffff), 0, 0.31, 0));
    const sam = new THREE.Group(); sam.position.set(0.45, 0.32, -0.35); r.add(sam, 'samovar');
    const brass = mat(0xd9a23a, { m: 0.8, r: 0.25, flat: false });
    sam.add(mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 16), brass, 0, 0.06, 0)); sam.add(mesh(new THREE.SphereGeometry(0.2, 18, 12), brass, 0, 0.3, 0)); sam.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.16, 12), brass, 0, 0.55, 0));
    sam.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), sm(0xffffff), 0, 0.68, 0)); const sp = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), brass, 0.2, 0.22, 0); sp.rotation.z = 1.2; sam.add(sp);
    r.label(sam, 'Самаурын', 0.85);
    const bp = new THREE.Group(); bp.position.set(-0.4, 0.32, 0.1); r.add(bp, 'baursak');
    bp.add(mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.04, 20), sm(0x2f4f9a)));
    for (let i = 0; i < 16; i++) { const b = mesh(new THREE.SphereGeometry(0.055, 8, 6), sm(0xd9962e, { r: 0.6 }), (Math.random() - 0.5) * 0.36, 0.05 + Math.random() * 0.08, (Math.random() - 0.5) * 0.36); b.scale.y = 0.8; bp.add(b); }
    r.label(bp, 'Бауырсақ', 0.4);
    const pl = new THREE.Group(); pl.position.set(0.1, 0.32, 0.45); r.add(pl, 'beshbarmak');
    pl.add(mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.05, 24), sm(0xffffff)));
    pl.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24), sm(0xf0e2b8), 0, 0.04, 0));
    for (let i = 0; i < 8; i++) pl.add(mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), sm(0x7a3f22), (Math.random() - 0.5) * 0.3, 0.09, (Math.random() - 0.5) * 0.3));
    r.label(pl, 'Бесбармақ', 0.4);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.6; const bw = mesh(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sm(0xffffff, { side: THREE.DoubleSide }), Math.cos(a) * 0.72, 0.42, Math.sin(a) * 0.72); r.add(bw, 'kymyz'); bw.add(mesh(new THREE.CircleGeometry(0.085, 14).rotateX(-Math.PI / 2), sm(0xf6f1e4), 0, -0.01, 0)); }
    [0xc8352f, 0x2f4f9a, 0x2fa36b, 0xe8b85a, 0x7d3fae, 0xc8352f].forEach((c, i) => { const a = i / 6 * Math.PI * 2; const k = mesh(new THREE.BoxGeometry(1.4, 0.08, 0.6), sm(c, { r: 0.95 }), Math.cos(a) * 1.75, 0.04, Math.sin(a) * 1.75); k.rotation.y = -a + Math.PI / 2; r.scene.add(k); });
    const el = person({ coat: 0x5a3a22, hat: 'tymak', beard: 'white' }, 0, -0.52, -1.7, 0, 'sit'); r.add(el, 'aksakal'); r.label(el, 'Ақсақал', 2.0);
    const w = person({ coat: 0xc8352f, hat: 'scarf', scarf: 0xffffff }, 1.55, -0.52, 0.5, -Math.PI / 2 - 0.3, 'sit'); w.userData.work = true; r.add(w, 'kymyz'); r.movers.push((dt) => M.animatePerson(w, 0, dt)); r.label(w, 'Қымыз құюшы', 2.0);
    const ch = person({ coat: 0xf2c032, hat: 'hair', trim: false }, -1.5, -0.32, 0.4, Math.PI / 2 + 0.3, 'sit'); ch.scale.setScalar(0.65); r.scene.add(ch);
    r.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6b4a2b, 0.75));
    const top = new THREE.SpotLight(0xfff4dc, 1.4, 14, 0.6, 0.6); top.position.set(0, topY + 1, 0); top.target.position.set(0, 0, 0); top.castShadow = true; r.scene.add(top); r.scene.add(top.target);
    const warm = new THREE.PointLight(0xffb36b, 0.5, 9); warm.position.set(0, 2.2, 0); r.scene.add(warm);
    r.pos.set(0, 1.6, R - 1.3);
    return r;
  };
  B.restaurant = function () {
    const r = room('restaurant'); hall(r, 15, { drumH: 6.5, carpet: 3.2 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2; if (Math.abs(Math.sin(a) + 1) < 0.35 || Math.abs(Math.sin(a) - 1) < 0.3) continue; table(r, Math.cos(a) * 9.5, Math.sin(a) * 9.5, (i * 3) % 4 + 1); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.8; table(r, Math.cos(a) * 5.2, Math.sin(a) * 5.2, i % 3); }
    // buffet along back arc
    const buf = new THREE.Group(); r.add(buf, 'beshbarmak');
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.13, R2 = 12.6; const b = mesh(new THREE.BoxGeometry(1.7, 1, 0.9), new THREE.MeshStandardMaterial({ map: M.tex.ornament }), Math.cos(a) * R2, 0.5, Math.sin(a) * R2); b.rotation.y = -a - Math.PI / 2; buf.add(b);
      const top = mesh(new THREE.BoxGeometry(1.75, 0.06, 0.95), sm(0xf4efe4), Math.cos(a) * R2, 1.03, Math.sin(a) * R2); top.rotation.y = b.rotation.y; buf.add(top);
      const dish = mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.08, 20), sm(0xffffff), Math.cos(a) * R2, 1.1, Math.sin(a) * R2); buf.add(dish);
      for (let k = 0; k < 6; k++) buf.add(mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), sm([0x7a3f22, 0xd99a3a, 0x2fa36b][i % 3]), Math.cos(a) * R2 + (Math.random() - 0.5) * 0.3, 1.18, Math.sin(a) * R2 + (Math.random() - 0.5) * 0.3));
    }
    sign(r, 'Ұлттық тағамдар', 0, 3.2, -12.4); r.label(buf.children[6], 'Бесбармақ · қуырдақ · бауырсақ', 1.2);
    const kb = new THREE.Group(); kb.position.set(-11.5, 0, -3); r.add(kb, 'kymyz');
    kb.add(mesh(new THREE.BoxGeometry(2, 1.05, 0.9), sm(0x6b4423)));
    kb.children[0].position.y = 0.52;
    const saba = mesh(new THREE.SphereGeometry(0.45, 16, 12), sm(0x5a3a22, { r: 0.5 }), 0, 1.5, 0); saba.scale.set(0.8, 1.2, 0.8); kb.add(saba);
    for (let i = 0; i < 5; i++) kb.add(mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sm(0xffffff, { side: THREE.DoubleSide }), -0.7 + i * 0.35, 1.15, 0.2));
    sign(r, 'Қымыз · шұбат · саумал', -11.5, 2.8, -3); r.label(kb, 'Қымыз бары', 2.2);
    const waiter = person({ coat: 0xffffff, hat: 'hair', trim: false }, 0, 0, 0, 0); r.scene.add(waiter); waiter.userData.pose = 'walk';
    const tray = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), mat(0xd0d4da, { m: 0.6 }), 0.45, 1.25, 0.2); waiter.add(tray);
    r.movers.push((dt, t) => { const a = t * 0.12; waiter.position.set(Math.cos(a) * 7.3, 0, Math.sin(a) * 7.3); waiter.rotation.y = -a + Math.PI; M.animatePerson(waiter, 0.6, dt); });
    plant(r, 12, 7); plant(r, -12, -6); plant(r, 8, -11);
    return r;
  };
  B.hotel = function () {
    const r = room('hotel'); hall(r, 10.5, { carpet: 3.5 });
    const desk = new THREE.Group(); r.add(desk, 'hotel');
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.17, R2 = 8; const b = mesh(new THREE.BoxGeometry(1.4, 1.1, 0.7), sm(0x6b4423), Math.cos(a) * R2, 0.55, Math.sin(a) * R2); b.rotation.y = -a - Math.PI / 2; desk.add(b); const tp = mesh(new THREE.BoxGeometry(1.45, 0.06, 0.75), sm(0xe8b85a, { m: 0.4 }), Math.cos(a) * R2, 1.12, Math.sin(a) * R2); tp.rotation.y = b.rotation.y; desk.add(tp); }
    const clerk = person({ coat: 0x1e2a55, hat: 'hair' }, 0, 0, -8.9, 0); r.add(clerk, 'guide'); r.label(clerk, 'Қабылдау', 2.1);
    sign(r, 'Қабылдау · Reception', 0, 3, -9.4);
    const fire = new THREE.Group(); fire.position.set(7.6, 0, 2); fire.rotation.y = -Math.PI / 2; r.scene.add(fire);
    fire.add(mesh(new THREE.BoxGeometry(2.4, 2.2, 0.8), sm(0x9a8f84), 0, 1.1, 0));
    fire.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.3), mat(0xff8a1f, { emissive: 0xff6a00, ei: 1.3 }), 0, 0.7, 0.3));
    const fl = new THREE.PointLight(0xff8a3a, 0.9, 8); fl.position.set(6.6, 1, 2); r.scene.add(fl); r.movers.push((dt, t) => (fl.intensity = 0.8 + Math.sin(t * 9) * 0.2));
    [[4.5, 0.8, 0], [4.5, 3.2, 0], [2.4, 2, Math.PI / 2]].forEach(([x, z, ry]) => { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; r.scene.add(s); s.add(mesh(new THREE.BoxGeometry(2, 0.45, 0.9), sm(0x8b1e1e), 0, 0.3, 0)); s.add(mesh(new THREE.BoxGeometry(2, 0.7, 0.2), sm(0x8b1e1e), 0, 0.75, -0.4)); });
    r.scene.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), sm(0x6b4423), 4.3, 0.2, 2));
    [[-5, 3], [-5.6, 4]].forEach(([x, z], i) => r.scene.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), sm([0x3b7dd8, 0xe8452f][i]), x, 0.35, z)));
    const guest = person({ coat: 0x2fa36b, hat: 'cap', backpack: 0x2b2b33, trim: false }, -1.5, 0, -6.5, Math.PI); r.add(guest, 'tourists');
    plant(r, -7, -5); plant(r, 7, -5);
    return r;
  };
  function screen(r, lines, x, z, ry) {
    const tex = App.canvasTex(768, 432, (c, w, h) => {
      c.fillStyle = '#111936'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8b85a'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
      c.fillStyle = '#f6d488'; c.font = '900 40px Nunito, sans-serif'; c.fillText(lines[0], 30, 70);
      c.fillStyle = '#ffffff'; c.font = '700 34px Nunito, sans-serif'; lines.slice(1).forEach((l, i) => c.fillText(l, 30, 140 + i * 62));
    });
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; r.add(g, 'info');
    g.add(mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), sm(0x333333), 0, 0.8, 0));
    g.add(mesh(new THREE.PlaneGeometry(2.6, 1.46), new THREE.MeshBasicMaterial({ map: tex }), 0, 2.2, 0.09));
    g.add(mesh(new THREE.BoxGeometry(2.7, 1.56, 0.12), sm(0x1e2a55), 0, 2.2, 0));
  }
  B.info = function () {
    const r = room('info'); hall(r, 10.5, { carpet: 2 });
    const tb = new THREE.Group(); r.add(tb, 'info');
    tb.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.9, 32), sm(0x6b4423), 0, 0.45, 0));
    tb.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.1, 32), sm(0x6cc256), 0, 0.95, 0));
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, h = 0.5 + Math.random() * 0.6; const m = mesh(new THREE.ConeGeometry(0.45, h, 6), mat(0x8a8f9a), Math.cos(a) * 1.75, 1 + h / 2, Math.sin(a) * 1.75); tb.add(m); tb.add(mesh(new THREE.ConeGeometry(0.17, h * 0.35, 6), mat(0xffffff), Math.cos(a) * 1.75, 1 + h - h * 0.17, Math.sin(a) * 1.75)); }
    tb.add(mesh(new THREE.BoxGeometry(0.3, 0.02, 4.4), mat(0x3b9fdc), 0, 1.01, 0));
    const mc = M.domeComplex(); mc.scale.setScalar(0.022); mc.position.set(0.7, 1.0, 0.2); tb.add(mc);
    r.label(tb, 'Кластер макеті', 1.6);
    screen(r, ['Туристік ағым', 'T = Nw·Dw·Kw + Ns·Ds·Ks', '1500·150·0,6 + 2000·215·0,5', '= 350 000 адам/жыл'], 0, -7.5, 0);
    screen(r, ['Таза келтірілген құн', 'NPV = Σ CF/(1+r)^t × M − I₀', '640,2 × 1,4 − 750 млн ₸', '= +146,3 млн ₸'], 6.5, -3.7, -Math.PI / 3);
    screen(r, ['Инвестиция', 'I₀ = 500 + 250 = 750 млн ₸', 'PP = 6,2 жыл · IRR = 14,5%', '85 тұрақты жұмыс орны'], -6.5, -3.7, Math.PI / 3);
    const g = person({ coat: 0xc8352f, hat: 'kalpak' }, 2.6, 0, 2.6, -2.3, 'arms'); r.add(g, 'guide'); r.label(g, 'Гид', 2.1);
    return r;
  };
  B.rental = function () {
    const r = room('rental'); hall(r, 10.5, { carpet: 2.5 });
    const cols = [0xe8452f, 0x3b7dd8, 0xf2c032, 0x2fa36b, 0x7d3fae, 0xff7a1a, 0xffffff, 0x1e2a55];
    const skis = new THREE.Group(); r.add(skis, 'skiers');
    for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 - 1.1 + i * 0.085, R2 = 9.4; const s = mesh(new THREE.BoxGeometry(0.1, 1.75, 0.03), sm(cols[i % 8], { r: 0.3 }), Math.cos(a) * R2, 0.95, Math.sin(a) * R2); s.rotation.y = -a; s.rotation.z = 0.1; skis.add(s); }
    r.label(skis.children[13], 'Шаңғылар', 1.2);
    const boards = new THREE.Group(); r.add(boards, 'snowpark');
    for (let i = 0; i < 10; i++) { const a = 0.4 + i * 0.13, R2 = 9.3; const b = mesh(new THREE.BoxGeometry(0.32, 1.5, 0.04), sm(cols[(i + 3) % 8], { r: 0.3 }), Math.cos(a) * R2, 0.85, Math.sin(a) * R2); b.rotation.y = -a + Math.PI / 2; boards.add(b); }
    r.label(boards.children[5], 'Сноубордтар', 1.1);
    const shelf = new THREE.Group(); shelf.position.set(-8.6, 0, 2.5); shelf.rotation.y = Math.PI / 2; r.add(shelf, 'skiers'); shelf.add(mesh(new THREE.BoxGeometry(3, 2, 0.5), sm(0x6b4423), 0, 1, 0));
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) shelf.add(mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm(cols[(i + row) % 8], { r: 0.3 }), -1.2 + i * 0.48, 0.45 + row * 0.6, 0.3));
    r.label(shelf, 'Дулығалар', 2.2);
    const bikes = new THREE.Group(); bikes.position.set(5, 0, 4); r.add(bikes, 'hikers');
    for (let i = 0; i < 3; i++) { const bk = new THREE.Group(); bk.position.x = i * 0.9; bk.rotation.y = Math.PI / 2; bikes.add(bk); [-0.5, 0.5].forEach((z) => { const w = mesh(new THREE.TorusGeometry(0.33, 0.04, 6, 20), sm(0x222222), 0, 0.36, z); bk.add(w); }); bk.add(M.beam(new V3(0, 0.36, -0.5), new V3(0, 0.8, 0.1), 0.03, 0.03, sm(cols[i]))); bk.add(M.beam(new V3(0, 0.8, 0.1), new V3(0, 0.36, 0.5), 0.03, 0.03, sm(cols[i]))); bk.add(M.beam(new V3(0, 0.36, -0.5), new V3(0, 0.36, 0.1), 0.03, 0.03, sm(cols[i]))); }
    r.label(bikes, 'Велосипедтер (жаз)', 1.4);
    const counter = mesh(new THREE.BoxGeometry(3.2, 1.1, 0.8), sm(0x2f4f9a), 0, 0.55, -5); r.scene.add(counter);
    const staff = person({ coat: 0xe8452f, hat: 'beanie', helmet: 0x1e2a55 }, 0, 0, -5.8, 0); r.add(staff, 'rental'); r.label(staff, 'Прокат қызметкері', 2.1);
    sign(r, 'ПРОКАТ', 0, 3.2, -6);
    return r;
  };
  B.health = function () {
    const r = room('health'); hall(r, 10.5, { carpet: 0.01 });
    const pool = new THREE.Group(); pool.position.set(0, 0, -1); r.add(pool, 'health');
    pool.add(mesh(new THREE.CylinderGeometry(3.2, 3.3, 0.5, 40), sm(0xe9e2d3), 0, 0.25, 0));
    pool.add(mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0x3fb3e8, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9 }), 0, 0.48, 0));
    r.label(pool, 'Минералды су бассейні', 1.0);
    for (let i = 0; i < 3; i++) { const a = 0.5 + i * 0.5, x = Math.cos(a) * 7.3, z = Math.sin(a) * 7.3; const bed = new THREE.Group(); bed.position.set(x, 0, z); bed.rotation.y = -a; r.add(bed, 'health'); bed.add(mesh(new THREE.BoxGeometry(0.9, 0.7, 2.1), sm(0x6b4423), 0, 0.35, 0)); bed.add(mesh(new THREE.BoxGeometry(0.92, 0.12, 2.12), sm(0xffffff), 0, 0.76, 0)); }
    const bar = new THREE.Group(); bar.position.set(-7.2, 0, 2); bar.rotation.y = Math.PI / 2; r.add(bar, 'phyto');
    bar.add(mesh(new THREE.BoxGeometry(3.4, 1.1, 0.8), sm(0x2f6b3f), 0, 0.55, 0));
    for (let i = 0; i < 7; i++) bar.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 12), mat([0x8fd46a, 0xd9a23a, 0xc8352f, 0xf2c032][i % 4], { opacity: 0.8, flat: false }), -1.3 + i * 0.43, 1.28, 0));
    sign(r, 'Фито-бар', -7.4, 2.6, 2, '#8fd46a'); r.label(bar, 'Шипалы шөп шайлары', 1.7);
    const doc = person({ coat: 0xffffff, hat: 'hair' }, -6.2, 0, 2, -Math.PI / 2); r.add(doc, 'health'); r.label(doc, 'Дәрігер-нұсқаушы', 2.1);
    const cross = M.textSprite('✚ Медпункт', { size: 44, color: '#fff', bg: '#d9473c', scale: 0.4 }); cross.position.set(6, 3, -6); r.scene.add(cross);
    for (let i = 0; i < 5; i++) plant(r, Math.cos(i * 1.3) * 9, Math.sin(i * 1.3) * 9);
    return r;
  };
  B.stable = function () {
    const r = room('stable'); r.rect = { x: 1.6, z: 13 };
    r.scene.background = new THREE.Color(0x2a1d14);
    const straw = App.canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#c9a46c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.strokeStyle = ['#e0c07a', '#a8814a', '#d8b46a'][i % 3]; c.beginPath(); const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); c.stroke(); } }, [6, 12]);
    r.scene.add(mesh(new THREE.PlaneGeometry(11.9, 29.9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: straw, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0.02, 0));
    const wall = new THREE.MeshStandardMaterial({ map: M.tex.wood, side: THREE.BackSide });
    r.scene.add(mesh(new THREE.BoxGeometry(12, 6, 30), wall, 0, 3, 0));
    for (let i = 0; i < 8; i++) r.scene.add(mesh(new THREE.BoxGeometry(12, 0.3, 0.3), sm(0x5a3a22), 0, 5.4, -13 + i * 3.7));
    const coats = ['bay', 'chestnut', 'black', 'grey', 'palomino', 'dun', 'white', 'bay'];
    for (let s = 0; s < 8; s++) {
      const side = s % 2 ? 1 : -1, z = -10.5 + Math.floor(s / 2) * 6.2;
      r.scene.add(mesh(new THREE.BoxGeometry(3.8, 1.6, 0.15), sm(0x6b4423), side * 4, 0.8, z - 3));
      r.scene.add(mesh(new THREE.BoxGeometry(0.15, 1.3, 5.8), sm(0x7a5432), side * 2.1, 0.65, z));
      const h = M.horse({ coat: coats[s], saddle: false }); h.position.set(side * 4, 0, z); h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; r.add(h, 'horse');
      r.movers.push((dt) => M.animateHorse(h, 0, dt));
      r.scene.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), sm(0xd9b45a), side * 5.4, 0.25, z + 1.6));
      if (s === 2) r.label(h, 'Тау аты', 2.6);
    }
    for (let i = 0; i < 3; i++) { const sd = new THREE.Group(); sd.position.set(-1.9, 1.2, 9 + i * 1.2); r.add(sd, 'horse'); sd.add(mesh(new THREE.BoxGeometry(0.6, 0.06, 0.9), sm(0xb8322a))); sd.add(M.ell(0.22, 0.08, 0.3, sm(0x6b3a1c), 0, 0.08, 0)); }
    const groom = person({ coat: 0x5a3a22, hat: 'tymak', beard: true }, 0.8, 0, -2, -0.5); groom.userData.work = true; r.add(groom, 'stable'); r.label(groom, 'Атбегі', 2.1); r.movers.push((dt) => M.animatePerson(groom, 0, dt));
    r.scene.add(new THREE.HemisphereLight(0xfff0d8, 0x5a3a22, 0.7));
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffc27a, 0.6, 10); l.position.set(0, 4.5, -11 + i * 7.3); r.scene.add(l); r.scene.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xffe0a0, { emissive: 0xffc27a }), 0, 4.6, -11 + i * 7.3)); }
    r.pos.set(0, 1.65, 12);
    return r;
  };

  /* ---------- controller ---------- */
  I.enter = function (type, season) {
    if (!cache[type]) cache[type] = B[type]();
    cur = cache[type];
    if (cur.pano) { if (cur.pano.material.map) cur.pano.material.map.dispose(); cur.pano.material.map = panoTex(season || 'summer'); cur.pano.material.needsUpdate = true; }
    cur.start = cur.start || cur.pos.clone(); cur.pos.copy(cur.start); cur.yaw = 0; cur.pitch = -0.05; cur.camera.fov = 68;
    App.setScene(I.ctrl);
    return cur;
  };
  I.current = () => cur;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cur.camera);
    const hit = ray.intersectObjects(cur.click, true)[0]; if (!hit) return null;
    let o = hit.object; while (o && !o.userData.info) o = o.parent; return o ? o.userData.info : null;
  }
  I.ctrl = {
    get scene() { return cur.scene; }, get camera() { return cur.camera; }, get labels() { return cur.labels; },
    activate() { cur.labels.setVisible(true); }, deactivate() { if (cur) cur.labels.setVisible(false); App.canvas.style.cursor = ''; },
    update(dt, t) {
      const inp = App.input, k = inp.keys, c = cur;
      if (inp.dragging) { c.yaw -= inp.dx * 0.004; c.pitch = Math.max(-1.2, Math.min(1.2, c.pitch - inp.dy * 0.004)); }
      if (inp.wheel) { c.camera.fov = Math.max(35, Math.min(85, c.camera.fov + inp.wheel * 0.03)); c.camera.updateProjectionMatrix(); }
      const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - inp.joy.y;
      const s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + inp.joy.x;
      if (k.ArrowLeft) c.yaw += dt * 1.6; if (k.ArrowRight) c.yaw -= dt * 1.6;
      const sp = 3.2 * dt * (k.ShiftLeft ? 1.8 : 1);
      c.pos.x += (-Math.sin(c.yaw) * f + Math.cos(c.yaw) * s) * sp;
      c.pos.z += (-Math.cos(c.yaw) * f - Math.sin(c.yaw) * s) * sp;
      if (c.rect) { c.pos.x = Math.max(-c.rect.x, Math.min(c.rect.x, c.pos.x)); c.pos.z = Math.max(-c.rect.z, Math.min(c.rect.z, c.pos.z)); }
      else { const d = Math.hypot(c.pos.x, c.pos.z), lim = c.R - 0.8; if (d > lim) { c.pos.x *= lim / d; c.pos.z *= lim / d; } }
      c.camera.position.copy(c.pos); c.camera.rotation.y = c.yaw; c.camera.rotation.x = c.pitch;
      for (const m of c.movers) m(dt, t);
    },
    onClick(x, y) { const k = pick(x, y); if (k && I.onInfo) I.onInfo(k); },
    onHover(x, y) { const now = performance.now(); if (now - (I._h || 0) < 90) return; I._h = now; App.canvas.style.cursor = pick(x, y) ? 'pointer' : ''; }
  };
})();
