import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  className?: string;
};

const VARIANT_CLASSES = {
  primary: { box: 'bg-kin-coral', text: 'text-white', spinner: '#FFFFFF' },
  secondary: { box: 'border border-kin-stone-300 bg-white', text: 'text-kin-navy', spinner: '#113B50' },
} as const;

/** Full-width action button. Put two in a `flex-row gap-3` row with `className="flex-1"` for Back/Next. */
export const Button = ({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  loadingLabel,
  disabled = false,
  className = '',
}: ButtonProps) => {
  const styles = VARIANT_CLASSES[variant];
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-80 ${
        styles.box
      } ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {isLoading ? <ActivityIndicator color={styles.spinner} /> : null}
      <Text className={`text-lg font-bold ${styles.text}`}>
        {isLoading && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
};
