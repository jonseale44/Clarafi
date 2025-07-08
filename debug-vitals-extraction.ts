import { DocumentAnalysisService } from "./server/document-analysis-service.js";
import { AttachmentChartProcessor } from "./server/attachment-chart-processor.js";
import { db } from "./server/db.js";
import { patientAttachments, attachmentExtractedContent, vitals } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function debugVitalsExtraction() {
  try {
    console.log("=== VITALS EXTRACTION DEBUG ===");
    
    // Check attachment 9 status
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(eq(patientAttachments.id, 9));
    
    console.log("Attachment 9:", {
      id: attachment.id,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      processingStatus: attachment.processingStatus,
      patientId: attachment.patientId
    });
    
    // Check extracted content
    const [extractedContent] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, 9));
    
    console.log("Extracted content:", {
      attachmentId: extractedContent.attachmentId,
      processingStatus: extractedContent.processingStatus,
      documentType: extractedContent.documentType,
      aiGeneratedTitle: extractedContent.aiGeneratedTitle,
      textLength: extractedContent.extractedText?.length || 0
    });
    
    if (extractedContent.processingStatus === 'completed') {
      console.log("\n=== TRIGGERING CHART PROCESSING ===");
      const processor = new AttachmentChartProcessor();
      await processor.processCompletedAttachment(9);
      console.log("Chart processing completed!");
      
      // Check if vitals were created
      const vitalsCreated = await db.select()
        .from(vitals)
        .where(eq(vitals.extractedFromAttachmentId, 9));
      
      console.log("\n=== VITALS CREATED ===");
      console.log(`Found ${vitalsCreated.length} vitals from attachment 9`);
      
      if (vitalsCreated.length > 0) {
        vitalsCreated.forEach((v, i) => {
          console.log(`Vital ${i + 1}:`, {
            recordedAt: v.recordedAt,
            bp: `${v.systolicBp}/${v.diastolicBp}`,
            hr: v.heartRate,
            temp: v.temperature,
            o2: v.oxygenSaturation
          });
        });
      }
    } else {
      console.log("Extracted content not completed yet!");
    }
    
  } catch (error) {
    console.error("Debug error:", error);
  } finally {
    process.exit(0);
  }
}

debugVitalsExtraction();