# Clarafi Mobile App

This is the native mobile version of the Clarafi EMR system with full functionality.

## How to Run the Mobile App

### Option 1: Run in Web Browser (Easiest)
1. Open a new terminal in Replit
2. Type these commands:
   ```
   cd clarafi-mobile
   npm install
   npm run web
   ```
3. The app will open in a web preview window

### Option 2: Run on Your Phone (Using Expo Go)
1. Install "Expo Go" app on your phone (from App Store or Play Store)
2. In the terminal, run:
   ```
   cd clarafi-mobile
   npm install
   npm start
   ```
3. Scan the QR code with your phone

### Option 3: Open in a New Browser Tab
After running `npm run web`, you can click the external link icon to open the mobile app in a full browser tab.

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

## Troubleshooting

If you see dependency errors, run:
```
cd clarafi-mobile
rm -rf node_modules
npm install
```

The mobile app connects to your existing EMR backend on port 5000.