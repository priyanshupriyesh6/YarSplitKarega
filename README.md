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

## CI/CD Automation

This project is configured with GitHub Actions to automate EAS builds in the cloud. The workflow is located at `.github/workflows/eas-build.yml`.

### Automated Triggers
- **Branch Pushes & PRs:** Automatically triggers an Android `preview` profile build when changes are pushed or merged into the `main` or `master` branches.

### Manual Triggers (GitHub UI)
You can manually run builds directly from your repository's **Actions** tab on GitHub:
1. Go to the **Actions** tab in your repository.
2. Select the **EAS Build Automation** workflow from the left sidebar.
3. Click the **Run workflow** dropdown.
4. Select the target branch, target **platform** (`android`, `all`), and **profile** (`development`, `preview`, `production`).
5. Click **Run workflow** to initiate.

### Setup Instructions

To activate the automated workflow, you need to link your GitHub repository to your Expo account:

1. **Generate an Expo Access Token:**
   - Go to your [Expo Access Tokens Dashboard](https://expo.dev/settings/access-tokens).
   - Click **Create token**, give it a name (e.g., `GitHub Actions`), and copy the generated token.

2. **Add the Token to GitHub Secrets:**
   - In your GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions**.
   - Click **New repository secret**.
   - Set the name to `EXPO_TOKEN`.
   - Paste your generated Expo Access Token into the value field and click **Add secret**.

3. **Android Keystore Setup (First Time Only):**
   - Ensure your Android credentials have been configured on the Expo servers. If you have already run a manual EAS build from your terminal, this is done automatically. If not, run:
     ```bash
     eas credentials
     ```

---

## License

Copyright (c) 2025 Priyanshu Priyesh. All Rights Reserved.

This software is proprietary and confidential. Unauthorized use, copying,
modification, or distribution of this software is strictly prohibited.
See the [LICENSE](./LICENSE) file for full terms.

