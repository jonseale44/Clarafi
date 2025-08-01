#!/bin/bash

# Post-build script to copy necessary files to dist directory

echo "Running post-build script..."

# Create certs directory in dist
mkdir -p dist/certs

# Copy AWS certificate bundle
if [ -f "server/certs/aws-global-bundle.pem" ]; then
    cp server/certs/aws-global-bundle.pem dist/certs/
    echo "✅ Copied AWS certificate bundle to dist/certs/"
else
    echo "⚠️  Warning: AWS certificate bundle not found at server/certs/aws-global-bundle.pem"
fi

echo "Post-build script completed."