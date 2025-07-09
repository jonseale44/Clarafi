#!/bin/bash

echo "=== Clarafi Mobile App Setup ==="
echo ""
echo "Cleaning up old dependencies..."
rm -rf node_modules package-lock.json

echo ""
echo "Installing fresh dependencies..."
npm install --legacy-peer-deps

echo ""
echo "Starting the mobile app in web mode..."
echo "Note: The warning about expo-cli is expected - we're using npx instead"
echo ""
npx expo start --web --port 19006

# If the above doesn't work, try:
# npx expo start --web