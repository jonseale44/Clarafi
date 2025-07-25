/**
 * Median Face ID / Touch ID Authentication Service
 * 
 * This service provides integration with Median's JavaScript Bridge
 * for biometric authentication (Face ID/Touch ID on iOS devices)
 */

interface MedianAuthStatus {
  hasTouchId: boolean;
  biometryType?: 'touchId' | 'faceId' | 'none';
  hasSecret: boolean;
}

interface MedianAuthResponse {
  success: boolean;
  error?: string;
  secret?: string;
}

interface MedianCredentials {
  username: string;
  password: string;
}

// Type guard to check if Median is available
export function isMedianAvailable(): boolean {
  return typeof (window as any).median !== 'undefined';
}

/**
 * Check Face ID/Touch ID availability and if a secret is saved
 */
export async function checkMedianAuthStatus(): Promise<MedianAuthStatus | null> {
  if (!isMedianAvailable()) {
    console.log('[MedianAuth] Median JavaScript Bridge not available');
    return null;
  }

  return new Promise((resolve) => {
    const median = (window as any).median;
    
    median.auth.status({
      callbackFunction: (data: MedianAuthStatus) => {
        console.log('[MedianAuth] Status:', data);
        resolve(data);
      }
    });
  });
}

/**
 * Save credentials to device secure storage
 */
export async function saveMedianCredentials(credentials: MedianCredentials): Promise<boolean> {
  if (!isMedianAvailable()) {
    return false;
  }

  const status = await checkMedianAuthStatus();
  if (!status || !status.hasTouchId) {
    console.log('[MedianAuth] Face ID/Touch ID not available');
    return false;
  }

  const secret = JSON.stringify(credentials);

  return new Promise((resolve) => {
    const median = (window as any).median;
    
    median.auth.save({
      secret: secret,
      callbackFunction: (data: { success: boolean }) => {
        console.log('[MedianAuth] Save result:', data);
        resolve(data.success);
      }
    });
  });
}

/**
 * Retrieve saved credentials using Face ID/Touch ID
 */
export async function getMedianCredentials(): Promise<MedianCredentials | null> {
  if (!isMedianAvailable()) {
    return null;
  }

  const status = await checkMedianAuthStatus();
  if (!status || !status.hasTouchId || !status.hasSecret) {
    console.log('[MedianAuth] No saved credentials or biometrics unavailable');
    return null;
  }

  return new Promise((resolve) => {
    const median = (window as any).median;
    
    const biometryType = status.biometryType === 'faceId' ? 'Face ID' : 'Touch ID';
    const prompt = `Use ${biometryType} to log in to CLARAFI`;
    
    median.auth.get({
      prompt: prompt,
      callbackOnCancel: 1,
      callbackFunction: (data: MedianAuthResponse) => {
        console.log('[MedianAuth] Get result:', data);
        
        if (data.success && data.secret) {
          try {
            const credentials = JSON.parse(data.secret) as MedianCredentials;
            resolve(credentials);
          } catch (error) {
            console.error('[MedianAuth] Failed to parse credentials:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      }
    });
  });
}

/**
 * Delete saved credentials
 */
export async function deleteMedianCredentials(): Promise<boolean> {
  if (!isMedianAvailable()) {
    return false;
  }

  return new Promise((resolve) => {
    const median = (window as any).median;
    
    median.auth.delete({
      callbackFunction: (data: { success: boolean }) => {
        console.log('[MedianAuth] Delete result:', data);
        resolve(data.success);
      }
    });
  });
}

/**
 * Get a user-friendly biometry type name
 */
export function getBiometryTypeName(status: MedianAuthStatus | null): string {
  if (!status || !status.hasTouchId) {
    return 'Biometric Authentication';
  }
  
  if (status.biometryType === 'faceId') {
    return 'Face ID';
  } else if (status.biometryType === 'touchId') {
    return 'Touch ID';
  }
  
  return 'Biometric Authentication';
}