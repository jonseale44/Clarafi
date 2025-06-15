import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface NursingTemplate {
  cc: string;           // Chief Complaint
  hpi: string;          // History of Present Illness
  pmh: string;          // Past Medical History
  meds: string;         // Medications
  allergies: string;    // Allergies
  famHx: string;        // Family History
  soHx: string;         // Social History
  psh: string;          // Past Surgical History
  ros: string;          // Review of Systems
  vitals: string;       // Vital Signs
}

export class NursingTemplateAnalyzer {
  async analyzeTranscriptionForTemplate(
    transcription: string,
    currentTemplate: NursingTemplate,
    patientId: number,
  ): Promise<{ updates: Partial<NursingTemplate>; confidence: number }> {
    console.log(`📋 [TemplateAnalyzer] Analyzing transcription for nursing template updates`);

    try {
      const prompt = this.buildAnalysisPrompt(transcription, currentTemplate);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: `Please analyze this conversation transcript and extract information for the nursing assessment template. Only include information that is explicitly mentioned or clearly implied in the conversation.

Transcript:
${transcription}

Current template state:
${JSON.stringify(currentTemplate, null, 2)}

Return a JSON object with only the fields that have new or updated information. Do not repeat existing information unless it has been modified or expanded.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";
      
      try {
        // Try to parse the JSON response
        const result = JSON.parse(content);
        
        // Validate the response format
        if (result && typeof result === 'object') {
          const updates: Partial<NursingTemplate> = {};
          let hasUpdates = false;

          // Only include valid template fields that have meaningful content
          const validFields = ['cc', 'hpi', 'pmh', 'meds', 'allergies', 'famHx', 'soHx', 'psh', 'ros', 'vitals'];
          
          for (const field of validFields) {
            if (result[field] && typeof result[field] === 'string' && result[field].trim()) {
              const newValue = result[field].trim();
              const currentValue = currentTemplate[field as keyof NursingTemplate] || '';
              
              // Only include if it's genuinely new or significantly different
              if (!currentValue || (newValue !== currentValue && newValue.length > currentValue.length + 10)) {
                updates[field as keyof NursingTemplate] = newValue;
                hasUpdates = true;
              }
            }
          }

          console.log(`✅ [TemplateAnalyzer] Found ${Object.keys(updates).length} field updates`);
          
          return {
            updates: hasUpdates ? updates : {},
            confidence: result.confidence || 0.8,
          };
        }
      } catch (parseError) {
        console.error("❌ [TemplateAnalyzer] Failed to parse JSON response:", parseError);
        console.log("Raw response:", content);
      }

      return { updates: {}, confidence: 0 };

    } catch (error) {
      console.error("❌ [TemplateAnalyzer] Error analyzing transcription:", error);
      return { updates: {}, confidence: 0 };
    }
  }

  private buildAnalysisPrompt(transcription: string, currentTemplate: NursingTemplate): string {
    return `You are an expert nursing assessment analyzer. Your job is to extract specific medical information from patient conversations and organize it into a structured nursing assessment template.

**INSTRUCTIONS:**
1. Analyze the conversation transcript for medical information
2. Extract only information that is explicitly stated or clearly implied
3. Organize information into the appropriate template fields
4. Do not make assumptions or add information not present in the conversation
5. Be concise but complete in your extractions
6. Return only fields that have new or updated information

**TEMPLATE FIELDS:**
- cc: Chief Complaint (main reason for visit, primary symptom/concern)
- hpi: History of Present Illness (current symptoms, timeline, characteristics)
- pmh: Past Medical History (previous diagnoses, chronic conditions)
- meds: Current Medications (drugs, dosages, frequency)
- allergies: Known Allergies (drug allergies, food allergies, reactions)
- famHx: Family History (family medical conditions, genetic predispositions)
- soHx: Social History (smoking, alcohol, occupation, lifestyle)
- psh: Past Surgical History (previous surgeries, procedures)
- ros: Review of Systems (systematic symptoms inquiry)
- vitals: Vital Signs (blood pressure, heart rate, temperature, etc.)

**OUTPUT FORMAT:**
Return a JSON object with only the fields that contain new information. Include a confidence score (0-1).

Example:
{
  "cc": "Chest pain for 2 hours",
  "hpi": "Patient reports sudden onset chest pain, 8/10 severity, radiating to left arm",
  "meds": "Lisinopril 10mg daily, Metformin 500mg twice daily",
  "confidence": 0.9
}

**IMPORTANT:**
- Only include fields with meaningful, specific information
- Do not repeat information already in the current template unless it's been updated
- Be precise and use medical terminology appropriately
- Focus on facts, not interpretations`;
  }
}

export const nursingTemplateAnalyzer = new NursingTemplateAnalyzer();