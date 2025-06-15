import OpenAI from "openai";
import { db } from "./db.js";
import { encounters } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface NursingTemplateData {
  cc: string;
  hpi: string;
  pmh: string;
  meds: string;
  allergies: string;
  famHx: string;
  soHx: string;
  psh: string;
  ros: string;
  vitals: string;
}

export class NursingSummaryGenerator {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateNursingSummary(
    templateData: NursingTemplateData,
    transcription: string,
    patientId: number,
    encounterId: number
  ): Promise<string> {
    try {
      console.log(`🏥 [NursingSummary] Generating summary for encounter ${encounterId}`);

      const prompt = this.buildNursingSummaryPrompt(templateData, transcription);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert nurse creating a concise, structured nursing assessment summary. Format the output as clean, organized bullet points under each section heading."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const nursingSummary = completion.choices[0]?.message?.content || "";
      
      if (!nursingSummary.trim()) {
        throw new Error("Failed to generate nursing summary");
      }

      // Save to database
      await this.saveNursingSummary(encounterId, nursingSummary);
      
      console.log(`✅ [NursingSummary] Generated and saved summary (${nursingSummary.length} chars)`);
      return nursingSummary;

    } catch (error) {
      console.error("❌ [NursingSummary] Error generating summary:", error);
      throw error;
    }
  }

  private buildNursingSummaryPrompt(templateData: NursingTemplateData, transcription: string): string {
    return `Based on the nursing assessment data collected below, create a clean, structured nursing summary. 

NURSING TEMPLATE DATA:
Chief Complaint: ${templateData.cc || "Not documented"}
History of Present Illness: ${templateData.hpi || "Not documented"}
Past Medical History: ${templateData.pmh || "Not documented"}
Current Medications: ${templateData.meds || "Not documented"}
Allergies: ${templateData.allergies || "Not documented"}
Family History: ${templateData.famHx || "Not documented"}
Social History: ${templateData.soHx || "Not documented"}
Past Surgical History: ${templateData.psh || "Not documented"}
Review of Systems: ${templateData.ros || "Not documented"}
Vital Signs: ${templateData.vitals || "Not documented"}

TRANSCRIPTION CONTEXT:
${transcription || "No transcription available"}

Generate a structured nursing assessment summary with the following format:

**CHIEF COMPLAINT**
• [Clean, concise statement]

**HISTORY OF PRESENT ILLNESS**
• [Key points as bullet points]
• [Each symptom or concern on separate line]

**PAST MEDICAL HISTORY**
• [Each condition as bullet point]
• [Include relevant dates if available]

**CURRENT MEDICATIONS**
• [Each medication with dosage if available]
• [Include frequency and route]

**ALLERGIES**
• [Each allergy with reaction if known]
• [Use "NKDA" if no known allergies]

**FAMILY HISTORY**
• [Relevant family medical history]
• [Each family member condition as bullet]

**SOCIAL HISTORY**
• [Smoking, alcohol, occupation, etc.]
• [Each social factor as bullet point]

**PAST SURGICAL HISTORY**
• [Each surgery with approximate date]
• [Include complications if noted]

**REVIEW OF SYSTEMS**
• [Positive findings only]
• [Organize by body system if multiple]

**VITAL SIGNS**
• [Current vital signs in clear format]
• [Include any trending information]

Rules:
- Only include sections that have documented information
- Keep bullet points concise and clinical
- Omit sections that are empty or "Not documented"
- Use standard medical abbreviations appropriately
- Maintain professional nursing documentation style
- Do not add information not provided in the source data`;
  }

  private async saveNursingSummary(encounterId: number, nursingSummary: string): Promise<void> {
    try {
      await db
        .update(encounters)
        .set({ 
          nurseNotes: nursingSummary,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, encounterId));
        
      console.log(`💾 [NursingSummary] Saved to encounter ${encounterId}`);
    } catch (error) {
      console.error(`❌ [NursingSummary] Failed to save to database:`, error);
      throw error;
    }
  }

  async getNursingSummary(encounterId: number): Promise<string | null> {
    try {
      const result = await db
        .select({ nurseNotes: encounters.nurseNotes })
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);

      return result[0]?.nurseNotes || null;
    } catch (error) {
      console.error(`❌ [NursingSummary] Failed to retrieve summary:`, error);
      return null;
    }
  }
}

export const nursingSummaryGenerator = new NursingSummaryGenerator();