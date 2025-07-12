# Clarafi Mobile Capacitor Setup

## ✅ Capacitor Configuration Complete!

Your Clarafi Mobile app is now ready for Ionic Appflow "Capacitor" builds and app store publishing.

## What's Been Done

1. **Capacitor Dependencies Installed**
   - `@capacitor/core` - Core Capacitor functionality
   - `@capacitor/cli` - Capacitor CLI tools
   - `@capacitor/ios` - iOS platform support
   - `@capacitor/android` - Android platform support

2. **Native Platforms Configured**
   - ✅ iOS platform (`/ios` folder) - Ready for Xcode
   - ✅ Android platform (`/android` folder) - Ready for Android Studio
   - ✅ `capacitor.config.ts` configured with:
     - App ID: `com.clarafi.mobile`
     - App Name: `Clarafi Mobile`
     - Web Directory: `dist`

3. **Build and Sync Completed**
   - Web assets built to `/dist` folder
   - Native projects synced with latest web build

4. **NPM Scripts Added**
   - `npm run cap:sync` - Build and sync with native platforms
   - `npm run cap:open:ios` - Open iOS project in Xcode
   - `npm run cap:open:android` - Open Android project in Android Studio
   - `npm run cap:run:ios` - Run on iOS simulator/device
   - `npm run cap:run:android` - Run on Android emulator/device

## Next Steps

### 1. Commit and Push to GitHub
```bash
git add clarafi-mobile-web/
git commit -m "Complete Capacitor setup for Clarafi Mobile"
git push origin main
```

### 2. Connect to Ionic Appflow
1. Go to [Ionic Appflow](https://dashboard.ionicframework.com/)
2. Create a new app
3. Select "Import existing app"
4. Choose "Capacitor" as the app type
5. Connect your GitHub repository
6. Select the `clarafi-mobile-web` folder as the root

### 3. Configure Appflow Build
In Appflow dashboard:
- Set build type to "Capacitor"
- Set build directory to `clarafi-mobile-web`
- Configure signing certificates for iOS/Android
- Set up build environments

## Project Structure
```
clarafi-mobile-web/
├── src/                    # React source code
├── dist/                   # Built web assets
├── ios/                    # iOS native project
├── android/                # Android native project
├── capacitor.config.ts     # Capacitor configuration
├── package.json            # Node dependencies & scripts
└── index.html              # Entry HTML file
```

## Important Notes

- The app connects to your EMR backend on port 5000
- Make sure to update the API URL for production builds
- iOS builds require an Apple Developer account
- Android builds require signing keys for production

## Testing Locally

1. **Web Development**
   ```bash
   npm run dev
   ```

2. **Build and Sync**
   ```bash
   npm run cap:sync
   ```

3. **iOS Development** (requires macOS with Xcode)
   ```bash
   npm run cap:open:ios
   ```

4. **Android Development** (requires Android Studio)
   ```bash
   npm run cap:open:android
   ```