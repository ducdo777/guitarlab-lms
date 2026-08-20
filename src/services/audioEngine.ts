// Web Audio API Polyphonic Synthesizer & Sound Engine for HarmonyLab

export type InstrumentType = 'piano' | 'epiano' | 'synth' | 'guitar';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private activeVoices: Map<string, { stop: () => void }> = new Map();

  public instrument: InstrumentType = 'piano';
  public volume: number = 0.8;
  public sustain: boolean = false;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Destination node for audio recording
      this.mediaStreamDestination = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.mediaStreamDestination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStreamDestination ? this.mediaStreamDestination.stream : null;
  }

  public setVolume(val: number) {
    this.volume = val;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  // Calculate frequency for note name (e.g. "C4", "F#3")
  public noteToFreq(note: string): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octaveStr = note.match(/\d+/)?.[0] || '4';
    const noteName = note.replace(/\d+/, '');
    const octave = parseInt(octaveStr, 10);
    const semitone = notes.indexOf(noteName);

    if (semitone === -1) return 440;
    // A4 is 440 Hz (index 9 in octave 4)
    const distance = (octave - 4) * 12 + (semitone - 9);
    return 440 * Math.pow(2, distance / 12);
  }

  // Play Note Synth
  public playNote(note: string, duration?: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const freq = this.noteToFreq(note);
    const now = this.ctx.currentTime;

    // Stop existing voice if playing
    if (this.activeVoices.has(note)) {
      this.activeVoices.get(note)?.stop();
      this.activeVoices.delete(note);
    }

    const noteGain = this.ctx.createGain();
    noteGain.connect(this.masterGain);

    let stopFunc = () => {};

    if (this.instrument === 'piano') {
      // Grand Piano Synth: Triangle + Sine with quick attack & exponential decay
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now); // 1st harmonic

      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.value = 0.3;
      osc2.connect(osc2Gain);
      osc2Gain.connect(noteGain);
      osc1.connect(noteGain);

      // ADSR Envelope
      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.8, now + 0.015); // Attack
      noteGain.gain.exponentialRampToValueAtTime(0.4, now + 0.2); // Decay

      osc1.start(now);
      osc2.start(now);

      stopFunc = () => {
        if (!this.ctx) return;
        const stopTime = this.ctx.currentTime;
        const relTime = this.sustain ? 1.2 : 0.25;
        noteGain.gain.cancelScheduledValues(stopTime);
        noteGain.gain.setValueAtTime(noteGain.gain.value, stopTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + relTime);
        setTimeout(() => {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        }, relTime * 1000 + 50);
      };

    } else if (this.instrument === 'epiano') {
      // Electric Piano / Rhodes: FM Synthesis
      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();

      carrier.type = 'sine';
      modulator.type = 'sine';

      carrier.frequency.setValueAtTime(freq, now);
      modulator.frequency.setValueAtTime(freq * 7, now); // Metallic tine ratio

      modGain.gain.setValueAtTime(freq * 2, now);
      modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(noteGain);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.7, now + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.2, now + 0.4);

      carrier.start(now);
      modulator.start(now);

      stopFunc = () => {
        if (!this.ctx) return;
        const stopTime = this.ctx.currentTime;
        noteGain.gain.cancelScheduledValues(stopTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.3);
        setTimeout(() => {
          carrier.stop();
          modulator.stop();
        }, 350);
      };

    } else if (this.instrument === 'guitar') {
      // Plucked String Synthesis
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.3);

      osc.connect(filter);
      filter.connect(noteGain);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.9, now + 0.005);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.start(now);

      stopFunc = () => {
        if (!this.ctx) return;
        const stopTime = this.ctx.currentTime;
        noteGain.gain.cancelScheduledValues(stopTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.15);
        setTimeout(() => osc.stop(), 200);
      };

    } else {
      // Synth Lead: Sawtooth + Filter Sweep
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.Q.value = 4;
      filter.frequency.setValueAtTime(2000, now);

      osc.connect(filter);
      filter.connect(noteGain);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.6, now + 0.02);

      osc.start(now);

      stopFunc = () => {
        if (!this.ctx) return;
        const stopTime = this.ctx.currentTime;
        noteGain.gain.cancelScheduledValues(stopTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.2);
        setTimeout(() => osc.stop(), 250);
      };
    }

    if (duration) {
      setTimeout(() => stopFunc(), duration * 1000);
    } else {
      this.activeVoices.set(note, { stop: stopFunc });
    }
  }

  public stopNote(note: string) {
    if (this.activeVoices.has(note)) {
      this.activeVoices.get(note)?.stop();
      this.activeVoices.delete(note);
    }
  }

  // Drum Synthesizer for Beat Sequencer
  public playDrum(type: 'kick' | 'snare' | 'hihat' | 'clap' | 'perc') {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'snare') {
      // Tone + White Noise
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

      const noiseBuffer = this.createNoiseBuffer();
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      noise.connect(filter);
      filter.connect(gain);
      osc.connect(gain);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.18);
      noise.stop(now + 0.18);
    } else if (type === 'hihat') {
      const noiseBuffer = this.createNoiseBuffer();
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      noise.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.start(now);
      noise.stop(now + 0.05);
    } else if (type === 'clap') {
      const noiseBuffer = this.createNoiseBuffer();
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      noise.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.start(now);
      noise.stop(now + 0.2);
    } else if (type === 'perc') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  // Helper for generating white noise for percussive instruments
  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No AudioContext');
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Metronome Click sound
  public playClick(accent: boolean = false) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1200 : 800, now);

    gain.gain.setValueAtTime(accent ? 0.9 : 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }
}

export const audioEngine = new AudioEngine();
