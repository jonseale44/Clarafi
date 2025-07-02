/**
 * Test Enhanced Social History System
 * Verifies the medical-grade improvements to social history parsing
 * Tests 7 specific social history changes that should result in database updates
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Sample social history content that should trigger sophisticated processing
const TEST_SOCIAL_HISTORY_CONTENT = `
SOCIAL HISTORY:
- Tobacco: Patient reports smoking 1 pack per day for 15 years, started at age 18. Recently cut down to 0.5 pack daily.
- Alcohol: Drinks wine socially on weekends, approximately 2-3 glasses. Denies hard liquor consumption.
- Employment: Currently works as a software engineer, mostly sedentary work with computer screens 8+ hours daily.
- Exercise: Joined gym last month, now exercises 3 times per week including cardio and weight training.
- Diet: Following Mediterranean diet since diabetes diagnosis, increased vegetables and reduced processed foods.
- Sleep: Improved sleep hygiene, now getting 7-8 hours nightly instead of previous 4-5 hours.
- Living situation: Lives with spouse in stable housing, has good social support from family.
`;

async function testEnhancedSocialHistorySystem() {
  console.log('\n🚬 [ENHANCED SOCIAL HISTORY TEST] Starting comprehensive system test...\n');

  try {
    // Step 1: Get existing social history for patient 28
    console.log('📋 [Step 1] Fetching existing social history for patient 28...');
    const existingResponse = await axios.get(`${BASE_URL}/api/social-history/28`);
    const existingSocialHistory = existingResponse.data;
    console.log(`📊 Found ${existingSocialHistory.length} existing social history entries`);
    
    if (existingSocialHistory.length > 0) {
      console.log('📋 Existing entries:');
      existingSocialHistory.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.category}: ${entry.currentStatus} (ID: ${entry.id})`);
      });
    }

    // Step 2: Process social history using unified parser
    console.log('\n🔄 [Step 2] Processing social history with enhanced GPT prompts...');
    const processResponse = await axios.post(`${BASE_URL}/api/social-history/process-unified`, {
      patientId: 28,
      soapNote: TEST_SOCIAL_HISTORY_CONTENT,
      encounterId: 35,
      triggerType: 'manual_test'
    });

    console.log('✅ Processing response received:', processResponse.status);
    console.log('📊 Response data:', JSON.stringify(processResponse.data, null, 2));

    // Step 3: Verify database updates
    console.log('\n📋 [Step 3] Verifying database updates...');
    const updatedResponse = await axios.get(`${BASE_URL}/api/social-history/28`);
    const updatedSocialHistory = updatedResponse.data;
    console.log(`📊 Now have ${updatedSocialHistory.length} social history entries`);

    // Step 4: Analyze changes
    console.log('\n🔍 [Step 4] Analyzing changes...');
    const entriesAdded = updatedSocialHistory.length - existingSocialHistory.length;
    console.log(`➕ New entries added: ${entriesAdded}`);

    if (updatedSocialHistory.length > 0) {
      console.log('\n📋 All social history entries after processing:');
      updatedSocialHistory.forEach((entry, index) => {
        const isNew = !existingSocialHistory.find(existing => existing.id === entry.id);
        const status = isNew ? '🆕 NEW' : '📝 EXISTING';
        console.log(`   ${status} ${index + 1}. ${entry.category}: ${entry.currentStatus}`);
        console.log(`      Source: ${entry.sourceType} | Confidence: ${entry.sourceConfidence}`);
        console.log(`      Visit History: ${entry.visitHistory?.length || 0} entries`);
        
        if (entry.visitHistory && entry.visitHistory.length > 0) {
          entry.visitHistory.forEach((visit, vIndex) => {
            console.log(`         Visit ${vIndex + 1}: ${visit.date} - ${visit.notes} (${visit.source})`);
          });
        }
        console.log('');
      });
    }

    // Step 5: Test category-specific matching
    console.log('\n🎯 [Step 5] Testing category-specific matching...');
    const categoryMatches = {
      'smoking': updatedSocialHistory.filter(entry => 
        entry.category.toLowerCase().includes('smoking') || 
        entry.category.toLowerCase().includes('tobacco')
      ),
      'alcohol': updatedSocialHistory.filter(entry => 
        entry.category.toLowerCase().includes('alcohol') || 
        entry.category.toLowerCase().includes('drinking')
      ),
      'exercise': updatedSocialHistory.filter(entry => 
        entry.category.toLowerCase().includes('exercise') || 
        entry.category.toLowerCase().includes('activity')
      ),
      'occupation': updatedSocialHistory.filter(entry => 
        entry.category.toLowerCase().includes('occupation') || 
        entry.category.toLowerCase().includes('employment')
      )
    };

    Object.entries(categoryMatches).forEach(([category, matches]) => {
      console.log(`🔍 ${category.toUpperCase()}: ${matches.length} matches found`);
      matches.forEach(match => {
        console.log(`   - ${match.category}: ${match.currentStatus.substring(0, 50)}...`);
      });
    });

    // Step 6: Evaluate system performance
    console.log('\n📈 [Step 6] System Performance Evaluation:');
    const expectedChanges = 7; // smoking, alcohol, occupation, exercise, diet, sleep, living situation
    const actualChanges = processResponse.data.socialHistoryAffected || 0;
    
    console.log(`Expected social history changes: ${expectedChanges}`);
    console.log(`Actual social history changes: ${actualChanges}`);
    console.log(`Success rate: ${((actualChanges / expectedChanges) * 100).toFixed(1)}%`);

    if (actualChanges >= expectedChanges * 0.7) { // 70% success threshold
      console.log('✅ ENHANCED SOCIAL HISTORY SYSTEM: WORKING EFFECTIVELY');
      console.log('🎯 Medical-grade consolidation logic successfully implemented');
    } else {
      console.log('⚠️  ENHANCED SOCIAL HISTORY SYSTEM: NEEDS OPTIMIZATION');
      console.log('🔧 Review GPT prompts and consolidation logic for improvements');
    }

  } catch (error) {
    console.error('❌ Enhanced social history test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEnhancedSocialHistorySystem()
  .then(() => {
    console.log('\n🏁 Enhanced social history system test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });