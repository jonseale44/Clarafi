# Clarafi Mobile App

This is the native mobile version of the Clarafi EMR system with full functionality.

## How to Run the Mobile App

### Quick Start (Recommended)
1. Open a new terminal in Replit
2. Run these commands:
   ```
   cd clarafi-mobile
   rm -rf node_modules package-lock.json
   npm install
   npx expo start --web
   ```
3. The app will open in the web preview

### Alternative: Using npm scripts
```
cd clarafi-mobile
npm install
npm run web
```

### Run on Your Phone (Using Expo Go)
1. Install "Expo Go" app on your phone
2. Run `npx expo start` (without --web)
3. Scan the QR code

## Features Available

- ✅ Login with your existing EMR credentials
- ✅ View patient list with search
- ✅ Voice recording and transcription
- ✅ SOAP note generation from voice
- ✅ View complete patient charts
- ✅ Natural language order entry

## Test Credentials
- Username: `admin`
- Password: `admin123`

## Note about Expo CLI
The warning about expo-cli being deprecated is expected. We're using the local Expo SDK which is the recommended approach.

## Troubleshooting

If you get dependency errors:
1. Delete node_modules and package-lock.json
2. Run `npm install` again
3. Use `npx expo` instead of global expo

The mobile app connects to your existing EMR backend on port 5000.