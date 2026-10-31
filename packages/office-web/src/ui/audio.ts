/**
 * All sound is synthesised with WebAudio at runtime (no samples, so no licensing questions).
 * Off by default; the browser only allows it after a user gesture anyway.
 */
export class Audio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private ambient?: { gain: GainNode; filter: BiquadFilterNode };
  private padTimer?: number;
  enabled = false;
  volume = 0.5;
  private lastClick = 0;

  async enable(on: boolean) {
    this.enabled = on;
    if (on && !this.ctx) this.init();
    if (!this.ctx) return;
    if (on) await this.ctx.resume();
    this.master!.gain.setTargetAtTime(on ? this.volume * 0.5 : 0, this.ctx.currentTime, 0.4);
  }

  private init() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // city ambience: brown noise through a low-pass filter
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.ambient = { gain, filter };
    // vinyl crackle
    const cbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const cd = cbuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.random() < 0.0008 ? (Math.random() - 0.5) * 0.6 : 0;
    const crackle = ctx.createBufferSource();
    crackle.buffer = cbuf;
    crackle.loop = true;
    const cg = ctx.createGain();
    cg.gain.value = 0.18;
    crackle.connect(cg).connect(this.master);
    crackle.start();
    this.schedulePad();
  }

  /** Slow lo-fi chord loop (Cmaj7 → Am7 → Fmaj7 → G6) on soft triangle voices. */
  private schedulePad() {
    const chords = [
      [261.6, 329.6, 392, 493.9],
      [220, 261.6, 329.6, 392],
      [174.6, 220, 261.6, 329.6],
      [196, 246.9, 293.7, 329.6],
    ];
    let i = 0;
    const play = () => {
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime;
      for (const f of chords[i % chords.length]!) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f / 2;
        o.detune.value = (Math.random() - 0.5) * 12;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 1.2);
        g.gain.linearRampToValueAtTime(0, t + 3.9);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        o.connect(lp).connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 4);
      }
      i++;
    };
    play();
    this.padTimer = window.setInterval(play, 4000);
  }

  setNight(night: number, rain: boolean) {
    if (!this.ambient || !this.ctx) return;
    this.ambient.filter.frequency.setTargetAtTime(rain ? 1800 : 380 + (1 - night) * 420, this.ctx.currentTime, 1);
    this.ambient.gain.gain.setTargetAtTime(rain ? 0.45 : 0.14 + (1 - night) * 0.16, this.ctx.currentTime, 1);
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slide = 1) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  bell() {
    this.blip(1318.5, 1.1, 'sine', 0.12);
    setTimeout(() => this.blip(1975.5, 0.9, 'sine', 0.06), 90);
  }

  ding() {
    this.blip(880, 0.5, 'sine', 0.06);
    setTimeout(() => this.blip(1174.7, 0.6, 'sine', 0.05), 160);
  }

  pop() {
    this.blip(660, 0.18, 'triangle', 0.05, 1.6);
  }

  /** Keyboard clicks while agents type, rate limited. */
  click() {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = performance.now();
    if (now - this.lastClick < 70) return;
    this.lastClick = now;
    const t = this.ctx.currentTime;
    const b = this.ctx.createBuffer(1, 400, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    s.connect(hp).connect(g).connect(this.master);
    s.start(t);
  }

  dispose() {
    clearInterval(this.padTimer);
    void this.ctx?.close();
  }
}
