---
description: Build Android APK for client distribution
---

# Build Android APK for Client

Follow these steps to create an installable APK file for your client:

## Prerequisites
1. Create an Expo account at https://expo.dev (free)
2. Install EAS CLI globally

## Step-by-Step Instructions

### 1. Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```
Enter your Expo account credentials.

### 3. Configure EAS Build
```bash
eas build:configure
```
This creates an `eas.json` file in your project.

### 4. Build APK for Android
```bash
eas build -p android --profile preview
```

**Options:**
- For development build: `eas build -p android --profile development`
- For production build: `eas build -p android --profile production`
- For APK (not AAB): Add `--profile preview` or configure in eas.json

### 5. Download and Share
- After build completes (15-30 minutes), you'll get a download link
- Download the APK file
- Share the APK with your client via email, Google Drive, or any file sharing service
- Client can install it directly on their Android device (may need to enable "Install from unknown sources")

## Alternative: Build Locally (Faster, No Expo Account Needed)

### Using expo-dev-client
```bash
# Install expo-dev-client
npx expo install expo-dev-client

# Build locally (requires Android Studio)
npx expo run:android --variant release
```
The APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

## For iOS (IPA file)
```bash
# Requires Apple Developer account ($99/year)
eas build -p ios --profile preview
```

## Notes
- APK files can be installed directly on Android devices
- For Google Play Store submission, you'll need an AAB file (use production profile)
- iOS apps require Apple Developer account and TestFlight for distribution
