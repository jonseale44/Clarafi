// Offscreen document for capturing desktop streams
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_DESKTOP') {
    captureDesktop(request.streamId)
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function captureDesktop(streamId) {
  try {
    // Get user media with desktop capture
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    });

    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // Wait for video to load
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    // Create canvas and capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());

    // Convert to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Offscreen capture error:', error);
    throw error;
  }
}