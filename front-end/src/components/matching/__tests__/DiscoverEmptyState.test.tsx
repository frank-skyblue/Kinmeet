import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscoverEmptyState from '../DiscoverEmptyState';
import { NEW_PEOPLE_ALERT_MESSAGES } from '../../../hooks/useNewPeopleAlerts';
import type { ChannelPreferences, UpdateNotificationPreferencesPayload } from '../../../types';

vi.mock('../../../services/api', () => ({
  notificationsAPI: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

vi.mock('../../../services/pushNotifications', () => ({
  registerWebPushForCurrentUser: vi.fn(),
}));

import { notificationsAPI } from '../../../services/api';
import { registerWebPushForCurrentUser } from '../../../services/pushNotifications';

/** A fake server: GET returns what was last saved; PATCH merges the channels sent. */
let saved: ChannelPreferences;
const respond = () => ({ success: true, preferences: { newPeopleNearby: { ...saved } } });

const renderEmptyState = (kind: 'community_growing' | 'all_caught_up' = 'all_caught_up') =>
  render(<DiscoverEmptyState kind={kind} />);

const openPanel = async (user: ReturnType<typeof userEvent.setup>, name: RegExp = /notify me/i) => {
  await user.click(await screen.findByRole('button', { name }));
  return screen.getByRole('dialog', { name: 'Manage alerts' });
};

describe('DiscoverEmptyState alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saved = { email: false, push: false };
    vi.mocked(notificationsAPI.getPreferences).mockImplementation(async () => respond());
    vi.mocked(notificationsAPI.updatePreferences).mockImplementation(
      async ({ newPeopleNearby }: UpdateNotificationPreferencesPayload) => {
        saved = { ...saved, ...newPeopleNearby };
        return respond();
      },
    );
    vi.mocked(registerWebPushForCurrentUser).mockResolvedValue('registered');
  });

  it('shows Notify me when no alerts are on', async () => {
    renderEmptyState('community_growing');

    expect(await screen.findByRole('button', { name: /notify me/i })).toBeInTheDocument();
    expect(screen.queryByText(/Email (on|off) ·/)).not.toBeInTheDocument();
  });

  it('shows Manage alerts with a summary when a channel is on', async () => {
    saved = { email: true, push: false };
    renderEmptyState();

    expect(await screen.findByRole('button', { name: /manage alerts/i })).toBeInTheDocument();
    expect(screen.getByText('Email on · Push off')).toBeInTheDocument();
  });

  it('opens the panel with both toggles off for a user who never opted in', async () => {
    const user = userEvent.setup();
    renderEmptyState();

    const panel = await openPanel(user);

    expect(within(panel).getByRole('switch', { name: 'Email Notifications' })).not.toBeChecked();
    expect(within(panel).getByRole('switch', { name: 'Push Notifications' })).not.toBeChecked();
    expect(within(panel).getByText('Receive an alert in your inbox.')).toBeInTheDocument();
    expect(within(panel).getByText('Receive an alert on your device.')).toBeInTheDocument();
    expect(
      within(panel).getByText('Changes save automatically. Turn both off to stop new people nearby alerts.'),
    ).toBeInTheDocument();
  });

  it('saves a toggle right away, confirms it, and keeps the panel open', async () => {
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole('switch', { name: 'Email Notifications' }));

    expect(notificationsAPI.updatePreferences).toHaveBeenCalledWith({ newPeopleNearby: { email: true } });
    expect(await within(panel).findByText(NEW_PEOPLE_ALERT_MESSAGES.saved)).toBeInTheDocument();
    expect(within(panel).getByRole('switch', { name: 'Email Notifications' })).toBeChecked();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('back arrow closes the panel without undoing the save, and the button becomes Manage alerts', async () => {
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);
    await user.click(within(panel).getByRole('switch', { name: 'Email Notifications' }));
    await within(panel).findByText(NEW_PEOPLE_ALERT_MESSAGES.saved);

    await user.click(within(panel).getByRole('button', { name: 'Back to Discover' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage alerts/i })).toHaveFocus();
    expect(screen.getByText('Email on · Push off')).toBeInTheDocument();
    expect(saved.email).toBe(true);
  });

  it('reopening shows the saved preferences', async () => {
    saved = { email: false, push: true };
    const user = userEvent.setup();
    renderEmptyState();

    const panel = await openPanel(user, /manage alerts/i);

    expect(within(panel).getByRole('switch', { name: 'Email Notifications' })).not.toBeChecked();
    expect(within(panel).getByRole('switch', { name: 'Push Notifications' })).toBeChecked();
  });

  it('turning both off switches back to Notify me', async () => {
    saved = { email: true, push: false };
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user, /manage alerts/i);

    await user.click(within(panel).getByRole('switch', { name: 'Email Notifications' }));
    await within(panel).findByText(NEW_PEOPLE_ALERT_MESSAGES.saved);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notify me/i })).toBeInTheDocument();
  });

  it('restores the previous state when saving fails, and Retry saves again', async () => {
    vi.mocked(notificationsAPI.updatePreferences).mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole('switch', { name: 'Email Notifications' }));

    const alert = await within(panel).findByRole('alert');
    expect(alert).toHaveTextContent(NEW_PEOPLE_ALERT_MESSAGES.saveFailed);
    expect(within(panel).getByRole('switch', { name: 'Email Notifications' })).not.toBeChecked();

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await within(panel).findByText(NEW_PEOPLE_ALERT_MESSAGES.saved)).toBeInTheDocument();
    expect(within(panel).getByRole('switch', { name: 'Email Notifications' })).toBeChecked();
    expect(notificationsAPI.updatePreferences).toHaveBeenCalledTimes(2);
  });

  it('asks the browser for permission before turning push on', async () => {
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole('switch', { name: 'Push Notifications' }));

    await within(panel).findByText(NEW_PEOPLE_ALERT_MESSAGES.saved);
    expect(registerWebPushForCurrentUser).toHaveBeenCalledTimes(1);
    expect(notificationsAPI.updatePreferences).toHaveBeenCalledWith({ newPeopleNearby: { push: true } });
    expect(within(panel).getByRole('switch', { name: 'Push Notifications' })).toBeChecked();
  });

  it('does not show push as on when the browser permission is denied', async () => {
    vi.mocked(registerWebPushForCurrentUser).mockResolvedValue('denied');
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole('switch', { name: 'Push Notifications' }));

    expect(await within(panel).findByRole('alert')).toHaveTextContent(NEW_PEOPLE_ALERT_MESSAGES.pushDenied);
    expect(within(panel).getByRole('switch', { name: 'Push Notifications' })).not.toBeChecked();
    expect(notificationsAPI.updatePreferences).not.toHaveBeenCalled();
  });

  it('offers no Retry when the browser cannot do push at all', async () => {
    vi.mocked(registerWebPushForCurrentUser).mockResolvedValue('unsupported');
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole('switch', { name: 'Push Notifications' }));

    const alert = await within(panel).findByRole('alert');
    expect(alert).toHaveTextContent(NEW_PEOPLE_ALERT_MESSAGES.pushUnsupported);
    expect(within(alert).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('turning push off does not ask for permission', async () => {
    saved = { email: false, push: true };
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user, /manage alerts/i);

    await user.click(within(panel).getByRole('switch', { name: 'Push Notifications' }));

    await waitFor(() =>
      expect(notificationsAPI.updatePreferences).toHaveBeenCalledWith({ newPeopleNearby: { push: false } }),
    );
    expect(registerWebPushForCurrentUser).not.toHaveBeenCalled();
  });

  it('says so when the saved settings could not be loaded', async () => {
    vi.mocked(notificationsAPI.getPreferences).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderEmptyState();
    const panel = await openPanel(user);

    expect(await within(panel).findByRole('alert')).toHaveTextContent(NEW_PEOPLE_ALERT_MESSAGES.loadFailed);
    await user.click(within(panel).getByRole('button', { name: 'Try again' }));

    expect(await within(panel).findByRole('switch', { name: 'Email Notifications' })).toBeInTheDocument();
  });
});
