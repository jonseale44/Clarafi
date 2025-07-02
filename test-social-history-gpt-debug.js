/**
 * Debug Social History GPT Processing
 * This will help us see exactly what GPT is thinking during social history extraction
 */

import { UnifiedSocialHistoryParser } from './server/unified-social-history-parser.js';

async function debugSocialHistoryGPT() {
  console.log('🔍 Starting social history GPT debug...');
  
  // Create parser instance
  const parser = new UnifiedSocialHistoryParser();
  
  // Test with the exact content from attachment 55
  const attachmentContent = `Social History
• Former smoker: 1 pack per day for 30 years, quit in 2005 after MI
• Alcohol use: Occasional, 1-2 drinks per week
• Illicit drugs: Denies
• Marital status: Married, lives with wife
• Occupation: Retired factory worker
• Diet: High salt intake reported recently
• Exercise: Limited due to dyspnea`;

  // Simulate existing social history (the contaminated data)
  const existingSocialHistory = [
    {
      id: 113,
      category: 'social_support',
      currentStatus: 'Patient has family support but is experiencing financial difficulties affecting medication adherence.',
      sourceType: 'attachment_extracted'
    },
    {
      id: 112,
      category: 'diet',
      currentStatus: 'Increased salt intake due to dietary indiscretions at a family gathering.',
      sourceType: 'attachment_extracted'
    },
    {
      id: 114,
      category: 'recreational_drugs',
      currentStatus: 'Denies use of illicit drugs.',
      sourceType: 'attachment_extracted'
    },
    {
      id: 115,
      category: 'living_situation',
      currentStatus: 'Married, lives with wife.',
      sourceType: 'attachment_extracted'
    }
  ];

  try {
    // Call the unified processor
    const result = await parser.processUnified(
      27, // patientId
      null, // encounterId
      null, // soapNote
      attachmentContent, // attachmentContent
      55, // attachmentId
      1, // providerId
      "debug_test" // triggerType
    );

    console.log('🎯 Final result:', result);
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug
debugSocialHistoryGPT().catch(console.error);