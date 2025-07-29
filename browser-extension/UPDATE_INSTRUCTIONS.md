# Clarafi Browser Extension - Desktop Capture Update

## What's New
The Clarafi browser extension now supports capturing from ANY application on your computer - not just browser tabs! This major upgrade uses Chrome's desktop capture API to let you capture screenshots from:

- Desktop EMR applications (Epic via Citrix, etc.)
- Any browser-based EMR (Athena, Cerner, etc.)
- Any window or application on your screen
- Your entire screen if needed

## Installation Instructions

### 1. Remove Previous Version (if installed)
1. Go to Chrome Menu → More tools → Extensions
2. Find "Clarafi Secure Capture" if it exists
3. Click "Remove" 

### 2. Install Updated Extension
1. Download `browser-extension-desktop.tar.gz` from this folder
2. Extract the files to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" toggle in the top right
5. Click "Load unpacked"
6. Select the extracted `browser-extension` folder
7. The extension should now appear in your extensions list

### 3. Grant Permissions
When you first use the extension, Chrome will ask for permission to:
- Access tabs (for detecting Clarafi patient context)
- Capture your screen (for taking screenshots)
- Show notifications (for success/error messages)

## How to Use

### 1. Open Patient Record in Clarafi
- Navigate to any patient in your Clarafi EMR
- The extension will automatically detect the patient context

### 2. Click Extension Icon
- Click the Clarafi extension icon in your browser toolbar
- You'll see the patient name and ID if connected properly

### 3. Choose Capture Method
- **Capture Screen or Window**: Click this to capture from ANY application
  - Chrome will show a dialog to select which screen or window to capture
  - Select your EMR application (browser tab, desktop app, Citrix window, etc.)
  - Click "Share" to capture that window
  
- **Select Area to Capture**: For capturing specific regions (coming soon)

### 4. Review and Upload
- The screenshot will appear in Clarafi's attachment preview
- Add any notes or descriptions
- Click "Upload" to save to the patient's chart

## Key Features
- **Zero PHI Storage**: Screenshots stream directly to Clarafi servers
- **Works Anywhere**: Capture from desktop apps, Citrix, browsers, any window
- **HIPAA Compliant**: No data stored locally on your computer
- **Smart Detection**: Automatically knows which patient you're working with

## Troubleshooting

**"No Patient Selected" Message**
- Make sure you have a patient record open in Clarafi
- Try refreshing the Clarafi page and clicking the extension again

**Can't See My Application in Capture List**
- Make sure the application is open and visible
- Some applications may appear under "Entire Screen" option
- Try minimizing other windows to make your target app more prominent

**Extension Not Working After Update**
- Remove and reinstall the extension
- Make sure Developer Mode is enabled
- Check that all files were extracted properly

## Security Note
This extension is designed with HIPAA compliance in mind:
- No screenshots are saved to your computer
- All data streams directly to Clarafi's secure servers
- Patient context ensures screenshots go to the correct record
- No PHI is stored in browser storage or cache