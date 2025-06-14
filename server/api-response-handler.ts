/**
 * Standardized API Response Handler
 * 
 * Provides consistent error handling, response formatting, and logging
 * across all API endpoints to eliminate inconsistent error patterns
 */

import type { Response } from 'express';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

export class APIResponseHandler {
  /**
   * Send successful response with consistent formatting
   */
  static success<T>(res: Response, data: T, statusCode: number = 200): Response {
    const response: APIResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response with consistent formatting and logging
   */
  static error(
    res: Response, 
    error: Error | string, 
    statusCode: number = 500,
    errorCode?: string
  ): Response {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const response: APIResponse = {
      success: false,
      error: {
        code: errorCode || `HTTP_${statusCode}`,
        message: errorMessage,
        details: typeof error === 'object' ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    };

    // Log error for debugging (but don't expose sensitive details to client)
    console.error(`[API Error ${statusCode}] ${errorMessage}`, typeof error === 'object' ? error : '');
    
    return res.status(statusCode).json(response);
  }

  /**
   * Handle authentication errors consistently
   */
  static unauthorized(res: Response, message: string = 'Authentication required'): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Handle validation errors consistently
   */
  static badRequest(res: Response, message: string, validationErrors?: any): Response {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: validationErrors
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }

  /**
   * Handle not found errors consistently
   */
  static notFound(res: Response, resource: string): Response {
    return this.error(res, `${resource} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Handle conflict errors consistently
   */
  static conflict(res: Response, message: string): Response {
    return this.error(res, message, 409, 'CONFLICT');
  }

  /**
   * Wrap async route handlers with error catching
   */
  static asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('[Async Handler Error]', error);
        this.error(res, error);
      });
    };
  }
}