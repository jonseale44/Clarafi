#!/bin/bash

echo "Setting up Clarafi Mobile App..."

# Navigate to mobile app directory
cd clarafi-mobile

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the Expo development server
echo "Starting Expo server..."
npm run web