import { useContext } from 'react';
import { ThemeContext } from './theme-context';

export default function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error(
			'ThemeContextError: useTheme hook is being used outside the ThemeContext window',
		);
	}

	return context;
}
