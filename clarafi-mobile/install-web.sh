#!/bin/bash
# Install web dependencies for Clarafi Mobile

echo "Installing web dependencies for Clarafi Mobile..."
npm install --legacy-peer-deps react-native-web@0.19.12 @expo/metro-runtime@~5.0.4

echo "Done! Now press 'w' in your Expo terminal to open in web browser."