/**
 * Enhanced Note Generation Service
 * Integrates custom user templates with existing clinical note generation
 */

import { storage } from "./storage";
import { ClinicalNoteTemplates } from "./routes";
import { PatientChartService } from "./patient-chart-service";
import { TemplatePromptGenerator } from "./template-prompt-generator";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class EnhancedNoteGenerationService {
  /**
   * Generates a clinical note using either base templates or custom user templates
   */
  static async generateNote(
    noteType: string,
    patientId: number,
    encounterId: string,
    transcription: string,
    userId?: number,
    customTemplateId?: number
  ): Promise<string> {
    console.log(`🩺 [EnhancedNotes] Starting note generation:`, {
      noteType,
      patientId,
      encounterId,
      userId,
      customTemplateId,
      transcriptionLength: transcription?.length || 0
    });

    try {
      // Get patient chart data
      console.log(`📊 [EnhancedNotes] Fetching patient chart data for patient ${patientId}`);
      const patientChart = await PatientChartService.getPatientChartData(patientId);
      console.log(`📊 [EnhancedNotes] Patient chart retrieved:`, {
        hasChart: !!patientChart,
        hasDemographics: !!patientChart?.demographics,
        medicalProblemsCount: patientChart?.medicalProblems?.length || 0,
        medicationsCount: patientChart?.medications?.length || 0,
        allergiesCount: patientChart?.allergies?.length || 0,
        vitalsCount: patientChart?.vitals?.length || 0
      });

      const medicalContext = this.buildMedicalContext(patientChart, encounterId);
      console.log(`🔧 [EnhancedNotes] Medical context built, length: ${medicalContext.length}`);
      console.log(`🔧 [EnhancedNotes] Medical context sample:`, medicalContext.substring(0, 200) + '...');

    let prompt: string;
    let templateUsed: string = noteType;

      // Determine which template/prompt to use
      console.log(`🎯 [EnhancedNotes] Template selection logic:`, {
        hasCustomTemplateId: !!customTemplateId,
        hasUserId: !!userId
      });

      if (customTemplateId && userId) {
        console.log(`🔍 [EnhancedNotes] Attempting to use custom template ${customTemplateId}`);
        // Use custom template
        const customTemplate = await storage.getUserNoteTemplate(customTemplateId);
        console.log(`🔍 [EnhancedNotes] Custom template query result:`, {
          found: !!customTemplate,
          templateUserId: customTemplate?.userId,
          requestUserId: userId,
          authorized: customTemplate?.userId === userId
        });
        
        if (customTemplate && customTemplate.userId === userId) {
          prompt = this.prepareCustomPrompt(customTemplate.generatedPrompt, medicalContext, transcription);
          templateUsed = customTemplate.templateName;
          
          // Increment usage count
          await storage.incrementTemplateUsage(customTemplateId);
          
          console.log(`📋 [EnhancedNotes] Using custom template: ${customTemplate.templateName}`);
        } else {
          console.warn(`⚠️ [EnhancedNotes] Custom template ${customTemplateId} not found or unauthorized, falling back to base template`);
          prompt = ClinicalNoteTemplates.getPrompt(noteType, medicalContext, transcription);
        }
      } else if (userId) {
        console.log(`🔍 [EnhancedNotes] Checking for user's default template for ${noteType}`);
        // Check for user's default template for this note type
        const userTemplates = await storage.getUserTemplatesByType(userId, noteType);
        console.log(`🔍 [EnhancedNotes] User templates found: ${userTemplates.length}`);
        const defaultTemplate = userTemplates.find(t => t.isDefault);
        console.log(`🔍 [EnhancedNotes] Default template found:`, !!defaultTemplate);
        
        if (defaultTemplate) {
          prompt = this.prepareCustomPrompt(defaultTemplate.generatedPrompt, medicalContext, transcription);
          templateUsed = defaultTemplate.templateName;
          
          // Increment usage count
          await storage.incrementTemplateUsage(defaultTemplate.id);
          
          console.log(`⭐ [EnhancedNotes] Using user's default template: ${defaultTemplate.templateName}`);
        } else {
          // No default set, use base template
          console.log(`📋 [EnhancedNotes] No default template found, using base template`);
          prompt = ClinicalNoteTemplates.getPrompt(noteType, medicalContext, transcription);
        }
      } else {
        // No user context, use base template
        console.log(`📋 [EnhancedNotes] No user context, using base template`);
        prompt = ClinicalNoteTemplates.getPrompt(noteType, medicalContext, transcription);
      }

      console.log(`🤖 [EnhancedNotes] Prompt prepared, length: ${prompt.length}`);
      console.log(`🤖 [EnhancedNotes] Template used: ${templateUsed}`);
      console.log(`🤖 [EnhancedNotes] Prompt preview:`, prompt.substring(0, 300) + '...');

      // Generate note using GPT
      console.log(`🚀 [EnhancedNotes] Calling OpenAI API...`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      });

      console.log(`📥 [EnhancedNotes] OpenAI response received:`, {
        choices: completion.choices.length,
        hasContent: !!completion.choices[0]?.message?.content,
        contentLength: completion.choices[0]?.message?.content?.length || 0,
        usage: completion.usage
      });

      const generatedNote = completion.choices[0]?.message?.content;
      if (!generatedNote) {
        console.error(`❌ [EnhancedNotes] No content in OpenAI response:`, completion);
        throw new Error(`No ${noteType} note generated from OpenAI`);
      }

      console.log(`💾 [EnhancedNotes] Saving note to encounter ${encounterId}`);
      // Save note to encounter
      await storage.updateEncounter(parseInt(encounterId), {
        note: generatedNote,
      });

      console.log(`✅ [EnhancedNotes] Generated ${noteType} note using template: ${templateUsed}, length: ${generatedNote.length}`);
      return generatedNote;
    } catch (error: any) {
      console.error(`❌ [EnhancedNotes] Error in note generation:`, {
        error: error.message,
        stack: error.stack,
        noteType,
        patientId,
        encounterId,
        userId,
        customTemplateId
      });
      throw error;
    }
  }

  /**
   * Prepares a custom template prompt by inserting patient context and transcription
   */
  private static prepareCustomPrompt(templatePrompt: string, medicalContext: string, transcription: string): string {
    return templatePrompt
      .replace(/\{medicalContext\}/g, medicalContext)
      .replace(/\{transcription\}/g, transcription)
      // Also support the old format for backward compatibility
      .replace(/PATIENT CONTEXT:\s*\$\{medicalContext\}/g, `PATIENT CONTEXT:\n${medicalContext}`)
      .replace(/ENCOUNTER TRANSCRIPTION:\s*\$\{transcription\}/g, `ENCOUNTER TRANSCRIPTION:\n${transcription}`);
  }

  /**
   * Builds medical context string for templates
   */
  private static buildMedicalContext(patientChart: any, encounterId: string): string {
    const demographics = patientChart.demographics;
    const age = demographics.age || "Unknown";
    
    const currentMedicalProblems = patientChart.medicalProblems?.length > 0
      ? patientChart.medicalProblems.map((problem: any) => `- ${problem.problemDescription}`).join('\n')
      : "- No active medical problems documented";

    const currentMedications = patientChart.medications?.length > 0
      ? patientChart.medications.map((med: any) => `- ${med.medicationName} ${med.dosage}`).join('\n')
      : "- No current medications documented";

    const knownAllergies = patientChart.allergies?.length > 0
      ? patientChart.allergies.map((allergy: any) => `- ${allergy.allergen} (${allergy.reaction})`).join('\n')
      : "- No Known Drug Allergies";

    // Format vitals for clinical context
    const formatVitalsForContext = (vitalsList: any[]) => {
      if (!vitalsList || vitalsList.length === 0) {
        return "- No recent vitals recorded";
      }

      const latestVitals = vitalsList[0];
      const vitalParts = [];
      
      if (latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic) {
        vitalParts.push(`BP: ${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic} mmHg`);
      }
      if (latestVitals.heartRate) vitalParts.push(`HR: ${latestVitals.heartRate} bpm`);
      if (latestVitals.temperature) vitalParts.push(`Temp: ${latestVitals.temperature}°F`);
      if (latestVitals.respiratoryRate) vitalParts.push(`RR: ${latestVitals.respiratoryRate}/min`);
      if (latestVitals.oxygenSaturation) vitalParts.push(`SpO2: ${latestVitals.oxygenSaturation}%`);

      return vitalParts.length > 0 ? `- ${vitalParts.join(' | ')}` : "- Vitals documented but incomplete";
    };

    return `
PATIENT CONTEXT:
- Name: ${demographics.firstName} ${demographics.lastName}
- Age: ${age} years old
- Gender: ${demographics.gender}
- MRN: ${demographics.mrn}

ACTIVE MEDICAL PROBLEMS:
${currentMedicalProblems}

CURRENT MEDICATIONS:
${currentMedications}

KNOWN ALLERGIES:
${knownAllergies}

RECENT VITALS:
${formatVitalsForContext(patientChart.vitals || [])}
    `.trim();
  }

  /**
   * Gets available templates for a user and note type
   */
  static async getAvailableTemplates(userId: number, noteType: string) {
    const customTemplates = await storage.getUserTemplatesByType(userId, noteType);
    
    // Add base template option
    const baseTemplate = {
      id: `base-${noteType}`,
      templateName: noteType.toUpperCase(),
      displayName: `${noteType.toUpperCase()} (Standard)`,
      baseNoteType: noteType,
      isPersonal: false,
      isDefault: false,
      isBaseTemplate: true
    };

    return [baseTemplate, ...customTemplates];
  }

  /**
   * Phase 2 preparation: Track note edits for AI learning
   */
  static async trackNoteEdit(
    userId: number,
    templateId: number,
    originalNote: string,
    editedNote: string,
    noteType: string
  ): Promise<void> {
    // This will be implemented in Phase 2
    // For now, we just log the edit for future analysis
    console.log(`📝 [EnhancedNotes] Note edit tracked for user ${userId}, template ${templateId} (${noteType})`);
    console.log(`📝 [EnhancedNotes] Original length: ${originalNote.length}, Edited length: ${editedNote.length}`);
    
    // TODO Phase 2: Analyze edits and update template prompts automatically
    // This could involve:
    // 1. Detecting formatting preference changes
    // 2. Identifying content style modifications  
    // 3. Learning section organization preferences
    // 4. Updating the template's generated prompt via TemplatePromptGenerator.updatePromptFromEdits()
  }
}