// Popup script for Clarafi Secure Capture

document.addEventListener('DOMContentLoaded', async () => {
  const patientInfo = document.getElementById('patientInfo');
  const captureButtons = document.getElementById('captureButtons');
  const warningMessage = document.getElementById('warningMessage');
  const warningText = document.getElementById('warningText');
  const captureFullBtn = document.getElementById('captureFullBtn');
  const captureAreaBtn = document.getElementById('captureAreaBtn');
  
  // Get patient context from background script
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PATIENT_CONTEXT' });
    
    if (response && response.patientId) {
      // Show patient info
      patientInfo.innerHTML = `
        <div class="patient-name">${response.patientName || 'Patient'}</div>
        <div class="patient-id">ID: ${response.patientId}</div>
      `;
      patientInfo.classList.remove('not-connected');
      
      // Show capture buttons
      captureButtons.style.display = 'flex';
    } else {
      // No patient context
      patientInfo.innerHTML = `
        <div class="patient-name">No Patient Selected</div>
        <div class="patient-id">Please open a patient record in Clarafi first</div>
      `;
      patientInfo.classList.add('not-connected');
      
      // Show warning
      warningText.textContent = 'Open a patient record in Clarafi before capturing EMR data';
      warningMessage.style.display = 'flex';
    }
  } catch (error) {
    console.error('Failed to get patient context:', error);
    patientInfo.innerHTML = `
      <div class="patient-name">Connection Error</div>
      <div class="patient-id">Unable to connect to Clarafi</div>
    `;
    patientInfo.classList.add('not-connected');
  }
  
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