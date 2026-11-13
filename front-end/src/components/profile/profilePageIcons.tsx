import React from 'react';

type IconProps = { className?: string };

const iconProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.8,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
	viewBox: '0 0 24 24',
	'aria-hidden': true,
} as const;

/** Back arrow: returns to the page the profile was opened from. */
export const ArrowLeftIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
	</svg>
);

/** Location pin for the current place line. */
export const PinIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.6 12 21 12 21Z" />
		<circle cx="12" cy="10.5" r="2.3" />
	</svg>
);

export const InfoIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<circle cx="12" cy="12" r="8.5" />
		<path d="M12 11v5.5M12 7.8h.01" />
	</svg>
);

export const HeartIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z" />
	</svg>
);

export const SparkleIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<path d="M11 3.5 12.8 8 17.3 9.8 12.8 11.6 11 16.1 9.2 11.6 4.7 9.8 9.2 8 11 3.5Z" />
		<path d="M18 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
	</svg>
);

export const GlobeIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<circle cx="12" cy="12" r="8.5" />
		<path d="M3.7 12h16.6M12 3.5a14 14 0 0 1 0 17 14 14 0 0 1 0-17Z" />
	</svg>
);

export const BriefcaseIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<rect x="3.5" y="7.5" width="17" height="12" rx="2.3" />
		<path d="M9 7.5V6.4A1.9 1.9 0 0 1 10.9 4.5h2.2A1.9 1.9 0 0 1 15 6.4v1.1M3.5 12.5h17" />
	</svg>
);

export const CapIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
	<svg className={className} {...iconProps}>
		<path d="M3 9.4 12 5l9 4.4-9 4.4-9-4.4Z" />
		<path d="M7 11.4V16c0 1.6 2.2 2.9 5 2.9s5-1.3 5-2.9v-4.6M21 9.4v4.4" />
	</svg>
);
