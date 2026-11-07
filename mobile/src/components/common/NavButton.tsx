import { Pressable, Text } from 'react-native';

type NavButtonProps = {
  label: string;
  onPress: () => void;
};

export const NavButton = ({ label, onPress }: NavButtonProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="mt-4 rounded-lg bg-slate-900 px-4 py-3"
    >
      <Text className="text-center text-base font-medium text-white">{label}</Text>
    </Pressable>
  );
};
