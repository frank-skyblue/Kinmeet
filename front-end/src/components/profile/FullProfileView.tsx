import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhotoUrl } from '../../services/api';
import type { UserProfile } from '../../types';
import { calculateAgeFromDateOfBirth } from '../../utils/age';
import { primaryActionClass } from '../../constants/ui';
import useTheme from '../../contexts/useTheme';
import ActionMenu from '../common/ActionMenu';
import CountryFlag from '../common/CountryFlag';
import ProfileSectionCard from './ProfileSectionCard';
import {
	ArrowLeftIcon,
	BriefcaseIcon,
	CapIcon,
	GlobeIcon,
	HeartIcon,
	InfoIcon,
	PinIcon,
	SparkleIcon,
} from './profilePageIcons';

interface FullProfileViewProps {
	profile: UserProfile;
	onEdit: () => void;
	showManageActions?: boolean;
	onBlock?: () => void;
	onReport?: () => void;
	onProfileOpen: () => void;
}

const genderLabel = (value: string | undefined) => {
	if (value === 'female') return 'Female';
	if (value === 'male') return 'Male';
	if (value === 'other') return 'Other';
	return null;
};

const fullNameOf = (profile: UserProfile) =>
	[profile.firstName, profile.lastName]
		.filter((part) => Boolean(part?.trim()))
		.join(' ');

const initialsOf = (profile: UserProfile) => {
	const firstInitial = profile.firstName?.trim().charAt(0) ?? '';
	const lastInitial = profile.lastName?.trim().charAt(0) ?? '';
	return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
};

const ageOf = (profile: UserProfile) =>
	calculateAgeFromDateOfBirth(profile.dateOfBirth);

const placeOf = (profile: UserProfile) => {
	const seen = new Set<string>();
	return [profile.currentCity, profile.currentProvince, profile.currentCountry]
		.map((part) => part?.trim() ?? '')
		.filter((part) => part.length > 0 && part !== 'N/A')
		.filter((part) => {
			const key = part.toLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.join(', ');
};

const workLinesOf = (profile: UserProfile) => {
	const lines: string[] = [];
	const role = [profile.jobTitle?.trim(), profile.company?.trim()]
		.filter(Boolean)
		.join(' · ');
	if (role) lines.push(role);
	const industry = profile.industry?.trim();
	if (industry) lines.push(industry);
	return lines;
};

const nonEmpty = (items: string[] | undefined) =>
	(items ?? []).filter((item) => item?.trim().length > 0);

/**
 * Full profile page. Identity (photo, name, handle, gender/age, place) and the
 * detail sections all share one surface: a single border and rounding, with
 * hairline dividers between blocks so the page reads as one calm unit.
 * Pass/Meet stay on the Discover card; this page only reads the profile and
 * offers editing, reporting or blocking where allowed.
 */
const FullProfileView: React.FC<FullProfileViewProps> = ({
	profile,
	onEdit,
	showManageActions = true,
	onBlock,
	onReport,
	onProfileOpen,
}) => {
	const navigate = useNavigate();
	const { isDark } = useTheme();

	const name = fullNameOf(profile);
	const age = ageOf(profile);
	const gender = genderLabel(profile.gender);
	const place = placeOf(profile);
	const about = profile.about?.trim();
	const work = workLinesOf(profile);
	const education = profile.educationLevel?.trim();
	const lookingFor = nonEmpty(profile.lookingFor);
	const interests = nonEmpty(profile.interests);
	const languages = nonEmpty(profile.languages);
	const showActionsMenu = !showManageActions && Boolean(onBlock);

	const palette = isDark()
		? {
				avatar: 'border-border bg-kin-coral-900/50 text-kin-coral-200',
				age: 'text-kin-coral-300',
				neutralChip: 'bg-surface-hover text-foreground',
				tealChip: 'bg-kin-teal-800/60 text-kin-teal-100',
				coralChip: 'bg-kin-coral-900/50 text-kin-coral-200',
			}
		: {
				avatar: 'border-surface bg-kin-coral-100 text-kin-coral-700',
				age: 'text-kin-coral-600',
				neutralChip: 'bg-kin-stone-100 text-kin-teal-800',
				tealChip: 'bg-kin-teal-100 text-kin-teal-700',
				coralChip: 'bg-kin-coral-100 text-kin-coral-700',
			};

	return (
		<div className="bg-canvas px-4 pb-8 pt-4 md:px-6 md:pb-12 md:pt-6">
			<div className="mx-auto w-full max-w-5xl">
				<div className="mb-4">
					<button
						type="button"
						onClick={() => navigate(-1)}
						aria-label="Back"
						className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-kin-soft transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
						<ArrowLeftIcon className="h-5 w-5" />
					</button>
				</div>

				<article className="overflow-hidden rounded-kin-xl border border-border bg-surface shadow-kin-soft">
					<div className="grid lg:grid-cols-[19rem_minmax(0,1fr)]">
						<section
							aria-labelledby="profile-name"
							className="relative border-b border-border p-6 text-center lg:border-b-0 lg:border-r lg:text-left"
						>
							{showActionsMenu && (
								<ActionMenu
									label={`More actions for ${profile.firstName}`}
									className="right-3 top-3"
									items={[
										{
											label: 'Report',
											onSelect: () => onReport?.(),
											variant: 'destructive',
										},
										{
											label: 'Block',
											onSelect: () => onBlock?.(),
											variant: 'destructive',
										},
									]}
								/>
							)}

							<button
								type="button"
								onClick={() => onProfileOpen()}
								aria-label={`Open ${profile.firstName}'s profile photo`}
								className="mx-auto mb-4 block cursor-pointer rounded-full lg:mx-0"
							>
								{profile.photo ? (
									<img
										src={getPhotoUrl(profile.photo)}
										alt={name}
										className="h-32 w-32 rounded-full border-4 border-surface object-cover shadow-kin-medium transition hover:shadow-kin-strong md:h-36 md:w-36"
									/>
								) : (
									<span
										aria-hidden
										className={`flex h-32 w-32 items-center justify-center rounded-full border-4 font-montserrat text-4xl font-semibold shadow-kin-medium md:h-36 md:w-36 ${palette.avatar}`}
									>
										{initialsOf(profile)}
									</span>
								)}
							</button>
							{!profile.photo && (
								<span className="sr-only">{name} has not added a photo</span>
							)}

							<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
								<h1
									id="profile-name"
									className="font-montserrat text-2xl font-bold leading-tight text-foreground md:text-3xl"
								>
									{name}
								</h1>
								<span
									className="inline-flex items-center"
									title={`Home country: ${profile.homeCountry}`}
								>
									<CountryFlag
										country={profile.homeCountry}
										className="rounded-[2px] shadow-kin-soft"
									/>
									<span className="sr-only">
										Home country: {profile.homeCountry}
									</span>
								</span>
							</div>

							{profile.username && (
								<p className="mt-1 truncate font-inter text-sm text-muted">
									@{profile.username}
								</p>
							)}

							{(gender || age !== null) && (
								<p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 font-inter text-sm text-foreground/80 lg:justify-start">
									{gender && <span>{gender}</span>}
									{gender && age !== null && (
										<span aria-hidden className="text-muted">
											·
										</span>
									)}
									{age !== null && (
										<span className={`font-medium ${palette.age}`}>{age}</span>
									)}
								</p>
							)}

							{place && (
								<p className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-inter text-sm text-muted lg:justify-start">
									<PinIcon className="h-4 w-4 shrink-0" />
									<span>{place}</span>
									<CountryFlag
										country={profile.currentCountry}
										className="rounded-[2px]"
									/>
									<span className="sr-only">currently living in {place}</span>
								</p>
							)}

							{showManageActions && (
								<button
									type="button"
									onClick={onEdit}
									className={`${primaryActionClass} mt-6 w-full cursor-pointer rounded-kin-sm py-3 font-montserrat text-sm font-semibold shadow-kin-soft transition hover:shadow-kin-medium`}
								>
									Edit Profile
								</button>
							)}
						</section>

						<div className="divide-y divide-border">
							{about && (
								<ProfileSectionCard
									title="About"
									icon={<InfoIcon />}
									tint="neutral"
								>
									<p className="whitespace-pre-line font-inter leading-relaxed text-foreground/90">
										{about}
									</p>
								</ProfileSectionCard>
							)}

							{lookingFor.length > 0 && (
								<ProfileSectionCard
									title="Looking for"
									icon={<HeartIcon />}
									tint="coral"
								>
									<ul className="flex flex-wrap gap-2">
										{lookingFor.map((item, index) => (
											<li
												key={`${item}-${index}`}
												className={`rounded-full px-3 py-1.5 font-inter text-sm font-medium ${palette.coralChip}`}
											>
												{item}
											</li>
										))}
									</ul>
								</ProfileSectionCard>
							)}

							{interests.length > 0 && (
								<ProfileSectionCard
									title="Interests"
									icon={<SparkleIcon />}
									tint="teal"
								>
									<ul className="flex flex-wrap gap-2">
										{interests.map((item, index) => (
											<li
												key={`${item}-${index}`}
												className={`rounded-full px-3 py-1.5 font-inter text-sm font-medium ${palette.tealChip}`}
											>
												{item}
											</li>
										))}
									</ul>
								</ProfileSectionCard>
							)}

							{languages.length > 0 && (
								<ProfileSectionCard
									title="Languages"
									icon={<GlobeIcon />}
									tint="neutral"
								>
									<ul className="flex flex-wrap gap-2">
										{languages.map((item, index) => (
											<li
												key={`${item}-${index}`}
												className={`rounded-full px-3 py-1.5 font-inter text-sm font-medium ${palette.neutralChip}`}
											>
												{item}
											</li>
										))}
									</ul>
								</ProfileSectionCard>
							)}

							{work.length > 0 && (
								<ProfileSectionCard
									title="Work"
									icon={<BriefcaseIcon />}
									tint="neutral"
								>
									<div className="space-y-1 font-inter text-sm">
										{work.map((line, index) => (
											<p
												key={line}
												className={
													index === 0
														? 'font-medium text-foreground'
														: 'text-muted'
												}
											>
												{line}
											</p>
										))}
									</div>
								</ProfileSectionCard>
							)}

							{education && (
								<ProfileSectionCard
									title="Education"
									icon={<CapIcon />}
									tint="neutral"
								>
									<p className="font-inter text-sm font-medium text-foreground">
										{education}
									</p>
								</ProfileSectionCard>
							)}
						</div>
					</div>
				</article>
			</div>
		</div>
	);
};

export default FullProfileView;
