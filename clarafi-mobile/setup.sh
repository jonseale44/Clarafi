#!/bin/bash

echo "Setting up Clarafi Mobile App..."
echo "================================"

# Navigate to mobile app directory
cd /home/runner/workspace/clarafi-mobile

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start your mobile app, run:"
echo "  cd /home/runner/workspace/clarafi-mobile"
echo "  npx expo start"
echo ""
echo "Then press 'w' to open in web browser"