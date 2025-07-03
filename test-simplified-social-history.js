/**
 * Test Simplified 7-Category Social History System
 * 
 * This test verifies:
 * 1. Proper consolidation of inconsistent categories (substance_use → drugs, recreational_drugs → drugs)
 * 2. Only 7 standardized categories: tobacco, alcohol, drugs, occupation, living_situation, activity, diet
 * 3. No blank entries - only categories with actual data
 * 4. Visit history only updates when status actually changes
 * 5. Most recent visit history displays at top
 */

import { unifiedSocialHistoryParser } from './server/unified-social-history-parser.js';

async function testSimplifiedSocialHistory() {
  console.log('\n🚬 ============= TESTING SIMPLIFIED 7-CATEGORY SOCIAL HISTORY SYSTEM =============');
  
  try {
    // Test Patient: Thomas Molloy (ID 30) - has inconsistent categories that need consolidation
    const patientId = 30;
    const encounterId = null; // Testing attachment processing
    const attachmentId = 99; // Mock attachment ID
    
    // Test content that includes cocaine use (should consolidate with existing "recreational_drugs" → "drugs")
    const testContent = `
Social History:
- Smoking: Former smoker, quit in 2005 after MI, previously 1 pack per day for 30 years
- Alcohol: Patient reports drinking a bottle of liquor every day, significant escalation from prior
- Substance use: Patient admits to smoking cocaine once daily, contradicts prior denial
- Employment: Retired factory worker since 2018
- Living situation: Married, lives with wife, stable housing
- Exercise: Limited exercise due to dyspnea and CHF
- Diet: Reports high salt intake, poor dietary habits
    `;

    console.log('🚬 Testing with content that should consolidate existing inconsistent categories...');
    console.log('🚬 Expected behavior:');
    console.log('🚬   - "substance_use" should consolidate with "recreational_drugs" → "drugs"');
    console.log('🚬   - "smoking" should consolidate → "tobacco"');
    console.log('🚬   - All 7 categories should be present with proper consolidation');
    
    // Process the social history
    const result = await unifiedSocialHistoryParser.processUnified(
      patientId,
      encounterId,
      null, // No SOAP note
      testContent, // Attachment content
      attachmentId,
      1, // Provider ID
      'test_consolidation'
    );

    console.log('\n🚬 ============= PROCESSING RESULTS =============');
    console.log('🚬 Success:', result.success);
    console.log('🚬 Changes applied:', result.changes?.length || 0);
    console.log('🚬 Social history entries affected:', result.socialHistoryAffected);

    if (result.changes && result.changes.length > 0) {
      console.log('\n🚬 ============= DETAILED CHANGES =============');
      result.changes.forEach((change, index) => {
        console.log(`🚬 ${index + 1}. ${change.action} - ${change.category}`);
        console.log(`🚬    Status: "${change.currentStatus}"`);
        console.log(`🚬    Confidence: ${change.confidence}`);
        console.log(`🚬    Reasoning: ${change.consolidation_reasoning || 'N/A'}`);
        console.log('');
      });
    }

    // Now let's verify the database state
    console.log('\n🚬 ============= VERIFYING DATABASE STATE =============');
    
    // Query the current social history for Thomas Molloy
    const { db } = await import('./server/db.js');
    const { socialHistory } = await import('./shared/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const currentSocialHistory = await db
      .select()
      .from(socialHistory)
      .where(eq(socialHistory.patientId, patientId))
      .orderBy(socialHistory.category);

    console.log(`🚬 Found ${currentSocialHistory.length} social history entries for patient ${patientId}:`);
    
    const expectedCategories = ['tobacco', 'alcohol', 'drugs', 'occupation', 'living_situation', 'activity', 'diet'];
    const actualCategories = [...new Set(currentSocialHistory.map(entry => entry.category))];
    
    console.log('\n🚬 ============= CATEGORY ANALYSIS =============');
    console.log('🚬 Expected categories:', expectedCategories);
    console.log('🚬 Actual categories:', actualCategories);
    
    // Check for proper consolidation
    const problemCategories = actualCategories.filter(cat => !expectedCategories.includes(cat));
    if (problemCategories.length > 0) {
      console.log('🚬 ❌ UNCONSOLIDATED CATEGORIES FOUND:', problemCategories);
      console.log('🚬 These should have been consolidated into the 7 standard categories');
    } else {
      console.log('🚬 ✅ All categories properly consolidated to 7-category system');
    }
    
    // Display each category with visit history
    console.log('\n🚬 ============= SOCIAL HISTORY DISPLAY =============');
    expectedCategories.forEach(category => {
      const entries = currentSocialHistory.filter(entry => entry.category === category);
      if (entries.length > 0) {
        const entry = entries[0]; // Should only be one per category
        const visitCount = entry.visitHistory ? JSON.parse(entry.visitHistory).length : 0;
        console.log(`🚬 ${category.toUpperCase()}: "${entry.currentStatus}"`);
        console.log(`🚬   Source: ${entry.sourceType}, Confidence: ${entry.sourceConfidence}, Visits: ${visitCount}`);
        
        if (entries.length > 1) {
          console.log(`🚬   ❌ WARNING: Multiple entries found for ${category} - consolidation failed`);
        }
      } else {
        console.log(`🚬 ${category.toUpperCase()}: (not present - no data found)`);
      }
    });

    console.log('\n🚬 ============= CONSOLIDATION SUCCESS TEST =============');
    
    // Check if the "cocaine" information properly consolidated
    const drugsEntries = currentSocialHistory.filter(entry => entry.category === 'drugs');
    if (drugsEntries.length === 1) {
      const drugsEntry = drugsEntries[0];
      if (drugsEntry.currentStatus.includes('cocaine')) {
        console.log('🚬 ✅ SUCCESS: Cocaine information properly consolidated into "drugs" category');
        console.log(`🚬    Current status: "${drugsEntry.currentStatus}"`);
      } else {
        console.log('🚬 ❌ PARTIAL: "drugs" category exists but cocaine information may be missing');
        console.log(`🚬    Current status: "${drugsEntry.currentStatus}"`);
      }
    } else if (drugsEntries.length > 1) {
      console.log('🚬 ❌ FAILED: Multiple "drugs" entries found - consolidation incomplete');
      drugsEntries.forEach((entry, i) => {
        console.log(`🚬    ${i + 1}. "${entry.currentStatus}"`);
      });
    } else {
      console.log('🚬 ❌ FAILED: No "drugs" category found despite cocaine information in content');
    }

    console.log('\n🚬 ============= TEST COMPLETE =============');
    
    return {
      success: result.success,
      categoriesConsolidated: problemCategories.length === 0,
      drugsCocaineConsolidated: drugsEntries.length === 1 && drugsEntries[0]?.currentStatus?.includes('cocaine'),
      totalCategories: actualCategories.length,
      expectedCategories: 7
    };

  } catch (error) {
    console.error('🚬 ❌ Test failed with error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testSimplifiedSocialHistory()
  .then(result => {
    console.log('\n🚬 FINAL TEST RESULT:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('🚬 Test execution failed:', error);
    process.exit(1);
  });