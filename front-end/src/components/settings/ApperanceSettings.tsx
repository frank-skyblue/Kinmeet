import { Link } from 'react-router-dom';
import { surfaceCardClass } from '../../constants/ui';
import ThemeOptionSettings from './ThemeOptionSettings';

export default function AppearanceSettings() {
	return (
		<>
			<div className="bg-canvas py-8 px-4">
				<div className="max-w-3xl mx-auto">
					<div className={`${surfaceCardClass} rounded-kin-xl overflow-y-auto`}>
						<div className="p-8">
							<Link
								to="/settings"
								className="inline-flex items-center gap-1 text-sm font-inter text-muted hover:text-kin-teal-700 transition mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
								aria-label="Back to Settings and Privacy"
							>
								<span>
									<svg
										className="h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 19l-7-7 7-7"
										/>
									</svg>
								</span>
								<span>Settings &amp; Privacy</span>
							</Link>

							<h1 className="text-3xl font-bold font-montserrat text-foreground mb-2">
								Appearance
							</h1>

							<p className="text-foreground font-inter mb-8">
								Choose how KinMeet looks on your device
							</p>

							<ThemeOptionSettings />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
