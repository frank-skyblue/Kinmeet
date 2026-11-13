import React, { type ReactNode } from 'react';
import useTheme from '../../contexts/useTheme';

type SectionTint = 'coral' | 'teal' | 'neutral';

interface ProfileSectionCardProps {
	title: string;
	icon: ReactNode;
	tint?: SectionTint;
	className?: string;
	children: ReactNode;
}

/**
 * One labelled block inside the profile card. It deliberately carries no card
 * chrome of its own: the enclosing surface owns the border, rounding and the
 * hairline dividers, so every section reads as part of a single unit.
 */
const ProfileSectionCard: React.FC<ProfileSectionCardProps> = ({
	title,
	icon,
	tint = 'neutral',
	className = '',
	children,
}) => {
	const { isDark } = useTheme();

	const iconClass = isDark()
		? {
				coral: 'text-kin-coral-300',
				teal: 'text-kin-teal-200',
				neutral: 'text-muted',
			}[tint]
		: {
				coral: 'text-kin-coral-600',
				teal: 'text-kin-teal-600',
				neutral: 'text-muted',
			}[tint];

	return (
		<section className={`px-6 py-5 ${className}`.trim()}>
			<div className="mb-2.5 flex items-center gap-2">
				<span aria-hidden className={iconClass}>
					{icon}
				</span>
				<h2 className="font-inter text-xs font-semibold uppercase tracking-[0.08em] text-muted">
					{title}
				</h2>
			</div>
			{children}
		</section>
	);
};

export default ProfileSectionCard;
