// Trial Status Middleware
// Enforces trial restrictions and provides trial status to frontend

import { Request, Response, NextFunction } from 'express';
import { TrialManagementService } from './trial-management-service.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    healthSystemId: number;
    [key: string]: any;
  };
}

/**
 * Middleware to check trial status and enforce restrictions
 */
export async function trialStatusMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Skip for non-authenticated routes
  if (!req.user?.healthSystemId) {
    return next();
  }

  try {
    const trialStatus = await TrialManagementService.getTrialStatus(req.user.healthSystemId);
    
    // Add trial status to request for use in routes
    (req as any).trialStatus = trialStatus;
    
    // Check for restrictions based on trial status
    if (trialStatus.status === 'deactivated') {
      // Complete deactivation - only allow auth routes and data export
      if (isAllowedForDeactivated(req.path)) {
        return next();
      }
      return res.status(403).json({
        error: 'TRIAL_EXPIRED',
        message: 'Your trial has expired. Please upgrade to continue using Clarafi.',
        trialStatus,
        upgradeUrl: '/dashboard?upgrade=true'
      });
    }
    
    if (trialStatus.status === 'grace_period' && trialStatus.restrictions.readOnly) {
      // Grace period - read-only access
      if (isWriteOperation(req.method, req.path)) {
        return res.status(403).json({
          error: 'TRIAL_READ_ONLY',
          message: 'Your trial has expired. You have read-only access for 7 days. Upgrade to restore full functionality.',
          trialStatus,
          upgradeUrl: '/dashboard?upgrade=true'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [TrialMiddleware] Error checking trial status:', error);
    // Don't block on middleware errors, just log and continue
    next();
  }
}

/**
 * Check if route is allowed for deactivated accounts
 */
function isAllowedForDeactivated(path: string): boolean {
  const allowedPaths = [
    '/api/user',
    '/api/logout',
    '/api/export-data',
    '/api/trial-status',
    '/api/upgrade',
    '/api/stripe',
  ];
  
  return allowedPaths.some(allowedPath => path.startsWith(allowedPath));
}

/**
 * Check if the request is a write operation
 */
function isWriteOperation(method: string, path: string): boolean {
  // Write operations are POST, PUT, PATCH, DELETE
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    return false;
  }
  
  // Exception: Allow login and upgrade operations
  const writeExceptions = [
    '/api/login',
    '/api/logout',
    '/api/upgrade',
    '/api/stripe',
    '/api/export-data',
  ];
  
  return !writeExceptions.some(exception => path.startsWith(exception));
}

/**
 * Middleware to inject trial status into responses
 */
export async function injectTrialStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.healthSystemId) {
    return next();
  }

  try {
    const trialStatus = await TrialManagementService.getTrialStatus(req.user.healthSystemId);
    
    // Store trial status in response locals for use in routes
    res.locals.trialStatus = trialStatus;
    
    next();
  } catch (error) {
    console.error('❌ [TrialMiddleware] Error injecting trial status:', error);
    next();
  }
}