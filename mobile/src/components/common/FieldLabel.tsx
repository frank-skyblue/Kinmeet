import { Text } from 'react-native';

type FieldLabelProps = {
  label: string;
  /** Adds a red asterisk after the label. */
  required?: boolean;
  /** Defaults to the standard gap above the input; pass '' when the label sits in a row. */
  className?: string;
};

/** The label above every form field. */
export const FieldLabel = ({ label, required = false, className = 'mb-2' }: FieldLabelProps) => (
  <Text className={`text-sm font-medium text-kin-navy ${className}`}>
    {label}
    {required ? (
      <Text accessibilityLabel="required" className="text-red-600">
        {' *'}
      </Text>
    ) : null}
  </Text>
);
