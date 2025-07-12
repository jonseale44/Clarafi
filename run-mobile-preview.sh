#!/bin/bash

echo "🚀 Starting Clarafi Mobile Preview..."
echo ""

cd clarafi-mobile-capacitor

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
    echo ""
fi

echo "🌐 Starting mobile app dev server..."
echo "📱 Mobile app will be available at: https://[your-replit-url]:3002"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev