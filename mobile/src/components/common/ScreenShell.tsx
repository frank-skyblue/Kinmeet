import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenShellProps = {
  title: string;
  children?: ReactNode;
};

export const ScreenShell = ({ title, children }: ScreenShellProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: insets.top }}>
      <Text accessibilityRole="header" className="text-2xl font-semibold text-slate-900">
        {title}
      </Text>
      {children}
    </View>
  );
};
