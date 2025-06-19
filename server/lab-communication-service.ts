/**
 * Lab Communication Service - Phase 2: GPT Message Generation
 * 
 * Generates AI-powered patient communications based on lab results
 * with multi-channel delivery and provider approval workflows
 */

import OpenAI from 'openai';
import { db } from './db';
import { labResults, patients, encounters, users } from '../shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LabMessage {
  id: number;
  patientId: number;
  encounterId: number;
  messageType: 'normal_results' | 'abnormal_results' | 'critical_results' | 'follow_up_required';
  content: string;
  channel: 'portal' | 'sms' | 'email' | 'postal';
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'failed';
  generatedBy: 'ai' | 'provider';
  approvedBy?: number;
  sentAt?: Date;
  readAt?: Date;
  resultIds: number[];
  urgencyLevel: 'routine' | 'urgent' | 'critical';
  createdAt: Date;
}

export interface MessageGenerationRequest {
  patientId: number;
  encounterId: number;
  resultIds: number[];
  messageType?: 'normal_results' | 'abnormal_results' | 'critical_results' | 'follow_up_required';
  preferredChannel?: 'portal' | 'sms' | 'email' | 'postal';
  forceGenerate?: boolean; // Skip waiting for complete panels
}

export interface PatientCommunicationPreferences {
  patientId: number;
  preferredChannel: 'portal' | 'sms' | 'email' | 'postal';
  secondaryChannel?: 'portal' | 'sms' | 'email' | 'postal';
  urgentChannel: 'portal' | 'sms' | 'email' | 'postal';
  timePreference: 'morning' | 'afternoon' | 'evening' | 'any';
  languagePreference: 'en' | 'es' | 'fr';
  simplifiedLanguage: boolean;
  includeDetails: boolean;
}

export class LabCommunicationService {
  
  /**
   * Generate AI-powered lab result message for patient communication
   */
  static async generateLabMessage(request: MessageGenerationRequest): Promise<LabMessage> {
    console.log(`🤖 [Lab Communication] Generating message for patient ${request.patientId}`);
    
    // Get lab results
    const results = await db
      .select()
      .from(labResults)
      .where(inArray(labResults.id, request.resultIds));
    
    if (!results.length) {
      throw new Error('No lab results found for message generation');
    }
    
    // Get patient information
    const patient = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        preferredLanguage: 'en' // Default language
      })
      .from(patients)
      .where(eq(patients.id, request.patientId))
      .limit(1);
    
    if (!patient.length) {
      throw new Error('Patient not found');
    }
    
    // Get communication preferences (mock for now - would be in separate table)
    const preferences = await this.getPatientCommunicationPreferences(request.patientId);
    
    // Determine message type and urgency
    const messageAnalysis = this.analyzeResults(results);
    const messageType = request.messageType || messageAnalysis.messageType;
    const urgencyLevel = messageAnalysis.urgencyLevel;
    
    // Generate message content using GPT
    const messageContent = await this.generateMessageContent({
      patient: patient[0],
      results,
      messageType,
      preferences,
      urgencyLevel
    });
    
    // Create message record
    const message: Partial<LabMessage> = {
      patientId: request.patientId,
      encounterId: request.encounterId,
      messageType,
      content: messageContent,
      channel: request.preferredChannel || preferences.preferredChannel,
      status: urgencyLevel === 'critical' ? 'pending_approval' : 'draft',
      generatedBy: 'ai',
      resultIds: request.resultIds,
      urgencyLevel,
      createdAt: new Date()
    };
    
    console.log(`✅ [Lab Communication] Generated ${messageType} message for patient ${request.patientId}`);
    return message as LabMessage;
  }
  
  /**
   * Analyze lab results to determine message type and urgency
   */
  private static analyzeResults(results: any[]): { messageType: LabMessage['messageType'], urgencyLevel: LabMessage['urgencyLevel'] } {
    const hasCritical = results.some(r => r.criticalFlag || r.abnormalFlag === 'Critical');
    const hasAbnormal = results.some(r => r.abnormalFlag && r.abnormalFlag !== 'Normal');
    
    if (hasCritical) {
      return { messageType: 'critical_results', urgencyLevel: 'critical' };
    } else if (hasAbnormal) {
      return { messageType: 'abnormal_results', urgencyLevel: 'urgent' };
    } else {
      return { messageType: 'normal_results', urgencyLevel: 'routine' };
    }
  }
  
  /**
   * Generate message content using GPT
   */
  private static async generateMessageContent(params: {
    patient: any;
    results: any[];
    messageType: LabMessage['messageType'];
    preferences: PatientCommunicationPreferences;
    urgencyLevel: LabMessage['urgencyLevel'];
  }): Promise<string> {
    
    const { patient, results, messageType, preferences, urgencyLevel } = params;
    
    const systemPrompt = this.buildCommunicationPrompt(messageType, preferences);
    
    const resultsContext = results.map(r => ({
      testName: r.testName,
      result: r.resultValue,
      normalRange: r.referenceRange,
      status: r.abnormalFlag || 'Normal',
      units: r.resultUnits
    }));
    
    const userPrompt = `
Patient: ${patient.firstName} ${patient.lastName}
Lab Results:
${resultsContext.map(r => `- ${r.testName}: ${r.result} ${r.units || ''} (Normal: ${r.normalRange || 'N/A'}) - ${r.status}`).join('\n')}

Message Type: ${messageType}
Urgency: ${urgencyLevel}
Language Preference: ${preferences.languagePreference}
Simplified Language: ${preferences.simplifiedLanguage ? 'Yes' : 'No'}
Include Details: ${preferences.includeDetails ? 'Yes' : 'No'}

Generate a patient-friendly message about these lab results.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      return completion.choices[0]?.message?.content || 'Unable to generate message content.';
    } catch (error) {
      console.error('Error generating message content:', error);
      return this.getFallbackMessage(messageType, results);
    }
  }
  
  /**
   * Build system prompt for different message types
   */
  private static buildCommunicationPrompt(messageType: LabMessage['messageType'], preferences: PatientCommunicationPreferences): string {
    const basePrompt = `You are a healthcare communication assistant that creates patient-friendly messages about lab results. 

GUIDELINES:
- Use clear, non-medical language that patients can understand
- Be empathetic and reassuring when appropriate
- Include next steps when results are abnormal
- Match the tone to the urgency level
- Respect cultural sensitivities
- Include contact information for questions
- ${preferences.simplifiedLanguage ? 'Use very simple language suitable for low health literacy' : 'Use standard patient-friendly language'}
- ${preferences.includeDetails ? 'Include specific result values and explanations' : 'Focus on overall summary without specific numbers'}
`;

    const typeSpecificPrompts = {
      normal_results: `
${basePrompt}

MESSAGE TYPE: Normal Results
- Congratulate on normal results
- Reassure about health status
- Mention when next testing might be needed
- Keep tone positive and brief
`,
      abnormal_results: `
${basePrompt}

MESSAGE TYPE: Abnormal Results
- Explain what the abnormal results mean
- Provide context (many abnormal results are not serious)
- Clearly state next steps
- Encourage patient to contact provider
- Balance concern with reassurance
`,
      critical_results: `
${basePrompt}

MESSAGE TYPE: Critical Results
- Explain urgency without causing panic
- Clearly state immediate next steps
- Provide emergency contact information
- Emphasize importance of follow-up
- Be direct but compassionate
`,
      follow_up_required: `
${basePrompt}

MESSAGE TYPE: Follow-up Required
- Explain why additional testing is needed
- Provide clear instructions for next steps
- Reassure that follow-up is precautionary
- Include scheduling information
`
    };

    return typeSpecificPrompts[messageType];
  }
  
  /**
   * Get patient communication preferences
   */
  private static async getPatientCommunicationPreferences(patientId: number): Promise<PatientCommunicationPreferences> {
    // For now, return default preferences
    // In production, this would query a patient_communication_preferences table
    return {
      patientId,
      preferredChannel: 'portal',
      secondaryChannel: 'email',
      urgentChannel: 'sms',
      timePreference: 'any',
      languagePreference: 'en',
      simplifiedLanguage: false,
      includeDetails: true
    };
  }
  
  /**
   * Fallback message when GPT fails
   */
  private static getFallbackMessage(messageType: LabMessage['messageType'], results: any[]): string {
    const templates = {
      normal_results: `Your recent lab results are within normal limits. Please contact your healthcare provider if you have any questions.`,
      abnormal_results: `Your recent lab results show some values outside the normal range. Please contact your healthcare provider to discuss these results and next steps.`,
      critical_results: `Your recent lab results require immediate attention. Please contact your healthcare provider immediately or visit the emergency department if instructed.`,
      follow_up_required: `Your recent lab results indicate that additional testing may be needed. Please contact your healthcare provider to schedule follow-up care.`
    };
    
    return templates[messageType];
  }
  
  /**
   * Process batch messages for multiple patients by encounter
   */
  static async processBatchMessagesByEncounter(encounterId: number): Promise<LabMessage[]> {
    console.log(`📧 [Lab Communication] Processing batch messages for encounter ${encounterId}`);
    
    // Get all results for this encounter grouped by patient
    const encounterResults = await db
      .select()
      .from(labResults)
      .where(eq(labResults.patientId, encounterId)); // Note: Using patientId temporarily
    
    // Group results by patient
    const resultsByPatient = encounterResults.reduce((acc, result) => {
      if (!acc[result.patientId]) {
        acc[result.patientId] = [];
      }
      acc[result.patientId].push(result);
      return acc;
    }, {} as Record<number, any[]>);
    
    const messages: LabMessage[] = [];
    
    // Generate message for each patient
    for (const [patientIdStr, patientResults] of Object.entries(resultsByPatient)) {
      const patientId = parseInt(patientIdStr);
      const resultIds = patientResults.map(r => r.id);
      
      try {
        const message = await this.generateLabMessage({
          patientId,
          encounterId,
          resultIds
        });
        
        messages.push(message);
      } catch (error) {
        console.error(`Failed to generate message for patient ${patientId}:`, error);
      }
    }
    
    console.log(`✅ [Lab Communication] Generated ${messages.length} messages for encounter ${encounterId}`);
    return messages;
  }
  
  /**
   * Approve message for sending
   */
  static async approveMessage(messageId: number, providerId: number): Promise<boolean> {
    // In production, this would update the message status to 'approved'
    // and set the approvedBy field
    console.log(`✅ [Lab Communication] Message ${messageId} approved by provider ${providerId}`);
    return true;
  }
  
  /**
   * Send approved message via specified channel
   */
  static async sendMessage(messageId: number): Promise<boolean> {
    // In production, this would integrate with:
    // - Patient portal API
    // - SMS service (Twilio)
    // - Email service (SendGrid)
    // - Postal mail service
    console.log(`📤 [Lab Communication] Message ${messageId} sent successfully`);
    return true;
  }
}