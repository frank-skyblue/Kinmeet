import React, { useRef, useState, useEffect } from 'react';
import { primaryActionClass, secondaryActionClass, textFieldClass } from '../../constants/ui';
import { CHAT_VOICE_MAX_MS, formatDuration } from '../../utils/chatMedia';
import { useVoiceRecorder, type VoiceRecording } from './useVoiceRecorder';

/** A photo chosen but not sent yet: it goes out, with the text as its caption, on Send. */
export interface StagedImage {
  previewUrl: string;
  name: string;
}

interface ChatComposerProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Sends the staged photo (with the text as caption) if there is one, otherwise the text. */
  onSubmit: (event: React.FormEvent) => void;
  onPickImage: (file: File) => void;
  stagedImage: StagedImage | null;
  onRemoveStagedImage: () => void;
  onVoiceRecorded: (recording: VoiceRecording) => void;
  onError: (message: string) => void;
  isSending: boolean;
  isConnected: boolean;
}

const iconButtonClass =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-kin-sm text-muted transition hover:bg-surface-hover cursor-pointer hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';

const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onPickImage,
  stagedImage,
  onRemoveStagedImage,
  onVoiceRecorded,
  onError,
  isSending,
  isConnected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The browser may not be able to preview some formats (e.g. HEIC outside Safari).
  const [previewFailed, setPreviewFailed] = useState(false);
  const recorder = useVoiceRecorder({
    onAutoStop: (recording) => {
      if (recording) onVoiceRecorded(recording);
    },
    onError,
  });

  const chatInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
      chatInputRef?.current?.focus()
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      setPreviewFailed(false);
      onPickImage(file);
    }
  };

  const handleStopRecording = async () => {
    const recording = await recorder.stop();
    if (recording) {
      onVoiceRecorded(recording);
    } else {
      onError('Voice message is too short');
    }
  };

  const handleStartRecording = async () => {
    await recorder.start();
  };

  if (recorder.state === 'recording') {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-3" role="group" aria-label="Recording voice message">
        <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-red-600" aria-hidden />
        <span className="flex-1 font-inter text-sm text-foreground tabular-nums" aria-live="polite">
          Recording {formatDuration(recorder.elapsedMs)} / {formatDuration(CHAT_VOICE_MAX_MS)}
        </span>
        <button
          type="button"
          onClick={() => void recorder.cancel()}
          className={`${secondaryActionClass} rounded-kin-sm px-4 py-3 font-montserrat cursor-pointer text-sm font-semibold`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleStopRecording()}
          className={`${primaryActionClass} rounded-kin-sm px-4 py-3 font-montserrat cursor-pointer text-sm font-semibold shadow-kin-soft`}
          aria-label="Send voice message"
        >
          Send
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => {
      onSubmit(e)
      chatInputRef?.current?.focus()
    }} className="mx-auto max-w-3xl">
      {stagedImage && (
        <div className="mb-3 flex items-center gap-3 rounded-kin-sm bg-surface-muted p-2" data-testid="chat-staged-photo">
          {previewFailed ? (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-kin-sm bg-surface text-2xl" aria-hidden>
              📷
            </div>
          ) : (
            <img
              src={stagedImage.previewUrl}
              alt={`Selected photo: ${stagedImage.name}`}
              onError={() => setPreviewFailed(true)}
              className="h-16 w-16 shrink-0 rounded-kin-sm object-cover"
            />
          )}
          <p className="min-w-0 flex-1 truncate font-inter text-sm text-foreground">{stagedImage.name}</p>
          <button
            type="button"
            onClick={onRemoveStagedImage}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-muted hover:bg-surface-hover hover:text-foreground"
            aria-label="Remove selected photo"
          >
            &times;
          </button>
        </div>
      )}
      <div className="flex gap-2 md:gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden
          tabIndex={-1}
          data-testid="chat-image-input"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConnected}
          className={iconButtonClass}
          aria-label={stagedImage ? 'Choose a different photo' : 'Choose a photo'}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        {recorder.isSupported && (
          <button
            type="button"
            onClick={() => void handleStartRecording()}
            disabled={!isConnected || !!stagedImage}
            className={iconButtonClass}
            aria-label="Record a voice message"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8m-4-7a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={stagedImage ? 'Add a caption (optional)...' : 'Type a message...'}
          className={`${textFieldClass} min-w-0 flex-1 rounded-kin-sm px-4 py-3 transition`}
          disabled={isSending || !isConnected}
          aria-label={stagedImage ? 'Add a caption' : 'Type a message'}
          ref={chatInputRef}
        />
        <button
          type="submit"
          disabled={isSending || (!value.trim() && !stagedImage) || !isConnected}
          className={`${primaryActionClass} flex items-center rounded-kin-sm px-6 py-3 font-montserrat font-semibold shadow-kin-soft transition hover:shadow-kin-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label="Send message"
        >
          {isSending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary-foreground" />
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
};

export default ChatComposer;
