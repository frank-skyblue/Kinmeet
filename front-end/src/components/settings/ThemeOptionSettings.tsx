import useTheme from '../../contexts/useTheme';

export default function ThemeOptionSettings() {
	const { theme, setTheme } = useTheme();

	function handleThemeChange(e: React.ChangeEvent<HTMLInputElement>) {
		const newThemeMode = e?.target?.value;
		if (newThemeMode === theme) return;

		setTheme(newThemeMode as 'light' | 'dark');
	}

	return (
		<>
			<div className="border border-kin-beige-600 rounded-kin-sm px-4 py-5 shadow-kin-stone shadow-xs">
				<fieldset>
					<div className="flex items-center justify-between border-b border-kin-beige-600/75 pb-4">
						<div className="flex items-center justify-start w-full">
							<label htmlFor="light-mode">
								<LightModeIcon />
							</label>

							<span className="ml-4 w-full">
								<h3 className="font-bold">
									<label htmlFor="light-mode">Light Mode</label>
								</h3>
								<label
									htmlFor="light-mode"
									className="inline-block pt-1.5 text-kin-stone-800/75"
								>
									A light background with dark text
								</label>
							</span>
						</div>

						<input
							type="radio"
							id="light-mode"
							name="theme"
							value="light"
							onChange={handleThemeChange}
							className="appearance-none grid place-content-center size-5 rounded-full border-2 border-gray-300 cursor-pointer transition-colors checked:bg-orange-500 checked:border-orange-500 before:content-[''] before:size-2 before:rounded-full before:bg-white before:scale-0 before:transition-transform checked:before:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
							checked={theme === 'light'}
						/>
					</div>

					<div className="flex items-center justify-between pt-4">
						<div className="flex items-center justify-start w-full">
							<label htmlFor="dark-mode">
								<DarkModeIcon />
							</label>

							<span className="ml-4 w-full">
								<h3 className="font-bold">
									<label htmlFor="dark-mode">Dark Mode</label>
								</h3>
								<label
									htmlFor="dark-mode"
									className="inline-block pt-1.5 text-kin-stone-800/75"
								>
									A dark background with light text
								</label>
							</span>
						</div>

						<input
							type="radio"
							id="dark-mode"
							name="theme"
							value="dark"
							onChange={handleThemeChange}
							className="appearance-none grid place-content-center size-5 rounded-full border-2 border-gray-300 cursor-pointer transition-colors checked:bg-orange-500 checked:border-orange-500 before:content-[''] before:size-2 before:rounded-full before:bg-white before:scale-0 before:transition-transform checked:before:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
							checked={theme === 'dark'}
						/>
					</div>
				</fieldset>
			</div>

			<div className="mt-5 text-xs">
				<p>Your preference saves automatically</p>
				<p className="mt-2">
					{theme === 'light' ? 'Light' : 'Dark'} Mode Selected
				</p>
			</div>
		</>
	);
}

function LightModeIcon() {
	return (
		<>
			<svg
				className="h-7 w-7"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
				/>
			</svg>
		</>
	);
}

function DarkModeIcon() {
	return (
		<>
			<svg
				className="h-6 w-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
				/>
			</svg>
		</>
	);
}
