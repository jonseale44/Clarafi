/**
 * Direct Medication Extraction Test
 * Directly test medication processing after database constraint fix
 */
import { db } from './server/db.js';
import { patientAttachments, attachmentExtractedContent, medications } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { attachmentChartProcessor } from './server/attachment-chart-processor.js';

async function testMedicationProcessing() {
  console.log('🧪 [DirectTest] Starting direct medication processing test');
  
  try {
    // Get attachment 34 details
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(eq(patientAttachments.id, 34));
    
    if (!attachment) {
      console.error('❌ [DirectTest] Attachment 34 not found');
      return;
    }
    
    console.log('📄 [DirectTest] Found attachment:', {
      id: attachment.id,
      filename: attachment.originalFileName,
      patientId: attachment.patientId
    });
    
    // Get extracted content
    const [content] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, 34));
    
    if (!content) {
      console.error('❌ [DirectTest] No extracted content found for attachment 34');
      return;
    }
    
    console.log('📄 [DirectTest] Found extracted content:', {
      documentType: content.documentType,
      textLength: content.extractedText?.length || 0,
      status: content.processingStatus
    });
    
    // Check current medications count
    const existingMeds = await db.select()
      .from(medications)
      .where(eq(medications.patientId, 19));
    
    console.log(`💊 [DirectTest] Current medications count: ${existingMeds.length}`);
    
    // Trigger chart processing directly
    console.log('🚀 [DirectTest] Triggering chart processing...');
    await attachmentChartProcessor.processCompletedAttachment(34);
    
    // Check medications count after processing
    const newMeds = await db.select()
      .from(medications)
      .where(eq(medications.patientId, 19));
    
    console.log(`💊 [DirectTest] Medications count after processing: ${newMeds.length}`);
    console.log(`💊 [DirectTest] New medications added: ${newMeds.length - existingMeds.length}`);
    
    if (newMeds.length > existingMeds.length) {
      console.log('✅ [DirectTest] Medications successfully extracted!');
      newMeds.slice(existingMeds.length).forEach((med, index) => {
        console.log(`  ${index + 1}. ${med.medicationName} ${med.dosage} (${med.sourceType})`);
      });
    } else {
      console.log('⚠️ [DirectTest] No new medications extracted');
    }
    
  } catch (error) {
    console.error('💥 [DirectTest] Error:', error);
  }
  
  process.exit(0);
}

testMedicationProcessing();