import { Capacitor, registerPlugin } from '@capacitor/core';

export interface VoiceStatus {
  platform: string;
  sttAvailable: boolean;
  ttsAvailable: boolean;
  message?: string;
}

export interface ListenRequest {
  language?: string;
  prompt?: string;
  offlinePreferred?: boolean;
}

export interface ListenResponse {
  text: string;
  confidence?: number;
}

export interface SpeakRequest {
  text: string;
  language?: string;
  rate?: number;
  pitch?: number;
}

export interface VoiceIOPlugin {
  getStatus(): Promise<VoiceStatus>;
  startListening(request?: ListenRequest): Promise<ListenResponse>;
  speak(request: SpeakRequest): Promise<void>;
  stopSpeaking(): Promise<void>;
}

const NativeVoiceIO = registerPlugin<VoiceIOPlugin>('VoiceIO');

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>>;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const webFallback: VoiceIOPlugin = {
  async getStatus() {
    const speechWindow = window as WindowWithSpeech;

    return {
      platform: 'web',
      sttAvailable: Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition),
      ttsAvailable: 'speechSynthesis' in window,
      message: 'Browser preview uses Web Speech APIs when available. Android uses native SpeechRecognizer and TextToSpeech.',
    };
  },
  async startListening(request = {}) {
    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      throw new Error('Speech recognition is not available in this browser preview.');
    }

    return new Promise<ListenResponse>((resolve, reject) => {
      const recognition = new Recognition();
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        finish(() => reject(new Error('No speech was heard. Try again or type the emergency.')));
      }, 12_000);

      function finish(callback: () => void) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        try {
          recognition.stop();
        } catch {
          // Some browsers throw if stop is called after recognition already ended.
        }
        callback();
      }

      recognition.lang = request.language ?? 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const match = event.results[0]?.[0];
        finish(() => resolve({
          text: match?.transcript?.trim() ?? '',
          confidence: match?.confidence,
        }));
      };
      recognition.onerror = (event) => {
        finish(() => reject(new Error(webSpeechErrorMessage(event.error))));
      };
      recognition.onend = () => {
        finish(() => reject(new Error('No speech was heard. Try again or type the emergency.')));
      };
      recognition.start();
    });
  },
  async speak(request) {
    if (!('speechSynthesis' in window)) {
      throw new Error('Text to speech is not available in this browser preview.');
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(request.text);
    utterance.lang = request.language ?? 'en-US';
    utterance.rate = request.rate ?? 0.96;
    utterance.pitch = request.pitch ?? 1;
    window.speechSynthesis.speak(utterance);
  },
  async stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },
};

function webSpeechErrorMessage(error?: string) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission is blocked in this browser. Allow mic access or type the emergency.';
    case 'no-speech':
      return 'No speech was heard. Try again or type the emergency.';
    case 'audio-capture':
      return 'No microphone was found. Type the emergency or check your mic.';
    case 'network':
      return 'Browser speech recognition needs network access here. The Android app uses offline-first STT.';
    default:
      return 'Speech recognition failed. Try again or type the emergency.';
  }
}

export const VoiceIO = Capacitor.getPlatform() === 'web' ? webFallback : NativeVoiceIO;
