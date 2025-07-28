// Offscreen document handler for desktop capture
// This runs in a separate context to handle media streams

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_STREAM') {
    handleStreamCapture(request.streamId)
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleStreamCapture(streamId) {
  try {
    // Get media stream from desktop capture
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    });

    // Create video element to capture frame
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
    console.error('Stream capture error:', error);
    throw error;
  }
}