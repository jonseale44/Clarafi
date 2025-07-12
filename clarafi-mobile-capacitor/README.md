# Clarafi Mobile - Ionic React + Capacitor

This is the official Ionic React + Capacitor version of the Clarafi Mobile EMR application, ready for Ionic Appflow builds and app store deployment.

## Project Structure

This is a proper Ionic React application with:
- ✅ Ionic React framework with full component library
- ✅ Capacitor for native iOS/Android functionality
- ✅ TypeScript for type safety
- ✅ Vite for fast development builds
- ✅ React Router for navigation
- ✅ API proxy configured to connect to EMR backend

## Key Features Scaffolded

- **Login Page**: Clarafi-branded authentication
- **Home Dashboard**: Quick access to main features
- **Patient List**: Searchable patient directory
- **Side Menu Navigation**: iOS/Android native navigation patterns
- **API Service**: Ready to connect to your EMR backend

## Installation

```bash
cd clarafi-mobile-capacitor
npm install
```

## Development

```bash
# Web development
npm run dev

# Build for production
npm run build

# Sync with Capacitor
npm run cap:sync

# Open in Xcode (macOS only)
npm run cap:open:ios

# Open in Android Studio
npm run cap:open:android
```

## Ionic Appflow Setup

1. Push this project to GitHub
2. In Ionic Appflow:
   - Create new app
   - Select "Import existing app"
   - Choose "Capacitor" as the app type
   - Connect your GitHub repository
   - Set root directory to `clarafi-mobile-capacitor`

## Configuration for Appflow Builds

In your Appflow build configuration:
- Build stack: Latest
- Build type: App Store / Play Store
- Node version: 18.x or later
- Build command: `npm run build`
- Web directory: `dist`

## Migrating Code from Expo App

To migrate your existing Expo/React Native code:

1. **Components**: Convert React Native components to Ionic React:
   - `View` → `IonContent` or `div`
   - `Text` → `IonText` or `p`/`h1`/etc
   - `TouchableOpacity` → `IonButton`
   - `TextInput` → `IonInput`
   - `ScrollView` → `IonContent`

2. **Navigation**: Convert React Navigation to Ionic React Router:
   - Stack Navigator → Route components
   - Tab Navigator → `IonTabs`

3. **Native Features**: Use Capacitor plugins instead of Expo:
   - `expo-av` → `@capacitor/microphone`
   - `@react-native-async-storage` → `@capacitor/preferences`

4. **Styling**: Convert StyleSheet to CSS/SCSS:
   - React Native styles → CSS classes
   - Use Ionic CSS variables for theming

## Environment Variables

For production builds, update the API URL in `src/services/api.service.ts` to point to your production backend.

## Support

This project is configured for:
- ✅ Ionic Appflow builds
- ✅ App Store deployment (iOS)
- ✅ Google Play Store deployment (Android)
- ✅ Progressive Web App (PWA)

## Next Steps

1. Install dependencies: `npm install`
2. Add Capacitor platforms: `npx cap add ios` and `npx cap add android`
3. Sync Capacitor: `npm run cap:sync`
4. Push to GitHub
5. Connect to Ionic Appflow