/**
 * Template Prompt Generator Service
 * Converts example notes into GPT prompts for template generation
 */

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class TemplatePromptGenerator {
  /**
   * Analyzes an example note and generates a GPT prompt that would produce similar notes
   */
  static async generatePromptFromExample(
    noteType: string,
    exampleNote: string,
    templateName: string,
    templateId?: number,
  ): Promise<string> {
    console.log(
      `🧠 [TemplatePrompt] Analyzing example for ${templateName} (${noteType})`,
    );

    const analysisPrompt = `You are an expert clinical documentation analyst. Analyze the following ${noteType.toUpperCase()} note example and create a GPT prompt that would generate similar notes with the same style, structure, and formatting preferences.

EXAMPLE NOTE TO ANALYZE:
${exampleNote}

CRITICAL INSTRUCTION: The example note contains specific patient information that should be used to understand the user's style preferences, but the generated prompt must use placeholders for dynamic data. Focus on:
1. The formatting style (bullets vs paragraphs, spacing, section headers)
2. Section organization and order  
3. Language patterns and medical terminology style
4. Level of detail and clinical focus
5. Structural elements and layout

Your generated prompt MUST follow this exact structure at the beginning:

You are an expert physician creating a comprehensive ${noteType.toUpperCase()} note from a patient encounter transcription.

PATIENT CONTEXT:
$\{medicalContext\}

ENCOUNTER TRANSCRIPTION:
$\{transcription\}

Generate a complete, professional ${noteType.toUpperCase()} note with the following sections:

Then add the specific style and formatting instructions based on the example note analysis. Include detailed instructions for:
- Section formatting and structure (based on the example)
- Writing style preferences (observed from the example)
- Medical terminology usage patterns
- Level of clinical detail preferences
- Any special formatting requirements

The prompt should be detailed enough that GPT can consistently generate notes matching this example's style and structure, while using the actual patient context and transcription data provided.

Return ONLY the GPT prompt, no additional commentary.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const generatedPrompt = completion.choices[0]?.message?.content;
      if (!generatedPrompt) {
        throw new Error("Failed to generate prompt from example");
      }

      console.log(`✅ [TemplatePrompt] Generated prompt for ${templateName}`);
      console.log(`📋 [TemplatePrompt] GENERATED PROMPT:\n${generatedPrompt}\n--- END PROMPT ---`);
      
      // Save generated prompt for admin review
      if (templateId) {
        try {
          const { storage } = await import("./storage");
          await storage.createAdminPromptReview({
            templateId: templateId,
            originalPrompt: generatedPrompt,
            reviewStatus: "pending"
          });
          console.log(`📝 [TemplatePrompt] Saved prompt for admin review - template ${templateId}`);
        } catch (error) {
          console.error("❌ [TemplatePrompt] Failed to save prompt for admin review:", error);
        }
      }
      
      return generatedPrompt;
    } catch (error) {
      console.error("❌ [TemplatePrompt] Error generating prompt:", error);

      // Fallback to base template prompt if analysis fails
      return this.getBasePromptForNoteType(noteType);
    }
  }

  /**
   * Gets the base prompt for a note type (fallback)
   */
  private static getBasePromptForNoteType(noteType: string): string {
    switch (noteType) {
      case "soap":
        return `You are an expert physician creating a comprehensive SOAP note from a patient encounter transcription.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete, professional SOAP note with the following sections:

**SUBJECTIVE:**
Summarize patient-reported symptoms, concerns, relevant history, and review of systems. Use bullet points for clarity.

**OBJECTIVE:**
Vitals: List all vital signs in a single line
Physical Exam: Organized by system, clear and concise findings

**ASSESSMENT:**
Primary and secondary diagnoses with clinical reasoning

**PLAN:**
Treatment plan, medications, follow-up, and patient education

Maintain professional medical language and clear organization.`;

      case "apso":
        return `You are an expert physician creating a comprehensive APSO note from a patient encounter transcription.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete APSO note with sections: Assessment, Plan, Subjective, Objective.`;

      case "progress":
        return `You are an expert physician creating a hospital progress note from a patient encounter transcription.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete progress note focusing on interval changes and current status.`;

      case "hAndP":
        return `You are an expert physician creating a comprehensive History & Physical examination note.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete H&P with detailed history and comprehensive physical examination.`;

      case "discharge":
        return `You are an expert physician creating a discharge summary from a patient encounter.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete discharge summary with admission diagnosis, hospital course, and discharge instructions.`;

      case "procedure":
        return `You are an expert physician creating a procedure note from a patient encounter.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete procedure note with indication, technique, findings, and post-procedure plan.`;

      default:
        return `You are an expert physician creating a clinical note from a patient encounter transcription.

PATIENT CONTEXT:
{medicalContext}

ENCOUNTER TRANSCRIPTION:
{transcription}

Generate a complete, professional clinical note appropriate for the specified note type.`;
    }
  }

  /**
   * Updates an existing prompt based on user edits (Phase 2 preparation)
   */
  static async updatePromptFromEdits(
    originalPrompt: string,
    originalNote: string,
    editedNote: string,
    noteType: string,
  ): Promise<string> {
    console.log(
      `🔄 [TemplatePrompt] Updating prompt based on user edits for ${noteType}`,
    );

    const updatePrompt = `You are an expert clinical documentation analyst. A physician has edited an AI-generated note to match their preferences. Update the GPT prompt to incorporate these changes.

ORIGINAL GPT PROMPT:
${originalPrompt}

ORIGINAL NOTE:
${originalNote}

EDITED NOTE (physician's preferred version):
${editedNote}

Analyze the differences between the original and edited notes, then modify the GPT prompt to incorporate the physician's style preferences. Focus on:
1. Formatting changes (bullets vs paragraphs, spacing, etc.)
2. Content organization modifications
3. Language style adjustments
4. Level of detail preferences
5. Structural changes

Return the updated GPT prompt that would generate notes matching the edited version's style.

Return ONLY the updated GPT prompt, no additional commentary.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: updatePrompt }],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const updatedPrompt = completion.choices[0]?.message?.content;
      if (!updatedPrompt) {
        throw new Error("Failed to update prompt from edits");
      }

      console.log(`✅ [TemplatePrompt] Updated prompt based on user edits`);
      return updatedPrompt;
    } catch (error) {
      console.error("❌ [TemplatePrompt] Error updating prompt:", error);
      return originalPrompt; // Return original if update fails
    }
  }
}
