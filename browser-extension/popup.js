// Popup script for Clarafi Secure Capture

document.addEventListener('DOMContentLoaded', async () => {
  const patientInfo = document.getElementById('patientInfo');
  const captureButtons = document.getElementById('captureButtons');
  const warningMessage = document.getElementById('warningMessage');
  const warningText = document.getElementById('warningText');
  const captureFullBtn = document.getElementById('captureFullBtn');
  const captureAreaBtn = document.getElementById('captureAreaBtn');
  
  // Check if we have patient context
  const response = await chrome.runtime.sendMessage({ type: 'GET_PATIENT_CONTEXT' });
  
  if (response && response.patientId) {
    // We have patient context - show patient info and enable capture
    patientInfo.innerHTML = `
      <div class="patient-name">${response.patientName}</div>
      <div class="patient-id">ID: ${response.patientId}</div>
    `;
    patientInfo.classList.remove('not-connected');
    
    // Show capture buttons
    captureButtons.style.display = 'flex';
    
    // Hide warning message
    warningMessage.style.display = 'none';
  } else {
    // No patient context - show warning
    patientInfo.innerHTML = `
      <div class="patient-name">No Patient Selected</div>
      <div class="patient-id">Open a patient in Clarafi first</div>
    `;
    patientInfo.classList.add('not-connected');
    
    // Hide capture buttons
    captureButtons.style.display = 'none';
    
    // Show warning message
    warningMessage.style.display = 'block';
    warningText.textContent = 'Please open a patient in Clarafi before capturing screenshots. This ensures HIPAA compliance by linking screenshots to the correct patient record.';
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