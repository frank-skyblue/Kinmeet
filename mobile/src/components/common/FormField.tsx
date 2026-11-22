import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { FieldLabel } from './FieldLabel';

export const PLACEHOLDER_COLOR = '#A79F97'; // kin-stone-500

/** Input box chrome shared by every field (text inputs, selects, pickers). */
export const fieldBoxClass = (isFocused: boolean) =>
  `rounded-xl border bg-white px-4 ${isFocused ? 'border-kin-coral' : 'border-kin-stone-300'}`;

type FormFieldProps = Omit<TextInputProps, 'className' | 'placeholderTextColor'> & {
  label: string;
  required?: boolean;
  helperText?: string;
};

/** Label, input and optional helper text with the app's standard spacing and focus border. */
export const FormField = ({
  label,
  required = false,
  helperText,
  multiline,
  onFocus,
  onBlur,
  ...inputProps
}: FormFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      <FieldLabel label={label} required={required} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={PLACEHOLDER_COLOR}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        // text-[16px], not text-base: a line height pushes TextInput text down on iOS.
        className={`${fieldBoxClass(isFocused)} text-[16px] text-kin-navy ${
          multiline ? 'h-28 py-3' : 'h-12'
        }`}
        {...inputProps}
      />
      {helperText ? <Text className="mt-1 text-xs text-kin-stone-500">{helperText}</Text> : null}
    </View>
  );
};
