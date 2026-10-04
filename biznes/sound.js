/* Oddiy sintez qilingan ovozlar (fayllarsiz) */
(function (root) {
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem('tb_sound') !== '0'; } catch (e) {}
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, when, slide) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, when, hp) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const len = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = c.createBufferSource(); src.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hp || 2500; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start(t);
  }
  const S = {
    get on() { return on; },
    set on(v) { on = v; try { localStorage.setItem('tb_sound', v ? '1' : '0'); } catch (e) {} },
    play(name) {
      if (!on) return;
      try {
        switch (name) {
          case 'click': tone(660, 0.06, 'triangle', 0.12); break;
          case 'dice': for (let i = 0; i < 6; i++) noise(0.05, 0.35, i * 0.07 + Math.random() * 0.02, 1800 + Math.random() * 1500); break;
          case 'step': tone(520 + Math.random() * 60, 0.05, 'sine', 0.09); break;
          case 'coin': tone(988, 0.08, 'square', 0.07); tone(1319, 0.22, 'square', 0.07, 0.08); break;
          case 'pay': tone(440, 0.1, 'triangle', 0.14); tone(330, 0.18, 'triangle', 0.14, 0.09); break;
          case 'buy': tone(523, 0.1, 'triangle', 0.15); tone(659, 0.1, 'triangle', 0.15, 0.1); tone(784, 0.25, 'triangle', 0.15, 0.2); break;
          case 'build': noise(0.08, 0.4, 0, 900); noise(0.08, 0.4, 0.12, 900); tone(700, 0.15, 'triangle', 0.1, 0.25); break;
          case 'card': tone(880, 0.07, 'sine', 0.12); tone(1175, 0.18, 'sine', 0.12, 0.07); break;
          case 'jail': tone(700, 0.25, 'sawtooth', 0.06, 0, 500); tone(700, 0.25, 'sawtooth', 0.06, 0.3, 500); break;
          case 'turn': tone(784, 0.09, 'sine', 0.1); break;
          case 'bad': tone(300, 0.3, 'sawtooth', 0.08, 0, 150); break;
          case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, i * 0.14)); break;
        }
      } catch (e) {}
    },
  };
  root.Snd = S;
})(window);
