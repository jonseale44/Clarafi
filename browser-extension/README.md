# Clarafi Secure Capture Browser Extension

HIPAA-compliant EMR screenshot capture extension that works with any EMR system - browser-based (Athena, Cerner) or desktop applications (Epic via Citrix).

## Features

- **Universal EMR Support**: Works with both browser-based and desktop EMR applications
- **HIPAA Compliant**: Zero local PHI storage - screenshots stream directly to secure servers
- **Area Selection**: Select specific regions of your screen to capture
- **Patient Context Detection**: Optional GPT verification when capturing from Clarafi pages
- **Direct Integration**: Screenshots appear in Clarafi's attachment preview for confirmation

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The Clarafi Secure Capture icon will appear in your browser toolbar

## Usage

### Basic Screenshot Capture

1. Click the Clarafi extension icon in your toolbar
2. Choose capture mode:
   - **Current Tab**: Captures the active browser tab
   - **Full Desktop**: Captures any application window (for desktop EMRs)
3. If using Full Desktop mode, select the window you want to capture
4. Click and drag to select the area you want to capture
5. Click "Capture Selected Area"
6. The screenshot will automatically appear in your Clarafi patient attachments

### Patient Context Detection

When capturing from a Clarafi patient page:
- The extension automatically detects the current patient context
- Patient information is included with the screenshot for verification
- This ensures screenshots are attached to the correct patient record

## Security & Privacy

- **No Local Storage**: Screenshots are never saved to your computer
- **Encrypted Transmission**: All data is encrypted during transfer
- **Direct Upload**: Images stream directly to HIPAA-compliant servers
- **Session-Based**: No persistent data stored in the extension

## Supported EMR Systems

Works with all EMR systems including:
- **Browser-Based**: Athena, Cerner, Allscripts, NextGen
- **Desktop Applications**: Epic (via Citrix), eClinicalWorks
- **Any Application**: Captures from any window on your desktop

## Requirements

- Google Chrome browser (version 88 or higher)
- Active Clarafi account with patient access
- Network connection to Clarafi servers

## Troubleshooting

**Extension not appearing:**
- Ensure Developer mode is enabled in Chrome
- Check that all files were loaded correctly
- Restart Chrome after installation

**Capture not working:**
- Grant screen recording permissions when prompted
- Ensure you're logged into Clarafi
- Check your network connection

**Screenshots not appearing:**
- Verify you have an active patient selected in Clarafi
- Check the attachment upload section
- Ensure popup blockers aren't interfering

## Support

For support, please contact your Clarafi administrator or visit the help section within the Clarafi application.