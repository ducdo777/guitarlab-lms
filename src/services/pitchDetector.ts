// Microphone Pitch Detection using Autocorrelation Algorithm

export interface TunerResult {
  note: string;
  octave: number;
  frequency: number;
  cents: number;
  inTune: boolean;
  clarity: number;
}

export class PitchDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private isListening: boolean = false;
  private animFrameId: number | null = null;

  private notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  public async start(onPitchUpdate: (result: TunerResult | null) => void): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      this.isListening = true;
      this.detectPitch(onPitchUpdate);
      return true;
    } catch (err) {
      console.error('Error accessing microphone for pitch detection:', err);
      return false;
    }
  }

  public stop() {
    this.isListening = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
  }

  private detectPitch(onPitchUpdate: (result: TunerResult | null) => void) {
    if (!this.isListening || !this.analyser || !this.audioCtx) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    const freq = this.autoCorrelate(buffer, this.audioCtx.sampleRate);

    if (freq !== -1) {
      const result = this.getNoteFromPitch(freq);
      onPitchUpdate(result);
    } else {
      onPitchUpdate(null);
    }

    this.animFrameId = requestAnimationFrame(() => this.detectPitch(onPitchUpdate));
  }

  // Autocorrelation Pitch Detection Algorithm
  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    let SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // Minimum signal volume threshold
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buffer[j] * buffer[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Parabolic interpolation for fine tuning frequency accuracy
    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  private getNoteFromPitch(frequency: number): TunerResult {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const midiNote = Math.round(noteNum) + 69;

    const noteIndex = (midiNote % 12 + 12) % 12;
    const noteName = this.notes[noteIndex];
    const octave = Math.floor(midiNote / 12) - 1;

    // Calculate standard frequency for this MIDI note
    const standardFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
    // Cents deviation = 1200 * log2(freq / standardFreq)
    const cents = Math.round(1200 * (Math.log(frequency / standardFreq) / Math.log(2)));

    const inTune = Math.abs(cents) <= 5;

    return {
      note: noteName,
      octave,
      frequency: Math.round(frequency * 10) / 10,
      cents,
      inTune,
      clarity: 100 - Math.min(Math.abs(cents), 50) * 2,
    };
  }
}
