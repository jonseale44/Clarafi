/**
 * Direct Imaging Attachment Test
 * Test the imaging extraction from attachment 45 with detailed logging
 */

import { db } from "./server/db.js";
import { patientAttachments, attachmentExtractedContent, imagingResults } from "./shared/schema.js";
import { eq } from "drizzle-orm";
import { UnifiedImagingParser } from "./server/unified-imaging-parser.js";

async function testImagingAttachmentDirect() {
  console.log('🧪 [ImagingTest] Starting direct imaging processing test for attachment 45');
  
  try {
    // Get attachment 45 details
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(eq(patientAttachments.id, 45));
    
    if (!attachment) {
      console.error('❌ [ImagingTest] Attachment 45 not found');
      return;
    }
    
    console.log('📄 [ImagingTest] Found attachment:', {
      id: attachment.id,
      filename: attachment.originalFileName,
      patientId: attachment.patientId,
      encounterId: attachment.encounterId
    });
    
    // Get extracted content
    const [content] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, 45));
    
    if (!content) {
      console.error('❌ [ImagingTest] No extracted content found for attachment 45');
      return;
    }
    
    console.log('📄 [ImagingTest] Found extracted content:', {
      documentType: content.documentType,
      textLength: content.extractedText?.length || 0,
      status: content.processingStatus,
      preview: content.extractedText?.substring(0, 500)
    });
    
    // Check current imaging results count for patient
    const existingImaging = await db.select()
      .from(imagingResults)
      .where(eq(imagingResults.patientId, attachment.patientId));
    
    console.log(`📸 [ImagingTest] Current imaging results count for patient ${attachment.patientId}: ${existingImaging.length}`);
    
    if (existingImaging.length > 0) {
      console.log('📸 [ImagingTest] Existing imaging:', existingImaging.map(img => ({
        id: img.id,
        modality: img.modality,
        bodyPart: img.bodyPart,
        studyDate: img.studyDate,
        clinicalSummary: img.clinicalSummary
      })));
    }
    
    // Create imaging parser instance and test processing
    console.log('🚀 [ImagingTest] Creating UnifiedImagingParser instance...');
    const imagingParser = new UnifiedImagingParser();
    
    console.log('🚀 [ImagingTest] Calling processAttachmentImagingData...');
    console.log('🚀 [ImagingTest] Parameters:');
    console.log('  - attachmentId:', attachment.id);
    console.log('  - extractedText length:', content.extractedText?.length);
    console.log('  - documentType:', content.documentType);
    
    // Call the imaging processing method directly
    const result = await imagingParser.processAttachmentImagingData(
      attachment.id,
      content.extractedText,
      content.documentType
    );
    
    console.log('✅ [ImagingTest] Processing completed! Result:', {
      changesLength: result.changes?.length || 0,
      totalAffected: result.total_imaging_affected,
      extractionConfidence: result.extraction_confidence,
      processingNotes: result.processing_notes
    });
    
    // Check final imaging results count
    const finalImaging = await db.select()
      .from(imagingResults)
      .where(eq(imagingResults.patientId, attachment.patientId));
    
    console.log(`📸 [ImagingTest] Final imaging results count for patient ${attachment.patientId}: ${finalImaging.length}`);
    
    if (finalImaging.length > existingImaging.length) {
      console.log('🎉 [ImagingTest] SUCCESS! New imaging results were created');
      const newResults = finalImaging.slice(existingImaging.length);
      newResults.forEach((result, index) => {
        console.log(`📸 [ImagingTest] New result ${index + 1}:`, {
          id: result.id,
          modality: result.modality,
          bodyPart: result.bodyPart,
          studyDate: result.studyDate,
          clinicalSummary: result.clinicalSummary,
          sourceType: result.sourceType,
          sourceConfidence: result.sourceConfidence
        });
      });
    } else {
      console.log('❌ [ImagingTest] PROBLEM: No new imaging results were created despite processing');
    }
    
  } catch (error) {
    console.error('❌ [ImagingTest] Test failed:', error);
    console.error('❌ [ImagingTest] Error stack:', error.stack);
  }
  
  console.log('🏁 [ImagingTest] Test completed');
  process.exit(0);
}

// Run the test
testImagingAttachmentDirect().catch(console.error);