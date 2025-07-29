// Area selection script for capture overlay

let isSelecting = false;
let startX, startY, endX, endY;
let imageData = null;
let patientContext = null;

const screenshot = document.getElementById('screenshot');
const selectionOverlay = document.getElementById('selection-overlay');
const selectionBox = document.getElementById('selection-box');
const dimensions = document.getElementById('dimensions');
const captureBtn = document.getElementById('captureBtn');

// Listen for initialization from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'INIT_OVERLAY') {
    // Set screenshot
    screenshot.src = request.screenshot;
    
    // Store patient context
    patientContext = request.context;
    
    // Update instructions with patient name
    if (patientContext && patientContext.patientName) {
      const instructions = document.querySelector('.instructions h3');
      instructions.textContent = `Select area to capture for ${patientContext.patientName}`;
    }
    
    sendResponse({ success: true });
  }
});
const cancelBtn = document.getElementById('cancelBtn');

// Listen for initialization message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'INIT_SELECTOR') {
    imageData = request.imageData;
    patientContext = request.context;
    screenshot.src = imageData;
  }
});

// Handle mouse events for selection
selectionOverlay.addEventListener('mousedown', (e) => {
  isSelecting = true;
  const rect = screenshot.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  
  selectionBox.style.display = 'block';
  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
});

selectionOverlay.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;
  
  const rect = screenshot.getBoundingClientRect();
  endX = e.clientX - rect.left;
  endY = e.clientY - rect.top;
  
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
  
  // Show dimensions
  dimensions.textContent = `${width} × ${height}`;
  dimensions.style.display = 'block';
  dimensions.style.left = (endX + 10) + 'px';
  dimensions.style.top = (endY + 10) + 'px';
});

selectionOverlay.addEventListener('mouseup', (e) => {
  if (!isSelecting) return;
  isSelecting = false;
  
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  
  if (width > 10 && height > 10) {
    captureBtn.style.display = 'inline-block';
    dimensions.style.display = 'none';
  } else {
    // Selection too small
    selectionBox.style.display = 'none';
    captureBtn.style.display = 'none';
  }
});

// Handle capture button
captureBtn.addEventListener('click', async () => {
  const rect = screenshot.getBoundingClientRect();
  const img = screenshot;
  
  // Calculate selection coordinates relative to original image
  const scaleX = img.naturalWidth / rect.width;
  const scaleY = img.naturalHeight / rect.height;
  
  const left = Math.min(startX, endX) * scaleX;
  const top = Math.min(startY, endY) * scaleY;
  const width = Math.abs(endX - startX) * scaleX;
  const height = Math.abs(endY - startY) * scaleY;
  
  // Create canvas for cropping
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Draw cropped area
  ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
  
  // Convert to data URL
  const croppedImage = canvas.toDataURL('image/png');
  
  // Send back to background script
  chrome.runtime.sendMessage({
    type: 'AREA_SELECTED',
    croppedImage: croppedImage,
    context: patientContext
  });
  
  // Show loading state
  captureBtn.textContent = 'Processing...';
  captureBtn.disabled = true;
});

// Handle cancel button
cancelBtn.addEventListener('click', () => {
  window.close();
});

// ESC key to cancel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.close();
  }
});