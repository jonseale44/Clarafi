#!/bin/bash

echo "Setting up Clarafi Mobile Capacitor project..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Add Capacitor platforms
echo "Adding iOS platform..."
npx cap add ios

echo "Adding Android platform..."
npx cap add android

# Build the project
echo "Building project..."
npm run build

# Sync Capacitor
echo "Syncing Capacitor..."
npx cap sync

echo "✅ Setup complete! The project is ready for Ionic Appflow."
echo ""
echo "Next steps:"
echo "1. Commit and push to GitHub"
echo "2. Connect to Ionic Appflow"
echo "3. Configure build settings in Appflow"
echo ""
echo "To run locally:"
echo "  npm run dev          # Web development"
echo "  npm run cap:open:ios # Open iOS project"
echo "  npm run cap:open:android # Open Android project"