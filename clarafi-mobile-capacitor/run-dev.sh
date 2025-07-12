#!/bin/bash

echo "Starting Ionic Capacitor development server..."
echo ""
echo "⚠️  Dependencies not fully installed yet."
echo "The project structure is complete but needs npm packages."
echo ""
echo "To complete setup:"
echo "1. Clone this folder to your local machine"
echo "2. Run 'npm install' locally"
echo "3. Or connect to Ionic Appflow for cloud builds"
echo ""
echo "Project files are ready at:"
echo "- src/App.tsx (main application)"
echo "- src/pages/ (Login, Home, PatientList)"
echo "- src/services/api.service.ts (API connection)"
echo ""

# Try to run vite anyway to see what happens
cd /home/runner/workspace/clarafi-mobile-capacitor
npx vite --port 3002