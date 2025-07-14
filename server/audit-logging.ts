import { Request, Response, NextFunction } from 'express';
import { pool } from './db';
import { AuthenticatedRequest } from './auth';
import { phiAccessLogs, authenticationLogs, dataModificationLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Initialize drizzle instance for audit logging
const db = drizzle(pool, { schema });

// Helper to extract IP address
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Helper to determine resource type from endpoint
function getResourceType(endpoint: string): string {
  if (endpoint.includes('/patients')) return 'patient';
  if (endpoint.includes('/encounters')) return 'encounter';
  if (endpoint.includes('/medications')) return 'medication';
  if (endpoint.includes('/lab')) return 'lab_result';
  if (endpoint.includes('/imaging')) return 'imaging';
  if (endpoint.includes('/vitals')) return 'vitals';
  if (endpoint.includes('/orders')) return 'order';
  if (endpoint.includes('/attachments')) return 'attachment';
  if (endpoint.includes('/allergies')) return 'allergy';
  if (endpoint.includes('/problems')) return 'medical_problem';
  if (endpoint.includes('/diagnoses')) return 'diagnosis';
  return 'unknown';
}

// Helper to extract resource ID from URL
function extractResourceId(url: string): number {
  const matches = url.match(/\/(\d+)/);
  return matches ? parseInt(matches[1]) : 0;
}

// Helper to extract patient ID from request
function extractPatientId(req: AuthenticatedRequest): number | null {
  // Check URL params
  if (req.params.patientId) return parseInt(req.params.patientId);
  if (req.params.id && req.originalUrl.includes('/patients/')) return parseInt(req.params.id);
  
  // Check request body
  if (req.body?.patientId) return parseInt(req.body.patientId);
  if (req.body?.patient_id) return parseInt(req.body.patient_id);
  
  return null;
}

// Helper to determine action from HTTP method
function getAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'view';
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

// HIPAA PHI Access Logging Middleware
export async function auditPHIAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  
  // Skip non-PHI endpoints
  const nonPHIEndpoints = [
    '/api/auth',
    '/api/health',
    '/api/admin',
    '/api/dev',
    '/api/organization-types',
    '/api/subscription',
    '/api/migration/invitations',
    '/api/user-templates',
    '/api/feature-gates'
  ];
  
  const isPHIEndpoint = !nonPHIEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint));
  
  if (!isPHIEndpoint || !req.user) {
    return next();
  }

  // Capture original send method
  const originalSend = res.send;
  
  // Override send method to log after response
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Log PHI access asynchronously (don't block response)
    logPHIAccess({
      userId: req.user!.id,
      userName: req.user!.username,
      userRole: req.user!.role,
      healthSystemId: req.user!.healthSystemId || 0,
      locationId: req.sessionLocation?.id || null,
      patientId: extractPatientId(req),
      resourceType: getResourceType(req.originalUrl),
      resourceId: extractResourceId(req.originalUrl),
      action: getAction(req.method),
      accessMethod: 'web',
      httpMethod: req.method,
      apiEndpoint: req.originalUrl,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
      sessionId: req.sessionID || null,
      success,
      errorMessage: success ? null : (typeof data === 'object' ? data.error : 'Unknown error'),
      responseTime,
      accessReason: req.body?.accessReason || 'treatment',
      emergencyAccess: req.body?.emergencyAccess || false,
      breakGlassReason: req.body?.breakGlassReason || null,
    }).catch(err => {
      console.error('Failed to log PHI access:', err);
    });
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
}

// Log PHI access to database
async function logPHIAccess(data: {
  userId: number;
  userName: string;
  userRole: string;
  healthSystemId: number;
  locationId: number | null;
  patientId: number | null;
  resourceType: string;
  resourceId: number;
  action: string;
  accessMethod: string;
  httpMethod: string;
  apiEndpoint: string;
  ipAddress: string;
  userAgent: string | null;
  sessionId: string | null;
  success: boolean;
  errorMessage: string | null;
  responseTime: number;
  accessReason: string;
  emergencyAccess: boolean;
  breakGlassReason: string | null;
}): Promise<void> {
  try {
    // Get patient name if we have patient ID
    let patientName = null;
    if (data.patientId) {
      const patientResult = await pool.query(
        'SELECT first_name, last_name FROM patients WHERE id = $1',
        [data.patientId]
      );
      if (patientResult.rows.length > 0) {
        const patient = patientResult.rows[0];
        // Encrypt patient name in production - for now just concatenate
        patientName = `${patient.first_name} ${patient.last_name}`;
      }
    }
    
    await db.insert(phiAccessLogs).values({
      ...data,
      patientName,
    });
  } catch (error) {
    console.error('Error logging PHI access:', error);
  }
}

// Authentication Event Logging
export async function logAuthenticationEvent(data: {
  userId?: number;
  username: string;
  email?: string;
  healthSystemId?: number;
  eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'session_timeout' | 'password_change' | 'mfa_challenge' | 'account_locked';
  success: boolean;
  failureReason?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  sessionDuration?: number;
  mfaType?: string;
  mfaSuccess?: boolean;
  riskScore?: number;
  riskFactors?: string[];
}): Promise<void> {
  try {
    await db.insert(authenticationLogs).values({
      ...data,
      deviceFingerprint: null, // TODO: Implement device fingerprinting
      geolocation: null, // TODO: Implement IP geolocation
    });
  } catch (error) {
    console.error('Error logging authentication event:', error);
  }
}

// Data Modification Logging
export async function logDataModification(data: {
  userId: number;
  userName: string;
  userRole: string;
  healthSystemId: number;
  tableName: string;
  recordId: number;
  patientId?: number;
  operation: 'insert' | 'update' | 'delete';
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  changeReason?: string;
  encounterId?: number;
  orderAuthority?: string;
}): Promise<void> {
  try {
    await db.insert(dataModificationLogs).values({
      ...data,
      validated: false,
      validatedBy: null,
      validatedAt: null,
    });
  } catch (error) {
    console.error('Error logging data modification:', error);
  }
}

// Emergency Access Logging (for break-glass scenarios)
export async function logEmergencyAccess(data: {
  userId: number;
  userName: string;
  userRole: string;
  healthSystemId: number;
  patientId: number;
  patientName: string;
  emergencyType: 'life_threatening' | 'urgent_care' | 'disaster_response';
  justification: string;
  authorizingPhysician?: string;
}): Promise<void> {
  try {
    const result = await db.insert(schema.emergencyAccessLogs).values({
      ...data,
      accessStartTime: new Date(),
      accessEndTime: null,
      accessedResources: [],
      reviewRequired: true,
      reviewedBy: null,
      reviewedAt: null,
      reviewOutcome: null,
      reviewNotes: null,
    }).returning();
    
    console.log(`🚨 EMERGENCY ACCESS: User ${data.userName} (${data.userId}) accessed patient ${data.patientName} (${data.patientId}) - Reason: ${data.justification}`);
  } catch (error) {
    console.error('Error logging emergency access:', error);
  }
}

// Middleware to log data modifications
export function auditDataModification(tableName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next();
    
    // Capture original json method
    const originalJson = res.json;
    
    // Override json method to log after successful modification
    res.json = function(data: any) {
      if (res.statusCode < 400 && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
        const operation = req.method === 'POST' ? 'insert' : 
                         req.method === 'DELETE' ? 'delete' : 'update';
        
        logDataModification({
          userId: req.user!.id,
          userName: req.user!.username,
          userRole: req.user!.role,
          healthSystemId: req.user!.healthSystemId || 0,
          tableName,
          recordId: data.id || extractResourceId(req.originalUrl),
          patientId: extractPatientId(req),
          operation,
          changeReason: req.body?.changeReason,
          encounterId: req.body?.encounterId,
          orderAuthority: req.body?.orderAuthority,
        }).catch(err => {
          console.error('Failed to log data modification:', err);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}