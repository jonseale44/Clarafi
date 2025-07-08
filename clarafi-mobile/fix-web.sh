#!/bin/bash
# Fix web dependencies for Clarafi Mobile

echo "Fixing web dependencies..."
npm install --save --legacy-peer-deps react-native-web@0.19.12 @expo/metro-runtime@~5.0.4

echo ""
echo "✅ Done! Now press 'w' in your Expo terminal to open in browser."