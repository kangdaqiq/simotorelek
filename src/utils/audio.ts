// Web Audio synthesizer for realistic SMK motorcycle workshop sounds (Horn, Flasher, Relay, Fuse Pop, Buzzer, Engine)

class WorkshopAudio {
  private ctx: AudioContext | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  private buzzerOsc: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private starterOsc1: OscillatorNode | null = null;
  private starterOsc2: OscillatorNode | null = null;
  private starterGain: GainNode | null = null;

  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setHorn(active: boolean, intensity = 1) {
    if (!active || this.muted) {
      if (this.hornGain && this.ctx) {
        this.hornGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.hornOsc1 || !this.hornOsc2 || !this.hornGain) {
      this.hornGain = ctx.createGain();
      this.hornGain.gain.value = 0;
      this.hornGain.connect(ctx.destination);

      // Classic dual-harmonic motorcycle disc horn (~420Hz + ~510Hz sawtooth)
      this.hornOsc1 = ctx.createOscillator();
      this.hornOsc1.type = 'sawtooth';
      this.hornOsc1.frequency.value = 415;
      this.hornOsc1.connect(this.hornGain);
      this.hornOsc1.start();

      this.hornOsc2 = ctx.createOscillator();
      this.hornOsc2.type = 'square';
      this.hornOsc2.frequency.value = 505;
      this.hornOsc2.connect(this.hornGain);
      this.hornOsc2.start();
    }

    const vol = Math.min(0.14, Math.max(0.02, intensity * 0.12));
    this.hornGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.015);
  }

  public setBuzzer(active: boolean) {
    if (!active || this.muted) {
      if (this.buzzerGain && this.ctx) {
        this.buzzerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.buzzerOsc || !this.buzzerGain) {
      this.buzzerGain = ctx.createGain();
      this.buzzerGain.gain.value = 0;
      this.buzzerGain.connect(ctx.destination);

      this.buzzerOsc = ctx.createOscillator();
      this.buzzerOsc.type = 'sine';
      this.buzzerOsc.frequency.value = 2450;
      this.buzzerOsc.connect(this.buzzerGain);
      this.buzzerOsc.start();
    }
    this.buzzerGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.01);
  }

  public setEngine(running: boolean, rpm: number) {
    if (!running || rpm <= 0 || this.muted) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.engineOsc || !this.engineGain) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;

      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      filter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);

      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 35;
      this.engineOsc.connect(filter);
      this.engineOsc.start();
    }

    // 4-stroke single cylinder firing frequency = (RPM / 60) / 2
    const freq = Math.max(20, (rpm / 120) * 1.6);
    this.engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.06);
    this.engineGain.gain.setTargetAtTime(0.055, ctx.currentTime, 0.06);
  }

  public setStarterCrank(active: boolean) {
    if (!active || this.muted) {
      if (this.starterGain && this.ctx) {
        this.starterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.starterOsc1 || !this.starterOsc2 || !this.starterGain) {
      this.starterGain = ctx.createGain();
      this.starterGain.gain.value = 0;
      this.starterGain.connect(ctx.destination);

      // Electric starter motor gear whine + cranking pulse
      this.starterOsc1 = ctx.createOscillator();
      this.starterOsc1.type = 'sawtooth';
      this.starterOsc1.frequency.value = 165;
      this.starterOsc1.connect(this.starterGain);
      this.starterOsc1.start();

      this.starterOsc2 = ctx.createOscillator();
      this.starterOsc2.type = 'triangle';
      this.starterOsc2.frequency.value = 390;
      this.starterOsc2.connect(this.starterGain);
      this.starterOsc2.start();
    }
    const mod = 155 + Math.sin(ctx.currentTime * 22) * 28;
    this.starterOsc1.frequency.setTargetAtTime(mod, ctx.currentTime, 0.02);
    this.starterGain.gain.setTargetAtTime(0.09, ctx.currentTime, 0.02);
  }

  public playSparkSnap() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(3400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.012);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.014);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  }

  public playTick(high = true) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(high ? 1350 : 950, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  public playRelayClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  }

  public playShortSpark() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * 0.16;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    noise.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playWrenchSwap() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playWarningPenalty() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.25);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playSuccessFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }
}

export const workshopAudio = new WorkshopAudio();
