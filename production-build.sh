#!/bin/bash

# Production Build Script for AWS App Runner
# Installs system dependencies and builds the application

echo "🔧 Installing system dependencies..."
apt-get update
apt-get install -y imagemagick poppler-utils libvips-dev build-essential

echo "📦 Installing npm dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

echo "📁 Copying public assets..."
cp -r dist/public public

echo "✅ Production build complete!"