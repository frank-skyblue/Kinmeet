import React, { useState } from 'react';
import { settingsAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import PasswordInputField from '../common/PasswordInputField';

type SectionState = {
	editing: boolean;
	loading: boolean;
	error: string | null;
	success: string | null;
};

const initialSection = (): SectionState => ({
	editing: false,
	loading: false,
	error: null,
	success: null,
});

const AccountPasswordSection: React.FC = () => {
	const [section, setSection] = useState<SectionState>(initialSection);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const handleEdit = () => {
		setCurrentPassword('');
		setNewPassword('');
		setConfirmPassword('');
		setSection({ ...initialSection(), editing: true });
	};

	const handleCancel = () => {
		setSection(initialSection());
		setCurrentPassword('');
		setNewPassword('');
		setConfirmPassword('');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			setSection((prev) => ({ ...prev, error: 'New passwords do not match' }));
			return;
		}
		setSection((prev) => ({
			...prev,
			loading: true,
			error: null,
			success: null,
		}));
		try {
			await settingsAPI.changePassword({ currentPassword, newPassword });
			setSection({
				editing: false,
				loading: false,
				error: null,
				success: 'Password updated successfully.',
			});
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
		} catch (err: unknown) {
			setSection((prev) => ({
				...prev,
				loading: false,
				error: getErrorMessage(err, 'Failed to update password'),
			}));
		}
	};

	return (
		<section className="py-6" aria-labelledby="password-heading">
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<h2
						id="password-heading"
						className="text-sm font-semibold font-inter text-foreground mb-1"
					>
						Change Password
					</h2>
					{!section.editing && (
						<p className="text-foreground font-inter text-sm">
							Update the password for your KinMeet account.
						</p>
					)}
					{section.success && !section.editing && (
						<p role="status" className="text-green-600 text-sm mt-1 font-inter">
							{section.success}
						</p>
					)}
				</div>
				{!section.editing && (
					<button
						type="button"
						onClick={handleEdit}
						className="shrink-0 text-sm font-semibold font-inter text-muted hover:text-kin-teal-700 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						aria-label="Change password"
					>
						Change
					</button>
				)}
			</div>

			{section.editing && (
				<form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
					<div>
						<label
							htmlFor="current-password"
							className="block text-sm font-inter text-foreground mb-1"
						>
							Current password
						</label>

						<PasswordInputField
							id="current-password"
							autoComplete="current-password"
							required
							value={currentPassword}
							setPassword={setCurrentPassword}
							placeholder="Enter your current password"
							className="placeholder-kin-stone-400"
							sizeType="small"
						/>
					</div>
					<div>
						<label
							htmlFor="new-password"
							className="block text-sm font-inter text-foreground mb-1"
						>
							New password
						</label>

						<PasswordInputField
							id="new-password"
							autoComplete="new-password"
							required
							value={newPassword}
							setPassword={setNewPassword}
							placeholder="8+ chars, upper, lower, number"
							className="placeholder-kin-stone-400"
							sizeType="small"
						/>
					</div>
					<div>
						<label
							htmlFor="confirm-password"
							className="block text-sm font-inter text-foreground mb-1"
						>
							Confirm new password
						</label>

						<PasswordInputField
							id="confirm-password"
							autoComplete="confirm-password"
							required
							value={confirmPassword}
							setPassword={setConfirmPassword}
							className="placeholder-kin-stone-400"
							placeholder="Re-enter new password"
							sizeType="small"
						/>
					</div>
					{section.error && (
						<p role="alert" className="text-kin-coral text-sm font-inter">
							{section.error}
						</p>
					)}
					<div className="flex gap-3">
						<button
							type="submit"
							disabled={section.loading}
							className="bg-kin-teal text-white px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat hover:bg-kin-teal-700 cursor-pointer transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							{section.loading ? 'Saving…' : 'Save'}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={section.loading}
							className="px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat text-foreground hover:bg-surface-muted cursor-pointer transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							Cancel
						</button>
					</div>
				</form>
			)}
		</section>
	);
};

export default AccountPasswordSection;
