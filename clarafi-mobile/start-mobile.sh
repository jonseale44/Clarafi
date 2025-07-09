#!/bin/bash
# Start Clarafi Mobile with proper Replit configuration

echo "Starting Clarafi Mobile for Replit..."

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null

# Wait a moment
sleep 2

# Start Expo with web support for Replit
# Using localhost which Replit will proxy correctly
npx expo start --web --port 8081

echo "Mobile app should now be accessible!"