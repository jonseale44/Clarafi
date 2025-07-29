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
  // Check if we're on the attachments section
  const isOnAttachments = window.location.pathname.includes('/chart') && 
                         (document.querySelector('[aria-selected="true"]')?.textContent?.includes('Attachments') ||
                          document.querySelector('.flex.items-center.justify-between h2')?.textContent?.includes('Attachments'));
  
  if (!isOnAttachments) {
    console.error('Not on attachments section');
    showNotification('Please navigate to the patient attachments section first', 'error');
    return;
  }
  
  // Find the attachment upload component - look for the dropzone
  const attachmentSection = document.querySelector('.border-dashed') ||
                          document.querySelector('[role="button"]') ||
                          document.querySelector('.flex.flex-col.items-center.justify-center');
  
  if (!attachmentSection) {
    console.error('Could not find attachment upload area');
    showNotification('Could not find attachment upload area', 'error');
    return;
  }
  
  // Convert base64 to blob
  fetch(imageData)
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