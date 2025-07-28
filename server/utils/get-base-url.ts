/**
 * Get the base URL for the application based on the current environment
 * This ensures email links and other external URLs work correctly
 */
export function getBaseUrl(): string {
  // 1. Check for explicitly set APP_URL (highest priority)
  if (process.env.APP_URL) {
    console.log('📍 [BaseURL] Using APP_URL:', process.env.APP_URL);
    return process.env.APP_URL;
  }

  // 2. Check if we're in a Replit deployment
  if (process.env.REPLIT_DEPLOYMENT) {
    // Try to use the deployment URL if available
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      const deploymentUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER.toLowerCase()}.repl.co`;
      console.log('📍 [BaseURL] Using Replit deployment URL:', deploymentUrl);
      return deploymentUrl;
    }
  }

  // 3. In development, we need to handle this differently
  // Email links from dev environment should include a note about accessing through the workspace
  if (process.env.REPLIT_DEV_DOMAIN) {
    // For development, we'll still use the dev domain but with a different approach
    const devUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    console.log('📍 [BaseURL] Using Replit dev domain:', devUrl);
    console.log('⚠️  [BaseURL] Note: Email links in development require the app to be running in the Replit workspace');
    return devUrl;
  }

  // 4. Fallback to localhost
  const localUrl = 'http://localhost:5000';
  console.log('📍 [BaseURL] Using localhost fallback:', localUrl);
  return localUrl;
}

/**
 * Check if we're in a development environment
 */
export function isDevelopment(): boolean {
  return !process.env.REPLIT_DEPLOYMENT && !!process.env.REPLIT_DEV_DOMAIN;
}