import {
  calculateRms,
  normalizeMouthOpen,
  smoothMouthOpen,
} from './mic-mouth';

export interface MicReactiveMouthOptions {
  fftSize: number;
  threshold: number;
  sensitivity: number;
  attack: number;
  release: number;
}

export interface MicReactiveMouthFrame {
  rms: number;
  mouthOpen: number;
}

export class MicReactiveMouth {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private samples: Float32Array<ArrayBuffer> | null = null;
  private mouthOpen = 0;

  public constructor(private readonly options: MicReactiveMouthOptions) {}

  public async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is not available in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.options.fftSize;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.samples = new Float32Array(this.analyser.fftSize);
  }

  public stop(): void {
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.samples = null;
    this.mouthOpen = 0;
  }

  public sample(): MicReactiveMouthFrame {
    if (!this.analyser || !this.samples) {
      return {
        rms: 0,
        mouthOpen: 0,
      };
    }

    this.analyser.getFloatTimeDomainData(this.samples);

    const rms = calculateRms(this.samples);
    const normalized = normalizeMouthOpen(rms, {
      threshold: this.options.threshold,
      sensitivity: this.options.sensitivity,
    });
    this.mouthOpen = smoothMouthOpen(this.mouthOpen, normalized, {
      attack: this.options.attack,
      release: this.options.release,
    });

    return {
      rms,
      mouthOpen: this.mouthOpen,
    };
  }
}
