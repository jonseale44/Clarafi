import { transcribeAudio } from './openai.js';
import { AssistantContextService } from './assistant-context-service.js';

export class SimpleRealtimeService {
  private assistantService: AssistantContextService;

  constructor() {
    this.assistantService = new AssistantContextService();
  }

  async processLiveAudioChunk(
    audioBuffer: Buffer,
    patientId: number,
    userRole: string
  ): Promise<{
    transcription: string;
    suggestions: any;
  }> {
    console.log('⚡ [SimpleRealtime] Processing live audio chunk...');
    
    try {
      // Get transcription from audio chunk
      const transcription = await transcribeAudio(audioBuffer);
      console.log('📝 [SimpleRealtime] Transcription:', transcription);

      let suggestions = {};
      
      // If we have meaningful text, get AI suggestions
      if (transcription && transcription.length > 10) {
        try {
          await this.assistantService.initializeAssistant();
          const threadId = await this.assistantService.getOrCreateThread(patientId);
          
          suggestions = await this.assistantService.getRealtimeSuggestions(
            threadId,
            transcription,
            userRole,
            patientId
          );
          console.log('🧠 [SimpleRealtime] Live suggestions generated');
        } catch (error) {
          console.warn('⚠️ [SimpleRealtime] Suggestions failed:', error);
          suggestions = {
            suggestions: ['Processing audio...'],
            clinicalFlags: []
          };
        }
      }

      return {
        transcription,
        suggestions
      };
    } catch (error) {
      console.error('❌ [SimpleRealtime] Processing failed:', error);
      return {
        transcription: '',
        suggestions: {
          suggestions: ['Audio processing...'],
          clinicalFlags: []
        }
      };
    }
  }
}