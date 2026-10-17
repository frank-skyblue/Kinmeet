import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/useAuth';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export const RootNavigator = () => {
  const { isLoading, token } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white" accessibilityLabel="Loading">
        <ActivityIndicator accessibilityLabel="Loading session" />
      </View>
    );
  }

  if (!token) {
    return <AuthStack />;
  }

  return <MainTabs />;
};
