import { describe, it, expect, vi, afterEach } from 'vitest';
import { describeMessagePreview, formatDuration, pickRecorderMimeType } from '../chatMedia';
import type { ChatMessage } from '../../types';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  _id: 'm1',
  sender: { _id: 'a', firstName: 'Alice', lastName: 'A' },
  receiver: { _id: 'b', firstName: 'Bob', lastName: 'B' },
  read: false,
  createdAt: '2026-10-11T09:00:00Z',
  ...overrides,
});

describe('formatDuration', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(12_400)).toBe('0:12');
    expect(formatDuration(120_000)).toBe('2:00');
  });
});

describe('describeMessagePreview', () => {
  it('handles an empty conversation', () => {
    expect(describeMessagePreview(null)).toBe('No messages yet');
  });

  it('shortens long text', () => {
    expect(describeMessagePreview(message({ content: 'x'.repeat(80) }))).toBe(`${'x'.repeat(56)}…`);
  });

  it('treats messages without a type as text', () => {
    expect(describeMessagePreview(message({ content: 'Hi' }))).toBe('Hi');
  });

  it('labels photos, with the caption when there is one', () => {
    expect(describeMessagePreview(message({ type: 'image' }))).toBe('📷 Photo');
    expect(describeMessagePreview(message({ type: 'image', content: 'Sunset' }))).toBe('📷 Sunset');
  });

  it('labels voice messages with their length', () => {
    expect(describeMessagePreview(message({ type: 'voice', attachment: { durationMs: 12_400 } })))
      .toBe('🎤 Voice message · 0:12');
    expect(describeMessagePreview(message({ type: 'voice' }))).toBe('🎤 Voice message');
  });
});

describe('pickRecorderMimeType', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns undefined when MediaRecorder is unavailable', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(pickRecorderMimeType()).toBeUndefined();
  });

  it('prefers Opus in WebM', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    expect(pickRecorderMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('falls back to MP4 where only that is supported (Safari)', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (type: string) => type === 'audio/mp4' });
    expect(pickRecorderMimeType()).toBe('audio/mp4');
  });
});
