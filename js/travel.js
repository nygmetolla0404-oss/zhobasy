/* Travel controller: overview orbit + horse / eagle / drone / e-car (shared by map & world) */
(function () {
  const V3 = THREE.Vector3;
  class Travel {
    constructor(o) {
      this.o = o; const s = o.scale;
      this.av = {
        horse: Models.horse({ rider: true, riderCoat: 0x1f3a7a, riderHat: 'kalpak', color: 0x8a4b22 }),
        eagle: Models.eagle(),
        drone: Models.drone(),
        car: Models.car(0x1e9bb0)
      };
      for (const k in this.av) {
        const a = this.av[k]; a.scale.setScalar(s * (k === 'eagle' ? 1.1 : k === 'drone' ? 1.3 : 1)); a.visible = false; a.rotation.order = 'YXZ'; o.scene.add(a);
      }
      this.pos = new V3(o.start.x, 0, o.start.z); this.pos.y = o.ground(this.pos.x, this.pos.z);
      this.heading = o.start.h || 0; this.vel = 0; this.vy = 0; this.bank = 0;
      this.mode = 'overview';
      this.ov = Object.assign({}, o.overview); this.ov.target = o.overview.target.clone();
      this.camYaw = 0; this.camPitch = 0.3; this.camDist = 1; this.camSnap = true; this.tween = null;
      this._d = new V3(); this._c = new V3();
    }
    setMode(m) {
      const prev = this.mode, o = this.o, s = o.scale; this.mode = m;
      for (const k in this.av) this.av[k].visible = k === m;
      if (m !== 'overview') {
        if (prev === 'overview') {
          this.pos.set(this.ov.target.x, 0, this.ov.target.z);
          this.heading = this.ov.yaw + Math.PI;
          this.pos.y = o.ground(this.pos.x, this.pos.z) + this.ov.dist * 0.15;
        }
        if ((m === 'horse' || m === 'car') && !o.canGo(this.pos.x, this.pos.z, m)) {
          const p = o.nearestGo ? o.nearestGo(this.pos.x, this.pos.z) : o.start; this.pos.x = p.x; this.pos.z = p.z;
        }
        const g = o.ground(this.pos.x, this.pos.z);
        if (m === 'eagle' || m === 'drone') this.pos.y = Math.max(this.pos.y, g + o.flyStart * s); else this.pos.y = g;
        this.vel = 0; this.camYaw = 0; this.camPitch = m === 'eagle' ? 0.22 : 0.3;
      } else if (prev !== 'overview') {
        this.ov.target.set(this.pos.x, o.overviewY ? o.overviewY(this.pos.x, this.pos.z) : this.ov.target.y, this.pos.z);
        this.ov.yaw = this.heading + Math.PI;
      }
      this.camSnap = true; this.tween = null;
    }
    keys() {
      const k = App.input.keys, j = App.input.joy;
      const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - j.y;
      const t = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0) - j.x;
      const v = (k.Space || k.KeyE ? 1 : 0) - (k.KeyC || k.KeyQ ? 1 : 0) + App.input.fly;
      return { f: Math.max(-1, Math.min(1, f)), t: Math.max(-1, Math.min(1, t)), v, boost: !!(k.ShiftLeft || k.ShiftRight) };
    }
    clampBounds(p) { const b = this.o.bounds; p.x = Math.max(b.minX, Math.min(b.maxX, p.x)); p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z)); }
    flyTo(p, dist, yaw) {
      const o = this.o, s = o.scale;
      if (this.mode === 'overview') {
        this.tween = { t: 0, dur: 1.6, from: this.ov.target.clone(), to: p.clone(), fd: this.ov.dist, td: dist || this.ov.dist, fy: this.ov.yaw, ty: yaw != null ? yaw : this.ov.yaw };
        let dy = this.tween.ty - this.tween.fy; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.tween.ty = this.tween.fy + dy;
        return;
      }
      const stand = (dist || 40 * s) * 0.6;
      for (let i = 0; i < 12; i++) {
        const a = (yaw != null ? yaw : 0) + i * (Math.PI / 6);
        const x = p.x + Math.sin(a) * stand, z = p.z + Math.cos(a) * stand;
        if (this.mode === 'eagle' || this.mode === 'drone' || o.canGo(x, z, this.mode)) {
          this.pos.set(x, 0, z); this.heading = Math.atan2(p.x - x, p.z - z); break;
        }
      }
      const g = o.ground(this.pos.x, this.pos.z);
      this.pos.y = this.mode === 'eagle' || this.mode === 'drone' ? Math.max(g + o.flyStart * s, p.y + 10 * s) : g;
      this.vel = 0; this.camYaw = 0; this.camSnap = true;
    }
    focus() { return this.mode === 'overview' ? this.ov.target : this.pos; }
    update(dt) {
      const o = this.o, s = o.scale, cam = o.camera, inp = App.input;
      if (this.mode === 'overview') return this.updateOverview(dt);
      const K = this.keys(), m = this.mode, av = this.av[m];
      const maxV = o.speeds[m] * s * (K.boost ? 1.8 : 1);
      const dir = this._d.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      if (m === 'horse' || m === 'car') {
        const tv = K.f * maxV * (K.f < 0 ? 0.4 : 1);
        this.vel += (tv - this.vel) * Math.min(1, dt * (m === 'car' ? 2 : 3));
        this.heading += K.t * (m === 'car' ? 1.3 * Math.min(1, Math.abs(this.vel) / (maxV * 0.3 + 1e-6)) * Math.sign(this.vel || 1) : 1.8) * dt;
        const nx = this.pos.x + dir.x * this.vel * dt, nz = this.pos.z + dir.z * this.vel * dt;
        if (o.canGo(nx, nz, m)) { this.pos.x = nx; this.pos.z = nz; } else this.vel *= -0.2;
        this.clampBounds(this.pos);
        this.pos.y = o.ground(this.pos.x, this.pos.z);
        const L = 1.6 * s, hf = o.ground(this.pos.x + dir.x * L, this.pos.z + dir.z * L), hb = o.ground(this.pos.x - dir.x * L, this.pos.z - dir.z * L);
        av.position.copy(this.pos); av.rotation.y = this.heading; av.rotation.x = -Math.atan2(hf - hb, 2 * L) * 0.8; av.rotation.z = 0;
        if (m === 'horse') Models.animateHorse(av, this.vel / (o.speeds.horse * s), dt); else Models.animateCar(av, this.vel / s, dt);
      } else {
        const tv = m === 'eagle' ? Math.max(0.3, K.f) * maxV : K.f * maxV;
        this.vel += (tv - this.vel) * Math.min(1, dt * 1.8);
        this.heading += K.t * 1.4 * dt;
        this.vy += (K.v * maxV * 0.6 - this.vy) * Math.min(1, dt * 3);
        this.pos.x += dir.x * this.vel * dt; this.pos.z += dir.z * this.vel * dt; this.pos.y += this.vy * dt;
        this.clampBounds(this.pos);
        const g = o.ground(this.pos.x, this.pos.z);
        this.pos.y = Math.max(g + (m === 'drone' ? 1.0 : 2.5) * s, Math.min(o.flyMax, this.pos.y));
        this.bank += (-K.t * (m === 'eagle' ? 0.55 : 0.25) - this.bank) * Math.min(1, dt * 3);
        av.position.copy(this.pos);
        av.rotation.y = this.heading; av.rotation.z = this.bank;
        if (m === 'eagle') { av.rotation.x = -this.vy / (maxV + 1e-6) * 0.5; Models.animateEagle(av, K.f > 0.3 || K.v > 0 ? 1 : 0.15, dt); }
        else { av.rotation.x = (this.vel / (maxV + 1e-6)) * 0.22; av.position.y += Math.sin(App.clock.elapsedTime * 2.5) * 0.08 * s; Models.animateDrone(av, dt); }
      }
      // camera
      if (inp.dragging) { this.camYaw -= inp.dx * 0.005; this.camPitch = Math.max(-0.05, Math.min(1.25, this.camPitch + inp.dy * 0.004)); }
      else if (Math.abs(this.vel) > 0.5 * s) this.camYaw *= 1 - Math.min(1, dt * 1.2);
      this.camDist = Math.max(0.4, Math.min(3.5, this.camDist * Math.exp(inp.wheel * 0.001)));
      const base = { horse: 9, car: 11, eagle: 13, drone: 9 }[m] * s * this.camDist;
      const a = this.heading + this.camYaw;
      const des = this._c.set(this.pos.x - Math.sin(a) * base * Math.cos(this.camPitch), this.pos.y + 2.2 * s + base * Math.sin(this.camPitch), this.pos.z - Math.cos(a) * base * Math.cos(this.camPitch));
      const gy = o.ground(des.x, des.z) + 1.5 * s; if (des.y < gy) des.y = gy;
      if (this.camSnap) { cam.position.copy(des); this.camSnap = false; } else cam.position.lerp(des, 1 - Math.exp(-dt * 6));
      const cg = o.ground(cam.position.x, cam.position.z) + 1.2 * s; if (cam.position.y < cg) cam.position.y = cg;
      cam.lookAt(this.pos.x, this.pos.y + 1.8 * s, this.pos.z);
    }
    updateOverview(dt) {
      const o = this.o, ov = this.ov, inp = App.input, cam = o.camera, K = this.keys();
      if (this.tween) {
        const tw = this.tween; tw.t += dt / tw.dur; const e = App.ease(Math.min(1, tw.t));
        ov.target.lerpVectors(tw.from, tw.to, e); ov.dist = App.lerp(tw.fd, tw.td, e); ov.yaw = App.lerp(tw.fy, tw.ty, e);
        if (tw.t >= 1) this.tween = null;
      }
      if (inp.dragging) { ov.yaw -= inp.dx * 0.005; ov.pitch = Math.max(ov.minPitch || 0.08, Math.min(1.45, ov.pitch + inp.dy * 0.004)); this.tween = null; }
      if (inp.wheel) { ov.dist = Math.max(ov.minDist, Math.min(ov.maxDist, ov.dist * Math.exp(inp.wheel * 0.0012))); }
      if (K.f || K.t) {
        const sp = ov.dist * 0.9 * dt * (K.boost ? 2 : 1);
        ov.target.x += (-Math.sin(ov.yaw) * K.f - Math.cos(ov.yaw) * K.t) * sp;
        ov.target.z += (-Math.cos(ov.yaw) * K.f + Math.sin(ov.yaw) * K.t) * sp;
        this.clampBounds(ov.target); this.tween = null;
      }
      if (o.autoRotate && !inp.dragging && !this.tween && !K.f && !K.t) ov.yaw += dt * o.autoRotate;
      if (o.overviewY && !this.tween) ov.target.y += (o.overviewY(ov.target.x, ov.target.z) - ov.target.y) * Math.min(1, dt * 3);
      const p = ov.pitch, d = ov.dist;
      const des = this._c.set(ov.target.x + Math.sin(ov.yaw) * Math.cos(p) * d, ov.target.y + Math.sin(p) * d, ov.target.z + Math.cos(ov.yaw) * Math.cos(p) * d);
      const gy = o.ground(des.x, des.z) + (o.camMin || 3) * o.scale; if (des.y < gy) des.y = gy;
      if (this.camSnap) { cam.position.copy(des); this.camSnap = false; } else cam.position.lerp(des, 1 - Math.exp(-dt * 8));
      cam.lookAt(ov.target);
    }
  }
  window.Travel = Travel;
  window.MODE_HINTS = {
    overview: '<b>Шолу</b><br><kbd>Тышқан</kbd> айналдыру · <kbd>Дөңгелек</kbd> жақындату<br><kbd>W A S D</kbd> жылжу',
    horse: '<b>Тұлпармен шабу</b><br><kbd>W</kbd><kbd>S</kbd> алға/артқа · <kbd>A</kbd><kbd>D</kbd> бұрылу<br><kbd>Shift</kbd> жылдам · <kbd>Тышқан</kbd> камера',
    eagle: '<b>Бүркітпен ұшу</b><br><kbd>W</kbd> жылдамдық · <kbd>A</kbd><kbd>D</kbd> бұрылу<br><kbd>Space</kbd> жоғары · <kbd>C</kbd> төмен · <kbd>Shift</kbd> жылдам',
    drone: '<b>Дронмен ұшу</b><br><kbd>W</kbd><kbd>S</kbd> алға/артқа · <kbd>A</kbd><kbd>D</kbd> бұрылу<br><kbd>Space</kbd> жоғары · <kbd>C</kbd> төмен',
    car: '<b>Электрокар</b><br><kbd>W</kbd><kbd>S</kbd> газ/тежеу · <kbd>A</kbd><kbd>D</kbd> руль<br><kbd>Shift</kbd> жылдам · <kbd>Тышқан</kbd> камера'
  };
})();
