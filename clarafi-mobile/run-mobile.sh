#!/bin/bash

echo "Cleaning up old dependencies..."
rm -rf node_modules
rm -f package-lock.json

echo "Installing fresh dependencies..."
npm install

echo "Starting mobile app..."
npm run web