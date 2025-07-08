#!/bin/bash
# Start Clarafi Mobile with proper Replit configuration

echo "Starting Clarafi Mobile for Replit..."

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null

# Wait a moment
sleep 2

# Start Expo with web support and proper host configuration
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --web --host 0.0.0.0 --port 8081

echo "Mobile app should now be accessible!"