# KinMeet mobile architecture

This document describes the Expo app shell: entry point, auth, navigation, and where feature code will land. Day-to-day rules live in [`.cursor/rules/mobile-architecture.mdc`](../../.cursor/rules/mobile-architecture.mdc). The web app map is [front-end/docs/ARCHITECTURE.md](../../front-end/docs/ARCHITECTURE.md).

Login submits email and password through `authAPI.login`. A stored token opens the tabs. The Profile tab loads the signed-in member with `profileAPI.getProfile` and can log out. Signup, password reset, and the other tabs are still placeholders.

---

## Runtime entry

| Piece | Role |
| --- | --- |
| `index.ts` | Registers `App` with Expo |
| `App.tsx` | Imports `global.css`, then `SafeAreaProvider`, `AuthProvider`, and `NavigationContainer` |
| `app.config.ts` | App name, `com.kinmeet.app` for Android and iOS, SecureStore plugin |
| `global.css` | Tailwind entry for NativeWind |

`android/` and `ios/` are generated at build time and are gitignored.

---

## Provider order

1. **`SafeAreaProvider`** — required by React Navigation.
2. **`AuthProvider`** — reads the JWT and user JSON from `expo-secure-store`, exposes `login`, `register`, and `logout`.
3. **`NavigationContainer`** — React Navigation.

Chat inbox and connection-request providers stay off this tree until those screens are ported. `socketService` can connect with the stored token, and nothing calls it during launch.

---

## Navigation

`RootNavigator` waits until SecureStore hydration finishes. No token shows the auth stack. A token shows the main tabs.

| Area | Screens |
| --- | --- |
| Auth stack | Login, Sign up, Forgot password, Reset password |
| Tabs | Discover, Connections, Chat, Profile |
| Chat stack | Chat home, conversation (`userId`) |
| Profile stack | Signed-in profile (`GET /profile/me`), member profile placeholder (`userId`), Settings |
| Settings stack | Settings, Account, Community safety, Support, Contact support, Feedback, Privacy, Blocked accounts |

Admin routes stay on the web app. The web `/requests` path is not a separate screen; requests will live on Connections when that screen is ported.

---

## Directory map (`src/`)

| Area | Responsibility |
| --- | --- |
| `types/index.ts` | `User`, `UserProfile`, `RegisterPayload`, and auth response types. Add domain types here when a screen needs them. |
| `constants/` | Storage keys. Must not import from screens or components. |
| `utils/` | `getErrorMessage` and `calculateAgeFromDateOfBirth`. |
| `services/api.ts` | Axios client. `EXPO_PUBLIC_API_URL` is the base URL. The request interceptor sanitizes JSON bodies and attaches the bearer token from SecureStore. `authAPI` covers login, register, logout, forgot password, and reset password. `profileAPI.getProfile` loads the signed-in member. `getPhotoUrl` resolves a relative photo path against the API origin. |
| `services/socketService.ts` | Socket.io client. The socket origin is the API URL with `/api` removed. |
| `contexts/` | Auth context definition, provider, and `useAuth`. |
| `navigation/` | Navigators and route param lists. |
| `screens/` | Feature screens: `auth/`, `matching/`, `connections/`, `chat/`, `profile/`, `settings/`. |
| `components/common/` | Shared chrome (`ScreenShell`, `NavButton`). |
| `components/profile/` | Read-only profile details for the signed-in member. |

Later REST namespaces (`matchingAPI`, `connectionsAPI`, `chatAPI`, `blockAPI`, `feedbackAPI`, `supportAPI`) belong in `services/api.ts` when those screens are ported.

---

## When to update this document

Update this file when you change any of the following:

- Provider order in `App.tsx`
- Auth versus signed-in navigation, or a new stack or tab
- A new global context
- A new top-level `services/api.ts` namespace, or the socket connection contract
- A new first-class `src/` area

A single placeholder screen that does not change those boundaries does not require an update.
