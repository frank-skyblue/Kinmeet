import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { PLACEHOLDER_COLOR, fieldBoxClass } from './FormField';
import { FieldLabel } from './FieldLabel';

type PasswordFieldProps = {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  helperText?: string;
  /** "new-password" lets iOS suggest a strong password on sign-up. */
  autoComplete?: 'password' | 'new-password';
  /** Shown at the right end of the label row, e.g. a "Forgot password?" link. */
  labelAccessory?: ReactNode;
};

export const PasswordField = ({
  label,
  required = false,
  value,
  onChangeText,
  helperText,
  autoComplete = 'password',
  labelAccessory,
}: PasswordFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className="mb-4">
      {labelAccessory ? (
        <View className="mb-2 flex-row items-center justify-between">
          <FieldLabel label={label} required={required} className="" />
          {labelAccessory}
        </View>
      ) : (
        <FieldLabel label={label} required={required} />
      )}
      <View className={`h-12 flex-row items-center ${fieldBoxClass(isFocused)}`}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder="••••••••"
          placeholderTextColor={PLACEHOLDER_COLOR}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-full flex-1 text-[16px] text-kin-navy"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          hitSlop={8}
          onPress={() => setIsVisible((prev) => !prev)}
        >
          <Text className="text-sm font-semibold text-kin-teal">{isVisible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      {helperText ? <Text className="mt-1 text-xs text-kin-stone-500">{helperText}</Text> : null}
    </View>
  );
};
