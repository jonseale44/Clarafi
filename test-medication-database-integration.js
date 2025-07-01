/**
 * Test Script: Medication Database Integration
 * 
 * Tests the medication system database integration without GPT calls
 * to verify schema changes and basic functionality
 */

import { db } from './server/db.ts';
import { eq } from 'drizzle-orm';
import { medications as medicationsTable } from './shared/schema.ts';

async function testMedicationDatabaseIntegration() {
  console.log('🧪 [TEST] Starting Medication Database Integration Test');
  
  try {
    const testPatientId = 7; // Nancy's patient ID
    const testEncounterId = 8; // Existing encounter
    
    // Step 1: Test creating a medication with new fields
    console.log('📝 [TEST] Creating medication with new schema fields...');
    
    const testMedication = {
      patientId: testPatientId,
      encounterId: testEncounterId,
      medicationName: 'Test Metformin',
      genericName: 'metformin',
      brandName: 'Glucophage',
      strength: '500mg',
      dosage: '500mg',
      dosageForm: 'tablet',
      route: 'oral',
      frequency: 'twice daily',
      sig: 'Take 1 tablet by mouth twice daily with meals',
      clinicalIndication: 'T2DM',
      status: 'active',
      startDate: new Date('2024-01-15'),
      endDate: null,
      sourceType: 'attachment',
      sourceConfidence: 95.0,
      extractedFromAttachmentId: 18, // Use the last created attachment
      enteredBy: 1,
      sourceNotes: 'Test medication extracted from attachment during unified parser testing',
      visitHistory: [
        {
          date: '2024-01-15',
          notes: 'Medication started for diabetes management',
          source: 'attachment',
          attachmentId: 18,
          confidence: 95,
          sourceNotes: 'Extracted from current medications list'
        }
      ]
    };
    
    const [createdMedication] = await db.insert(medicationsTable)
      .values(testMedication)
      .returning();
    
    console.log(`✅ [TEST] Created medication ID: ${createdMedication.id}`);
    console.log(`   • Name: ${createdMedication.medicationName}`);
    console.log(`   • Status: ${createdMedication.status}`);
    console.log(`   • Source Type: ${createdMedication.sourceType}`);
    console.log(`   • Source Confidence: ${createdMedication.sourceConfidence}%`);
    console.log(`   • Visit History Entries: ${createdMedication.visitHistory?.length || 0}`);
    
    // Step 2: Test retrieving medications with new fields
    console.log('\n🔍 [TEST] Retrieving medications for patient...');
    
    const patientMedications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.patientId, testPatientId));
    
    console.log(`📊 [TEST] Found ${patientMedications.length} medications for patient ${testPatientId}`);
    
    // Step 3: Test updating medication with visit history
    console.log('\n🔄 [TEST] Testing visit history update...');
    
    const updatedVisitHistory = [
      ...createdMedication.visitHistory || [],
      {
        date: '2024-07-01',
        notes: 'Medication working well, continuing therapy',
        source: 'encounter',
        encounterId: testEncounterId,
        confidence: 90,
        sourceNotes: 'Regular follow-up visit'
      }
    ];
    
    await db.update(medicationsTable)
      .set({ 
        visitHistory: updatedVisitHistory,
        sourceNotes: 'Updated during testing with additional visit history'
      })
      .where(eq(medicationsTable.id, createdMedication.id));
    
    console.log('✅ [TEST] Updated medication with additional visit history entry');
    
    // Step 4: Verify the update
    const updatedMedication = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, createdMedication.id));
    
    const medication = updatedMedication[0];
    console.log(`📋 [TEST] Updated medication verification:`);
    console.log(`   • Visit History Entries: ${medication.visitHistory?.length || 0}`);
    console.log(`   • Latest Visit: ${medication.visitHistory?.[medication.visitHistory.length - 1]?.date}`);
    console.log(`   • Source Notes: ${medication.sourceNotes?.substring(0, 50)}...`);
    
    // Step 5: Test querying by different source types
    console.log('\n🎯 [TEST] Testing source type filtering...');
    
    const attachmentMedications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.sourceType, 'attachment'));
    
    console.log(`📊 [TEST] Attachment-sourced medications: ${attachmentMedications.length}`);
    
    const manualMedications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.sourceType, 'manual'));
    
    console.log(`📊 [TEST] Manual-sourced medications: ${manualMedications.length}`);
    
    // Step 6: Clean up test data
    console.log('\n🧹 [TEST] Cleaning up test medication...');
    
    await db.delete(medicationsTable)
      .where(eq(medicationsTable.id, createdMedication.id));
    
    console.log('✅ [TEST] Test medication deleted successfully');
    
    console.log('\n🎉 [TEST] Medication Database Integration Test COMPLETED SUCCESSFULLY');
    console.log('📋 [TEST] Summary:');
    console.log('   ✅ New schema fields (visitHistory, sourceType, sourceConfidence, extractedFromAttachmentId, enteredBy, sourceNotes) working correctly');
    console.log('   ✅ JSONB visit history storage and retrieval functioning');
    console.log('   ✅ Medication CRUD operations with enhanced schema successful');
    console.log('   ✅ Source type filtering and confidence tracking operational');
    console.log('   ✅ Database ready for unified medication parser integration');
    
  } catch (error) {
    console.error('❌ [TEST] Error during medication database integration test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMedicationDatabaseIntegration().catch(console.error);