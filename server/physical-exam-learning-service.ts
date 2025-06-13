import OpenAI from "openai";
import { storage } from "./storage";

interface PhysicalFindingAnalysis {
  isPersistent: boolean;
  confidence: number;
  findingType: 'chronic_stable' | 'anatomical_variant' | 'surgical_history' | 'congenital' | 'temporary';
  examSystem: string;
  examComponent?: string;
  findingText: string;
  gptReasoning: string;
  clinicalContext: {
    relatedDiagnoses?: string[];
    expectedDuration?: string;
    monitoringRequired?: boolean;
    significanceLevel?: 'low' | 'moderate' | 'high';
  };
}

interface PhysicalExamSuggestion {
  examSystem: string;
  suggestedText: string;
  confidence: number;
  reasoning: string;
  isFromHistory: boolean;
  findingId?: number;
}

/**
 * GPT-driven Physical Exam Learning Service
 * 
 * Analyzes physician edits to physical exam sections and:
 * 1. Identifies persistent findings (wheelchair-bound, surgical scars, etc.)
 * 2. Stores them in patient-specific repository
 * 3. Suggests them intelligently in future encounters
 * 4. Updates findings when contradicted (wheelchair -> crutches)
 */
export class PhysicalExamLearningService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main entry point: Analyze SOAP note after user saves it
   * Called from encounter update route when user manually edits physical exam
   */
  async analyzeSOAPNoteForPersistentFindings(
    patientId: number,
    encounterId: number,
    soapNote: string,
    previousSoapNote?: string
  ): Promise<void> {
    console.log(`🔍 [PhysicalExamLearning] Analyzing SOAP note for patient ${patientId}, encounter ${encounterId}`);

    try {
      // Extract physical exam section from SOAP note
      const physicalExamSection = this.extractPhysicalExamSection(soapNote);
      if (!physicalExamSection || physicalExamSection.length < 10) {
        console.log(`ℹ️ [PhysicalExamLearning] No substantial physical exam section found`);
        return;
      }

      // Analyze for persistent findings with full SOAP context
      const findings = await this.identifyPersistentFindings(physicalExamSection, patientId, soapNote);
      
      for (const finding of findings) {
        await this.processPersistentFinding(finding, patientId, encounterId);
      }

      // If we have previous SOAP note, check for contradictions
      if (previousSoapNote) {
        await this.checkForContradictions(patientId, encounterId, physicalExamSection);
      }

      console.log(`✅ [PhysicalExamLearning] Processed ${findings.length} potential persistent findings`);

    } catch (error) {
      console.error(`❌ [PhysicalExamLearning] Error analyzing SOAP note:`, error);
    }
  }

  /**
   * Generate intelligent physical exam suggestions for new encounter
   * Called from FastSOAPService before generating SOAP note
   */
  async generatePhysicalExamSuggestions(
    patientId: number,
    currentChiefComplaint: string,
    clinicalContext?: string
  ): Promise<PhysicalExamSuggestion[]> {
    console.log(`🧠 [PhysicalExamLearning] Generating physical exam suggestions for patient ${patientId}`);

    try {
      // Get active persistent findings for this patient
      const activeFindings = await storage.getActivePhysicalFindings(patientId);
      
      if (activeFindings.length === 0) {
        console.log(`ℹ️ [PhysicalExamLearning] No persistent findings found for patient ${patientId}`);
        return [];
      }

      // Use GPT to determine which findings are relevant for current visit
      const suggestions = await this.selectRelevantFindings(
        activeFindings,
        currentChiefComplaint,
        clinicalContext || ''
      );

      console.log(`✅ [PhysicalExamLearning] Generated ${suggestions.length} physical exam suggestions`);
      return suggestions;

    } catch (error) {
      console.error(`❌ [PhysicalExamLearning] Error generating suggestions:`, error);
      return [];
    }
  }

  /**
   * Mark finding as confirmed when physician saves SOAP note without changing it
   */
  async confirmFinding(findingId: number, encounterId: number): Promise<void> {
    await storage.markPhysicalFindingConfirmed(findingId, encounterId);
  }

  /**
   * Mark finding as contradicted when physician changes or removes it
   */
  async contradictFinding(findingId: number, encounterId: number): Promise<void> {
    await storage.markPhysicalFindingContradicted(findingId, encounterId);
  }

  /**
   * Extract physical exam section from SOAP note
   */
  private extractPhysicalExamSection(soapNote: string): string {
    // Look for physical exam in objective section
    const objectiveMatch = soapNote.match(/OBJECTIVE[:\s]*(.*?)(?=ASSESSMENT|PLAN|$)/i);
    if (!objectiveMatch) return '';

    const objectiveSection = objectiveMatch[1];
    
    // Look for physical exam keywords
    const physExamPatterns = [
      /(?:physical\s*exam|examination)[:\s]*(.*?)(?=\n\s*[A-Z]|laboratory|labs|vitals|$)/i,
      /(?:gen|general)[:\s]*(.*?)(?=\n\s*[A-Z]|$)/i,
      /(?:heent|cv|heart|lungs|pulm|abd|abdomen|ext|extremities|neuro|skin)[:\s]*(.*?)(?=\n\s*[A-Z]|$)/i
    ];

    for (const pattern of physExamPatterns) {
      const match = objectiveSection.match(pattern);
      if (match) return match[0];
    }

    return objectiveSection;
  }

  /**
   * Use GPT to identify persistent findings in physical exam text with full SOAP context
   */
  private async identifyPersistentFindings(
    physicalExamText: string,
    patientId: number,
    fullSoapNote?: string
  ): Promise<PhysicalFindingAnalysis[]> {
    // Get patient's medical history for additional context
    const patientHistory = await this.getPatientHistoryContext(patientId);
    
    const prompt = `Analyze this physical examination for findings that are likely PERSISTENT and should be remembered for future encounters.

CRITICAL: Use the full SOAP note context to determine if findings are acute vs chronic.

Examples of PERSISTENT findings:
- Wheelchair-bound, uses crutches, prosthetic limbs
- Surgical scars, amputations, deformities  
- Chronic murmurs from structural heart disease
- Permanent neurological deficits
- Chronic physical limitations
- Rhonchi in patient with pulmonary fibrosis (chronic)

Examples of NON-PERSISTENT findings:
- Acute injuries, rashes, wounds
- Temporary swelling, bruising  
- Current vital signs
- Acute illness symptoms
- Rhonchi in patient with pneumonia (acute)

Physical Exam Text:
"${physicalExamText}"

Full SOAP Note Context:
"${fullSoapNote || 'Not provided'}"

Patient Medical History Context:
"${patientHistory}"

DECISION RULES:
1. If Assessment/Plan mentions acute conditions (pneumonia, UTI, cellulitis) -> findings are likely temporary
2. If Assessment/Plan mentions chronic conditions (CHF, COPD, pulmonary fibrosis) -> findings may be persistent  
3. Anatomical findings (scars, deformities) are usually persistent
4. Functional status (wheelchair, crutches) is usually persistent
5. Current symptoms without chronic disease context are usually temporary

Return a JSON array of persistent findings. For each finding, provide:
{
  "isPersistent": boolean,
  "confidence": number (0.0-1.0),
  "findingType": "chronic_stable" | "anatomical_variant" | "surgical_history" | "congenital",
  "examSystem": "cardiovascular" | "pulmonary" | "abdominal" | "neurological" | "musculoskeletal" | "dermatological" | "general",
  "examComponent": "mobility" | "scars" | "heart_sounds" | "reflexes" | etc,
  "findingText": "exact text describing the finding",
  "gptReasoning": "why this is likely persistent",
  "clinicalContext": {
    "expectedDuration": "permanent" | "chronic" | "years",
    "significanceLevel": "low" | "moderate" | "high",
    "monitoringRequired": boolean
  }
}

Only include findings with confidence > 0.7. Return empty array if no persistent findings found.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1", // the newest OpenAI model is "gpt-4.1" which is faster, cheaper, and smarter
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"findings": []}');
      return result.findings || [];

    } catch (error) {
      console.error(`❌ [PhysicalExamLearning] GPT analysis failed:`, error);
      return [];
    }
  }

  /**
   * Process a persistent finding - store or update in database
   */
  private async processPersistentFinding(
    finding: PhysicalFindingAnalysis,
    patientId: number,
    encounterId: number
  ): Promise<void> {
    // Check if similar finding already exists
    const existingFindings = await storage.getPatientPhysicalFindings(patientId);
    const similarFinding = existingFindings.find(existing => 
      existing.examSystem === finding.examSystem &&
      existing.examComponent === finding.examComponent &&
      existing.status === 'active'
    );

    if (similarFinding) {
      // Update existing finding
      await storage.updatePhysicalFinding(similarFinding.id, {
        findingText: finding.findingText,
        confidence: finding.confidence,
        lastSeenEncounter: encounterId,
        gptReasoning: finding.gptReasoning,
        clinicalContext: finding.clinicalContext
      });
      console.log(`🔄 [PhysicalExamLearning] Updated existing finding: ${finding.findingText}`);
    } else {
      // Create new persistent finding
      await storage.createPhysicalFinding({
        patientId,
        examSystem: finding.examSystem,
        examComponent: finding.examComponent,
        findingText: finding.findingText,
        findingType: finding.findingType,
        confidence: finding.confidence,
        firstNotedEncounter: encounterId,
        lastSeenEncounter: encounterId,
        gptReasoning: finding.gptReasoning,
        clinicalContext: finding.clinicalContext
      });
      console.log(`➕ [PhysicalExamLearning] Created new persistent finding: ${finding.findingText}`);
    }
  }

  /**
   * Check for contradictions between current exam and stored findings
   */
  private async checkForContradictions(
    patientId: number,
    encounterId: number,
    currentPhysicalExam: string
  ): Promise<void> {
    const activeFindings = await storage.getActivePhysicalFindings(patientId);
    
    for (const finding of activeFindings) {
      const isContradicted = await this.checkIfFindingContradicted(
        finding.findingText,
        currentPhysicalExam,
        finding.examSystem
      );

      if (isContradicted) {
        // Mark as outdated or resolved
        await storage.updatePhysicalFinding(finding.id, {
          status: 'outdated',
          lastSeenEncounter: encounterId
        });
        console.log(`🔄 [PhysicalExamLearning] Marked finding as outdated: ${finding.findingText}`);
      }
    }
  }

  /**
   * Use GPT to check if current exam contradicts stored finding
   */
  private async checkIfFindingContradicted(
    storedFinding: string,
    currentExam: string,
    examSystem: string
  ): Promise<boolean> {
    const prompt = `Does the current physical exam contradict or supersede this stored finding?

Stored Finding: "${storedFinding}"
Current Physical Exam: "${currentExam}"
Exam System: ${examSystem}

Examples of contradictions:
- Stored: "wheelchair-bound" vs Current: "ambulates with crutches"  
- Stored: "bilateral leg amputations" vs Current: "normal gait"
- Stored: "surgical scar RLQ" vs Current: "abdomen without scars"

Return JSON: {"isContradicted": boolean, "reasoning": "explanation"}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1", // the newest OpenAI model is "gpt-4.1" which is faster, cheaper, and smarter
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"isContradicted": false}');
      return result.isContradicted || false;

    } catch (error) {
      console.error(`❌ [PhysicalExamLearning] Contradiction check failed:`, error);
      return false;
    }
  }

  /**
   * Use GPT to select which stored findings are relevant for current visit
   */
  private async selectRelevantFindings(
    activeFindings: any[],
    chiefComplaint: string,
    clinicalContext: string
  ): Promise<PhysicalExamSuggestion[]> {
    const findingsText = activeFindings.map(f => 
      `${f.examSystem}: ${f.findingText} (confidence: ${f.confidence})`
    ).join('\n');

    const prompt = `Given this patient's chief complaint and stored physical findings, determine which findings should be included in today's physical exam.

Chief Complaint: "${chiefComplaint}"
Clinical Context: "${clinicalContext}"

Stored Physical Findings:
${findingsText}

Rules:
- Always include permanent conditions (wheelchair-bound, amputations, scars)
- Include relevant chronic findings based on chief complaint
- Consider if finding needs monitoring or follow-up
- High confidence findings (>0.8) should usually be included

Return JSON array of relevant findings:
{
  "examSystem": "system name",
  "suggestedText": "text to include in physical exam",
  "confidence": number,
  "reasoning": "why this is relevant",
  "isFromHistory": true,
  "findingId": number
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
      return result.suggestions || [];

    } catch (error) {
      console.error(`❌ [PhysicalExamLearning] Relevance selection failed:`, error);
      return [];
    }
  }

  /**
   * Get patient's medical history context for better decision making
   */
  private async getPatientHistoryContext(patientId: number): Promise<string> {
    try {
      const [
        diagnoses,
        medications,
        medicalHistory,
        socialHistory
      ] = await Promise.all([
        storage.getPatientDiagnoses(patientId),
        storage.getPatientMedications(patientId),
        storage.getPatientMedicalHistory(patientId),
        storage.getPatientSocialHistory(patientId)
      ]);

      const context = [];
      
      if (diagnoses.length > 0) {
        context.push(`Diagnoses: ${diagnoses.map(d => d.diagnosis).join(', ')}`);
      }
      
      if (medications.length > 0) {
        context.push(`Medications: ${medications.map(m => m.medicationName).join(', ')}`);
      }
      
      if (medicalHistory.length > 0) {
        context.push(`Medical History: ${medicalHistory.map(h => h.historyText).join('; ')}`);
      }
      
      if (socialHistory.length > 0) {
        context.push(`Social History: ${socialHistory.map(s => `${s.category}: ${s.currentStatus}`).join('; ')}`);
      }

      return context.join('\n');
    } catch (error) {
      console.error(`❌ [PhysicalExamLearning] Error getting patient history:`, error);
      return '';
    }
  }
}