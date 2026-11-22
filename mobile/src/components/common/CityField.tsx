import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  formatCityOptionLabel,
  resolveCityLocation,
  searchCities,
  type ResolvedCityLocation,
} from '../../utils/citySearch';
import { PLACEHOLDER_COLOR, fieldBoxClass } from './FormField';
import { FieldLabel } from './FieldLabel';

// Short pause so a fast typist doesn't trigger a search per letter.
const SEARCH_DELAY_MS = 150;
const MAX_SUGGESTIONS = 8;

type Suggestion = { key: string; label: string; resolved: ResolvedCityLocation };

type CityFieldProps = {
  label: string;
  required?: boolean;
  /** ISO code of the chosen country; suggestions only come from it. Empty disables the field. */
  countryCode: string;
  value: string;
  onChangeText: (value: string) => void;
  /** The user picked a suggestion: fills the province too. */
  onPickCity: (resolved: ResolvedCityLocation) => void;
  helperText?: string;
};

/** City text field with suggestions from the chosen country's cities (country-state-city). */
export const CityField = ({
  label,
  required = false,
  countryCode,
  value,
  onChangeText,
  onPickCity,
  helperText,
}: CityFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  // Picking a suggestion sets the text; don't search again for the name just picked.
  const [justPicked, setJustPicked] = useState(false);

  useEffect(() => {
    if (justPicked || !isFocused || !countryCode) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      const next: Suggestion[] = [];
      for (const city of searchCities(value, countryCode, MAX_SUGGESTIONS)) {
        const resolved = resolveCityLocation(city);
        if (resolved) {
          next.push({
            key: `${city.name}|${city.stateCode}`,
            label: formatCityOptionLabel(city),
            resolved,
          });
        }
      }
      setSuggestions(next);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, isFocused, justPicked, countryCode]);

  const handleChangeText = (text: string) => {
    setJustPicked(false);
    onChangeText(text);
  };

  const handlePick = (suggestion: Suggestion) => {
    setJustPicked(true);
    setSuggestions([]);
    onPickCity(suggestion.resolved);
  };

  return (
    <View className="mb-4">
      <FieldLabel label={label} required={required} />
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: !countryCode }}
        editable={Boolean(countryCode)}
        value={value}
        onChangeText={handleChangeText}
        placeholder={countryCode ? 'e.g., Toronto' : 'Choose a country first'}
        placeholderTextColor={PLACEHOLDER_COLOR}
        autoCorrect={false}
        autoComplete="off"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`h-12 ${fieldBoxClass(isFocused)} text-[16px] text-kin-navy ${
          countryCode ? '' : 'opacity-50'
        }`}
      />
      {suggestions.length > 0 ? (
        <View className="mt-1 overflow-hidden rounded-xl border border-kin-stone-300 bg-white">
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.key}
              accessibilityRole="button"
              accessibilityLabel={suggestion.label}
              onPress={() => handlePick(suggestion)}
              className={`px-4 py-3 active:bg-kin-beige ${
                index > 0 ? 'border-t border-kin-stone-300/50' : ''
              }`}
            >
              <Text numberOfLines={1} className="text-[16px] text-kin-navy">
                {suggestion.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {helperText ? <Text className="mt-1 text-xs text-kin-stone-500">{helperText}</Text> : null}
    </View>
  );
};
