import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileEditForm from '../ProfileEditForm';
import type { UserProfile } from '../../../types';

vi.mock('../../../services/api', () => ({
  profileAPI: {
    updateProfile: vi.fn(),
    uploadPhoto: vi.fn(),
    deletePhoto: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

const refreshUser = vi.fn();
vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({ refreshUser }),
}));

import { profileAPI } from '../../../services/api';

const profile: UserProfile = {
  _id: 'user-1',
  firstName: 'Lucia',
  lastName: 'Martinez',
  about: 'Moved to Canada for work.',
  homeCountry: 'Argentina',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
  languages: ['Spanish', 'English'],
  interests: ['Hiking'],
  lookingFor: ['Friendship'],
  profileComplete: true,
  gender: 'female',
  dateOfBirth: '1997-05-14',
};

const renderForm = (overrides: Partial<UserProfile> = {}) => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<ProfileEditForm profile={{ ...profile, ...overrides }} onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel };
};

const openTab = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('tab', { name }));
  return screen.getByRole('tabpanel');
};

describe('ProfileEditForm', () => {
  beforeEach(() => {
    vi.mocked(profileAPI.updateProfile).mockImplementation(async (payload) => ({
      success: true,
      user: { ...profile, ...payload },
    }));
  });

  it('opens on Basic Information with the four sections as tabs', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Basic Information',
      'About You',
      'Home & Location',
      'Languages & Interests',
    ]);
    expect(screen.getByRole('tab', { name: 'Basic Information' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'The Essentials' })).toBeInTheDocument();
    expect(screen.getByText('Hidden until your kin request is accepted.')).toBeInTheDocument();
    expect(screen.getByText('Only your age is shown on your profile.')).toBeInTheDocument();
  });

  it('shows each section when its tab is chosen', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(within(await openTab(user, 'About You')).getByRole('heading', { name: 'Your Story' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'About You' })).toHaveValue('Moved to Canada for work.');

    const location = await openTab(user, 'Home & Location');
    expect(within(location).getByRole('heading', { name: 'Home, Wherever You Are' })).toBeInTheDocument();
    expect(within(location).getByRole('heading', { name: 'Where You Live Now' })).toBeInTheDocument();

    const interests = await openTab(user, 'Languages & Interests');
    expect(within(interests).getByRole('heading', { name: 'Find Common Ground' })).toBeInTheDocument();
    expect(within(interests).getByRole('button', { name: 'Remove Spanish' })).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    renderForm();

    screen.getByRole('tab', { name: 'Basic Information' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'About You' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'About You' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Languages & Interests' })).toHaveAttribute('aria-selected', 'true');
  });

  it('says when there are unsaved changes, including on another tab', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByRole('status')).toHaveTextContent('No unsaved changes');

    await user.type(screen.getByLabelText(/First Name/), 'a');
    await openTab(user, 'About You');

    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
  });

  it('switches between worldwide province search and choosing country and province separately', async () => {
    const user = userEvent.setup();
    renderForm();
    const location = await openTab(user, 'Home & Location');
    expect(within(location).getByRole('combobox', { name: 'Current Province / State (Worldwide)' })).toBeInTheDocument();
    expect(within(location).getByText('Current Country')).toBeInTheDocument();

    await user.click(within(location).getByRole('button', { name: 'Choose country and province separately' }));
    expect(within(location).getByRole('combobox', { name: 'Current Country' })).toBeInTheDocument();
    expect(within(location).getByRole('combobox', { name: 'Current Province / State' })).toBeInTheDocument();

    await user.click(within(location).getByRole('button', { name: 'Search provinces worldwide' }));
    expect(within(location).getByRole('combobox', { name: 'Current Province / State (Worldwide)' })).toBeInTheDocument();
  });

  it('adds and removes languages, and toggles what the user is looking for', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();
    const panel = await openTab(user, 'Languages & Interests');

    await user.click(within(panel).getByRole('button', { name: 'Remove English' }));
    await user.click(within(panel).getByRole('combobox', { name: 'Languages Spoken' }));
    await user.keyboard('Fre');
    await user.click(screen.getByRole('option', { name: 'French' }));
    await user.click(within(panel).getByRole('checkbox', { name: 'Networking' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(profileAPI.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ languages: ['Spanish', 'French'], lookingFor: ['Friendship', 'Networking'] }),
    );
    expect(onSave).toHaveBeenCalled();
  });

  it('opens the tab with the problem when saving fails validation', async () => {
    const user = userEvent.setup();
    renderForm({ lookingFor: [] });

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please select what you are looking for');
    expect(screen.getByRole('tab', { name: 'Languages & Interests' })).toHaveAttribute('aria-selected', 'true');
    expect(profileAPI.updateProfile).not.toHaveBeenCalled();
  });

  it('goes back without saving from the back arrow and from Cancel', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Back to profile' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(profileAPI.updateProfile).not.toHaveBeenCalled();
  });
});
