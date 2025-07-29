# Clarafi HIPAA-Compliant EMR Screenshot Extension

Zero PHI storage browser extension that captures screenshots from ANY EMR system and uploads directly to Clarafi's secure servers.

## HIPAA Compliance

- **Zero Local Storage**: Screenshots never touch your computer's hard drive
- **Direct Server Upload**: Images stream from memory directly to Clarafi's secure servers
- **Patient Context Required**: Screenshots are automatically linked to the correct patient's chart
- **Encrypted Transfer**: All uploads use secure HTTPS connections
- **Audit Trail**: Every capture is logged with user and timestamp information

## Features

- **Universal EMR Support**: Works with ALL EMR systems:
  - Browser-based EMRs (Athena, Cerner, eClinicalWorks)
  - Desktop EMRs (Epic via Citrix, NextGen, AllScripts)
  - Any application on your screen
- **Smart Capture Modes**:
  - Full Desktop: Capture entire EMR windows
  - Area Selection: Select specific regions (lab results, imaging, notes)
- **Direct Patient Integration**: Screenshots appear instantly in patient's attachment section

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The Clarafi Secure Capture icon will appear in your browser toolbar

## Usage

### Prerequisites
**IMPORTANT**: You must have a patient open in Clarafi before capturing screenshots. This ensures HIPAA compliance by linking screenshots to the correct patient record.

### Capturing Screenshots

1. **Open a patient in Clarafi** - Navigate to any patient's chart
2. Click the Clarafi extension icon in your toolbar
3. Choose capture mode:
   - **Full Desktop**: For capturing entire EMR windows
   - **Area Selection**: For capturing specific regions
4. Select what to capture:
   - For browser EMRs: The current tab is captured
   - For desktop EMRs: Choose the application window
5. For area selection: Click and drag to select the region
6. Screenshot is automatically uploaded to the patient's attachments

### Security Features

- Patient context verification prevents accidental PHI exposure
- No local file downloads - everything streams directly to secure servers
- Session-based authentication ensures only authorized users can upload
- Automatic timeout after 30 minutes of inactivity

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