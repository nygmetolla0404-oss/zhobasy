/* AI audio guide (Kazakh neural voice, pre-generated MP3) */
(function () {
  const G = (window.Guide = {});
  const el = document.getElementById('guide'), txt = document.getElementById('gText'), status = document.getElementById('gStatus');
  const bPlay = document.getElementById('gPlay'), bReplay = document.getElementById('gReplay'), bMute = document.getElementById('gMute'), bMin = document.getElementById('gMin');
  const audio = new Audio();
  audio.preload = 'auto';
  let current = null, muted = false, unlocked = false;
  try { muted = localStorage.getItem('guideMuted') === '1'; } catch (e) {}
  bMute.textContent = muted ? '🔇' : '🔊';

  function setSpeaking(on) { el.classList.toggle('speaking', on); bPlay.textContent = on ? '❚❚' : '▶'; status.textContent = on ? 'сөйлеп тұр…' : 'аудиогид · қазақ тілінде'; }
  audio.addEventListener('playing', () => { if (!audio.muted) setSpeaking(true); });
  audio.addEventListener('pause', () => setSpeaking(false));
  audio.addEventListener('ended', () => { setSpeaking(false); if (G.onEnd) { const f = G.onEnd; G.onEnd = null; f(current); } });

  // Only the pre-generated neural Kazakh voice is used — never the browser's robotic speechSynthesis
  // (it read Kazakh with a foreign accent when autoplay was blocked or a clip was interrupted).
  let primed = false;
  function prime() {
    if (primed) return; primed = true;
    if (!audio.paused) return;
    const probe = 'assets/audio/portal.mp3';
    audio.muted = true; audio.src = probe;
    audio.play().then(() => { if (audio.src.endsWith(probe)) { audio.pause(); audio.muted = false; } }).catch(() => { audio.muted = false; primed = false; });
  }
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, prime, { capture: true, passive: true }));
  function play() {
    audio.muted = false;
    audio.play().catch((e) => { if (e && e.name === 'NotAllowedError') { setSpeaking(false); status.textContent = '▶ басып тыңдаңыз'; } });
  }

  G.say = function (key, opts = {}) {
    const text = (window.NARRATION || {})[key];
    if (!text) return;
    current = key;
    txt.textContent = text; txt.scrollTop = 0;
    el.classList.remove('min');
    G.onEnd = opts.onEnd || null;
    if (muted || !unlocked) { if (!unlocked) status.textContent = '▶ басып тыңдаңыз'; return; }
    audio.src = 'assets/audio/' + key + '.mp3';
    audio.currentTime = 0;
    play();
  };
  audio.addEventListener('error', () => { if (audio.muted) return; setSpeaking(false); });
  G.stop = function () { audio.pause(); setSpeaking(false); };
  G.unlock = function () { unlocked = true; };
  G.isMuted = () => muted;

  bPlay.addEventListener('click', () => {
    unlocked = true;
    if (!current) current = 'intro';
    if (!audio.src || !audio.src.includes(current + '.mp3')) { const m = muted; muted = false; G.say(current); muted = m; if (muted) { muted = false; bMute.textContent = '🔊'; } return; }
    if (audio.paused) { if (muted) { muted = false; bMute.textContent = '🔊'; } play(); } else audio.pause();
  });
  bReplay.addEventListener('click', () => { unlocked = true; if (muted) { muted = false; bMute.textContent = '🔊'; } G.say(current || 'intro'); });
  bMute.addEventListener('click', () => {
    muted = !muted; bMute.textContent = muted ? '🔇' : '🔊';
    try { localStorage.setItem('guideMuted', muted ? '1' : '0'); } catch (e) {}
    if (muted) G.stop();
  });
  bMin.addEventListener('click', () => el.classList.toggle('min'));
  document.getElementById('gAvatar').addEventListener('click', () => el.classList.toggle('min'));
  G.current = () => current;
})();
