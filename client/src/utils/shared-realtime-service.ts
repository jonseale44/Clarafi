/**
 * Shared Real-time Service for Provider and Nursing Workflows
 */

import { useRef, useCallback } from 'react';

export interface RealtimeServiceConfig {
  patientId: string;
  encounterId: string;
  userRole: 'provider' | 'nurse' | 'admin' | 'staff';
  onTranscriptionUpdate?: (transcription: string) => void;
  onContentGenerated?: (content: any) => void;
  onOrdersReceived?: (orders: any[]) => void;
  onValidationUpdate?: (validation: any) => void;
}

export interface AIContentRequest {
  type: 'soap_note' | 'nursing_assessment' | 'care_plan' | 'orders';
  content: string;
  context?: any;
}

export class SharedRealtimeService {
  private config: RealtimeServiceConfig;
  private transcriptionBuffer: string = '';
  private isProcessing: boolean = false;

  constructor(config: RealtimeServiceConfig) {
    this.config = config;
  }

  async processTranscription(transcription: string): Promise<void> {
    this.transcriptionBuffer = transcription;
    this.config.onTranscriptionUpdate?.(transcription);

    if (transcription.length > 100 && !this.isProcessing) {
      await this.triggerAIProcessing();
    }
  }

  async generateContent(request: AIContentRequest): Promise<any> {
    this.isProcessing = true;

    try {
      const roleSpecificPrompt = this.buildRoleSpecificPrompt(request);
      const response = await this.callAIService(roleSpecificPrompt, request);
      
      this.config.onContentGenerated?.(response);
      return response;
    } finally {
      this.isProcessing = false;
    }
  }

  async saveContent(content: string, type: string): Promise<void> {
    const fieldMapping = this.getRoleFieldMapping(type);
    const field = fieldMapping[type];
    
    if (!field) {
      throw new Error(`No field mapping for ${type} in ${this.config.userRole} role`);
    }

    const payload = { [field]: content };

    const response = await fetch(`/api/encounters/${this.config.encounterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to save ${type} content`);
    }
  }

  private getRoleFieldMapping(type: string): Record<string, string> {
    const mappings: Record<string, Record<string, string>> = {
      provider: {
        'soap_note': 'note',
        'assessment': 'note', 
        'plan': 'note'
      },
      nurse: {
        'assessment': 'nurseAssessment',
        'interventions': 'nurseInterventions', 
        'notes': 'nurseNotes'
      },
      admin: {
        'notes': 'note'
      },
      staff: {
        'notes': 'note'
      }
    };

    return mappings[this.config.userRole] || {};
  }

  private buildRoleSpecificPrompt(request: AIContentRequest): string {
    const basePrompt = `Patient ID: ${this.config.patientId}\nContent: ${request.content}\n\n`;
    
    const rolePrompts: Record<string, Record<string, string>> = {
      provider: {
        soap_note: basePrompt + "Generate a comprehensive SOAP note focusing on medical diagnosis, treatment planning, and billing optimization.",
        orders: basePrompt + "Generate appropriate medical orders including medications, labs, and imaging studies."
      },
      nurse: {
        nursing_assessment: basePrompt + `Generate a nursing assessment using professional medical abbreviations and bullet point formatting.

CRITICAL FORMATTING STANDARDS:
- Use standard medical abbreviations: HTN, DM2, CAD, CHF, COPD, GERD, etc.
- Format ALL content with bullet points using hyphens (-)
- Convert long-form conditions to abbreviations (hypertension → HTN, diabetes type 2 → DM2)
- Use professional nursing terminology throughout

MEDICAL ABBREVIATIONS TO USE:
- Hypertension → HTN
- Diabetes Type 2 → DM2
- Coronary Artery Disease → CAD
- Congestive Heart Failure → CHF
- Chronic Obstructive Pulmonary Disease → COPD
- Gastroesophageal Reflux Disease → GERD
- Atrial Fibrillation → AFib
- Myocardial Infarction → MI
- Cerebrovascular Accident → CVA
- Hyperlipidemia → HLD
- Osteoarthritis → OA
- Rheumatoid Arthritis → RA
- Urinary Tract Infection → UTI
- Blood Pressure → BP
- Heart Rate → HR
- Respiratory Rate → RR
- Temperature → T
- Oxygen Saturation → O2 Sat

Focus on patient safety, comfort, education needs, and nursing interventions using proper medical shorthand.`,
        care_plan: basePrompt + `Create a nursing care plan using NANDA diagnoses and bullet point formatting.

FORMATTING REQUIREMENTS:
- Use bullet points with hyphens (-) for all content
- Apply standard medical abbreviations consistently
- Include specific, measurable goals and interventions
- Use evidence-based nursing practice terminology

Create patient-centered goals, interventions, and evaluation criteria with proper medical abbreviations.`,
        interventions: basePrompt + `Document nursing interventions using professional medical terminology and bullet point formatting.

FORMATTING STANDARDS:
- Use bullet points with hyphens (-) for all interventions and responses
- Include specific times, doses, and measurements
- Use standard medical abbreviations consistently
- Document both interventions performed and patient responses

Format as professional nursing intervention documentation.`
      },
      admin: {
        notes: basePrompt + "Generate administrative notes and workflow documentation."
      },
      staff: {
        notes: basePrompt + "Generate staff notes and task documentation."
      }
    };

    return rolePrompts[this.config.userRole]?.[request.type] || basePrompt + `Generate ${request.type} content for ${this.config.userRole}.`;
  }

  private async callAIService(prompt: string, request: AIContentRequest): Promise<any> {
    // For now, use the existing SOAP generation endpoint but adapt for nursing
    const endpoint = this.config.userRole === 'nurse' 
      ? '/api/generate-nursing-content' 
      : '/api/generate-soap-from-transcription';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        type: request.type,
        patientId: this.config.patientId,
        encounterId: this.config.encounterId,
        transcription: request.content,
        context: request.context
      })
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    return response.json();
  }

  private async triggerAIProcessing(): Promise<void> {
    if (this.transcriptionBuffer.length < 100) return;

    const contentType = this.config.userRole === 'provider' ? 'soap_note' : 'nursing_assessment';
    
    await this.generateContent({
      type: contentType as any,
      content: this.transcriptionBuffer
    });
  }

  async getValidationRequirements(): Promise<any> {
    const response = await fetch(`/api/encounters/${this.config.encounterId}/validation`);
    
    if (!response.ok) {
      throw new Error('Failed to get validation requirements');
    }

    const validation = await response.json();
    this.config.onValidationUpdate?.(validation);
    return validation;
  }

  updateConfig(newConfig: Partial<RealtimeServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  cleanup(): void {
    this.transcriptionBuffer = '';
    this.isProcessing = false;
  }
}

export function useSharedRealtimeService(config: RealtimeServiceConfig) {
  const serviceRef = useRef<SharedRealtimeService | null>(null);

  const initializeService = useCallback(() => {
    if (!serviceRef.current) {
      serviceRef.current = new SharedRealtimeService(config);
    }
    return serviceRef.current;
  }, [config]);

  const getService = useCallback(() => {
    return serviceRef.current || initializeService();
  }, [initializeService]);

  const cleanup = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.cleanup();
      serviceRef.current = null;
    }
  }, []);

  return {
    service: getService(),
    initializeService,
    cleanup
  };
}