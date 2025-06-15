/**
 * Nursing Content Generation Routes
 * 
 * Provides AI-powered content generation specifically for nursing workflows
 */

import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { APIResponseHandler } from './api-response-handler';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/generate-nursing-content
 * Generate nursing-specific content from transcription
 */
router.post('/generate-nursing-content', APIResponseHandler.asyncHandler(async (req: Request, res: Response) => {
  const { transcription, type, patientId, encounterId } = req.body;

  if (!transcription) {
    return APIResponseHandler.badRequest(res, 'Transcription is required');
  }

  const nursingPrompt = buildNursingPrompt(transcription, type);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: nursingPrompt
        },
        {
          role: "user", 
          content: transcription
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const generatedContent = completion.choices[0]?.message?.content || '';
    
    // Parse the generated content based on type
    const parsedContent = parseNursingContent(generatedContent, type);

    return APIResponseHandler.success(res, {
      ...parsedContent,
      metadata: {
        patientId,
        encounterId,
        generatedAt: new Date().toISOString(),
        type
      }
    });

  } catch (error) {
    console.error('🚨 [NursingContent] Generation error:', error);
    return APIResponseHandler.error(res, 'Failed to generate nursing content', 500, 'GENERATION_FAILED');
  }
}));

/**
 * Build nursing-specific prompts based on content type
 */
function buildNursingPrompt(transcription: string, type: string): string {
  const basePrompt = `You are an expert registered nurse generating clinical documentation. 
Focus on patient-centered care, safety, education, and nursing interventions.`;

  const typeSpecificPrompts = {
    nursing_assessment: `${basePrompt}

Generate a comprehensive nursing assessment from this transcription. Include:

**NURSING ASSESSMENT:**
- Chief concern from nursing perspective
- Current condition and appearance
- Vital signs and measurements
- Pain assessment (scale, location, character, interventions)
- Mobility and functional status
- Safety concerns and fall risk
- Skin integrity
- Mental status and mood
- Educational needs identified
- Family dynamics and support system

**NURSING DIAGNOSES:**
- Primary nursing diagnoses (NANDA format preferred)
- Risk factors identified
- Patient responses to current interventions

Format as clear, professional nursing documentation suitable for EMR entry.`,

    care_plan: `${basePrompt}

Generate a nursing care plan from this transcription. Include:

**NURSING CARE PLAN:**

For each nursing diagnosis:
- **Nursing Diagnosis:** [NANDA format]
- **Expected Outcomes:** Patient-centered, measurable goals
- **Nursing Interventions:** Specific actions with rationale
- **Evaluation Criteria:** How to measure success

**PRIORITY INTERVENTIONS:**
- Immediate safety measures
- Pain management strategies
- Patient education priorities
- Discharge planning considerations

Format as actionable care plan for nursing staff.`,

    interventions: `${basePrompt}

Document nursing interventions from this transcription. Include:

**NURSING INTERVENTIONS PERFORMED:**
- Specific interventions completed
- Patient responses to interventions
- Medications administered (if any)
- Patient education provided
- Family communications
- Care coordination activities

**PATIENT RESPONSES:**
- Objective findings post-intervention
- Patient's subjective responses
- Any adverse reactions or concerns
- Need for follow-up interventions

Format as professional nursing intervention documentation.`
  };

  return typeSpecificPrompts[type] || typeSpecificPrompts.nursing_assessment;
}

/**
 * Parse generated nursing content based on type
 */
function parseNursingContent(content: string, type: string) {
  const typeMap: Record<string, any> = {
    'nursing_assessment': { nursingAssessment: content },
    'care_plan': { nursingInterventions: content },
    'interventions': { nursingInterventions: content }
  };
  
  return typeMap[type] || { nursingNotes: content };
}

export default router;