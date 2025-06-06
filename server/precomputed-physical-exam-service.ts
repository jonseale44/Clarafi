import { db } from "./db.js";
import { encounters } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { PhysicalExamLearningService } from "./physical-exam-learning-service.js";

export class PrecomputedPhysicalExamService {
  private physicalExamLearningService: PhysicalExamLearningService;

  constructor() {
    this.physicalExamLearningService = new PhysicalExamLearningService();
  }

  /**
   * Pre-compute physical exam findings for a patient when encounter starts
   * This runs in the background, no waiting required
   */
  async precomputePhysicalExamFindings(
    patientId: number, 
    encounterId: number,
    chiefComplaint?: string
  ): Promise<void> {
    try {
      console.log(`🧠 [PrecomputedPhysical] Starting precomputation for patient ${patientId}, encounter ${encounterId}`);
      
      // Get patient demographics for context
      const patient = await db.select().from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);
        
      if (!patient.length) {
        console.warn(`⚠️ [PrecomputedPhysical] Encounter ${encounterId} not found`);
        return;
      }

      // Generate physical exam suggestions using the learning service
      const physicalExamSuggestions = await this.physicalExamLearningService.generatePhysicalExamSuggestions(
        patientId,
        chiefComplaint || 'General visit',
        `Patient encounter ${encounterId}`
      );

      // Format findings for SOAP note integration
      const formattedFindings = this.formatFindingsForSOAP(physicalExamSuggestions);
      
      // Store precomputed findings in encounter record
      await db.update(encounters)
        .set({ 
          precomputedPhysicalFindings: JSON.stringify(formattedFindings) 
        })
        .where(eq(encounters.id, encounterId));

      console.log(`✅ [PrecomputedPhysical] Stored ${physicalExamSuggestions.length} findings for encounter ${encounterId}`);

    } catch (error: any) {
      console.error(`❌ [PrecomputedPhysical] Error precomputing findings:`, error);
      // Don't throw - this is background processing
    }
  }

  /**
   * Retrieve precomputed physical exam findings for SOAP generation
   */
  async getPrecomputedFindings(encounterId: number): Promise<string> {
    try {
      const encounter = await db.select()
        .from(encounters)
        .where(eq(encounters.id, encounterId))
        .limit(1);

      if (encounter.length > 0 && encounter[0].precomputedPhysicalFindings) {
        const findings = JSON.parse(encounter[0].precomputedPhysicalFindings);
        return this.formatFindingsForPrompt(findings);
      }

      return '';
    } catch (error: any) {
      console.error(`❌ [PrecomputedPhysical] Error retrieving findings:`, error);
      return '';
    }
  }

  private formatFindingsForSOAP(suggestions: any[]): any[] {
    return suggestions.map(suggestion => ({
      examSystem: suggestion.examSystem,
      finding: suggestion.suggestedText,
      reasoning: suggestion.reasoning,
      shouldBold: true // These are persistent findings that should be highlighted
    }));
  }

  private formatFindingsForPrompt(findings: any[]): string {
    if (!findings || findings.length === 0) {
      return '';
    }

    let promptText = '\n\nPERSISTENT PHYSICAL FINDINGS (include these in physical exam, make them bold):\n';
    
    findings.forEach(finding => {
      promptText += `- ${finding.examSystem}: **${finding.finding}** (${finding.reasoning})\n`;
    });

    promptText += '\nInclude these persistent findings in your physical exam section alongside any new findings from the transcription.\n';

    return promptText;
  }
}