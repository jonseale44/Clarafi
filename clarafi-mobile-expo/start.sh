#!/bin/bash
# Start script for Expo in Replit

# Export the API URL for mobile development
export EXPO_PUBLIC_API_URL="http://localhost:5000"

# Start Expo with Replit-specific configuration
npx expo start --tunnel --port 19000