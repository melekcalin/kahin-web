/**
 * Centralized Audio Manager for the Oracle App
 */

type SoundId = 
  | 'ambient_loop'
  | 'page_transition'
  | 'ui_click'
  | 'piano_D2' | 'piano_G2' | 'piano_Bb2' | 'piano_D3' | 'piano_E3' | 'piano_F3' | 'piano_G3' | 'piano_A3' | 'piano_B3' | 'piano_C4' | 'piano_D4' | 'piano_E4' | 'piano_G4';

const SOUND_URLBASE = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM';
const PIANO_URL = `${SOUND_URLBASE}/acoustic_grand_piano-mp3`;
const CELLO_URL = `${SOUND_URLBASE}/cello-mp3`;

const SOUND_URLS: Record<string, string> = {
  ambient_loop: 'https://docs.google.com/uc?id=115YGarXv4JwcEnFM65LgFR_g5df5i7bF&export=download',
  page_transition: 'https://docs.google.com/uc?id=16FxMXyX3nP30gs1oovdjIMguIj937WPs&export=download',
  ui_click: 'https://docs.google.com/uc?id=1iZAjyGcVMwqvTBZqn-i6ACOAI_-E6SVO&export=download',
  piano_E5: `${PIANO_URL}/E5.mp3`,
  piano_F3: `${PIANO_URL}/F3.mp3`,
  piano_A3: `${PIANO_URL}/A3.mp3`,
  piano_C4: `${PIANO_URL}/C4.mp3`,
  cello_D2: `${CELLO_URL}/D2.mp3`,
};

class AudioService {
  private static instance: AudioService;
  private audios: Map<string, HTMLAudioElement> = new Map();
  private ambientAudio: HTMLAudioElement | null = null;
  private initialized: boolean = false;
  private muted: boolean = false;
  private audioContext: AudioContext | null = null;

  private constructor() {}

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public init() {
    if (this.initialized) return;
    
    Object.entries(SOUND_URLS).forEach(([id, url]) => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
      audio.preload = 'auto';
      audio.load();
      this.audios.set(id, audio);
    });

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.initialized = true;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAll();
    } else if (this.initialized) {
      this.playAmbient();
    }
  }

  public async playAmbient() {
    if (!this.initialized) this.init();
    if (this.muted) return;
    
    if (!this.ambientAudio) {
      this.ambientAudio = this.audios.get('ambient_loop') || null;
      if (this.ambientAudio) {
        this.ambientAudio.loop = true;
        this.ambientAudio.volume = 0.12;
      }
    }

    try {
      await this.ambientAudio?.play();
    } catch (e) {
      console.warn('Ambient playback failed', e);
    }
  }

  public async playEffect(id: string, volume: number = 0.3) {
    if (!this.initialized) this.init();
    if (this.muted) return;

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (id === 'ui_click') {
      this.playOracleTap(volume);
      return;
    }
    
    const audio = this.audios.get(id);
    if (audio) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = volume;
      try {
        await clone.play();
      } catch (e) {
        console.warn(`Effect ${id} playback failed`, e);
      }
    }
  }

  public async playChord(noteIds: string[], volume: number = 0.4) {
    if (!this.initialized) this.init();
    if (this.muted) return;

    noteIds.forEach(id => {
      const audio = this.audios.get(id);
      if (audio) {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = volume;
        clone.play().catch(e => console.warn(`Chord note ${id} failed`, e));
      }
    });
  }

  /**
   * Procedural Sound Generation
   */
  public playOracleTap(volume: number = 0.22) {
    if (!this.initialized || !this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;
    const notes = [880, 1320];

    notes.forEach((frequency, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const delay = index * 0.035;

      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency, now + delay);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + delay + 0.12);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(volume * (index === 0 ? 0.55 : 0.22), now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.18);
    });
  }

  public playSine(frequency: number = 440, duration: number = 1.5, volume: number = 0.3) {
    if (!this.initialized || !this.audioContext || this.muted) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public playWhiteNoise(duration: number = 0.5, volume: number = 0.15) {
    if (!this.initialized || !this.audioContext || this.muted) return;
    
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(this.audioContext.destination);
    
    noise.start();
  }

  public playSubFrequency(frequency: number = 40, duration: number = 2, volume: number = 0.4) {
    if (!this.initialized || !this.audioContext || this.muted) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public stopAll() {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    }
  }

  public cleanup() {
    this.stopAll();
    this.audios.clear();
    this.initialized = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioService = AudioService.getInstance();
