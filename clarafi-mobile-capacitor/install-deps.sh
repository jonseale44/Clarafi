#!/bin/bash

echo "Installing Ionic Capacitor dependencies..."

# Install core dependencies first
echo "Installing core Ionic and React dependencies..."
npm install --no-save @ionic/react @ionic/react-router react react-dom react-router react-router-dom ionicons

echo "Installing Capacitor dependencies..."
npm install --no-save @capacitor/core @capacitor/android @capacitor/ios @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar

echo "Installing utility dependencies..."
npm install --no-save @tanstack/react-query lucide-react

echo "Installing dev dependencies..."
npm install --save-dev @capacitor/cli @types/react @types/react-dom @types/react-router @types/react-router-dom @vitejs/plugin-react typescript vite

echo "✅ Dependencies installed!"