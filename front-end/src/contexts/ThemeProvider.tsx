import { useEffect, useState } from 'react';
import { ThemeContext } from './theme-context';

type ThemeOptions = 'dark' | 'light';

const THEME_STORAGE_KEY = 'kinmeet-theme';

function getInitialTheme(): ThemeOptions {
	const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

	if (!storedTheme) return 'light';

	return storedTheme as ThemeOptions;
}

export function ThemeProvider({
	children,
}: {
	children: Readonly<React.ReactNode>;
}) {
	const [theme, setTheme] = useState<ThemeOptions>(getInitialTheme);

	useEffect(
		function () {
			localStorage.setItem(THEME_STORAGE_KEY, theme);

			// Apply the theme globally (e.g. Tailwind's dark mode).
			document.documentElement.classList.toggle('dark', theme === 'dark');
		},
		[theme],
	);

	function isDark() {
		return theme === 'dark';
	}

	function isLight() {
		return theme === 'light';
	}

	return (
		<>
			<ThemeContext.Provider value={{ theme, setTheme, isDark, isLight }}>
				{children}
			</ThemeContext.Provider>
		</>
	);
}
