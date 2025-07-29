// Popup script for Clarafi Secure Capture

document.addEventListener('DOMContentLoaded', async () => {
  const patientInfo = document.getElementById('patientInfo');
  const captureButtons = document.getElementById('captureButtons');
  const warningMessage = document.getElementById('warningMessage');
  const warningText = document.getElementById('warningText');
  const captureFullBtn = document.getElementById('captureFullBtn');
  const captureAreaBtn = document.getElementById('captureAreaBtn');
  
  // Simplified - no patient context required
  patientInfo.innerHTML = `
    <div class="patient-name">Clarafi Secure Capture</div>
    <div class="patient-id">Ready to capture EMR screenshots</div>
  `;
  patientInfo.classList.remove('not-connected');
  
  // Always show capture buttons
  captureButtons.style.display = 'flex';
  
  // Hide warning message
  warningMessage.style.display = 'none';
  
  // Handle capture full window
  captureFullBtn.addEventListener('click', async () => {
    captureFullBtn.disabled = true;
    captureFullBtn.innerHTML = '<span class="spinner"></span> Initiating capture...';
    
    try {
      await chrome.runtime.sendMessage({ 
        type: 'REQUEST_CAPTURE',
        captureType: 'fullscreen'
      });
      
      // Close popup after initiating capture
      setTimeout(() => window.close(), 500);
    } catch (error) {
      console.error('Capture failed:', error);
      captureFullBtn.innerHTML = 'Capture failed - try again';
      captureFullBtn.disabled = false;
    }
  });
  
  // Handle capture area selection
  captureAreaBtn.addEventListener('click', async () => {
    captureAreaBtn.disabled = true;
    captureAreaBtn.innerHTML = '<span class="spinner"></span> Initiating selection...';
    
    try {
      await chrome.runtime.sendMessage({ 
        type: 'REQUEST_CAPTURE',
        captureType: 'area'
      });
      
      // Close popup after initiating capture
      setTimeout(() => window.close(), 500);
    } catch (error) {
      console.error('Area selection failed:', error);
      captureAreaBtn.innerHTML = 'Selection failed - try again';
      captureAreaBtn.disabled = false;
    }
  });
});