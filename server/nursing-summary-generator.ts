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
    encounterId: number,
  ): Promise<string> {
    try {
      console.log(
        `🏥 [NursingSummary] Generating summary for encounter ${encounterId}`,
      );

      const prompt = this.buildNursingSummaryPrompt(
        templateData,
        transcription,
      );

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content:
              "You are an expert nurse creating a concise, structured nursing assessment summary. Format the output as clean, organized bullet points under each section heading.",
          },
          {
            role: "user",
            content: prompt,
          },
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

      console.log(
        `✅ [NursingSummary] Generated and saved summary (${nursingSummary.length} chars)`,
      );
      return nursingSummary;
    } catch (error) {
      console.error("❌ [NursingSummary] Error generating summary:", error);
      throw error;
    }
  }

  private buildNursingSummaryPrompt(
    templateData: NursingTemplateData,
    transcription: string,
  ): string {
    return `You are an expert registered nurse creating a comprehensive nursing assessment summary using proper medical terminology, standard abbreviations, and structured formatting. Your documentation must meet professional nursing standards and EMR requirements.

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

CRITICAL FORMATTING REQUIREMENTS:

1. **MEDICAL ABBREVIATIONS - USE THESE EXACT FORMATS:**
   - Hypertension → HTN
   - Diabetes Type 2 → DM2, Diabetes Type 1 → DM1
   - Coronary Artery Disease → CAD
   - Congestive Heart Failure → CHF
   - Chronic Obstructive Pulmonary Disease → COPD
   - Gastroesophageal Reflux Disease → GERD
   - Chronic Kidney Disease → CKD
   - Atrial Fibrillation → AFib
   - Myocardial Infarction → MI
   - Cerebrovascular Accident → CVA
   - Deep Vein Thrombosis → DVT
   - Pulmonary Embolism → PE
   - Hyperlipidemia → HLD
   - Hypothyroidism → Hypothyroid
   - Osteoarthritis → OA
   - Rheumatoid Arthritis → RA
   - Urinary Tract Infection → UTI
   - Upper Respiratory Infection → URI
   - Benign Prostatic Hyperplasia → BPH
   - Bipolar Disorder → Bipolar
   - Major Depressive Disorder → MDD
   - Generalized Anxiety Disorder → GAD
   - Post-Traumatic Stress Disorder → PTSD
   - Attention Deficit Hyperactivity Disorder → ADHD
   - Obstructive Sleep Apnea → OSA
   - Peripheral Artery Disease → PAD
   - Inflammatory Bowel Disease → IBD
   - Irritable Bowel Syndrome → IBS
   - Peptic Ulcer Disease → PUD
   - Liver Disease → Liver Dz
   - Kidney Disease → Kidney Dz
   - Heart Disease → Heart Dz
   - Asthma → Asthma
   - Seizure Disorder → Seizure Disorder
   - Stroke → Stroke
   - Cancer → CA (with specific type, e.g., "Breast CA")

2. **BULLET POINT FORMATTING:**
   - Use hyphen (-) followed by uppercase abbreviation
   - Each condition on separate line
   - No periods after abbreviations
   - Capitalize first letter of each bullet point

3. **MEDICATION FORMATTING:**
   - Generic name preferred (Lisinopril vs Prinivil)
   - Include strength and frequency
   - Use standard abbreviations: PO (by mouth), BID (twice daily), QD (once daily), PRN (as needed)
   - Format: "- Medication name [strength] [frequency] [route]"

4. **VITAL SIGNS FORMATTING:**
   - CRITICAL: Use ALL vitals data from the template, preserving chronological order
   - If template contains multiple vital sign entries, include ALL of them
   - Format exactly as provided in template data (preserve timestamps/sequences)
   - Example format: "6/19/2025 1: BP: 146/83 | HR: 52 | T: 98.7°F | RR: N/A | O2 Sat: N/A on RA"

**EXAMPLE OUTPUT FORMAT:**

**CHIEF COMPLAINT**
- [Brief, clear statement using proper medical terminology]

**HISTORY OF PRESENT ILLNESS**
- [Chronological symptoms with duration, quality, severity]
- [Aggravating/alleviating factors]
- [Associated symptoms]

**PAST MEDICAL HISTORY**
- HTN
- DM2
- CAD
- GERD
- [Each condition as separate bullet with standard abbreviation]

**CURRENT MEDICATIONS**
- Lisinopril 10mg QD PO
- Metformin 1000mg BID PO
- Atorvastatin 40mg QHS PO
- [Each medication with complete dosing information]

**ALLERGIES**
- NKDA (if no known allergies)
- [Allergen]: [reaction type] (e.g., "Penicillin: Rash")

**FAMILY HISTORY**
- Father: HTN, DM2
- Mother: Breast CA, HTN
- [Use standard abbreviations for conditions]

**SOCIAL HISTORY**
- Tobacco: [pack-year history or "Never"]
- Alcohol: [frequency/amount or "Denies"]
- Illicit drugs: [status or "Denies"]
- Occupation: [job title]
- Exercise: [frequency/type]

**PAST SURGICAL HISTORY**
- [Year] [procedure] (e.g., "2018 Cholecystectomy")
- [Include complications if any]

**REVIEW OF SYSTEMS**
- Constitutional: [positive findings only]
- HEENT: [positive findings only]
- Cardiovascular: [positive findings only]
- Respiratory: [positive findings only]
- GI: [positive findings only]
- GU: [positive findings only]
- Musculoskeletal: [positive findings only]
- Neurological: [positive findings only]
- Psychiatric: [positive findings only]
- [Only include systems with positive findings]

**VITAL SIGNS (${new Date().toLocaleDateString("en-US", { timeZone: "America/Chicago" })})**
- [Include ALL vital signs from the template data chronologically]
- If multiple sets of vitals are documented, list each set with time/sequence
- Example: "6/19/2025 1: BP: 146/83 | HR: 52 | T: 98.7°F | RR: N/A | O2 Sat: N/A on RA"
- Example: "6/19/2025 2: BP: 147/85 | HR: 51 | T: 98.2°F | RR: N/A | O2 Sat: N/A on RA"
- Use the EXACT format provided in the template vitals field

**CRITICAL RULES:**
1. Transform ALL long-form medical conditions to standard abbreviations
2. Use bullet points with hyphens (-) for EVERY item
3. Capitalize each bullet point appropriately
4. Omit empty sections (do not include sections with "Not documented")
5. Use professional nursing terminology throughout
6. Ensure medical abbreviations are consistent with standard practice
7. Include relevant clinical context when available
8. Maintain chronological order for HPI
9. Group medications by therapeutic class when multiple present
10. Use standard nursing assessment language

**FORBIDDEN PRACTICES:**
- Do NOT use long-form medical names when abbreviations exist
- Do NOT include sections with no data
- Do NOT use inconsistent abbreviation formats
- Do NOT add information not provided in source data
- Do NOT use periods after standard medical abbreviations
- Do NOT use lowercase for medical abbreviations

Generate the nursing summary following these exact specifications. Only include sections that contain actual documented information from the provided data.`;
  }

  private async saveNursingSummary(
    encounterId: number,
    nursingSummary: string,
  ): Promise<void> {
    try {
      await db
        .update(encounters)
        .set({
          nurseNotes: nursingSummary,
          updatedAt: new Date(),
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
