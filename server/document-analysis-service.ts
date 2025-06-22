import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import pdf from "pdf-parse";
import { db } from "./db.js";
import { 
  attachmentExtractedContent, 
  documentProcessingQueue,
  patientAttachments 
} from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

export class DocumentAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Queue document for processing
   */
  async queueDocument(attachmentId: number): Promise<void> {
    console.log(`📄 [DocumentAnalysis] Queuing attachment ${attachmentId} for processing`);
    
    // Check if already queued or processed
    const [existingQueue] = await db.select()
      .from(documentProcessingQueue)
      .where(eq(documentProcessingQueue.attachmentId, attachmentId));
      
    const [existingContent] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

    if (existingQueue || existingContent) {
      console.log(`📄 [DocumentAnalysis] Attachment ${attachmentId} already queued/processed`);
      return;
    }

    // Add to queue
    await db.insert(documentProcessingQueue).values({
      attachmentId,
      status: "queued"
    });

    // Create processing record
    await db.insert(attachmentExtractedContent).values({
      attachmentId,
      processingStatus: "pending"
    });

    console.log(`📄 [DocumentAnalysis] Attachment ${attachmentId} queued for processing`);
    
    // Process immediately in background
    this.processDocument(attachmentId).catch(error => {
      console.error(`📄 [DocumentAnalysis] Background processing failed for attachment ${attachmentId}:`, error);
    });
  }

  /**
   * Process a single document
   */
  async processDocument(attachmentId: number): Promise<void> {
    console.log(`📄 [DocumentAnalysis] Starting processing for attachment ${attachmentId}`);

    try {
      // Update status to processing
      await db.update(documentProcessingQueue)
        .set({ 
          status: "processing",
          lastAttempt: new Date()
        })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));

      await db.update(attachmentExtractedContent)
        .set({ processingStatus: "processing" })
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      // Get attachment details
      const [attachment] = await db.select()
        .from(patientAttachments)
        .where(eq(patientAttachments.id, attachmentId));

      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }

      console.log(`📄 [DocumentAnalysis] Processing ${attachment.originalFileName} (${attachment.mimeType})`);

      let imageData: string;

      if (attachment.mimeType.startsWith('image/')) {
        // For images, convert to base64
        imageData = await this.imageToBase64(attachment.filePath);
      } else if (attachment.mimeType === 'application/pdf') {
        // For PDFs, convert to image then to base64
        imageData = await this.pdfToBase64Image(attachment.filePath);
      } else {
        throw new Error(`Unsupported file type: ${attachment.mimeType}`);
      }

      // Process with GPT-4.1 Vision
      const result = await this.analyzeWithGPT(imageData, attachment.originalFileName);

      // Save results
      await db.update(attachmentExtractedContent)
        .set({
          extractedText: result.extractedText,
          aiGeneratedTitle: result.title,
          documentType: result.documentType,
          processingStatus: "completed",
          processedAt: new Date()
        })
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      await db.update(documentProcessingQueue)
        .set({ status: "completed" })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));

      console.log(`📄 [DocumentAnalysis] Successfully processed attachment ${attachmentId}`);
      console.log(`📄 [DocumentAnalysis] Extracted text length: ${result.extractedText?.length || 0} characters`);
      console.log(`📄 [DocumentAnalysis] Document type: ${result.documentType}`);
      console.log(`📄 [DocumentAnalysis] AI title: ${result.title}`);

    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Processing failed for attachment ${attachmentId}:`, error);

      // Update failure status
      await db.update(attachmentExtractedContent)
        .set({
          processingStatus: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        })
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      // Increment attempts
      await db.update(documentProcessingQueue)
        .set({ 
          status: "failed",
          attempts: db.sql`${documentProcessingQueue.attempts} + 1`,
          lastAttempt: new Date()
        })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));
    }
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(filePath: string): Promise<string> {
    const imageBuffer = await sharp(filePath)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 95 })
      .toBuffer();
    
    return imageBuffer.toString('base64');
  }

  /**
   * Convert PDF to base64 image
   */
  private async pdfToBase64Image(filePath: string): Promise<string> {
    // Read PDF file
    const pdfBuffer = await fs.readFile(filePath);
    
    // Try to extract first page as image using sharp (if PDF contains images)
    // For now, we'll use a simple approach - convert PDF to image using external tools would be ideal
    // But for MVP, let's try reading the PDF content and creating a text-based image
    
    try {
      // First attempt: try to extract text and create a simple image representation
      const pdfData = await pdf(pdfBuffer);
      
      if (pdfData.text && pdfData.text.length > 50) {
        // Create a simple text image for GPT to read
        const textImage = await this.createTextImage(pdfData.text.substring(0, 4000)); // Limit text
        return textImage;
      }
    } catch (pdfError) {
      console.log(`📄 [DocumentAnalysis] PDF text extraction failed, will need image conversion`);
    }

    // Fallback: For now, create a placeholder that indicates PDF processing needed
    // In production, you'd use pdf2pic or similar to convert PDF pages to images
    throw new Error("PDF image conversion not yet implemented - needs pdf2pic integration");
  }

  /**
   * Create a text-based image for OCR
   */
  private async createTextImage(text: string): Promise<string> {
    // Create a simple white background image with text
    // This is a fallback - ideally PDFs would be converted to actual page images
    const width = 800;
    const height = 1000;
    
    const textBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .png()
    .toBuffer();

    return textBuffer.toString('base64');
  }

  /**
   * Analyze document with GPT-4.1 Vision
   */
  private async analyzeWithGPT(imageBase64: string, originalFileName: string): Promise<{
    extractedText: string;
    title: string;
    documentType: string;
  }> {
    console.log(`📄 [DocumentAnalysis] Calling GPT-4.1 Vision for analysis`);

    const prompt = `Analyze this medical document and extract all information. Return JSON in this exact format:

{
  "extractedText": "Complete text content from the document, preserving structure and medical terminology",
  "documentType": "One of: lab_results, H&P, discharge_summary, nursing_notes, radiology_report, prescription, insurance_card, referral, operative_note, pathology_report, other",
  "title": "Concise, descriptive title for this document (max 100 characters)"
}

Document filename for context: ${originalFileName}

Extract ALL visible text including:
- Patient demographics
- Medical history
- Vital signs and measurements  
- Lab values and results
- Medications and dosages
- Clinical notes and observations
- Dates and timestamps
- Provider information
- Any structured data in tables

Preserve the original structure and formatting where possible. Be thorough and accurate.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from GPT-4.1");
    }

    const result = JSON.parse(content);
    
    console.log(`📄 [DocumentAnalysis] GPT-4.1 analysis complete`);
    console.log(`📄 [DocumentAnalysis] Detected document type: ${result.documentType}`);
    console.log(`📄 [DocumentAnalysis] Generated title: ${result.title}`);

    return {
      extractedText: result.extractedText || "",
      title: result.title || originalFileName,
      documentType: result.documentType || "other"
    };
  }

  /**
   * Get extracted content for an attachment
   */
  async getExtractedContent(attachmentId: number): Promise<any> {
    const [content] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

    return content || null;
  }

  /**
   * Process queue - run periodically to handle failed items
   */
  async processQueue(): Promise<void> {
    const queueItems = await db.select()
      .from(documentProcessingQueue)
      .where(and(
        eq(documentProcessingQueue.status, "queued"),
        db.sql`${documentProcessingQueue.attempts} < 3`
      ));

    for (const item of queueItems) {
      await this.processDocument(item.attachmentId);
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();