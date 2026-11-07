import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVoiceRecorder } from '../useVoiceRecorder';

class FakeMediaRecorder {
  static isTypeSupported = (type: string) => type === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stream: { getTracks: () => { stop: () => void }[] };

  constructor(stream: { getTracks: () => { stop: () => void }[] }, options: { mimeType: string }) {
    this.stream = stream;
    this.mimeType = options.mimeType;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const stopTrack = vi.fn();
const getUserMedia = vi.fn();

describe('useVoiceRecorder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopTrack.mockClear();
    getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const onAutoStop = vi.fn();
    const onError = vi.fn();
    const hook = renderHook(() => useVoiceRecorder({ onAutoStop, onError }));
    return { ...hook, onAutoStop, onError };
  };

  it('records and returns the audio with its duration, then releases the microphone', async () => {
    const { result } = setup();

    await act(() => result.current.start());
    expect(result.current.state).toBe('recording');

    await act(() => vi.advanceTimersByTimeAsync(3000));
    let recording: Awaited<ReturnType<typeof result.current.stop>> = null;
    await act(async () => {
      recording = await result.current.stop();
    });

    expect(recording).toMatchObject({ mimeType: 'audio/webm;codecs=opus' });
    expect(recording!.durationMs).toBeGreaterThanOrEqual(3000);
    expect(result.current.state).toBe('idle');
    expect(stopTrack).toHaveBeenCalled();
  });

  it('discards recordings shorter than a second', async () => {
    const { result } = setup();

    await act(() => result.current.start());
    let recording: Awaited<ReturnType<typeof result.current.stop>> = null;
    await act(async () => {
      recording = await result.current.stop();
    });

    expect(recording).toBeNull();
  });

  it('discards a cancelled recording', async () => {
    const { result } = setup();

    await act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(5000));
    let recording: Awaited<ReturnType<typeof result.current.cancel>> = null;
    await act(async () => {
      recording = await result.current.cancel();
    });

    expect(recording).toBeNull();
    expect(stopTrack).toHaveBeenCalled();
  });

  it('stops by itself at two minutes', async () => {
    const { result, onAutoStop } = setup();

    await act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(2 * 60 * 1000 + 400));

    expect(onAutoStop).toHaveBeenCalledWith(expect.objectContaining({ blob: expect.any(Blob) }));
    expect(result.current.state).toBe('idle');
  });

  it('reports when microphone access is denied', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { result, onError } = setup();

    await act(() => result.current.start());

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/microphone access was denied/i));
    expect(result.current.state).toBe('idle');
  });
});
