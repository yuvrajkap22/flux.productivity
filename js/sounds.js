/* ═══════════════════════════════════════
   FLUX — Web Audio Sound Engine
   ═══════════════════════════════════════ */

const FluxAudio = {
  ctx: null,
  masterGain: null,
  muted: false,
  volume: 30,
  activeSounds: {},
  noiseBuffers: {},

  init() {
    const saved = Flux.load('flux_sounds', { volume: 30, muted: false, active: {} });
    this.volume = saved.volume || 30;
    this.muted = saved.muted || false;
    if (this.muted) document.body.classList.add('sounds-muted');

    if (saved.active) {
      Object.keys(saved.active).forEach((type) => {
        if (saved.active[type]) this.startAmbient(type);
      });
    }
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
  },

  toggleMute() {
    this.muted = !this.muted;
    document.body.classList.toggle('sounds-muted', this.muted);
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume / 100;
    this.saveState();
  },

  saveState() {
    const active = {};
    for (const k in this.activeSounds) active[k] = true;
    Flux.save('flux_sounds', { volume: this.volume, muted: this.muted, active });
  },

  // Short sound effects
  playTone(freq, duration, type = 'sine', gain = 0.15) {
    this.ensureCtx();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
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
    osc.connect(g); g.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.4);
  },

  pomoStart() {
    this.playTone(220, 0.25, 'triangle', 0.1);
  },

  pomoEnd() {
    this.ensureCtx();
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + 0.9);
    });
  },

  breakEnd() {
    this.ensureCtx();
    const t = this.ctx.currentTime;
    this.playTone(392, 0.15, 'sine', 0.1);
    setTimeout(() => this.playTone(523, 0.15, 'sine', 0.1), 170);
  },

  buttonClick() {
    this.playTone(4000, 0.03, 'sine', 0.03);
  },

  taskAdded() {
    this.ensureCtx();
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const source = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    source.buffer = buffer;
    g.gain.value = 0.04;
    source.connect(g); g.connect(this.masterGain);
    source.start();
  },

  // Ambient sound generators
  createNoiseBuffer(type) {
    this.ensureCtx();
    const sr = this.ctx.sampleRate;
    const len = sr * 2;
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  },

  startAmbient(type) {
    this.ensureCtx();
    if (this.activeSounds[type]) return;

    const buffer = this.createNoiseBuffer();
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.5;

    let chain;
    if (type === 'rain') {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 1;
      source.connect(lp); lp.connect(gainNode);
      chain = { source, gain: gainNode, filter: lp };
    } else if (type === 'whitenoise') {
      source.connect(gainNode);
      chain = { source, gain: gainNode };
    } else if (type === 'forest') {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 2;
      source.connect(bp); bp.connect(gainNode);
      chain = { source, gain: gainNode, filter: bp };
    } else if (type === 'cafe') {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.7;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 100;
      source.connect(lp); lp.connect(hp); hp.connect(gainNode);
      chain = { source, gain: gainNode, filter: lp };
    }

    gainNode.connect(this.masterGain);
    source.start();
    this.activeSounds[type] = chain;
    this.saveState();
  },

  stopAmbient(type) {
    const s = this.activeSounds[type];
    if (s) {
      s.source.stop();
      delete this.activeSounds[type];
      this.saveState();
    }
  },

  toggleAmbient(type) {
    if (this.activeSounds[type]) {
      this.stopAmbient(type);
      return false;
    } else {
      this.startAmbient(type);
      return true;
    }
  },

  isActive(type) {
    return !!this.activeSounds[type];
  },

  hasAnySoundActive() {
    return Object.keys(this.activeSounds).length > 0;
  }
};
