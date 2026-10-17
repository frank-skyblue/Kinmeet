import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/useAuth';
import type { AuthStackParamList } from '../../navigation/types';
import { getErrorMessage } from '../../utils/error';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PLACEHOLDER_COLOR = '#A79F97';

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handleSignIn = async () => {
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSignup = () => {
    navigation.navigate('Signup');
  };

  const handleOpenForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-kin-beige"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow justify-center px-4 py-8"
      >
        <View className="rounded-3xl bg-white px-6 py-8">
          <Text accessibilityRole="header" className="text-center text-4xl font-bold text-kin-navy">
            KinMeet
          </Text>
          <Text className="mb-8 mt-2 text-center text-base text-kin-teal">
            Connect with your homeland community abroad
          </Text>

          {error ? (
            <Text
              accessibilityRole="alert"
              className="mb-6 rounded-2xl border border-kin-coral-200 bg-kin-coral-50 px-4 py-3 text-kin-coral-700"
            >
              {error}
            </Text>
          ) : null}

          <Text className="mb-2 text-sm font-medium text-kin-navy">Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={email}
            onChangeText={handleEmailChange}
            className="mb-6 rounded-xl border border-kin-stone-300 px-4 py-3 text-base text-kin-navy"
          />

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-kin-navy">Password</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              onPress={handleOpenForgotPassword}
            >
              <Text className="text-xs text-kin-coral">Forgot password?</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={password}
            onChangeText={handlePasswordChange}
            className="rounded-xl border border-kin-stone-300 px-4 py-3 text-base text-kin-navy"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={handleSignIn}
            className="mt-8 rounded-xl bg-kin-coral px-6 py-4 disabled:opacity-50"
          >
            <Text className="text-center text-lg font-bold text-white">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Text>
          </Pressable>

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-kin-navy">{"Don't have an account? "}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign up"
              onPress={handleOpenSignup}
            >
              <Text className="font-semibold text-kin-coral">Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
