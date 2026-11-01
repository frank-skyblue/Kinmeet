import React, { useEffect } from 'react';

interface ChatImageViewerProps {
  src: string;
  onClose: () => void;
}

/** Full-screen view of a chat image, shown whole (not cropped). Closes on Escape or backdrop click. */
const ChatImageViewer: React.FC<ChatImageViewerProps> = ({ src, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-surface px-3 py-1 text-2xl text-foreground hover:bg-surface-hover cursor-pointer"
        aria-label="Close photo"
      >
        &times;
      </button>
      <img
        src={src}
        alt="Shared in chat"
        className="max-h-full max-w-full rounded-kin object-contain shadow-kin-strong"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
};

export default ChatImageViewer;
