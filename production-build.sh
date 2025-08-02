#!/bin/bash

# Production Build Script for AWS App Runner
# Installs system dependencies and builds the application

echo "🔧 Installing system dependencies..."
yum update -y
yum install -y ImageMagick poppler-utils libvips-devel gcc gcc-c++ make

echo "📦 Installing npm dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

echo "📁 Copying public assets..."
cp -r dist/public public

echo "✅ Production build complete!"