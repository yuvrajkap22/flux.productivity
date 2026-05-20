const FluxAudio = {
  ctx: null,
  masterGain: null,
  muted: false,
  volume: 30,
  activeSounds: {},
  noiseBuffers: {},

  init() {
    // Respect performance-lite preference and avoid creating AudioContext when performance constrained
    if (typeof document !== 'undefined' && document.body && document.body.classList.contains('performance-lite')) return;

    const t = Flux.load('flux_sounds', { volume: 30, muted: false, active: {} });
    this.volume = t.volume || 30;
    this.muted = t.muted || false;
    if (this.muted) document.body.classList.add('sounds-muted');
    if (t.active) Object.keys(t.active).forEach((k) => { if (t.active[k]) this.startAmbient(k); });
  },

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume / 100;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : v / 100;
    this.saveState();
    window.dispatchEvent(new CustomEvent('flux-sound-change', { detail: { volume: this.volume, muted: this.muted } }));
  },

  toggleMute() {
    this.muted = !this.muted;
    document.body.classList.toggle('sounds-muted', this.muted);
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume / 100;
    this.saveState();
    window.dispatchEvent(new CustomEvent('flux-sound-change', { detail: { volume: this.volume, muted: this.muted } }));
  },

  saveState() {
    const out = {};
    for (const k in this.activeSounds) out[k] = true;
    Flux.save('flux_sounds', { volume: this.volume, muted: this.muted, active: out });
  },

  playTone(freq, dur, type = 'sine', gain = 0.15) {
    this.ensureCtx();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  },

  taskComplete() {
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  },

  pomoStart() { this.playTone(220, 0.25, 'triangle', 0.1); },
  pomoEnd() {
    this.ensureCtx();
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o.connect(g);
      g.connect(this.masterGain);
      o.start(t + 0.05 * i);
      o.stop(t + 0.9);
    });
  },

  breakEnd() { this.ensureCtx(); this.playTone(392, 0.15, 'sine', 0.1); setTimeout(() => this.playTone(523, 0.15, 'sine', 0.1), 170); },
  buttonClick() { this.playTone(4000, 0.03, 'sine', 0.03); },

  taskAdded() {
    this.ensureCtx();
    const len = Math.floor(0.05 * this.ctx.sampleRate);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = 0.3 * (2 * Math.random() - 1);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = 0.04;
    src.connect(g);
    g.connect(this.masterGain);
    src.start();
  },

  createNoiseBuffer() {
    this.ensureCtx();
    const sr = this.ctx.sampleRate;
    if (this.noiseBuffers[sr]) return this.noiseBuffers[sr];
    const len = 2 * sr;
    const b = this.ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = 2 * Math.random() - 1;
    this.noiseBuffers[sr] = b;
    return b;
  },

  startAmbient(type) {
    // Do not start ambient sounds when performance-lite is active
    if (typeof document !== 'undefined' && document.body && document.body.classList.contains('performance-lite')) return;

    if (this.activeSounds[type]) return;
    this.ensureCtx();
    const buf = this.createNoiseBuffer();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    let node = null;

    if (type === 'rain') {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 1;
      src.connect(f); f.connect(g);
      node = { source: src, gain: g, filter: f };
    } else if (type === 'whitenoise') {
      src.connect(g);
      node = { source: src, gain: g };
    } else if (type === 'forest') {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 2;
      src.connect(f); f.connect(g);
      node = { source: src, gain: g, filter: f };
    } else if (type === 'cafe') {
      const f1 = this.ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 600; f1.Q.value = 0.7;
      const f2 = this.ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 100;
      src.connect(f1); f1.connect(f2); f2.connect(g);
      node = { source: src, gain: g, filter: f1 };
    }

    g.connect(this.masterGain);
    src.start();
    this.activeSounds[type] = node;
    this.saveState();
  },

  stopAmbient(type) {
    const s = this.activeSounds[type];
    if (s) {
      try { s.source.stop(); } catch (e) {}
      delete this.activeSounds[type];
      this.saveState();
    }
  },

  toggleAmbient(type) {
    if (this.activeSounds[type]) { this.stopAmbient(type); return false; }
    this.startAmbient(type); return true;
  },

  isActive(type) { return !!this.activeSounds[type]; },
  hasAnySoundActive() { return Object.keys(this.activeSounds).length > 0; }
};

window.FluxAudio = FluxAudio;
