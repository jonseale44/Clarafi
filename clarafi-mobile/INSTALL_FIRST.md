# Quick Install Instructions

## Step 1: Open a NEW terminal window

## Step 2: Copy and run these commands:

```bash
cd /home/runner/workspace/clarafi-mobile
npm install --legacy-peer-deps
```

## Step 3: Once installed, start the app:

```bash
npx expo start
```

Then press 'w' to see it in your browser.

## What Happens Next:

After you get the basic app running, we'll immediately add:
1. Voice recording button
2. WebSocket connection to your server
3. Real-time transcription display
4. SOAP note generation
5. All your other features

The mobile app will connect to your existing Express backend at http://localhost:5000 and use ALL the same AI endpoints!