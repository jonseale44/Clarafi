// HIPAA-Compliant Screen Capture Service Worker
// No local storage - direct memory to server streaming

let authToken = null;
let serverUrl = 'http://localhost:5000'; // Will be configurable

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clarafi Secure Capture Extension installed');
});

// Listen for authentication messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_UPDATE') {
    authToken = request.token;
    serverUrl = request.serverUrl || serverUrl;
    chrome.storage.local.set({ authToken, serverUrl });
    sendResponse({ success: true });
  } else if (request.type === 'CAPTURE_AREA') {
    handleAreaCapture(request.tabId, request.coordinates);
  } else if (request.type === 'CAPTURE_VISIBLE') {
    handleVisibleCapture(request.tabId);
  }
});

// Capture visible area of tab
async function handleVisibleCapture(tabId) {
  try {
    // Capture the visible tab area
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture error:', chrome.runtime.lastError);
        notifyError('Failed to capture screen');
        return;
      }

      // Convert to blob without saving to disk
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload directly to server
      await uploadToServer(blob, tabId);
    });
  } catch (error) {
    console.error('Capture error:', error);
    notifyError('Failed to capture screen');
  }
}

// Capture specific area
async function handleAreaCapture(tabId, coordinates) {
  try {
    // First capture full visible area
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture error:', chrome.runtime.lastError);
        notifyError('Failed to capture screen');
        return;
      }

      // Process in memory using OffscreenCanvas
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      
      // Create offscreen canvas for cropping
      const canvas = new OffscreenCanvas(
        coordinates.width,
        coordinates.height
      );
      const ctx = canvas.getContext('2d');
      
      // Crop the image
      ctx.drawImage(
        bitmap,
        coordinates.x,
        coordinates.y,
        coordinates.width,
        coordinates.height,
        0,
        0,
        coordinates.width,
        coordinates.height
      );
      
      // Convert to blob
      const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
      
      // Upload directly
      await uploadToServer(croppedBlob, tabId);
    });
  } catch (error) {
    console.error('Area capture error:', error);
    notifyError('Failed to capture selected area');
  }
}

// Upload blob directly to server
async function uploadToServer(blob, tabId) {
  try {
    // Get current auth token
    const storage = await chrome.storage.local.get(['authToken', 'serverUrl']);
    const token = storage.authToken || authToken;
    const server = storage.serverUrl || serverUrl;
    
    if (!token) {
      notifyError('Not authenticated. Please log in to Clarafi first.');
      return;
    }

    // Get patient context from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tabId || tab.id, { 
      type: 'GET_PATIENT_CONTEXT' 
    });
    
    const patientId = response?.patientId;
    const encounterId = response?.encounterId;
    
    if (!patientId) {
      notifyError('No patient context found. Please open a patient record.');
      return;
    }

    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', blob, `capture_${Date.now()}.png`);
    formData.append('title', 'Epic EMR Screenshot');
    formData.append('description', 'Securely captured EMR data');
    formData.append('isConfidential', 'true');
    if (encounterId) {
      formData.append('encounterId', encounterId);
    }

    // Upload directly to server - no local storage
    const uploadResponse = await fetch(`${server}/api/patients/${patientId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();
    
    // Notify success
    chrome.tabs.sendMessage(tabId || tab.id, {
      type: 'CAPTURE_SUCCESS',
      attachmentId: result.id
    });
    
    // Clear blob from memory
    blob = null;
    
  } catch (error) {
    console.error('Upload error:', error);
    notifyError(`Failed to upload: ${error.message}`);
  }
}

// Send error notification
function notifyError(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Clarafi Secure Capture',
    message: message
  });
}

// Listen for commands (keyboard shortcuts)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-visible') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        handleVisibleCapture(tabs[0].id);
      }
    });
  }
});