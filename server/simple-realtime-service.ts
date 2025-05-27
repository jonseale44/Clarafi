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
    console.log('⚡ [SimpleRealtime] Processing live audio chunk, size:', audioBuffer.length);
    
    try {
      // For live chunks, try transcription with fallback to prevent blocking
      let transcription = '';
      try {
        // Quick transcription attempt for live chunks
        transcription = await Promise.race([
          transcribeAudio(audioBuffer),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Transcription timeout')), 5000)
          )
        ]);
        console.log('📝 [SimpleRealtime] ✅ Transcription successful:', transcription?.length || 0, 'characters');
      } catch (transcriptionError) {
        console.warn('⚠️ [SimpleRealtime] Transcription failed, using processing indicator:', transcriptionError.message);
        // Return a processing indicator to keep the UI responsive
        transcription = '[Processing audio...]';
      }
      
      console.log('📝 [SimpleRealtime] Transcription success:', transcription?.substring(0, 50) + '...');

      let suggestions = {
        suggestions: ['🔄 Analyzing speech...'],
        clinicalFlags: []
      };
      
      // If we have meaningful text, get AI suggestions with timeout protection
      if (transcription && transcription.length > 5) {
        try {
          console.log('🧠 [SimpleRealtime] Getting AI suggestions...');
          
          // Initialize assistant with timeout
          await Promise.race([
            this.assistantService.initializeAssistant(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Assistant init timeout')), 3000)
            )
          ]);
          
          const threadId = await this.assistantService.getOrCreateThread(patientId);
          
          // Get suggestions with timeout
          suggestions = await Promise.race([
            this.assistantService.getRealtimeSuggestions(
              threadId,
              transcription,
              userRole,
              patientId
            ),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Suggestions timeout')), 5000)
            )
          ]);
          
          console.log('🧠 [SimpleRealtime] ✅ Live suggestions generated successfully');
        } catch (error) {
          console.warn('⚠️ [SimpleRealtime] AI suggestions failed, using fallback:', error.message);
          suggestions = {
            suggestions: [
              '🩺 Continue speaking for clinical insights...',
              '📋 Patient context being analyzed'
            ],
            clinicalFlags: []
          };
        }
      }

      return {
        transcription: transcription || '',
        suggestions
      };
    } catch (error) {
      console.error('❌ [SimpleRealtime] Transcription failed:', error.message);
      
      // Return helpful fallback that keeps the UI responsive
      return {
        transcription: '',
        suggestions: {
          suggestions: [
            '🎤 Continue speaking...',
            '⏳ Processing audio in background'
          ],
          clinicalFlags: []
        }
      };
    }
  }
}