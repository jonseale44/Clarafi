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
    // Get stored patient context
    const storage = await chrome.storage.local.get(['patientContext']);
    const context = storage.patientContext || patientContext;
    
    if (!context?.patientId) {
      notifyError('Please open a patient record in Clarafi first');
      return;
    }

    // Use screenshot API for both capture types
    await captureWithScreenshotAPI(context);
  } catch (error) {
    console.error('Capture error:', error);
    notifyError('Failed to initiate capture');
  }
}

// Capture using desktop capture API (works with any application)
async function captureWithScreenshotAPI(context) {
  try {
    // Get the active tab for desktop capture dialog
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Use desktop capture to let user select screen or window
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window'],
      activeTab,
      async (streamId) => {
        if (!streamId) {
          notifyError('No source selected - please try again');
          return;
        }
        
        // Create a hidden tab to capture the stream
        const captureTab = await chrome.tabs.create({
          url: 'data:text/html,<html><body><script>' +
               'chrome.runtime.onMessage.addListener((msg, sender, respond) => {' +
               '  if (msg.type === "GET_STREAM") {' +
               '    navigator.mediaDevices.getUserMedia({' +
               '      video: {' +
               '        mandatory: {' +
               '          chromeMediaSource: "desktop",' +
               '          chromeMediaSourceId: msg.streamId' +
               '        }' +
               '      }' +
               '    }).then(stream => {' +
               '      const video = document.createElement("video");' +
               '      video.srcObject = stream;' +
               '      video.play();' +
               '      video.onloadedmetadata = () => {' +
               '        const canvas = document.createElement("canvas");' +
               '        canvas.width = video.videoWidth;' +
               '        canvas.height = video.videoHeight;' +
               '        const ctx = canvas.getContext("2d");' +
               '        ctx.drawImage(video, 0, 0);' +
               '        stream.getTracks().forEach(track => track.stop());' +
               '        canvas.toBlob(blob => {' +
               '          const reader = new FileReader();' +
               '          reader.onloadend = () => {' +
               '            respond({ dataUrl: reader.result });' +
               '          };' +
               '          reader.readAsDataURL(blob);' +
               '        }, "image/png");' +
               '      };' +
               '    }).catch(err => respond({ error: err.message }));' +
               '    return true;' +
               '  }' +
               '});' +
               '</script></body></html>',
          active: false
        });
        
        // Wait a moment for the tab to load
        setTimeout(async () => {
          try {
            // Request capture from the hidden tab
            const response = await chrome.tabs.sendMessage(captureTab.id, {
              type: 'GET_STREAM',
              streamId: streamId
            });
            
            // Close the capture tab
            await chrome.tabs.remove(captureTab.id);
            
            if (response.error) {
              throw new Error(response.error);
            }
            
            // Convert to blob
            const base64Response = await fetch(response.dataUrl);
            const blob = await base64Response.blob();
            
            // Process capture
            await processCapture(blob, context);
            
            // Show success notification
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon.svg',
              title: 'Screenshot Captured',
              message: 'EMR screenshot has been sent to patient attachments for review'
            });
          } catch (error) {
            console.error('Capture tab error:', error);
            notifyError('Failed to capture screen');
          }
        }, 1000);
      }
    );
  } catch (error) {
    console.error('Desktop capture error:', error);
    notifyError('Failed to initiate capture');
  }
}

// Capture desktop stream (works with any application)
async function captureDesktopStream(streamId, context) {
  try {
    // Create offscreen document for capturing
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Capturing EMR screen for HIPAA-compliant processing'
    });

    // Send capture request to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_STREAM',
      streamId: streamId
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Convert base64 to blob
    const base64Response = await fetch(response.dataUrl);
    const blob = await base64Response.blob();

    // Process capture
    await processCapture(blob, context);

    // Close offscreen document
    await chrome.offscreen.closeDocument();
  } catch (error) {
    console.error('Desktop capture error:', error);
    notifyError('Failed to capture screen');
  }
}

// Capture with area selection
async function captureDesktopStreamWithCrop(streamId, context) {
  try {
    // First capture full screen
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Capturing EMR screen for area selection'
    });

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_STREAM',
      streamId: streamId
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Open area selector in new tab
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL('capture-overlay.html'),
      active: true
    });

    // Send image to selector
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.sendMessage(tab.id, {
          type: 'INIT_SELECTOR',
          imageData: response.dataUrl,
          context: context
        });
      }
    });

    // Close offscreen document
    await chrome.offscreen.closeDocument();
  } catch (error) {
    console.error('Area capture error:', error);
    notifyError('Failed to capture for area selection');
  }
}

// Process and send capture to Clarafi
async function processCapture(blob, context) {
  try {
    // Create form data matching existing attachment upload
    const formData = new FormData();
    formData.append('file', blob, `emr_capture_${Date.now()}.png`);
    formData.append('title', 'EMR Screenshot');
    formData.append('description', `Captured from EMR for ${context.patientName || 'patient'}`);
    formData.append('isConfidential', 'true');
    
    if (context.encounterId) {
      formData.append('encounterId', context.encounterId);
    }

    // Send to Clarafi tab for preview (not direct upload)
    const tabs = await chrome.tabs.query({ url: `${context.serverUrl}/*` });
    if (tabs.length > 0) {
      // Convert blob to base64 for message passing
      const reader = new FileReader();
      reader.onloadend = async () => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PREVIEW_CAPTURE',
          imageData: reader.result,
          metadata: {
            title: 'EMR Screenshot',
            description: `Captured from EMR for ${context.patientName || 'patient'}`,
            patientId: context.patientId,
            encounterId: context.encounterId
          }
        });
      };
      reader.readAsDataURL(blob);
    } else {
      notifyError('Clarafi tab not found. Please open Clarafi first.');
    }

    // Clear blob from memory
    blob = null;
  } catch (error) {
    console.error('Process capture error:', error);
    notifyError('Failed to process capture');
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