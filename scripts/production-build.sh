#!/bin/bash
# Production build script for AWS App Runner

echo "Starting production build..."

# Install system dependencies if not present
if ! command -v convert &> /dev/null; then
    echo "Installing ImageMagick..."
    apt-get update && apt-get install -y imagemagick
fi

if ! command -v pdftoppm &> /dev/null; then
    echo "Installing Poppler utilities..."
    apt-get install -y poppler-utils
fi

# Verify installations
echo "Verifying system dependencies..."
convert --version | head -n 1
pdftoppm -v

# Run normal build process
echo "Installing Node dependencies..."
npm install

echo "Building application..."
npm run build

echo "Copying public assets..."
cp -r dist/public public

echo "Build complete!"