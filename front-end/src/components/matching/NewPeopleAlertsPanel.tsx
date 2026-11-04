import React, { useEffect, useRef, useState } from 'react';
import ToggleSwitch from '../common/ToggleSwitch';
import { NEW_PEOPLE_ALERT_MESSAGES, type SaveResult } from '../../hooks/useNewPeopleAlerts';
import type { AlertChannel, ChannelPreferences } from '../../types';

interface NewPeopleAlertsPanelProps {
  preferences: ChannelPreferences;
  saving: Record<AlertChannel, boolean>;
  isLoading: boolean;
  loadError: string;
  onReload: () => void;
  onSetChannel: (channel: AlertChannel, enabled: boolean) => Promise<SaveResult>;
  /** Closes the panel. Saved changes stay saved. */
  onClose: () => void;
}

type Status =
  | { kind: 'saved' }
  | { kind: 'error'; message: string; retry?: () => void };

const CHANNELS: { channel: AlertChannel; title: string; description: string; icon: React.ReactNode }[] = [
  {
    channel: 'email',
    title: 'Email Notifications',
    description: 'Receive an alert in your inbox.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6.5 8.5 6.5 8.5-6.5" />
      </svg>
    ),
  },
  {
    channel: 'push',
    title: 'Push Notifications',
    description: 'Receive an alert on your device.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path strokeLinecap="round" d="M11.5 18h1" />
      </svg>
    ),
  },
];

/** Manage alerts: email and push toggles for "new people nearby", saved as soon as they change. */
const NewPeopleAlertsPanel: React.FC<NewPeopleAlertsPanelProps> = ({
  preferences,
  saving,
  isLoading,
  loadError,
  onReload,
  onSetChannel,
  onClose,
}) => {
  const [status, setStatus] = useState<Status | null>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const change = async (channel: AlertChannel, enabled: boolean) => {
    setStatus(null);
    const result = await onSetChannel(channel, enabled);
    if (result.ok) {
      setStatus({ kind: 'saved' });
    } else {
      setStatus({
        kind: 'error',
        message: result.message,
        retry: result.retryable ? () => void change(channel, enabled) : undefined,
      });
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/20 p-3 md:p-6 overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-people-alerts-title"
        className="w-full max-w-md rounded-kin-xl border border-border bg-surface shadow-kin-strong p-5 md:p-7 font-inter"
      >
        <div className="flex items-center gap-4">
          <button
            ref={backButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Back to Discover"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-kin-lg border border-border text-foreground hover:bg-surface-hover transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6-6-6 6 6 6" />
            </svg>
          </button>
          <h2 id="new-people-alerts-title" className="text-xl md:text-2xl font-bold font-montserrat text-foreground">
            Manage alerts
          </h2>
        </div>

        <p className="mt-5 text-muted">Know when someone from your home country joins near you.</p>

        {loadError ? (
          <div role="alert" className="mt-5 border-t border-border pt-5 text-sm text-foreground">
            {loadError}{' '}
            <button type="button" onClick={onReload} className="font-semibold text-primary underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-border border-t border-border">
            {CHANNELS.map(({ channel, title, description, icon }) => (
              <li key={channel} className="flex items-center gap-4 py-5">
                <span className="text-muted">{icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{title}</span>
                  <span id={`alert-${channel}-description`} className="block text-sm text-muted">
                    {description}
                  </span>
                </span>
                <ToggleSwitch
                  checked={preferences[channel]}
                  onChange={(enabled) => void change(channel, enabled)}
                  label={title}
                  describedBy={`alert-${channel}-description`}
                  disabled={isLoading || saving[channel]}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-sm text-muted">
          Changes save automatically. Turn both off to stop new people nearby alerts.
        </p>

        <div role="status" aria-live="polite" className="mt-4 min-h-5 text-sm">
          {status?.kind === 'saved' && <span className="text-muted">{NEW_PEOPLE_ALERT_MESSAGES.saved}</span>}
        </div>
        {status?.kind === 'error' && (
          <div role="alert" className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-3 py-2 rounded-kin text-sm">
            {status.message}{' '}
            {status.retry && (
              <button
                type="button"
                onClick={status.retry}
                className="font-semibold underline cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default NewPeopleAlertsPanel;
