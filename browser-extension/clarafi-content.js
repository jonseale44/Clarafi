// Content script that runs only on Clarafi pages
// Detects patient context and handles screenshot previews

// Extract patient context from the page
function extractPatientContext() {
  // Try to get patient info from URL first
  const urlMatch = window.location.pathname.match(/\/patients\/(\d+)/);
  const patientId = urlMatch ? urlMatch[1] : null;
  
  // Try to get encounter ID from URL
  const encounterMatch = window.location.pathname.match(/\/encounters\/(\d+)/);
  const encounterId = encounterMatch ? encounterMatch[1] : null;
  
  // Try to get patient name from page content
  let patientName = null;
  const patientNameElement = document.querySelector('[data-patient-name]') || 
                            document.querySelector('.patient-name') ||
                            document.querySelector('h1');
  if (patientNameElement) {
    patientName = patientNameElement.textContent.trim();
  }
  
  // Get server URL
  const serverUrl = window.location.origin;
  
  // Get auth cookie
  const authCookie = document.cookie.split('; ')
    .find(row => row.startsWith('connect.sid='))
    ?.split('=')[1];
  
  return {
    patientId,
    patientName,
    encounterId,
    serverUrl,
    authCookie
  };
}

// Update context when page changes
function updatePatientContext() {
  const context = extractPatientContext();
  
  if (context.patientId) {
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_PATIENT_CONTEXT',
      ...context
    });
  }
}

// Listen for capture preview messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PREVIEW_CAPTURE') {
    handleCapturePreview(request.imageData, request.metadata);
    sendResponse({ success: true });
  }
});

// Handle screenshot preview in attachment upload area
function handleCapturePreview(imageData, metadata) {
  // Get patient context
  const context = extractPatientContext();
  if (!context.patientId) {
    showNotification('No patient selected. Please select a patient first.', 'error');
    return;
  }
  
  // Show a notification that screenshot was captured
  showNotification('Screenshot captured! Uploading to patient attachments...', 'success');
  
  // Upload directly to the server
  uploadScreenshot(imageData, metadata, context);
}

// Upload screenshot directly to server
async function uploadScreenshot(imageData, metadata, context) {
  try {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Create FormData
    const formData = new FormData();
    const filename = `EMR_Screenshot_${new Date().toISOString().replace(/:/g, '-')}.png`;
    formData.append('file', blob, filename);
    formData.append('category', 'Clinical Documents');
    formData.append('description', metadata.description || 'EMR Screenshot captured via browser extension');
    
    // Upload to server
    const uploadResponse = await fetch(`${context.serverUrl}/api/patients/${context.patientId}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (uploadResponse.ok) {
      showNotification('Screenshot uploaded successfully!', 'success');
      
      // If we're on the attachments page, refresh it
      if (window.location.pathname.includes('/attachments')) {
        window.location.reload();
      }
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showNotification('Failed to upload screenshot. Please try again.', 'error');
  }
}


    .then(res => res.blob())
    .then(blob => {
      // Create a file object
      const file = new File([blob], `emr_capture_${Date.now()}.png`, { type: 'image/png' });
      
      // Find the file input
      const fileInput = attachmentSection.querySelector('input[type="file"]');
      if (!fileInput) {
        console.error('Could not find file input');
        showNotification('Unable to add capture to attachments', 'error');
        return;
      }
      
      // Create a DataTransfer object to simulate file selection
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      
      // Show success message
      showNotification('EMR capture added to attachments. Please review and click "Upload" to save.', 'success');
    })
    .catch(error => {
      console.error('Error processing capture:', error);
      showNotification('Failed to add capture to attachments', 'error');
    });
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Try to use Clarafi's toast system if available
  const toastEvent = new CustomEvent('clarafi:toast', {
    detail: { message, type }
  });
  window.dispatchEvent(toastEvent);
  
  // Fallback to native notification
  if (!window.clarafi?.toast) {
    const notification = document.createElement('div');
    notification.className = `clarafi-capture-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize on page load
updatePatientContext();

// Watch for URL changes (single-page app navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    updatePatientContext();
  }
}).observe(document, { subtree: true, childList: true });

// Also update on page visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updatePatientContext();
  }
});