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

    // 1. Generate fast SOAP note immediately (1-3 seconds)
    const fastSoapPromise = this.fastSoapService.generateSOAPNote(patientId, encounterId, transcription);

    // 2. Start background patient learning (don't wait for it)
    this.updatePatientKnowledgeInBackground(patientId, transcription, encounterId);

    // 3. Return the fast result immediately
    const soapNote = await fastSoapPromise;
    const duration = Date.now() - startTime;
    
    console.log(`✅ [HybridSOAP] Fast SOAP completed in ${duration}ms, background learning in progress`);
    
    return soapNote;
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