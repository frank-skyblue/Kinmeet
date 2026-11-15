import React, { useCallback, useRef, useState } from 'react';
import { useNewPeopleAlerts } from '../../hooks/useNewPeopleAlerts';
import { primaryActionClass } from '../../constants/ui';
import type { DiscoverEmptyState as EmptyStateKind } from '../../types';
import NewPeopleAlertsPanel from './NewPeopleAlertsPanel';

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const;

const GlobeIcon = () => (
  <svg className="h-7 w-7" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
  </svg>
);

const SproutIcon = () => (
  <svg className="h-6 w-6" {...iconProps}>
    <path d="M12 20v-8M12 12c0-3 2-5 5.5-5 0 3-2 5-5.5 5ZM12 14c0-2.5-1.8-4.2-5-4.2 0 2.5 1.8 4.2 5 4.2ZM8 20h8" />
  </svg>
);

const CompassIcon = () => (
  <svg className="h-7 w-7" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-6 w-6" {...iconProps}>
    <path d="m6 12.5 4 4 8-9" />
  </svg>
);

const BellIcon = () => (
  <svg className="h-5 w-5" {...iconProps}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />
  </svg>
);

const CONTENT: Record<EmptyStateKind, { title: string; message: string; icon: React.ReactNode; badge: React.ReactNode }> = {
  community_growing: {
    title: 'Your community is still growing',
    message:
      'Your community is still growing. Get notified when someone from your home country joins near you.',
    icon: <GlobeIcon />,
    badge: <SproutIcon />,
  },
  all_caught_up: {
    title: 'You’re all caught up',
    message: 'Get notified when new people from your home country join.',
    icon: <CompassIcon />,
    badge: <CheckIcon />,
  },
};

interface DiscoverEmptyStateProps {
  kind: EmptyStateKind;
}

/** What Discover shows when there is no one left to show, with the way to turn on alerts. */
const DiscoverEmptyState: React.FC<DiscoverEmptyStateProps> = ({ kind }) => {
  const alerts = useNewPeopleAlerts();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const { title, message, icon, badge } = CONTENT[kind];
  const { email, push } = alerts.preferences;
  const hasAlerts = email || push;

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    openButtonRef.current?.focus();
  }, []);

  return (
    <div className="h-full bg-canvas px-3 py-3 md:px-6 md:py-5 overflow-y-auto">
      <section
        aria-labelledby="discover-empty-title"
        className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col rounded-kin-xl border border-border bg-surface shadow-kin-soft"
      >
        <h1 className="px-6 pt-6 md:px-8 md:pt-7 text-xl md:text-2xl font-bold font-montserrat text-foreground">
          Discover
        </h1>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-6 text-center">
          <div className="relative h-36 w-44" aria-hidden>
            <span className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-primary/40" />
            <span className="absolute left-1/2 top-0 flex h-32 w-32 -translate-x-1/2 items-center justify-center rounded-full bg-primary/15 text-primary">
              {icon}
            </span>
            <span className="absolute bottom-0 right-2 flex h-12 w-12 -rotate-6 items-center justify-center rounded-kin-lg border border-border bg-surface text-primary shadow-kin-soft">
              {badge}
            </span>
          </div>

          <h2
            id="discover-empty-title"
            className="mt-6 text-2xl md:text-3xl font-bold font-montserrat text-foreground"
          >
            {title}
          </h2>
          <p className="mt-3 max-w-md text-muted font-inter leading-relaxed">{message}</p>

          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setIsPanelOpen(true)}
            aria-haspopup="dialog"
            className={`${primaryActionClass} mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-kin-lg font-semibold font-montserrat shadow-kin-soft hover:shadow-kin-medium cursor-pointer transition`}
          >
            <BellIcon />
            {hasAlerts ? 'Manage alerts' : 'Notify me'}
          </button>
          {hasAlerts && (
            <p className="mt-3 text-sm text-muted font-inter">
              Email {email ? 'on' : 'off'} · Push {push ? 'on' : 'off'}
            </p>
          )}
        </div>

        {isPanelOpen && (
          <NewPeopleAlertsPanel
            preferences={alerts.preferences}
            saving={alerts.saving}
            isLoading={alerts.isLoading}
            loadError={alerts.loadError}
            onReload={() => void alerts.reload()}
            onSetChannel={alerts.setChannel}
            onClose={closePanel}
          />
        )}
      </section>
    </div>
  );
};

export default DiscoverEmptyState;
