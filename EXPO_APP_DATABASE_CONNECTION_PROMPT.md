# Prompt for Configuring Expo App Database Connection

## Current Issue
The Expo app in `/clarafi-mobile` needs to connect to the same database as the main EMR system. The recent changes using `process.env.REPLIT_DEV_DOMAIN` are incorrect.

## Important Context
1. The main EMR backend runs on port 5000 and connects to a PostgreSQL database via `DATABASE_URL`
2. Mobile apps should NEVER connect directly to the database
3. Mobile apps must connect to the backend API, which then accesses the database
4. The Expo app is in the `/clarafi-mobile` folder

## Requirements
Please configure the Expo app to properly connect to the main EMR backend:

### For Development (Running in Expo Go on phone):
- If testing on a physical device, the API URL cannot be `localhost:5000`
- You need to use one of these approaches:
  1. Use your computer's local IP address (e.g., `http://192.168.1.100:5000`)
  2. Use a tunnel service like ngrok or Expo's tunnel feature
  3. Use the Replit preview URL (without adding :5000)

### For Production/Deployment:
- Use the deployed backend URL (not localhost)
- This should be an environment variable that can be configured

## Specific Changes Needed:

1. **Revert the incorrect changes** in `/clarafi-mobile/src/services/api.ts`:
   - Remove the `:5000` from the Replit domain (Replit already handles port routing)
   - The WebSocket URL should match the API URL scheme

2. **Update the API configuration** to support multiple environments:
   ```typescript
   // For Expo apps, use these environment detection methods:
   const getApiUrl = () => {
     // If running in Replit web preview
     if (process.env.REPLIT_DEV_DOMAIN) {
       return `https://${process.env.REPLIT_DEV_DOMAIN}`;
     }
     
     // For local development with Expo Go on physical device
     // Replace with your computer's IP address
     if (__DEV__) {
       return 'http://YOUR_COMPUTER_IP:5000'; // e.g., http://192.168.1.100:5000
     }
     
     // Production URL
     return process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com';
   };
   ```

3. **Update WebSocket connections** to match:
   ```typescript
   const wsUrl = getApiUrl().replace('http', 'ws');
   const ws = new WebSocket(`${wsUrl}/api/realtime/connect`);
   ```

4. **Test the connection**:
   - The app should be able to login with `admin/admin123`
   - It should show the same patient data as the main web app
   - Check that API calls go to `/api/*` endpoints on the backend

## DO NOT:
- Add `:5000` to Replit domains (Replit handles port routing automatically)
- Try to connect directly to the PostgreSQL database from the mobile app
- Use hardcoded URLs - always use environment variables or configuration

## Verification:
After making changes, verify that:
1. The Expo app can successfully login
2. Patient data matches what's in the main web EMR
3. All API calls are reaching the Express backend on port 5000
4. The backend logs show requests coming from the Expo app

Please make these changes and ensure the Expo app properly connects to the same backend (and thus the same database) as the main EMR system.