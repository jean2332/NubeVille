import { AudioVolumes } from '../types/game';

/**
 * 100% procedural Web Audio API Lofi soundscape & SFX synthesizer.
 * Generates warm electric-piano chords, soft rain, cozy cafe murmur, and sweet bells with zero external links.
 */
class LofiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lofiGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private cafeGain: GainNode | null = null;
  private bellsGain: GainNode | null = null;

  private chordTimer: number | null = null;
  private clinkTimer: number | null = null;
  private chordStep = 0;
  private started = false;

  private volumes: AudioVolumes = {
    muted: false,
    lofi: 0.45,
    rain: 0.35,
    cafe: 0.25,
    bells: 0.7,
  };

  private ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volumes.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);

    this.lofiGain = this.ctx.createGain();
    this.lofiGain.gain.value = this.volumes.lofi;
    this.lofiGain.connect(this.masterGain);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = this.volumes.rain;
    this.rainGain.connect(this.masterGain);

    this.cafeGain = this.ctx.createGain();
    this.cafeGain.gain.value = this.volumes.cafe;
    this.cafeGain.connect(this.masterGain);

    this.bellsGain = this.ctx.createGain();
    this.bellsGain.gain.value = this.volumes.bells;
    this.bellsGain.connect(this.masterGain);
  }

  startAmbience(): void {
    this.ensureContext();
    if (!this.ctx || this.started) return;
    this.started = true;

    this.setupRainNoise();
    this.setupCafeMurmur();
    this.scheduleChordLoop();
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Warm pink/brown-ish noise filter
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.06) * 0.32;
    }
    return buffer;
  }

  private setupRainNoise() {
    if (!this.ctx || !this.rainGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(4);
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1150;
    filter.Q.value = 0.55;

    const shelf = this.ctx.createBiquadFilter();
    shelf.type = 'lowpass';
    shelf.frequency.value = 2600;

    const trim = this.ctx.createGain();
    trim.gain.value = 0.42;

    src.connect(filter);
    filter.connect(shelf);
    shelf.connect(trim);
    trim.connect(this.rainGain);
    src.start();
  }

  private setupCafeMurmur() {
    if (!this.ctx || !this.cafeGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(5);
    src.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 420;

    const trim = this.ctx.createGain();
    trim.gain.value = 0.55;

    src.connect(lowpass);
    lowpass.connect(trim);
    trim.connect(this.cafeGain);
    src.start();

    // Gentle distant ceramic cup clinks every few seconds
    this.clinkTimer = window.setInterval(() => {
      if (!this.ctx || !this.cafeGain || this.volumes.muted || this.volumes.cafe < 0.03) return;
      if (Math.random() > 0.55) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 1900 + Math.random() * 650;
      osc.frequency.setValueAtTime(baseFreq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(g);
      g.connect(this.cafeGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }, 3200);
  }

  private scheduleChordLoop() {
    if (!this.ctx) return;
    // Warm Dmaj9 -> Bm9 -> Gmaj7 -> A13 progression
    const progression = [
      [293.66, 369.99, 440.0, 554.37, 659.25],
      [246.94, 293.66, 369.99, 440.0, 554.37],
      [196.0, 293.66, 369.99, 440.0, 493.88],
      [220.0, 329.63, 392.0, 493.88, 554.37],
    ];

    const playNextChord = () => {
      if (!this.ctx || !this.lofiGain) return;
      if (!this.volumes.muted && this.volumes.lofi > 0.02) {
        const notes = progression[this.chordStep % progression.length];
        const now = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain = this.ctx!.createGain();

          osc.type = idx === 0 ? 'triangle' : 'sine';
          // Subtle tape-warm detune
          osc.frequency.setValueAtTime(freq * (1 + (Math.random() - 0.5) * 0.004), now + idx * 0.055);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(980, now);

          gain.gain.setValueAtTime(0.0001, now + idx * 0.055);
          gain.gain.exponentialRampToValueAtTime(0.042, now + idx * 0.055 + 0.14);
          gain.gain.exponentialRampToValueAtTime(0.018, now + 2.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.lofiGain!);

          osc.start(now + idx * 0.055);
          osc.stop(now + 3.6);
        });
      }
      this.chordStep++;
    };

    playNextChord();
    this.chordTimer = window.setInterval(playNextChord, 3600);
  }

  setVolumes(next: AudioVolumes): void {
    this.volumes = { ...next };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain?.gain.setTargetAtTime(next.muted ? 0 : 1, now, 0.04);
    this.lofiGain?.gain.setTargetAtTime(next.lofi, now, 0.04);
    this.rainGain?.gain.setTargetAtTime(next.rain, now, 0.04);
    this.cafeGain?.gain.setTargetAtTime(next.cafe, now, 0.04);
    this.bellsGain?.gain.setTargetAtTime(next.bells, now, 0.04);
  }

  playSweetBell(): void {
    this.ensureContext();
    if (!this.ctx || !this.bellsGain || this.volumes.muted) return;
    const now = this.ctx.currentTime;
    const chimeNotes = [587.33, 880.0, 1174.66]; // D5 - A5 - D6 sweet windchime
    chimeNotes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.0001, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 1.4);
      osc.connect(gain);
      gain.connect(this.bellsGain!);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 1.45);
    });
  }

  playSoftPop(): void {
    this.ensureContext();
    if (!this.ctx || !this.bellsGain || this.volumes.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.07);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.bellsGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playCheerSparkle(): void {
    this.ensureContext();
    if (!this.ctx || !this.bellsGain || this.volumes.muted) return;
    const now = this.ctx.currentTime;
    [659.25, 880, 1046.5].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      gain.gain.setValueAtTime(0.07, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.28);
      osc.connect(gain);
      gain.connect(this.bellsGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  playFishingBite(): void {
    this.ensureContext();
    if (!this.ctx || !this.bellsGain || this.volumes.muted) return;
    const now = this.ctx.currentTime;
    [783.99, 1046.5].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.bellsGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.26);
    });
  }

  dispose(): void {
    if (this.chordTimer) window.clearInterval(this.chordTimer);
    if (this.clinkTimer) window.clearInterval(this.clinkTimer);
  }
}

export const lofiAudio = new LofiAudioEngine();
