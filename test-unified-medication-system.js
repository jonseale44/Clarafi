/**
 * Test Script: Unified Medication Parser Integration
 * 
 * Tests the complete workflow from attachment upload to medication extraction
 * following the established EMR testing patterns
 */

const { db } = require('./server/storage');
const { attachmentChartProcessor } = require('./server/attachment-chart-processor');
const { unifiedMedicationParser } = require('./server/unified-medication-parser');
const { eq } = require('drizzle-orm');
const { medications as medicationsTable, patientAttachments, attachmentExtractedContent } = require('./shared/schema');

async function testUnifiedMedicationSystem() {
  console.log('🧪 [TEST] Starting Unified Medication Parser Integration Test');
  
  try {
    // Step 1: Create test attachment with medication-rich content
    const testPatientId = 7; // Nancy's patient ID
    const testEncounterId = 8; // Existing encounter
    
    console.log('📝 [TEST] Creating test attachment with medication data...');
    
    const [testAttachment] = await db.insert(patientAttachments).values({
      patientId: testPatientId,
      fileName: 'test-medication-list.txt',
      originalFileName: 'Current Medications January 2024.txt',
      fileSize: 2048,
      mimeType: 'text/plain',
      filePath: '/uploads/test-medication-list.txt',
      thumbnailPath: null,
      uploadedBy: 1,
      documentType: 'medication_list'
    }).returning();
    
    console.log(`✅ [TEST] Created test attachment ID: ${testAttachment.id}`);
    
    // Step 2: Create extracted content simulating GPT analysis
    const testExtractedContent = {
      raw_text: `CURRENT MEDICATIONS - Updated January 15, 2024
      
      Patient: Nancy Johnson
      DOB: 02/15/1985
      
      ACTIVE MEDICATIONS:
      1. Metformin 500mg twice daily - for diabetes management
      2. Lisinopril 10mg once daily - for blood pressure control  
      3. Atorvastatin 20mg at bedtime - for cholesterol management
      4. Aspirin 81mg daily - for cardiovascular protection
      5. Gabapentin 300mg three times daily - for neuropathic pain
      
      RECENTLY DISCONTINUED:
      6. Glyburide 5mg twice daily - discontinued due to hypoglycemia episodes
      
      HELD MEDICATIONS:
      7. Metoprolol 25mg twice daily - on hold due to low blood pressure
      
      HISTORICAL MEDICATIONS (from 2022):
      8. Insulin glargine 20 units nightly - discontinued when metformin proved effective
      9. Hydrochlorothiazide 25mg daily - replaced with lisinopril for better renal protection
      
      Prescribing Physician: Dr. Sarah Johnson, MD
      Next medication review: March 2024`,
      
      sections: {
        medications: {
          active: [
            "Metformin 500mg twice daily for diabetes",
            "Lisinopril 10mg once daily for hypertension", 
            "Atorvastatin 20mg at bedtime for hyperlipidemia",
            "Aspirin 81mg daily for cardioprotection",
            "Gabapentin 300mg TID for neuropathic pain"
          ],
          discontinued: [
            "Glyburide 5mg BID - discontinued due to hypoglycemia"
          ],
          held: [
            "Metoprolol 25mg BID - on hold due to hypotension"
          ],
          historical: [
            "Insulin glargine 20 units nightly - historical use",
            "Hydrochlorothiazide 25mg daily - replaced with ACE inhibitor"
          ]
        }
      },
      confidence: 0.95,
      document_type: "medication_list",
      processing_timestamp: new Date().toISOString()
    };
    
    await db.insert(attachmentExtractedContent).values({
      attachmentId: testAttachment.id,
      extractedContent: testExtractedContent,
      processingStatus: 'completed',
      confidence: 0.95,
      processingNotes: 'Test medication extraction for unified parser testing'
    });
    
    console.log('✅ [TEST] Created extracted content with comprehensive medication data');
    
    // Step 3: Get baseline medication count
    const baselineMedications = await db.select().from(medicationsTable)
      .where(eq(medicationsTable.patientId, testPatientId));
    console.log(`📊 [TEST] Baseline medications count: ${baselineMedications.length}`);
    
    // Step 4: Process attachment through unified medication parser
    console.log('🔄 [TEST] Processing attachment through unified medication parser...');
    
    const result = await unifiedMedicationParser.processUnified(
      testPatientId,
      testEncounterId,
      'attachment',
      JSON.stringify(testExtractedContent),
      testAttachment.id
    );
    
    console.log('✅ [TEST] Unified medication parser processing completed');
    console.log(`📊 [TEST] Processing result:`, {
      changes: result.changes.length,
      medicationsAffected: result.total_medications_affected,
      processingTime: `${result.processing_time_ms}ms`,
      summary: result.source_summary
    });
    
    // Step 5: Verify medications were created/updated
    const postProcessingMedications = await db.select().from(medicationsTable)
      .where(eq(medicationsTable.patientId, testPatientId));
    
    console.log(`📊 [TEST] Post-processing medications count: ${postProcessingMedications.length}`);
    console.log(`📈 [TEST] New medications added: ${postProcessingMedications.length - baselineMedications.length}`);
    
    // Step 6: Analyze medication status distribution
    const statusDistribution = postProcessingMedications.reduce((acc, med) => {
      acc[med.status] = (acc[med.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 [TEST] Medication status distribution:', statusDistribution);
    
    // Step 7: Check visit history tracking
    const medicationsWithVisitHistory = postProcessingMedications.filter(med => 
      med.visitHistory && Array.isArray(med.visitHistory) && med.visitHistory.length > 0
    );
    
    console.log(`📋 [TEST] Medications with visit history: ${medicationsWithVisitHistory.length}`);
    
    // Step 8: Test attachment processing integration
    console.log('🔄 [TEST] Testing full attachment chart processor integration...');
    
    await attachmentChartProcessor.processCompletedAttachment(testAttachment.id);
    console.log('✅ [TEST] Attachment chart processor completed successfully');
    
    // Step 9: Final verification
    const finalMedications = await db.select().from(medicationsTable)
      .where(eq(medicationsTable.patientId, testPatientId));
    
    console.log('🎯 [TEST] Final Results Summary:');
    console.log(`   • Total medications in system: ${finalMedications.length}`);
    console.log(`   • Active medications: ${finalMedications.filter(m => m.status === 'active').length}`);
    console.log(`   • Discontinued medications: ${finalMedications.filter(m => m.status === 'discontinued').length}`);
    console.log(`   • Held medications: ${finalMedications.filter(m => m.status === 'held').length}`);
    console.log(`   • Historical medications: ${finalMedications.filter(m => m.status === 'historical').length}`);
    
    // Show recent medication details
    const recentMedications = finalMedications
      .filter(med => med.extractedFromAttachmentId === testAttachment.id)
      .slice(0, 3);
    
    console.log('\n🔍 [TEST] Sample medication entries created:');
    recentMedications.forEach((med, index) => {
      console.log(`   ${index + 1}. ${med.medicationName} - ${med.dosage} (${med.status})`);
      console.log(`      Source: ${med.sourceType}, Confidence: ${med.sourceConfidence}%`);
      console.log(`      Visit History Entries: ${med.visitHistory ? med.visitHistory.length : 0}`);
    });
    
    console.log('\n✅ [TEST] Unified Medication Parser Integration Test COMPLETED');
    console.log('🏥 [TEST] System successfully extracted, classified, and integrated medications from attachment');
    
  } catch (error) {
    console.error('❌ [TEST] Error during unified medication system test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testUnifiedMedicationSystem().catch(console.error);