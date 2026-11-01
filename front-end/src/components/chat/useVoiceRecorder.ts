import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_VOICE_MAX_MS, CHAT_VOICE_MIN_MS, pickRecorderMimeType } from '../../utils/chatMedia';

export interface VoiceRecording {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

type RecorderState = 'idle' | 'recording';

interface VoiceRecorderCallbacks {
  /** Called with the result when recording stops at CHAT_VOICE_MAX_MS. */
  onAutoStop: (recording: VoiceRecording | null) => void;
  onError: (message: string) => void;
}

/**
 * Records one voice message with MediaRecorder. Recordings shorter than CHAT_VOICE_MIN_MS are
 * discarded (resolved as null).
 */
export const useVoiceRecorder = (callbacks: VoiceRecorderCallbacks) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<((recording: VoiceRecording | null) => void) | null>(null);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const isSupported = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && pickRecorderMimeType() !== undefined;

  const releaseResources = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    setState('idle');
    setElapsedMs(0);
  }, []);

  /** Stops recording and resolves with the result, or null if discarded. */
  const finish = useCallback((keep: boolean) => new Promise<VoiceRecording | null>((resolve) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resolve(null);
      return;
    }
    const durationMs = Date.now() - startedAtRef.current;
    finishRef.current = resolve;
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      releaseResources();
      finishRef.current?.(keep && durationMs >= CHAT_VOICE_MIN_MS ? { blob, durationMs, mimeType } : null);
      finishRef.current = null;
    };
    recorder.stop();
  }), [releaseResources]);

  const start = useCallback(async () => {
    const mimeType = pickRecorderMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      callbacksRef.current.onError('Voice messages are not supported in this browser');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      callbacksRef.current.onError('Microphone access was denied. Allow it in your browser settings to record.');
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start();
    setState('recording');
    setElapsedMs(0);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= CHAT_VOICE_MAX_MS) {
        void finish(true).then((recording) => callbacksRef.current.onAutoStop(recording));
      }
    }, 200);
  }, [finish]);

  const stop = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => finish(false), [finish]);

  // Release the microphone if the component goes away mid-recording.
  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    releaseResources();
  }, [releaseResources]);

  return { state, elapsedMs, isSupported, start, stop, cancel };
};
