# yarsplitkarega 💸

> **Split smarter. Settle faster.**

A modern expense-splitting app for friend groups, trips, and shared living — built with React Native & Expo SDK 56.

---

## Features

- 🔐 **Authentication** — Email/password sign-in and sign-up
- 🏠 **Groups** — Create and manage expense groups for any occasion
- ➕ **Add Expenses** — Log bills with category tagging, amounts, and splits
- 📊 **Dashboard** — Quick overview of balances, who owes whom, and recent activity
- 📈 **Reports** — Visual spending breakdowns with charts by category and time period
- 📷 **Receipt Scanner** — Scan receipts using the camera to auto-fill expense details
- 👤 **Profile** — Manage your account and app preferences
- 🔔 **Notifications** — Reminders to settle up outstanding balances
- 🌙 **Dark Mode** — Full dark UI out of the box

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 56 |
| Language | TypeScript |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| State Management | Zustand + AsyncStorage persistence |
| Data Fetching | TanStack React Query v5 |
| Forms | React Hook Form + Zod validation |
| UI / Styling | React Native StyleSheet + Expo Linear Gradient |
| Icons | @expo/vector-icons (Ionicons) |
| Charts | react-native-gifted-charts |
| Camera | expo-camera + expo-image-picker |
| Fonts | Inter (via @expo-google-fonts) |
| Build | EAS Build |

---

## Project Structure

```
yarsplitkarega/
├── src/
│   ├── components/
│   │   ├── screens/          # Full-page screen components
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── GroupsScreen.tsx
│   │   │   ├── AddExpenseScreen.tsx
│   │   │   ├── ReportsScreen.tsx
│   │   │   ├── ScannerScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── navigation/       # Navigation helpers
│   │   ├── ui/               # Reusable UI primitives
│   │   └── AppNavigator.tsx  # Root navigator
│   ├── constants/
│   │   └── theme.ts          # Design tokens (colors, spacing, typography)
│   ├── store/
│   │   ├── authStore.ts      # Authentication state (Zustand)
│   │   └── expenseStore.ts   # Groups & expenses state (Zustand)
│   ├── types/
│   │   └── index.ts          # Shared TypeScript interfaces
│   └── utils/                # Helper functions
├── assets/                   # Icons, splash screen, fonts
├── App.tsx                   # App entry point & splash screen
├── app.json                  # Expo configuration
├── eas.json                  # EAS Build profiles
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/) — `npm install -g eas-cli`
- An [Expo account](https://expo.dev/signup) (free)

### Installation

```bash
# Clone the repo
git clone https://github.com/priyanshupriyesh6/YarSplitKarega.git
cd YarSplitKarega

# Install dependencies
npm install
```

### Running in Development

> **Note:** This project uses Expo SDK 56, which requires a **development build** — it cannot run in the standard Expo Go app.

**Step 1 — Build your custom dev client (first time only):**
```bash
eas build --profile development --platform android
```
Install the resulting `.apk` on your Android device.

**Step 2 — Start the Metro bundler:**
```bash
npx expo start --dev-client
```

Scan the QR code from inside your installed dev client app.

---

## EAS Build Profiles

| Profile | Distribution | Output | Use For |
|---|---|---|---|
| `development` | Internal | `.apk` | Local development with dev client |
| `preview` | Internal | `.apk` | Sharing with testers |
| `production` | Store | `.aab` | Google Play Store submission |

```bash
# Development build
eas build --profile development --platform android

# Preview build (shareable APK)
eas build --profile preview --platform android

# Production build
eas build --profile production --platform android
```

---

## License

Copyright (c) 2025 Priyanshu Priyesh. All Rights Reserved.

This software is proprietary and confidential. Unauthorized use, copying,
modification, or distribution of this software is strictly prohibited.
See the [LICENSE](./LICENSE) file for full terms.
