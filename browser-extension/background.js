// HIPAA-Compliant EMR Capture Service Worker
// Works with ANY EMR - browser-based (Athena) or desktop (Epic/Citrix)
// No local storage - direct memory to server streaming

let patientContext = null;
let serverUrl = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clarafi Secure Capture Extension installed');
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_PATIENT_CONTEXT') {
    // Update patient context from Clarafi tab
    patientContext = {
      patientId: request.patientId,
      patientName: request.patientName,
      encounterId: request.encounterId,
      serverUrl: request.serverUrl,
      authCookie: request.authCookie
    };
    chrome.storage.local.set({ patientContext });
    sendResponse({ success: true });
    return true;
  } else if (request.type === 'REQUEST_CAPTURE') {
    // Handle capture request from popup
    handleCaptureRequest(request.captureType);
    sendResponse({ success: true });
    return true;
  } else if (request.type === 'GET_PATIENT_CONTEXT') {
    sendResponse(patientContext);
    return true;
  }
});

// Handle capture request
async function handleCaptureRequest(captureType) {
  try {
    // Simplified - no patient context required
    await captureWithScreenshotAPI();
  } catch (error) {
    console.error('Capture error:', error);
    notifyError('Failed to initiate capture');
  }
}

// Capture using desktop capture API (works with any application)
async function captureWithScreenshotAPI() {
  try {
    // For full screen capture, use the tabs API first
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // First try to capture the current visible tab
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      
      // Download the screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `clarafi-capture-${timestamp}.png`;
      
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      });
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.svg',
        title: 'Screenshot Captured',
        message: 'Screenshot saved to downloads folder'
      });
      
      return;
    } catch (tabError) {
      console.log('Tab capture failed, trying desktop capture:', tabError);
    }
    
    // If tab capture fails, use desktop capture for external applications
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window'],
      activeTab,
      async (streamId) => {
        if (!streamId) {
          notifyError('No source selected - please try again');
          return;
        }
        
        // We need to use the offscreen API to capture desktop
        try {
          // Create offscreen document
          await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Capturing EMR screen'
          });
          
          // Send message to offscreen document
          const response = await chrome.runtime.sendMessage({
            type: 'CAPTURE_DESKTOP',
            streamId: streamId
          });
          
          // Close offscreen document
          await chrome.offscreen.closeDocument();
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          // Download the screenshot
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `clarafi-capture-${timestamp}.png`;
          
          chrome.downloads.download({
            url: response.dataUrl,
            filename: filename,
            saveAs: true
          });
          
          // Show success notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon.svg',
            title: 'Screenshot Captured',
            message: 'Screenshot saved to downloads folder'
          });
        } catch (error) {
          console.error('Desktop capture error:', error);
          notifyError('Failed to capture screen');
        }
      }
    );
  } catch (error) {
    console.error('Capture error:', error);
    notifyError('Failed to initiate capture');
  }
}

// Removed unused functions - extension now downloads screenshots locally

// Send notification
function notifyError(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Clarafi Secure Capture',
    message: message
  });
}

// Handle area selection result
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AREA_SELECTED') {
    // Process cropped image
    fetch(request.croppedImage)
      .then(res => res.blob())
      .then(blob => processCapture(blob, request.context))
      .then(() => {
        // Close selector tab
        chrome.tabs.remove(sender.tab.id);
      })
      .catch(error => {
        console.error('Area processing error:', error);
        notifyError('Failed to process selected area');
      });
  }
});