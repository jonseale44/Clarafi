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
  
  // Copy the correct SOAP prompt from routes.ts lines 85-210
  private static buildSOAPPrompt(medicalContext: string, transcription: string): string {
    return `You are an expert physician creating a comprehensive SOAP note with integrated orders from a patient encounter transcription.

PATIENT CONTEXT:
${medicalContext}

ENCOUNTER TRANSCRIPTION:
${transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity. 

**OBJECTIVE:** Organize this section as follows:

Vitals: List all vital signs in a single line, formatted as:

BP: [value] | HR: [value] | Temp: [value] | RR: [value] | SpO2: [value]

- If the physical exam is completely normal, use the following full, pre-defined template verbatim:

Physical Exam:
Gen: AAO x 3. NAD.
HEENT: MMM, no lymphadenopathy.
CV: Normal rate, regular rhythm. No m/c/g/r.
Lungs: Normal work of breathing. CTAB.
Abd: Normoactive bowel sounds. Soft, non-tender.
Ext: No clubbing, cyanosis, or edema.
Skin: No rashes or lesions.

Bold the positive findings, but keep pertinent negatives in roman typeface. Modify and bold only abnormal findings. All normal findings must remain unchanged and unbolded

Do NOT use diagnostic terms (e.g., "pneumonia," "actinic keratosis," "otitis media"). Write only objective physician-level findings.

Use concise, structured phrases. Avoid full sentences and narrative explanations.

Example 1: 
Transcription: "2 cm actinic keratosis on right forearm."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Right forearm with a 2 cm rough, scaly, erythematous plaque with adherent keratotic scale**, without ulceration, bleeding, or induration.

🚫 Bad outcome (Incorrect Use of Diagnosis, no bolding):
Skin: Actinic keratosis right forearm.

Example 2:
Transcription: "Pneumonia right lung."

✅ Good outcome (Objective, No Diagnosis):
Lungs: Normal work of breathing. **Diminished breath sounds over the right lung base with scattered rhonchi.** No wheezes, rales.

🚫 Bad outcome (Incorrect Use of Diagnosis, bolding entire organ system):
**Lungs: Sounds of pneumonia right lung.**

Example 3: 
Transcription: "Cellulitis left lower leg."

✅ Good outcome (Objective, No Diagnosis):
Skin: **Left lower leg with erythema, warmth, and mild swelling**, without bullae, ulceration, or fluctuance.

🚫 Bad outcome (Incorrect Use of Diagnosis):
Skin: Cellulitis on the left lower leg.

**ASSESSMENT/PLAN:**

[Condition (ICD-10 Code)]: Provide a concise, bullet-pointed plan for the condition.
[Plan item 1]
[Plan item 2]
[Plan item 3 (if applicable)]
Example:

Chest Tightness, Suspected Airway Constriction (R06.4):

Trial low-dose inhaler therapy to address potential airway constriction.
Monitor response to inhaler and reassess in 2 weeks.
Patient education on environmental triggers (e.g., dust exposure).
Fatigue, Work-Related Stress (Z73.0):

Counsel patient on stress management and lifestyle modifications.
Encourage gradual increase in physical activity.
Family History of Cardiovascular Disease (Z82.49):

Document family history and assess cardiovascular risk factors as part of ongoing care.
(preceded by FOUR blank lines)**ORDERS:** 

For all orders, follow this highly-structured format:

Medications:

Each medication order must follow this exact template:

Medication: [name, include specific formulation and strength]

Sig: [detailed instructions for use, including route, frequency, specific indications, or restrictions (e.g., before/after meals, PRN for specific symptoms)]

Dispense: [quantity, clearly written in terms of formulation (e.g., "1 inhaler (200 metered doses)" or "30 tablets")]

Refills: [number of refills allowed]

Example:

Medication: Albuterol sulfate HFA Inhaler (90 mcg/actuation)

Sig: 2 puffs by mouth every 4-6 hours as needed for shortness of breath or wheezing. May use 2 puffs 15-30 minutes before exercise if needed. Do not exceed 12 puffs in a 24-hour period.

Dispense: 1 inhaler (200 metered doses)

Refills: 1

Labs: List specific tests ONLY. Be concise (e.g., "CBC, BMP, TSH"). Do not include reasons or justification for labs. 

Imaging: Specify the modality and purpose in clear terms (e.g., "Chest X-ray to assess for structural causes of chest tightness").

Referrals: Clearly indicate the specialty and purpose of the referral (e.g., "Refer to pulmonologist for abnormal lung function testing").

Patient Education: Summarize key educational topics discussed with the patient.

Follow-up: Provide clear next steps and timeline for follow-up appointments or assessments.

IMPORTANT INSTRUCTIONS:
- Keep the note concise yet comprehensive.
- Use professional medical language throughout.
- Ensure all clinical reasoning is evidence-based and logical.
- Include pertinent negatives where clinically relevant.
- Format the note for easy reading and clinical handoff.`;
  }
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
          // Use the correct base template from routes.ts buildSOAPPrompt for SOAP notes
          if (noteType === 'soap') {
            prompt = EnhancedNoteGenerationService.buildSOAPPrompt(medicalContext, transcription);
          } else {
            prompt = ClinicalNoteTemplates.getPrompt(noteType, medicalContext, transcription);
          }
        }
      } else if (userId) {
        console.log(`🔍 [EnhancedNotes] Checking for user's default template for ${noteType}`);
        console.log(`🔍 [EnhancedNotes] User ID: ${userId}, Note Type: ${noteType}`);
        
        try {
          // Check for user's default template for this note type
          const userTemplates = await storage.getUserTemplatesByType(userId, noteType);
          console.log(`🔍 [EnhancedNotes] User templates found: ${userTemplates.length}`);
          
          if (userTemplates.length > 0) {
            console.log(`🔍 [EnhancedNotes] Available templates:`, userTemplates.map(t => ({
              id: t.id,
              name: t.templateName,
              isDefault: t.isDefault,
              active: t.active
            })));
          }
          
          const defaultTemplate = userTemplates.find(t => t.isDefault);
          console.log(`🔍 [EnhancedNotes] Default template found:`, !!defaultTemplate);
          
          if (defaultTemplate) {
            console.log(`🔍 [EnhancedNotes] Using default template:`, {
              id: defaultTemplate.id,
              name: defaultTemplate.templateName,
              promptLength: defaultTemplate.generatedPrompt?.length || 0
            });
            
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
        } catch (templateError: any) {
          console.error(`❌ [EnhancedNotes] Error checking user templates:`, {
            error: templateError.message,
            stack: templateError.stack,
            userId,
            noteType
          });
          // Fallback to base template if template system fails
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
    try {
      const demographics = patientChart.demographics || {};
      const age = demographics.age || "Unknown";
      
      console.log(`🔧 [EnhancedNotes] Building medical context with chart data:`, {
        hasDemographics: !!demographics,
        firstName: demographics.firstName,
        lastName: demographics.lastName,
        medicalProblemsCount: patientChart.medicalProblems?.length || 0,
        medicationsCount: patientChart.medications?.length || 0,
        allergiesCount: patientChart.allergies?.length || 0,
        vitalsCount: patientChart.vitals?.length || 0
      });

      const currentMedicalProblems = patientChart.medicalProblems?.length > 0
        ? patientChart.medicalProblems.map((problem: any) => `- ${problem.problemDescription || 'Unspecified condition'}`).join('\n')
        : "- No active medical problems documented";

      const currentMedications = patientChart.medications?.length > 0
        ? patientChart.medications.map((med: any) => `- ${med.medicationName || 'Unknown medication'} ${med.dosage || ''}`).join('\n')
        : "- No current medications documented";

      const knownAllergies = patientChart.allergies?.length > 0
        ? patientChart.allergies.map((allergy: any) => `- ${allergy.allergen || 'Unknown allergen'} (${allergy.reaction || 'Unknown reaction'})`).join('\n')
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

      const context = `
PATIENT CONTEXT:
- Name: ${demographics.firstName || 'Unknown'} ${demographics.lastName || 'Unknown'}
- Age: ${age} years old
- Gender: ${demographics.gender || 'Unknown'}
- MRN: ${demographics.mrn || 'Unknown'}

ACTIVE MEDICAL PROBLEMS:
${currentMedicalProblems}

CURRENT MEDICATIONS:
${currentMedications}

KNOWN ALLERGIES:
${knownAllergies}

RECENT VITALS:
${formatVitalsForContext(patientChart.vitals || [])}
      `.trim();

      console.log(`✅ [EnhancedNotes] Medical context built successfully, length: ${context.length}`);
      return context;
    } catch (error: any) {
      console.error(`❌ [EnhancedNotes] Error building medical context:`, {
        error: error.message,
        stack: error.stack,
        patientChart: !!patientChart
      });
      
      // Return minimal fallback context
      return `
PATIENT CONTEXT:
- Name: Unknown Patient
- Age: Unknown
- Gender: Unknown
- MRN: Unknown

ACTIVE MEDICAL PROBLEMS:
- Unable to retrieve medical problems

CURRENT MEDICATIONS:
- Unable to retrieve current medications

KNOWN ALLERGIES:
- Unable to retrieve allergies

RECENT VITALS:
- Unable to retrieve recent vitals
      `.trim();
    }
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