import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blockAPI, matchingAPI, getPhotoUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import { calculateAgeFromDateOfBirth } from '../../utils/age';
import ActionMenu from '../common/ActionMenu';
import CountryFlag from '../common/CountryFlag';
import ReportUserModal from '../common/ReportUserModal';
import type { DiscoverEmptyState as EmptyStateKind, Match } from '../../types';
import { primaryActionClass, surfaceCardClass } from '../../constants/ui';
import useTheme from '../../contexts/useTheme';
import DiscoverEmptyState from './DiscoverEmptyState';

/**
 * The card now shows the whole identity, but the shared `Match` type still only
 * declares a first name. These fields come from the same API payload, so they are
 * optional extras here until the server-facing type catches up.
 */
type DiscoverMatch = Match & {
  lastName?: string;
  username?: string;
  dateOfBirth?: string;
  age?: number;
};

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const;

const PinIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} {...iconProps}>
    <path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </svg>
);

/** Waving hand, matching the Meet action in the card design. */
const MeetIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} {...iconProps}>
    <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12m0-5.5v-1a1.5 1.5 0 0 1 3 0V12m0-4.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.6a5 5 0 0 1-3.8-1.8l-2.8-3.4a1.6 1.6 0 0 1 2.5-2l1.9 2" />
  </svg>
);

type TagGroupProps = {
  label: string;
  items: string[];
  /** Chip colors come from the caller so they can follow the active theme. */
  chipClassName: string;
};

/** One labelled row of chips. Empty groups render nothing rather than an empty heading. */
const TagGroup: React.FC<TagGroupProps> = ({ label, items, chipClassName }) => {
  const visibleItems = items.filter((item) => item.trim().length > 0);
  if (visibleItems.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium font-inter text-muted md:text-xs">{label}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {visibleItems.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium font-inter md:text-xs ${chipClassName}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const fullNameOf = (match: DiscoverMatch) =>
  [match.firstName, match.lastName].filter((part) => Boolean(part?.trim())).join(' ');

const initialsOf = (match: DiscoverMatch) => {
  const firstInitial = match.firstName?.trim().charAt(0) ?? '';
  const lastInitial = match.lastName?.trim().charAt(0) ?? '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
};

const ageOf = (match: DiscoverMatch) =>
  match.age ?? calculateAgeFromDateOfBirth(match.dateOfBirth);

/** `Ontario, Canada`, or just the country when the place has no subdivision. */
const locationOf = (match: DiscoverMatch) => {
  const province = match.currentProvince?.trim();
  const country = match.currentCountry?.trim();
  if (!country) return province ?? '';
  if (!province || province === 'N/A') return country;
  return `${province}, ${country}`;
};

/**
 * Discover browsing card. Shows only what is needed to decide, with the rest
 * living on the full profile that the three-dot menu opens.
 */
const Discover: React.FC = () => {
  const [matches, setMatches] = useState<DiscoverMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emptyState, setEmptyState] = useState<EmptyStateKind>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [pendingAction, setPendingAction] = useState<'meet' | 'pass' | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const loadMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const response = await matchingAPI.getMatches();
      if (response.success) {
        setMatches(response.matches);
        setCurrentIndex(0);
        setEmptyState(response.matches.length === 0 ? response.emptyState ?? 'all_caught_up' : undefined);
      } else {
        // Without this, the "load more" effect below would retry forever.
        setLoadError('Failed to load matches');
      }
    } catch (err: unknown) {
      setLoadError('Failed to load matches');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  // Discover loads profiles in pages. At the end of one, ask the server for more; only it can
  // say whether the group is empty or the user has seen everyone.
  const needsMore = !isLoading && !loadError && !emptyState && currentIndex >= matches.length;
  useEffect(() => {
    if (needsMore) void loadMatches();
  }, [needsMore, loadMatches]);

  const moveToNext = () => {
    setCurrentIndex((index) => (index < matches.length - 1 ? index + 1 : matches.length));
  };

  const handleMeet = async () => {
    const currentMatch = matches[currentIndex];
    if (!currentMatch || pendingAction) return;

    setPendingAction('meet');
    setError('');
    try {
      await matchingAPI.sendMeetRequest(currentMatch._id);
      moveToNext();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send Meet request'));
    } finally {
      setPendingAction(null);
    }
  };

  const handlePass = async () => {
    const currentMatch = matches[currentIndex];
    if (!currentMatch || pendingAction) return;

    setPendingAction('pass');
    setError('');
    try {
      await matchingAPI.passUser(currentMatch._id);
      moveToNext();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to pass'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleBlock = async (userId: string, displayName: string) => {
    const ok = window.confirm(
      `Block ${displayName}? They won’t be able to message you or see you in Discover. ` +
        'You can unblock them in Settings & Privacy.',
    );
    if (!ok) return;

    setIsBlocking(true);
    setError('');
    try {
      await blockAPI.blockUser(userId);
      // Dropping the card keeps currentIndex pointing at the next person.
      setMatches((prev) => prev.filter((match) => match._id !== userId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, `Failed to block ${displayName}`));
    } finally {
      setIsBlocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-primary" />
          <p className="font-inter text-foreground">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (currentIndex >= matches.length) {
    if (emptyState) return <DiscoverEmptyState kind={emptyState} />;

    return (
      <div className="flex min-h-full items-center justify-center bg-canvas px-4">
        <div role="alert" className="max-w-md text-center">
          <p className="mb-4 font-inter text-foreground">{loadError || 'Loading matches...'}</p>
          {loadError && (
            <button
              onClick={() => void loadMatches()}
              className={`${primaryActionClass} rounded-kin-sm px-6 py-3 font-semibold font-montserrat shadow-kin-soft transition hover:shadow-kin-medium cursor-pointer`}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentMatch = matches[currentIndex];
  const remaining = matches.length - currentIndex;
  const name = fullNameOf(currentMatch);
  const age = ageOf(currentMatch);
  const location = locationOf(currentMatch);
  const username = currentMatch.username?.trim();
  const isBusy = isBlocking || pendingAction !== null;
  // Card chrome follows the theme roles. These pairs cover the fixed brand tints
  // (cream header, avatar, chips) that would otherwise stay light in dark mode.
  const palette = isDark()
    ? {
        header: 'bg-surface-muted',
        avatar: 'border-kin-coral-800 bg-kin-coral-900/50 text-kin-coral-200',
        age: 'text-kin-coral-300',
        error: 'border-kin-coral-800 bg-kin-coral-900/40 text-kin-coral-200',
        neutralChip: 'bg-surface-hover text-foreground',
        tealChip: 'bg-kin-teal-800/60 text-kin-teal-100',
        coralChip: 'bg-kin-coral-900/50 text-kin-coral-200',
      }
    : {
        header: 'bg-kin-beige-400',
        avatar: 'border-kin-coral-200 bg-kin-coral-100 text-kin-coral-700',
        age: 'text-kin-coral-600',
        error: 'border-kin-coral-200 bg-kin-coral-50 text-kin-coral-700',
        neutralChip: 'bg-kin-stone-100 text-foreground',
        tealChip: 'bg-kin-teal-100 text-kin-teal-700',
        coralChip: 'bg-kin-coral-100 text-kin-coral-700',
      };

  return (
    <div className="flex min-h-full flex-col items-center bg-canvas px-4 pb-6 pt-4 md:pt-7">
      <div className="w-full max-w-[25rem] md:max-w-[26rem]">
        <header className="mb-3 text-center">
          <h1 className="text-lg font-bold font-montserrat text-foreground md:text-xl">Discover</h1>
          <p className="font-inter text-xs text-muted">
            {remaining} match{remaining !== 1 ? 'es' : ''} available
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className={`mb-3 rounded-kin-sm border px-3 py-2 font-inter text-xs ${palette.error}`}
          >
            {error}
          </div>
        )}

        <article
          aria-label={`${name}${age !== null ? `, ${age}` : ''}`}
          className={`${surfaceCardClass} overflow-hidden rounded-kin-xl border border-border`}
        >
          {/* Header: avatar or initials, name with home flag, age, username */}
          <div className={`relative px-5 pb-4 pt-6 text-center ${palette.header}`}>
            <ActionMenu
              key={currentMatch._id}
              label={`More actions for ${name}`}
              className="right-2.5 top-2.5 [&_svg]:rotate-90"
              items={[
                {
                  label: 'View full profile',
                  onSelect: () => handleViewProfile(currentMatch._id),
                },
                {
                  label: 'Report',
                  onSelect: () => setIsReportOpen(true),
                  variant: 'destructive',
                },
                {
                  label: isBlocking ? 'Blocking…' : 'Block',
                  onSelect: () => void handleBlock(currentMatch._id, name),
                  variant: 'destructive',
                  disabled: isBlocking,
                },
              ]}
            />

            <div className={`mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full border ${palette.avatar}`}>
              {currentMatch.photo ? (
                <img
                  src={getPhotoUrl(currentMatch.photo)}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center font-montserrat text-2xl font-semibold tracking-wide"
                  >
                    {initialsOf(currentMatch)}
                  </span>
                  <span className="sr-only">{name} has not added a photo</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
              <span
                className="inline-flex items-center"
                title={`Home country: ${currentMatch.homeCountry}`}
              >
                <CountryFlag
                  country={currentMatch.homeCountry}
                  className="rounded-[2px] shadow-kin-soft"
                />
                <span className="sr-only">Home country: {currentMatch.homeCountry}</span>
              </span>
              <h2 className="text-lg font-bold font-montserrat leading-tight text-foreground md:text-xl">
                {name}
              </h2>
              {age !== null && (
                <span className={`font-inter text-sm font-medium ${palette.age}`}>· {age}</span>
              )}
            </div>

            {username && (
              <p className="mt-0.5 truncate font-inter text-xs text-muted">@{username}</p>
            )}
          </div>

          {/* Body: current location, then the tag groups */}
          <div className="px-5 pb-5 pt-4">
            {(location || currentMatch.currentCountry) && (
              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-inter text-xs text-foreground/80 md:text-sm">
                <PinIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                {location && <span className="min-w-0 truncate">{location}</span>}
                <CountryFlag country={currentMatch.currentCountry} className="rounded-[2px]" />
                <span className="sr-only">
                  currently living in {location || currentMatch.currentCountry}
                </span>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <TagGroup
                label="Speaks"
                items={currentMatch.languages}
                chipClassName={palette.neutralChip}
              />
              <TagGroup
                label="Interests"
                items={currentMatch.interests}
                chipClassName={palette.tealChip}
              />
              <TagGroup
                label="Looking for"
                items={currentMatch.lookingFor}
                chipClassName={palette.coralChip}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={() => void handlePass()}
              disabled={isBusy}
              aria-label={`Pass on ${name}`}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-kin-sm border border-border bg-surface-muted py-2.5 font-montserrat text-sm font-semibold text-foreground transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === 'pass' ? 'Passing…' : 'Pass'}
            </button>
            <button
              type="button"
              onClick={() => void handleMeet()}
              disabled={isBusy}
              aria-label={`Send a meet request to ${name}`}
              className={`${primaryActionClass} flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-kin-sm py-2.5 font-montserrat text-sm font-semibold shadow-kin-soft transition hover:shadow-kin-medium disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <MeetIcon className="h-4 w-4" />
              {pendingAction === 'meet' ? 'Sending…' : 'Meet'}
            </button>
          </div>
        </article>
      </div>

      <ReportUserModal
        key={currentMatch._id}
        isOpen={isReportOpen}
        userId={currentMatch._id}
        displayName={name}
        onClose={() => setIsReportOpen(false)}
        onBlocked={() =>
          setMatches((prev) => prev.filter((match) => match._id !== currentMatch._id))
        }
      />
    </div>
  );
};

export default Discover;
