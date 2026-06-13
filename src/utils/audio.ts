// Cozy Virtual Library Soundscape Synthesizer
// Generates Rain, Fireplace Crackles, and Lofi Ambient Chords natively using Web Audio API

class CozyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Rain nodes
  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private rainLfo: OscillatorNode | null = null;

  // Fireplace nodes
  private fireRumbleSource: AudioBufferSourceNode | null = null;
  private fireRumbleFilter: BiquadFilterNode | null = null;
  private fireGain: GainNode | null = null;
  private fireCrackleTimeout: any = null;

  // Lofi Music nodes
  private musicGain: GainNode | null = null;
  private musicTimer: any = null;
  private activeOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private currentChordIndex = 0;

  // Volume parameters (0 to 1)
  private volumes = {
    rain: 0.4,
    fire: 0.3,
    music: 0.25,
  };

  // Play states
  private states = {
    rain: false,
    fire: false,
    music: false,
  };

  constructor() {
    // Audio Context is initialized on first user interaction
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);
  }

  // Helper: Pink Noise Generator Buffer (Kellet filter approximation)
  private createPinkNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("AudioContext not initialized");
    
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds loop
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // normalise volume
      b6 = white * 0.115926;
    }
    
    return buffer;
  }

  // --- Rain Controls ---
  public toggleRain(play: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.states.rain = play;

    if (play) {
      if (this.rainSource) return;

      // Resume context if suspended (browser security)
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = this.volumes.rain;

      this.rainFilter = this.ctx.createBiquadFilter();
      this.rainFilter.type = 'lowpass';
      this.rainFilter.frequency.value = 900; // soft dampening

      const buffer = this.createPinkNoiseBuffer();
      this.rainSource = this.ctx.createBufferSource();
      this.rainSource.buffer = buffer;
      this.rainSource.loop = true;

      // Connect
      this.rainSource.connect(this.rainFilter);
      this.rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);

      this.rainSource.start();

      // Create an LFO to modulate volume slightly (rain swells)
      this.rainLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      
      this.rainLfo.frequency.value = 0.04; // very slow, 25 sec cycle
      lfoGain.gain.value = 0.12; // +/- 12% swell
      
      this.rainLfo.connect(lfoGain);
      if (this.rainGain) {
        lfoGain.connect(this.rainGain.gain);
      }
      this.rainLfo.start();
    } else {
      if (this.rainSource) {
        try {
          this.rainSource.stop();
        } catch (e) {}
        this.rainSource.disconnect();
        this.rainSource = null;
      }
      if (this.rainLfo) {
        try {
          this.rainLfo.stop();
        } catch (e) {}
        this.rainLfo.disconnect();
        this.rainLfo = null;
      }
      if (this.rainGain) {
        this.rainGain.disconnect();
        this.rainGain = null;
      }
      this.rainFilter = null;
    }
  }

  // --- Fireplace Controls ---
  private triggerFireCrackle = () => {
    if (!this.states.fire || !this.ctx || !this.fireGain) return;

    // Schedule crackles at randomized times
    this.playCracklePop();
    const delay = 120 + Math.random() * 1200;
    this.fireCrackleTimeout = setTimeout(this.triggerFireCrackle, delay);
  };

  private playCracklePop() {
    if (!this.ctx || !this.fireGain) return;

    const sampleRate = this.ctx.sampleRate;
    // Tiny crackle pop sound duration (5ms - 25ms)
    const duration = 0.005 + Math.random() * 0.02;
    const bufferSize = Math.floor(sampleRate * duration);
    const popBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const output = popBuffer.getChannelData(0);

    // Exponentially decaying noise pop
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-8 * (i / bufferSize));
    }

    const popSource = this.ctx.createBufferSource();
    popSource.buffer = popBuffer;

    // Bandpass filter centered at dry wood snap range
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600 + Math.random() * 2200;
    filter.Q.value = 4.5;

    const popGain = this.ctx.createGain();
    // randomize crackle volumes
    popGain.gain.value = (0.04 + Math.random() * 0.16) * this.volumes.fire;

    popSource.connect(filter);
    filter.connect(popGain);
    popGain.connect(this.fireGain);

    popSource.start();
  }

  public toggleFire(play: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.states.fire = play;

    if (play) {
      if (this.fireRumbleSource) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.fireGain = this.ctx.createGain();
      this.fireGain.gain.value = 1.0; // individual pop/rumble gain controls below
      this.fireGain.connect(this.masterGain);

      // Low hearth rumble
      this.fireRumbleFilter = this.ctx.createBiquadFilter();
      this.fireRumbleFilter.type = 'lowpass';
      this.fireRumbleFilter.frequency.value = 140; // deep bass rumble

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.value = this.volumes.fire * 0.55;

      const rumbleBuffer = this.createPinkNoiseBuffer();
      this.fireRumbleSource = this.ctx.createBufferSource();
      this.fireRumbleSource.buffer = rumbleBuffer;
      this.fireRumbleSource.loop = true;

      // Connect rumble
      this.fireRumbleSource.connect(this.fireRumbleFilter);
      this.fireRumbleFilter.connect(rumbleGain);
      rumbleGain.connect(this.fireGain);

      this.fireRumbleSource.start();

      // Start recursive crackling pop scheduling
      this.triggerFireCrackle();
    } else {
      if (this.fireCrackleTimeout) {
        clearTimeout(this.fireCrackleTimeout);
        this.fireCrackleTimeout = null;
      }
      if (this.fireRumbleSource) {
        try {
          this.fireRumbleSource.stop();
        } catch (e) {}
        this.fireRumbleSource.disconnect();
        this.fireRumbleSource = null;
      }
      if (this.fireGain) {
        this.fireGain.disconnect();
        this.fireGain = null;
      }
      this.fireRumbleFilter = null;
    }
  }

  // --- Lofi Ambient Music Controls ---
  private chords = [
    [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9 (warm, open)
    [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9 (soft, cozy)
    [110.00, 146.83, 196.00, 246.94, 293.66], // Am9 (mellow)
    [98.00, 146.83, 174.61, 220.00, 293.66]   // G9/11 (suspending)
  ];

  private startMusicLoop = () => {
    if (!this.states.music || !this.ctx || !this.musicGain) return;

    this.playCozyChord(this.chords[this.currentChordIndex]);
    
    // Cycle chords every 6.5 seconds
    this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
    this.musicTimer = setTimeout(this.startMusicLoop, 6500);
  };

  private playCozyChord(frequencies: number[]) {
    if (!this.ctx || !this.musicGain) return;

    const now = this.ctx.currentTime;
    const fadeDuration = 3.0; // 3 seconds fade-in, 3 seconds fade-out
    const chordDuration = 6.2;

    // Clear old notes first
    this.stopActiveOscillators();

    frequencies.forEach((freq) => {
      if (!this.ctx || !this.musicGain) return;

      const osc = this.ctx.createOscillator();
      // Triangle waves sound like a warm, retro rhodes piano when filtered
      osc.type = 'triangle';
      
      // detuning slightly for rich analog lofi chorus effect
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() * 10 - 5);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      // Low filter frequency cut makes it sound very warm and underwater
      filter.frequency.value = 320 + Math.random() * 40;

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0, now);
      // Soft fade in
      voiceGain.gain.linearRampToValueAtTime(this.volumes.music * 0.18, now + fadeDuration);
      // Soft fade out
      voiceGain.gain.setValueAtTime(this.volumes.music * 0.18, now + chordDuration - fadeDuration);
      voiceGain.gain.linearRampToValueAtTime(0, now + chordDuration);

      // Connect
      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + chordDuration);

      this.activeOscs.push({ osc, gain: voiceGain });
    });
  }

  private stopActiveOscillators() {
    this.activeOscs.forEach(({ osc, gain }) => {
      try {
        osc.stop();
      } catch (e) {}
      osc.disconnect();
      gain.disconnect();
    });
    this.activeOscs = [];
  }

  public toggleMusic(play: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.states.music = play;

    if (play) {
      if (this.musicTimer) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1.0;
      this.musicGain.connect(this.masterGain);

      this.currentChordIndex = 0;
      this.startMusicLoop();
    } else {
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
      this.stopActiveOscillators();
      if (this.musicGain) {
        this.musicGain.disconnect();
        this.musicGain = null;
      }
    }
  }

  // --- Volume adjusters ---
  public setVolume(type: 'rain' | 'fire' | 'music', volume: number) {
    this.volumes[type] = Math.max(0, Math.min(1, volume));

    if (type === 'rain' && this.rainGain) {
      this.rainGain.gain.value = this.volumes.rain;
    }
    // Fire and music volumes apply during synthesis runtime
  }

  public getVolumes() {
    return { ...this.volumes };
  }

  public getStates() {
    return { ...this.states };
  }

  public stopAll() {
    this.toggleRain(false);
    this.toggleFire(false);
    this.toggleMusic(false);
  }
}

export const CozyAudio = new CozyAudioEngine();
