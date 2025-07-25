/**
 * Median Background Audio Service
 * 
 * This service provides integration with Median's JavaScript Bridge
 * for background audio functionality on iOS devices.
 * Allows audio to continue playing when the app is backgrounded or screen is locked.
 */

// Type definitions for Median bridge
interface MedianBackgroundAudio {
  start: () => void;
  stop: () => void;
}

interface MedianBridge {
  backgroundAudio?: MedianBackgroundAudio;
}

// Extend window interface for Median
declare global {
  interface Window {
    median?: MedianBridge;
  }
}

/**
 * Check if the app is running in Median environment
 */
export const isMedianApp = (): boolean => {
  return typeof window !== 'undefined' && 
         window.median !== undefined &&
         window.median.backgroundAudio !== undefined;
};

/**
 * Start background audio service
 * This allows audio to continue playing when app is backgrounded
 * Only works on iOS devices in Median app
 */
export const startBackgroundAudio = (): boolean => {
  console.log('🎵 [MedianBackgroundAudio] Attempting to start background audio');
  
  if (!isMedianApp()) {
    console.log('🎵 [MedianBackgroundAudio] Not running in Median app - skipping');
    return false;
  }

  try {
    window.median!.backgroundAudio!.start();
    console.log('✅ [MedianBackgroundAudio] Background audio started successfully');
    return true;
  } catch (error) {
    console.error('❌ [MedianBackgroundAudio] Failed to start background audio:', error);
    return false;
  }
};

/**
 * Stop background audio service
 * This releases background audio resources
 * Should be called when audio playback is no longer needed
 */
export const stopBackgroundAudio = (): boolean => {
  console.log('🎵 [MedianBackgroundAudio] Attempting to stop background audio');
  
  if (!isMedianApp()) {
    console.log('🎵 [MedianBackgroundAudio] Not running in Median app - skipping');
    return false;
  }

  try {
    window.median!.backgroundAudio!.stop();
    console.log('✅ [MedianBackgroundAudio] Background audio stopped successfully');
    return true;
  } catch (error) {
    console.error('❌ [MedianBackgroundAudio] Failed to stop background audio:', error);
    return false;
  }
};

/**
 * Hook to manage background audio lifecycle
 * Automatically starts/stops background audio based on recording state
 */
export const useMedianBackgroundAudio = () => {
  const handleRecordingStart = () => {
    startBackgroundAudio();
  };

  const handleRecordingStop = () => {
    stopBackgroundAudio();
  };

  return {
    isMedianApp: isMedianApp(),
    startBackgroundAudio: handleRecordingStart,
    stopBackgroundAudio: handleRecordingStop,
  };
};