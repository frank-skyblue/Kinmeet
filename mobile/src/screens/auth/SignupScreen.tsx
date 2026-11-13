import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/useAuth';
import type { AuthStackParamList } from '../../navigation/types';
import { profileAPI } from '../../services/api';
import { dobIsoBoundsUtc } from '../../utils/age';
import { getErrorMessage } from '../../utils/error';
import { USERNAME_MESSAGES } from '../../utils/username';
import { INITIAL_SIGNUP_FORM, type SignupForm } from './signupForm';
import { DUPLICATE_EMAIL_MESSAGE, SignupStep1 } from './SignupStep1';
import { SignupStep2 } from './SignupStep2';
import { SignupStep3 } from './SignupStep3';
import { SignupStep4 } from './SignupStep4';

const kinmeetLogo = require('../../../assets/KinmeetLogo.png');

type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const TOTAL_STEPS = 4;
const STEPS = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

const isDuplicateEmailMessage = (message: string) =>
  message === DUPLICATE_EMAIL_MESSAGE || message === 'User already exists';

export const SignupScreen = ({ navigation }: SignupScreenProps) => {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [form, setForm] = useState<SignupForm>(INITIAL_SIGNUP_FORM);
  const [step, setStep] = useState(1);
  // Steps can be revisited from the indicator, but not skipped ahead past validation.
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [error, setErrorState] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const handleFormChange = (changes: Partial<SignupForm>) => {
    setForm((prev) => ({ ...prev, ...changes }));
    // An edit invalidates this step's earlier checks, so later steps can't be reached from the
    // indicator until Next re-runs them. Answers on later steps are kept.
    setMaxReachedStep(step);
  };

  /** Errors show above the form, so scroll up to them (the button that caused one is at the bottom). */
  const setError = (message: string) => {
    setErrorState(message);
    if (message) scrollToTop();
  };

  const goToStep = (next: number) => {
    setStep(next);
    setMaxReachedStep((max) => Math.max(max, next));
    setErrorState('');
    scrollToTop();
  };

  const handleSubmit = async () => {
    const { minIsoUtc, todayIsoUtc } = dobIsoBoundsUtc();
    const dob = form.dateOfBirth.trim();
    if (dob > todayIsoUtc || dob < minIsoUtc) {
      setError('Invalid date of birth');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email,
        username: form.username.trim() || undefined,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        about: form.about.trim() || undefined,
        industry: form.industry.trim() || undefined,
        educationLevel: form.educationLevel.trim() || undefined,
        homeCountry: form.homeCountry,
        currentLocation: {
          province: form.currentProvince,
          country: form.currentCountry,
          city: form.currentCity.trim(),
        },
        languages: form.languages.filter((language) => language.trim() !== ''),
        interests: form.interests.filter((interest) => interest.trim() !== ''),
        lookingFor: form.lookingFor,
        dateOfBirth: dob,
        gender: form.gender.trim(),
      });

      if (form.photo) {
        try {
          await profileAPI.uploadPhoto(form.photo);
        } catch {
          // Non-critical: the user can add a photo later from their profile.
        }
      }
      // No navigate() needed: register() stores the session and RootNavigator switches to the app.
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Registration failed. Please try again.');
      // Someone claimed the username after step 1 checked it: send the user back to that field.
      if (message === USERNAME_MESSAGES.taken) {
        setStep(1);
        setError(USERNAME_MESSAGES.taken);
        return;
      }
      setError(isDuplicateEmailMessage(message) ? DUPLICATE_EMAIL_MESSAGE : message);
    } finally {
      setIsLoading(false);
    }
  };

  const stepProps = { form, onChange: handleFormChange, setError };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow px-6"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* Header */}
        <View className="mb-6 items-center">
          <Image
            source={kinmeetLogo}
            accessibilityLabel="KinMeet logo"
            className="mb-4 h-16 w-16"
            resizeMode="contain"
          />
          <Text accessibilityRole="header" className="text-2xl font-bold text-kin-navy">
            Join KinMeet
          </Text>
          <Text className="mt-1 text-center text-base text-kin-teal">
            Connect with people from your homeland living abroad
          </Text>
        </View>

        {/* Step indicator */}
        <View className="mb-6 flex-row items-center justify-center">
          {STEPS.map((s) => {
            const isReachable = s <= maxReachedStep && !isLoading;
            return (
              <View key={s} className="flex-row items-center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Go to signup step ${s}`}
                  accessibilityState={{ selected: s === step, disabled: !isReachable }}
                  disabled={!isReachable}
                  onPress={() => goToStep(s)}
                  className={`h-8 w-8 items-center justify-center rounded-full active:opacity-70 ${
                    s <= step ? 'bg-kin-coral' : 'bg-kin-stone-300'
                  } ${s > maxReachedStep ? 'opacity-60' : ''}`}
                >
                  <Text className="text-sm font-semibold text-white">{s}</Text>
                </Pressable>
                {s < TOTAL_STEPS && (
                  <View
                    className={`mx-1 h-0.5 w-8 ${s < step ? 'bg-kin-coral' : 'bg-kin-stone-300'}`}
                  />
                )}
              </View>
            );
          })}
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            className="mb-6 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-4 py-3 text-kin-coral-700"
          >
            {error}
          </Text>
        ) : null}

        {/* Current step */}
        {step === 1 && <SignupStep1 {...stepProps} onNext={() => goToStep(2)} />}
        {step === 2 && (
          <SignupStep2 {...stepProps} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />
        )}
        {step === 3 && (
          <SignupStep3
            form={form}
            onChange={handleFormChange}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}
        {step === 4 && (
          <SignupStep4
            {...stepProps}
            isLoading={isLoading}
            onBack={() => goToStep(3)}
            onSubmit={handleSubmit}
          />
        )}

        {/* Footer */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-kin-navy">Already have an account? </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="font-semibold text-kin-coral">Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
