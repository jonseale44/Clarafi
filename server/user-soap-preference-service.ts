/**
 * User SOAP Preference Service
 * Manages personalized SOAP note templates and AI learning for individual providers
 * Provides transparent customization with optional adaptive intelligence
 */

import OpenAI from 'openai';
import { 
  InsertUserSoapTemplate, 
  UserSoapTemplate, 
  InsertUserEditPattern,
  InsertUserAssistantThread 
} from '@shared/schema';

interface FormatPreferences {
  useBulletPoints: boolean;
  boldDiagnoses: boolean;
  separateAssessmentPlan: boolean;
  vitalSignsFormat: 'inline' | 'list' | 'table';
  physicalExamFormat: 'paragraph' | 'bullets' | 'structured';
  abbreviationStyle: 'minimal' | 'standard' | 'extensive';
  sectionSpacing: number;
  customSectionOrder?: string[];
}

interface EditAnalysis {
  isUserPreference: boolean;
  patternType: 'formatting' | 'medical_content' | 'style' | 'structure';
  rule: string;
  context: string;
  confidence: number;
}

export class UserSOAPPreferenceService {
  private openai: OpenAI;
  private userThreads: Map<number, string> = new Map();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for user preference learning');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Get or create default SOAP template for user
   * Creates system default on first use, then allows customization
   */
  async getUserTemplate(userId: number): Promise<UserSoapTemplate> {
    try {
      // This would normally query the database
      // For now, return a comprehensive default template
      return this.getDefaultTemplate(userId);
    } catch (error) {
      console.error('[UserSOAP] Error getting user template:', error);
      return this.getDefaultTemplate(userId);
    }
  }

  /**
   * Create or update user's SOAP template
   * Allows full customization of template structure and formatting
   */
  async saveUserTemplate(template: InsertUserSoapTemplate): Promise<UserSoapTemplate> {
    try {
      console.log(`[UserSOAP] Saving template "${template.templateName}" for user ${template.userId}`);
      
      // This would normally save to database
      // For now, return the template with generated ID
      const savedTemplate: UserSoapTemplate = {
        id: Date.now(), // Mock ID
        ...template,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLearningUpdate: null
      };

      console.log(`✅ [UserSOAP] Template saved successfully`);
      return savedTemplate;
    } catch (error) {
      console.error('[UserSOAP] Error saving template:', error);
      throw error;
    }
  }

  /**
   * Generate personalized SOAP note using user's template and preferences
   * Combines patient medical context with provider's documentation style
   */
  async generatePersonalizedSOAP(
    userId: number,
    patientId: number,
    transcription: string,
    patientContext?: any
  ): Promise<string> {
    try {
      console.log(`[UserSOAP] Generating personalized SOAP for user ${userId}, patient ${patientId}`);

      const userTemplate = await this.getUserTemplate(userId);
      const userThreadId = await this.getOrCreateUserThread(userId);

      // Create personalized prompt with user's template preferences
      const personalizedPrompt = this.buildPersonalizedPrompt(
        userTemplate,
        transcription,
        patientContext
      );

      console.log(`[UserSOAP] Using personalized template: ${userTemplate.templateName}`);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a medical AI that generates SOAP notes following the user's specific template and formatting preferences. Use the exact structure and style specified in the template.`
          },
          {
            role: "user",
            content: personalizedPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const soapNote = response.choices[0].message.content?.trim() || '';
      console.log(`✅ [UserSOAP] Generated personalized SOAP (${soapNote.length} characters)`);
      
      return soapNote;
    } catch (error) {
      console.error('[UserSOAP] Error generating personalized SOAP:', error);
      throw error;
    }
  }

  /**
   * Analyze user edits to learn preferences
   * Classifies changes as user style vs patient medical content
   */
  async analyzeUserEdit(
    userId: number,
    originalText: string,
    editedText: string,
    sectionType: string
  ): Promise<EditAnalysis | null> {
    try {
      if (!this.shouldAnalyzeEdit(originalText, editedText)) {
        return null;
      }

      console.log(`[UserSOAP] Analyzing edit for user ${userId} in ${sectionType} section`);

      const analysisPrompt = `Analyze this SOAP note edit to determine if it represents a user preference or patient-specific medical content.

Original: "${originalText}"
Edited: "${editedText}"
Section: ${sectionType}

Classify as:
1. USER PREFERENCE (formatting, style, structure, abbreviations, organization)
2. MEDICAL CONTENT (patient-specific clinical information, diagnoses, treatments)

Return JSON: {
  "isUserPreference": boolean,
  "patternType": "formatting|medical_content|style|structure",
  "rule": "description of the pattern",
  "context": "when this rule applies",
  "confidence": 0.0-1.0
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI that analyzes medical documentation patterns. Return only valid JSON."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300,
      });

      const analysisText = response.choices[0].message.content?.trim() || '';
      const analysis = JSON.parse(analysisText);

      if (analysis.isUserPreference && analysis.confidence > 0.6) {
        console.log(`✅ [UserSOAP] User preference detected: ${analysis.rule}`);
        return analysis;
      }

      return null;
    } catch (error) {
      console.error('[UserSOAP] Error analyzing edit:', error);
      return null;
    }
  }

  /**
   * Apply learned preferences to future SOAP generation
   * Updates user's template based on consistent edit patterns
   */
  async applyLearnedPreferences(userId: number, patterns: EditAnalysis[]): Promise<void> {
    try {
      if (patterns.length === 0) return;

      console.log(`[UserSOAP] Applying ${patterns.length} learned preferences for user ${userId}`);

      const userTemplate = await this.getUserTemplate(userId);
      
      // Update template based on learned patterns
      const updatedPreferences = this.updateFormatPreferences(
        userTemplate.formatPreferences as FormatPreferences,
        patterns
      );

      // Save updated template
      await this.saveUserTemplate({
        ...userTemplate,
        formatPreferences: updatedPreferences,
        lastLearningUpdate: new Date()
      });

      console.log(`✅ [UserSOAP] Applied learned preferences to template`);
    } catch (error) {
      console.error('[UserSOAP] Error applying learned preferences:', error);
    }
  }

  /**
   * Get user's AI learning thread for preference accumulation
   */
  private async getOrCreateUserThread(userId: number): Promise<string> {
    try {
      if (this.userThreads.has(userId)) {
        return this.userThreads.get(userId)!;
      }

      // Create new thread for user's style learning
      const thread = await this.openai.beta.threads.create({
        metadata: {
          userId: userId.toString(),
          threadType: 'style_learning',
          purpose: 'Learn user SOAP documentation preferences'
        }
      });

      this.userThreads.set(userId, thread.id);
      console.log(`[UserSOAP] Created style learning thread for user ${userId}: ${thread.id}`);
      
      return thread.id;
    } catch (error) {
      console.error('[UserSOAP] Error creating user thread:', error);
      throw error;
    }
  }

  /**
   * Build personalized SOAP generation prompt using user's template
   */
  private buildPersonalizedPrompt(
    template: UserSoapTemplate,
    transcription: string,
    patientContext?: any
  ): string {
    const prefs = template.formatPreferences as FormatPreferences;
    
    let prompt = `Generate a SOAP note using this specific template and formatting preferences:\n\n`;

    prompt += `**SUBJECTIVE TEMPLATE:**\n${template.subjectiveTemplate}\n\n`;
    prompt += `**OBJECTIVE TEMPLATE:**\n${template.objectiveTemplate}\n\n`;
    prompt += `**ASSESSMENT TEMPLATE:**\n${template.assessmentTemplate}\n\n`;
    prompt += `**PLAN TEMPLATE:**\n${template.planTemplate}\n\n`;

    prompt += `**FORMATTING PREFERENCES:**\n`;
    prompt += `- Use bullet points: ${prefs.useBulletPoints}\n`;
    prompt += `- Bold diagnoses: ${prefs.boldDiagnoses}\n`;
    prompt += `- Separate Assessment/Plan: ${prefs.separateAssessmentPlan}\n`;
    prompt += `- Vital signs format: ${prefs.vitalSignsFormat}\n`;
    prompt += `- Physical exam format: ${prefs.physicalExamFormat}\n`;
    prompt += `- Abbreviation style: ${prefs.abbreviationStyle}\n`;
    prompt += `- Section spacing: ${prefs.sectionSpacing} blank lines\n`;

    if (patientContext) {
      prompt += `\n**PATIENT CONTEXT:**\n${JSON.stringify(patientContext, null, 2)}\n`;
    }

    prompt += `\n**TRANSCRIPTION TO PROCESS:**\n${transcription}`;

    return prompt;
  }

  /**
   * Get default SOAP template for new users
   */
  private getDefaultTemplate(userId: number): UserSoapTemplate {
    return {
      id: 0,
      userId,
      templateName: "Standard Clinical Template",
      isDefault: true,
      subjectiveTemplate: "Patient presents with [chief complaint]. [History of present illness]. [Review of systems as relevant].",
      objectiveTemplate: "Vitals: [vital signs]\n\nPhysical Exam:\n[Physical examination findings]\n\nLabs: [laboratory results if available]",
      assessmentTemplate: "[Primary diagnosis]\n[Secondary diagnoses as applicable]\n[Clinical reasoning]",
      planTemplate: "[Treatment plan]\n[Medications]\n[Follow-up instructions]\n[Patient education]",
      formatPreferences: {
        useBulletPoints: true,
        boldDiagnoses: true,
        separateAssessmentPlan: true,
        vitalSignsFormat: 'inline' as const,
        physicalExamFormat: 'structured' as const,
        abbreviationStyle: 'standard' as const,
        sectionSpacing: 4
      },
      enableAiLearning: true,
      learningConfidence: "0.75",
      lastLearningUpdate: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Determine if an edit is significant enough to analyze
   */
  private shouldAnalyzeEdit(original: string, edited: string): boolean {
    if (!original || !edited) return false;
    if (original === edited) return false;
    if (Math.abs(original.length - edited.length) < 10) return false;
    return true;
  }

  /**
   * Update format preferences based on learned patterns
   */
  private updateFormatPreferences(
    current: FormatPreferences,
    patterns: EditAnalysis[]
  ): FormatPreferences {
    const updated = { ...current };

    for (const pattern of patterns) {
      switch (pattern.patternType) {
        case 'formatting':
          if (pattern.rule.includes('bullet')) {
            updated.useBulletPoints = pattern.rule.includes('added bullets');
          }
          if (pattern.rule.includes('bold')) {
            updated.boldDiagnoses = pattern.rule.includes('bold diagnoses');
          }
          break;
        case 'structure':
          if (pattern.rule.includes('separate assessment')) {
            updated.separateAssessmentPlan = true;
          }
          break;
      }
    }

    return updated;
  }
}