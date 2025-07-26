/**
 * Patient Notification Service
 * 
 * Completes the lab cycle by automatically notifying patients of their results
 * after provider review, using GPT-enhanced messaging for clarity.
 */

import { db } from "./db.js";
import { labResults, patients, users, healthSystems } from "@shared/schema";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { GPTLabReviewService } from "./gpt-lab-review-service.js";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";

// Initialize services if credentials are available
const sendgridEnabled = !!process.env.SENDGRID_API_KEY;
const twilioEnabled = !!process.env.TWILIO_ACCOUNT_SID;

if (sendgridEnabled) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

const twilioClient = twilioEnabled 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export interface PatientCommunication {
  id?: number;
  patientId: number;
  labResultIds: number[];
  messageType: 'lab_result' | 'critical_result' | 'follow_up';
  messageContent: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  scheduledFor: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  deliveryMethod?: 'email' | 'sms' | 'portal' | 'phone';
  deliveryDetails?: any;
  error?: string;
}

export interface NotificationOptions {
  urgency?: 'routine' | 'urgent' | 'critical';
  includeEducation?: boolean;
  language?: string;
  preferredChannel?: 'email' | 'sms';
  useAllChannels?: boolean; // Use this instead of 'both'
}

export class PatientNotificationService {
  /**
   * Main entry point: Process new lab results and send notifications
   */
  static async processNewResults(
    resultIds: number[], 
    options: NotificationOptions = {}
  ): Promise<PatientCommunication[]> {
    console.log(`📧 [PatientNotification] Processing ${resultIds.length} results for notification`);
    
    try {
      // Group results by patient
      const resultsByPatient = await this.groupResultsByPatient(resultIds);
      const communications: PatientCommunication[] = [];
      
      for (const [patientId, patientResults] of Array.from(resultsByPatient)) {
        // Generate patient-specific message
        const communication = await this.createPatientCommunication(
          patientId, 
          patientResults,
          options
        );
        
        // Send notification
        const sent = await this.sendNotification(communication, options);
        
        if (sent) {
          communications.push(sent);
        }
      }
      
      console.log(`✅ [PatientNotification] Created ${communications.length} patient notifications`);
      return communications;
      
    } catch (error) {
      console.error(`❌ [PatientNotification] Error processing results:`, error);
      throw error;
    }
  }
  
  /**
   * Group lab results by patient for consolidated messaging
   */
  private static async groupResultsByPatient(
    resultIds: number[]
  ): Promise<Map<number, any[]>> {
    const results = await db.select()
      .from(labResults)
      .where(inArray(labResults.id, resultIds))
      .orderBy(desc(labResults.resultAvailableAt));
    
    const grouped = new Map<number, any[]>();
    
    for (const result of results) {
      const patientResults = grouped.get(result.patientId) || [];
      patientResults.push(result);
      grouped.set(result.patientId, patientResults);
    }
    
    return grouped;
  }
  
  /**
   * Create patient communication with GPT enhancement
   */
  private static async createPatientCommunication(
    patientId: number,
    results: any[],
    options: NotificationOptions
  ): Promise<PatientCommunication> {
    console.log(`📝 [PatientNotification] Creating communication for patient ${patientId}`);
    
    // Get patient profile for personalization
    const patientData = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (!patientData.length) {
      throw new Error(`Patient ${patientId} not found`);
    }
    
    const patient = patientData[0];
    
    // Determine if any results are critical
    const hasCritical = results.some(r => 
      r.criticalFlag || ['HH', 'LL', 'CRITICAL'].includes(r.abnormalFlag)
    );
    
    // Generate patient-friendly message with GPT
    const messageContent = await this.generatePatientMessage(
      patient,
      results,
      {
        ...options,
        urgency: hasCritical ? 'critical' : options.urgency || 'routine'
      }
    );
    
    return {
      patientId,
      labResultIds: results.map(r => r.id),
      messageType: hasCritical ? 'critical_result' : 'lab_result',
      messageContent,
      status: 'pending',
      scheduledFor: new Date(),
      deliveryMethod: options.preferredChannel || 'email'
    };
  }
  
  /**
   * Generate patient-friendly message using GPT
   */
  private static async generatePatientMessage(
    patient: any,
    results: any[],
    options: NotificationOptions
  ): Promise<string> {
    try {
      // Generate GPT review for the lab results
      const reviewRequest = {
        patientId: patient.id,
        resultIds: results.map(r => r.id),
        requestedBy: 1 // System user ID for automated processes
      };
      
      const reviewId = await GPTLabReviewService.generateLabReview(reviewRequest);
      
      // Get the generated review to extract patient message
      const review = await GPTLabReviewService.getGPTReview(reviewId);
      
      if (!review) {
        throw new Error('Failed to get generated review');
      }
      
      // Add personalization to the patient message
      const personalizedMessage = await this.personalizeMessage(
        review.patientMessage,
        patient,
        options
      );
      
      return personalizedMessage;
      
    } catch (error) {
      console.error(`❌ [PatientNotification] GPT generation failed, using fallback`);
      return this.generateFallbackMessage(patient, results, options);
    }
  }
  
  /**
   * Personalize message based on patient preferences
   */
  private static async personalizeMessage(
    baseMessage: string,
    patient: any,
    options: NotificationOptions
  ): Promise<string> {
    const greeting = `Dear ${patient.firstName || 'Patient'},\n\n`;
    
    const urgencyPrefix = options.urgency === 'critical' 
      ? '🚨 IMPORTANT: This message contains critical lab results that require immediate attention.\n\n'
      : options.urgency === 'urgent'
      ? '⚠️ This message contains lab results that need prompt attention.\n\n'
      : '';
    
    const footer = `\n\nIf you have any questions about these results, please contact your healthcare provider.\n\nBest regards,\nYour Healthcare Team`;
    
    return greeting + urgencyPrefix + baseMessage + footer;
  }
  
  /**
   * Fallback message generation if GPT fails
   */
  private static generateFallbackMessage(
    patient: any,
    results: any[],
    options: NotificationOptions
  ): string {
    const abnormalCount = results.filter(r => r.abnormalFlag).length;
    const criticalCount = results.filter(r => r.criticalFlag).length;
    
    let message = `Dear ${patient.firstName || 'Patient'},\n\n`;
    
    message += `Your recent lab results are now available. `;
    
    if (criticalCount > 0) {
      message += `⚠️ Some results require immediate attention. Please contact your healthcare provider as soon as possible.\n\n`;
    } else if (abnormalCount > 0) {
      message += `Some results are outside the normal range and may need follow-up.\n\n`;
    } else {
      message += `All results appear to be within normal ranges.\n\n`;
    }
    
    message += `Tests completed:\n`;
    results.forEach(r => {
      const flag = r.criticalFlag ? ' (CRITICAL)' : r.abnormalFlag ? ' (Abnormal)' : '';
      message += `- ${r.testName}: ${r.resultValue} ${r.resultUnits || ''}${flag}\n`;
    });
    
    message += `\nPlease log into your patient portal to view detailed results and provider notes.`;
    message += `\n\nIf you have questions, contact your healthcare provider.`;
    
    return message;
  }
  
  /**
   * Send notification via appropriate channel
   */
  private static async sendNotification(
    communication: PatientCommunication,
    options: NotificationOptions
  ): Promise<PatientCommunication | null> {
    console.log(`📤 [PatientNotification] Sending ${communication.deliveryMethod} notification`);
    
    try {
      // Get patient contact information
      const patient = await db.select()
        .from(patients)
        .where(eq(patients.id, communication.patientId))
        .limit(1);
      
      if (!patient.length) {
        throw new Error('Patient not found');
      }
      
      const patientInfo = patient[0];
      let sent = false;
      let deliveryDetails: any = {};
      
      // Send based on delivery method
      switch (communication.deliveryMethod) {
        case 'email':
          if (patientInfo.email && sendgridEnabled) {
            sent = await this.sendEmail(patientInfo.email, communication);
            deliveryDetails.email = patientInfo.email;
          }
          break;
          
        case 'sms':
          if (patientInfo.phone && twilioEnabled) {
            sent = await this.sendSMS(patientInfo.phone, communication);
            deliveryDetails.phone = patientInfo.phone;
          }
          break;
          
        default:
          // If useAllChannels is true, try both email and SMS
          if (options.useAllChannels) {
            const emailSent = patientInfo.email && sendgridEnabled 
              ? await this.sendEmail(patientInfo.email, communication) 
              : false;
            const smsSent = patientInfo.phone && twilioEnabled 
              ? await this.sendSMS(patientInfo.phone, communication) 
              : false;
            
            sent = emailSent || smsSent;
            deliveryDetails = {
              email: emailSent ? patientInfo.email : null,
              phone: smsSent ? patientInfo.phone : null
            };
          }
          break;
          
        case 'portal':
          // Portal notifications would be handled by portal system
          sent = true;
          deliveryDetails.method = 'portal';
          break;
      }
      
      // Update communication record
      communication.status = sent ? 'sent' : 'failed';
      communication.sentAt = sent ? new Date() : undefined;
      communication.deliveryDetails = deliveryDetails;
      
      // Store in database (would need to add this table)
      await this.storeCommunication(communication);
      
      return communication;
      
    } catch (error) {
      console.error(`❌ [PatientNotification] Send failed:`, error);
      communication.status = 'failed';
      communication.error = error instanceof Error ? error.message : 'Unknown error';
      await this.storeCommunication(communication);
      return null;
    }
  }
  
  /**
   * Send email notification
   */
  private static async sendEmail(
    email: string, 
    communication: PatientCommunication
  ): Promise<boolean> {
    if (!sendgridEnabled) {
      console.warn('⚠️ [PatientNotification] SendGrid not configured');
      return false;
    }
    
    try {
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@clarafi.com',
        subject: communication.messageType === 'critical_result' 
          ? '🚨 Critical Lab Results - Immediate Attention Required'
          : 'Your Lab Results Are Ready',
        text: communication.messageContent,
        html: this.formatEmailHTML(communication.messageContent)
      };
      
      await sgMail.send(msg);
      console.log(`✅ [PatientNotification] Email sent to ${email}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [PatientNotification] Email failed:`, error);
      return false;
    }
  }
  
  /**
   * Send SMS notification
   */
  private static async sendSMS(
    phone: string, 
    communication: PatientCommunication
  ): Promise<boolean> {
    if (!twilioEnabled || !twilioClient) {
      console.warn('⚠️ [PatientNotification] Twilio not configured');
      return false;
    }
    
    try {
      // Truncate message for SMS (160 char limit)
      const smsMessage = communication.messageContent.length > 160
        ? communication.messageContent.substring(0, 157) + '...'
        : communication.messageContent;
      
      await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      
      console.log(`✅ [PatientNotification] SMS sent to ${phone}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [PatientNotification] SMS failed:`, error);
      return false;
    }
  }
  
  /**
   * Format email content as HTML
   */
  private static formatEmailHTML(content: string): string {
    // Convert line breaks to <br> and wrap in basic HTML
    const htmlContent = content
      .replace(/\n/g, '<br>')
      .replace(/🚨/g, '<span style="color: red;">🚨</span>')
      .replace(/⚠️/g, '<span style="color: orange;">⚠️</span>');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f5f5f5; }
            .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>CLARAFI Healthcare</h2>
            </div>
            <div class="content">
              ${htmlContent}
            </div>
            <div class="footer">
              This is an automated message. Please do not reply to this email.
            </div>
          </div>
        </body>
      </html>
    `;
  }
  
  /**
   * Store communication record in database
   */
  private static async storeCommunication(communication: PatientCommunication): Promise<void> {
    // This would store in a patient_communications table
    // For now, just log it
    console.log(`💾 [PatientNotification] Storing communication:`, {
      patientId: communication.patientId,
      status: communication.status,
      method: communication.deliveryMethod,
      resultCount: communication.labResultIds.length
    });
    
    // Mark lab results as communicated
    // Note: Patient communication tracking fields will be added to schema in future iteration
    if (communication.status === 'sent') {
      console.log(`📝 [PatientNotification] Would mark ${communication.labResultIds.length} results as communicated via ${communication.deliveryMethod}`);
      // TODO: Add patient communication tracking fields to labResults schema
      // await db.update(labResults)
      //   .set({
      //     patientCommunicationSent: true,
      //     patientCommunicationMethod: communication.deliveryMethod,
      //     patientCommunicationTimestamp: new Date()
      //   })
      //   .where(inArray(labResults.id, communication.labResultIds));
    }
  }
  
  /**
   * Check for critical results requiring immediate notification
   */
  static async checkCriticalResults(): Promise<void> {
    console.log(`🚨 [PatientNotification] Checking for critical results`);
    
    // Find critical results not yet communicated
    // TODO: Add patient communication tracking to schema
    const criticalResults = await db.select()
      .from(labResults)
      .where(
        and(
          eq(labResults.criticalFlag, true),
          eq(labResults.needsReview, true) // Use existing field as proxy for now
        )
      )
      .limit(10);
    
    if (criticalResults.length > 0) {
      console.log(`🚨 [PatientNotification] Found ${criticalResults.length} critical results`);
      
      const resultIds = criticalResults.map(r => r.id);
      await this.processNewResults(resultIds, {
        urgency: 'critical',
        useAllChannels: true // Use all available channels for critical results
      });
    }
  }
}

// Export for use in background processor
export default PatientNotificationService;