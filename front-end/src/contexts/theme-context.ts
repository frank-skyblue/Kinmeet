import { createContext } from 'react';

type ThemeOptions = 'dark' | 'light';

interface ThemeContextType {
	theme: ThemeOptions;
	isDark: () => boolean;
	isLight: () => boolean;
	setTheme: (option: ThemeOptions) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);
