import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { fromPath } from "pdf2pic";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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
    
    // Check if already queued or processed (skip check for reprocessing)
    const [existingQueue] = await db.select()
      .from(documentProcessingQueue)
      .where(eq(documentProcessingQueue.attachmentId, attachmentId));
      
    const [existingContent] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

    if (existingQueue && existingQueue.status === 'completed') {
      console.log(`📄 [DocumentAnalysis] Attachment ${attachmentId} already completed, skipping`);
      return;
    }
    
    if (existingContent && existingContent.processingStatus === 'completed') {
      console.log(`📄 [DocumentAnalysis] Attachment ${attachmentId} content already processed, skipping`);
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
      console.log(`📄 [DocumentAnalysis] File path: ${attachment.filePath}`);

      let imageData: string;

      try {
        if (attachment.mimeType.startsWith('image/')) {
          console.log(`📄 [DocumentAnalysis] Processing as image file`);
          // For images, convert to base64
          imageData = await this.imageToBase64(attachment.filePath);
        } else if (attachment.mimeType === 'application/pdf') {
          console.log(`📄 [DocumentAnalysis] Processing as PDF file`);
          // For PDFs, convert to image then to base64
          imageData = await this.pdfToBase64Image(attachment.filePath);
        } else {
          throw new Error(`Unsupported file type: ${attachment.mimeType}`);
        }
        
        console.log(`📄 [DocumentAnalysis] Successfully converted file to base64, length: ${imageData.length}`);
      } catch (conversionError) {
        console.error(`📄 [DocumentAnalysis] File conversion failed:`, conversionError);
        throw conversionError;
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
      const [currentQueue] = await db.select()
        .from(documentProcessingQueue)
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));
      
      await db.update(documentProcessingQueue)
        .set({ 
          status: "failed",
          attempts: (currentQueue?.attempts || 0) + 1,
          lastAttempt: new Date()
        })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));
    }
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(filePath: string): Promise<string> {
    console.log(`📄 [DocumentAnalysis] Converting image to base64: ${filePath}`);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      const imageBuffer = await sharp(filePath)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 95 })
        .toBuffer();
      
      const base64String = imageBuffer.toString('base64');
      console.log(`📄 [DocumentAnalysis] Image converted to base64, length: ${base64String.length} characters`);
      
      // Validate base64 string
      if (base64String.length === 0) {
        throw new Error("Generated base64 string is empty");
      }
      
      // Test base64 validity
      const testBuffer = Buffer.from(base64String, 'base64');
      if (testBuffer.length === 0) {
        throw new Error("Invalid base64 string generated");
      }
      
      return base64String;
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Image conversion failed:`, error);
      throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PDF to base64 image
   */
  private async pdfToBase64Image(filePath: string): Promise<string> {
    console.log(`📄 [DocumentAnalysis] Converting PDF to image: ${filePath}`);
    
    try {
      // Check if PDF file exists
      await fs.access(filePath);
      console.log(`📄 [DocumentAnalysis] PDF file exists, proceeding with direct pdftoppm conversion`);
      
      // Use pdftoppm directly since it's the most reliable method
      const timestamp = Date.now();
      const outputPrefix = `/tmp/pdf_convert_${timestamp}`;
      
      console.log(`📄 [DocumentAnalysis] Running pdftoppm command...`);
      console.log(`📄 [DocumentAnalysis] Input file: ${filePath}`);
      console.log(`📄 [DocumentAnalysis] Output prefix: ${outputPrefix}`);
      
      const command = `pdftoppm -png -f 1 -l 1 -r 150 "${filePath}" "${outputPrefix}"`;
      console.log(`📄 [DocumentAnalysis] Command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      console.log(`📄 [DocumentAnalysis] pdftoppm stdout:`, stdout);
      if (stderr) console.log(`📄 [DocumentAnalysis] pdftoppm stderr:`, stderr);
      
      // pdftoppm creates files with -01.png suffix for first page
      const convertedFile = `${outputPrefix}-01.png`;
      console.log(`📄 [DocumentAnalysis] Looking for file: ${convertedFile}`);
      
      // Check if file exists
      try {
        await fs.access(convertedFile);
        console.log(`📄 [DocumentAnalysis] File exists, reading...`);
      } catch (accessError) {
        console.error(`📄 [DocumentAnalysis] File does not exist:`, accessError);
        
        // Check what files were actually created
        try {
          const { stdout: lsOutput } = await execAsync(`ls -la /tmp/pdf_convert_${timestamp}*`);
          console.log(`📄 [DocumentAnalysis] Created files:`, lsOutput);
        } catch (lsError) {
          console.log(`📄 [DocumentAnalysis] No files created with expected pattern`);
        }
        
        throw new Error(`Converted file not found: ${convertedFile}`);
      }
      
      const imageBuffer = await fs.readFile(convertedFile);
      console.log(`📄 [DocumentAnalysis] Read file buffer, size: ${imageBuffer.length} bytes`);
      
      // Clean up
      try {
        await fs.unlink(convertedFile);
        console.log(`📄 [DocumentAnalysis] Cleaned up temporary file`);
      } catch (cleanupError) {
        console.warn(`📄 [DocumentAnalysis] Failed to cleanup file:`, cleanupError);
      }
      
      const base64String = imageBuffer.toString('base64');
      console.log(`📄 [DocumentAnalysis] PDF conversion successful, base64 length: ${base64String.length} characters`);
      return base64String;
      
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] PDF conversion failed:`, error);
      console.error(`📄 [DocumentAnalysis] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    console.log(`📄 [DocumentAnalysis] Base64 string length: ${imageBase64.length}`);
    console.log(`📄 [DocumentAnalysis] Base64 prefix: ${imageBase64.substring(0, 50)}...`);

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

    try {
      console.log(`📄 [DocumentAnalysis] Making OpenAI API call...`);
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

      console.log(`📄 [DocumentAnalysis] OpenAI API response received`);
      console.log(`📄 [DocumentAnalysis] Response usage:`, response.usage);

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from GPT-4.1");
      }

      console.log(`📄 [DocumentAnalysis] Raw response content:`, content);

      const result = JSON.parse(content);
      
      console.log(`📄 [DocumentAnalysis] GPT-4.1 analysis complete`);
      console.log(`📄 [DocumentAnalysis] Detected document type: ${result.documentType}`);
      console.log(`📄 [DocumentAnalysis] Generated title: ${result.title}`);

      return {
        extractedText: result.extractedText || "",
        title: result.title || originalFileName,
        documentType: result.documentType || "other"
      };
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] OpenAI API call failed:`, error);
      if (error instanceof Error) {
        console.error(`📄 [DocumentAnalysis] Error message:`, error.message);
        console.error(`📄 [DocumentAnalysis] Error stack:`, error.stack);
      }
      throw error;
    }
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
        eq(documentProcessingQueue.status, "queued")
      ));

    console.log(`📄 [DocumentAnalysis] Found ${queueItems.length} items in queue to process`);

    for (const item of queueItems) {
      console.log(`📄 [DocumentAnalysis] Processing queued item: attachment ${item.attachmentId}`);
      await this.processDocument(item.attachmentId);
    }
  }

  /**
   * Manually trigger processing for testing
   */
  async reprocessDocument(attachmentId: number): Promise<void> {
    console.log(`📄 [DocumentAnalysis] Manually reprocessing attachment ${attachmentId}`);
    
    // Force process regardless of current status
    try {
      await this.processDocument(attachmentId);
      console.log(`📄 [DocumentAnalysis] Manual reprocessing completed for attachment ${attachmentId}`);
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Manual reprocessing failed for attachment ${attachmentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();