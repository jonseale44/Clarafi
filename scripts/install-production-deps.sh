#!/bin/bash
# Install system dependencies for production deployment

echo "Installing system dependencies for document processing..."

# Update package list
apt-get update

# Install required packages
apt-get install -y \
    imagemagick \
    poppler-utils

echo "System dependencies installed successfully!"

# Verify installations
echo "Verifying installations..."
convert --version
pdftoppm -v