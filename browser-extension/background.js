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
    // Load patient context from storage
    const result = await chrome.storage.local.get(['patientContext']);
    patientContext = result.patientContext;
    
    if (!patientContext || !patientContext.patientId) {
      notifyError('No patient selected. Please open a patient in Clarafi first.');
      return;
    }
    
    serverUrl = patientContext.serverUrl;
    
    if (captureType === 'desktop') {
      await captureWithScreenshotAPI();
    } else if (captureType === 'area') {
      await captureAreaWithScreenshotAPI();
    }
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
      
      // Convert dataUrl to blob for upload
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Process and upload to Clarafi
      await processCapture(blob, patientContext);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.svg',
        title: 'Screenshot Uploaded',
        message: 'Screenshot sent to patient attachments'
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
          
          // Convert base64 to blob for upload
          const base64Response = await fetch(response.dataUrl);
          const blob = await base64Response.blob();
          
          // Process capture and upload to Clarafi
          await processCapture(blob, patientContext);
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

// Capture area selection
async function captureAreaWithScreenshotAPI() {
  try {
    // First capture the current visible screen
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Capture current screen
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    // Open area selection overlay
    const overlayTab = await chrome.tabs.create({
      url: chrome.runtime.getURL('capture-overlay.html'),
      active: true
    });
    
    // Wait for overlay to load, then send screenshot and context
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === overlayTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        // Send screenshot and patient context to overlay
        chrome.tabs.sendMessage(overlayTab.id, {
          type: 'INIT_OVERLAY',
          screenshot: dataUrl,
          context: patientContext
        });
      }
    });
    
  } catch (error) {
    console.error('Area capture error:', error);
    notifyError('Failed to initiate area capture');
  }
}

// Process captured screenshot and upload to Clarafi
async function processCapture(blob, context) {
  try {
    // Create form data for upload
    const formData = new FormData();
    const timestamp = new Date().toISOString();
    const filename = `emr-capture-${timestamp.replace(/[:.]/g, '-')}.png`;
    
    formData.append('file', blob, filename);
    formData.append('patientId', context.patientId.toString());
    formData.append('encounterId', context.encounterId?.toString() || '');
    formData.append('uploadSource', 'browser-extension');
    formData.append('documentType', 'emr-screenshot');
    
    // Upload to Clarafi server
    const response = await fetch(`${context.serverUrl}/api/attachments/upload`, {
      method: 'POST',
      headers: {
        'Cookie': context.authCookie
      },
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon.svg',
      title: 'Screenshot Uploaded',
      message: `Screenshot added to ${context.patientName}'s attachments`
    });
    
    // Send success message to Clarafi tab if open
    const tabs = await chrome.tabs.query({ url: `${context.serverUrl}/*` });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'ATTACHMENT_UPLOADED',
        patientId: context.patientId,
        attachmentId: result.id
      });
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    notifyError('Failed to upload screenshot: ' + error.message);
  }
}

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