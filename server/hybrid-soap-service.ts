import { FastSOAPService } from './fast-soap-service';
import { AssistantContextService } from './assistant-context-service';

export class HybridSOAPService {
  private fastSoapService: FastSOAPService;
  private assistantService: AssistantContextService;

  constructor() {
    this.fastSoapService = new FastSOAPService();
    this.assistantService = new AssistantContextService();
  }

  async generateSOAPNote(patientId: number, encounterId: string, transcription: string): Promise<string> {
    console.log(`🔄 [HybridSOAP] Starting hybrid SOAP generation for patient ${patientId}`);
    const startTime = Date.now();

    try {
      // Try to get patient-specific context from accumulated knowledge
      const threadId = await this.assistantService.getOrCreateThread(patientId);
      
      // Check if we have accumulated knowledge for this patient
      const hasPatientHistory = await this.hasAccumulatedKnowledge(threadId);
      
      if (hasPatientHistory) {
        console.log(`🧠 [HybridSOAP] Using accumulated knowledge for patient ${patientId}`);
        // Use enhanced SOAP generation with patient context
        const enhancedSoap = await this.generateEnhancedSOAP(threadId, transcription, patientId);
        const duration = Date.now() - startTime;
        console.log(`✅ [HybridSOAP] Enhanced SOAP completed in ${duration}ms`);
        
        // Still do background learning for future encounters
        this.updatePatientKnowledgeInBackground(patientId, transcription, encounterId);
        return enhancedSoap;
      } else {
        console.log(`⚡ [HybridSOAP] No accumulated knowledge, using fast generation for patient ${patientId}`);
        // Fall back to fast generation for new patients
        const fastSoapPromise = this.fastSoapService.generateSOAPNote(patientId, encounterId, transcription);
        
        // Start background learning for future encounters
        this.updatePatientKnowledgeInBackground(patientId, transcription, encounterId);
        
        const soapNote = await fastSoapPromise;
        const duration = Date.now() - startTime;
        console.log(`✅ [HybridSOAP] Fast SOAP completed in ${duration}ms, learning started`);
        return soapNote;
      }
    } catch (error) {
      console.error(`❌ [HybridSOAP] Error in hybrid generation, falling back to fast:`, error);
      // Fallback to fast generation if anything fails
      const fastSoapPromise = this.fastSoapService.generateSOAPNote(patientId, encounterId, transcription);
      this.updatePatientKnowledgeInBackground(patientId, transcription, encounterId);
      return await fastSoapPromise;
    }
  }

  private async updatePatientKnowledgeInBackground(patientId: number, transcription: string, encounterId: string): Promise<void> {
    // Run this in background without blocking the response
    setTimeout(async () => {
      try {
        console.log(`🧠 [HybridSOAP] Starting background patient learning for patient ${patientId}`);
        const learningStartTime = Date.now();

        // Get or create patient thread
        const threadId = await this.assistantService.getOrCreateThread(patientId);
        
        // Add this encounter to patient's knowledge base
        await this.assistantService.processCompleteTranscription(
          threadId,
          transcription,
          "provider",
          patientId,
          parseInt(encounterId)
        );

        const learningDuration = Date.now() - learningStartTime;
        console.log(`✅ [HybridSOAP] Background learning completed in ${learningDuration}ms for patient ${patientId}`);
        
      } catch (error) {
        console.error(`❌ [HybridSOAP] Background learning failed for patient ${patientId}:`, error);
        // Don't throw - this is background processing
      }
    }, 100); // Small delay to ensure fast response is sent first
  }

  // Method to get enhanced suggestions using patient's accumulated knowledge
  async getEnhancedSuggestions(patientId: number, transcription: string): Promise<any> {
    try {
      console.log(`🧠 [HybridSOAP] Getting enhanced suggestions for patient ${patientId}`);
      
      const threadId = await this.assistantService.getOrCreateThread(patientId);
      
      return await this.assistantService.getRealtimeSuggestions(
        threadId,
        transcription,
        "provider",
        patientId
      );
      
    } catch (error) {
      console.error(`❌ [HybridSOAP] Enhanced suggestions failed for patient ${patientId}:`, error);
      
      // Fallback to basic suggestions
      return {
        suggestions: ["Enhanced suggestions temporarily unavailable"],
        clinicalFlags: [],
        contextualReminders: []
      };
    }
  }
}