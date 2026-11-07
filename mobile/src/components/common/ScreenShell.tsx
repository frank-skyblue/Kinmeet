import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type ScreenShellProps = {
  title: string;
  children?: ReactNode;
};

export const ScreenShell = ({ title, children }: ScreenShellProps) => {
  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text accessibilityRole="header" className="text-2xl font-semibold text-slate-900">
        {title}
      </Text>
      {children}
    </View>
  );
};
