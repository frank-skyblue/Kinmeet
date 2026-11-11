import { Text } from 'react-native';

type FieldLabelProps = {
  label: string;
  /** Adds a red asterisk after the label. */
  required?: boolean;
};

/** The label above every form field. */
export const FieldLabel = ({ label, required = false }: FieldLabelProps) => (
  <Text className="mb-2 text-sm font-medium text-kin-navy">
    {label}
    {required ? (
      <Text accessibilityLabel="required" className="text-red-600">
        {' *'}
      </Text>
    ) : null}
  </Text>
);
