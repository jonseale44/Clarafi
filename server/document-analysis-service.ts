import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
// Removed pdf2pic import - using direct pdftoppm approach
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
import { attachmentChartProcessor } from "./attachment-chart-processor.js";

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
    console.log(`🔥 [ANALYSIS WORKFLOW] ============= STARTING DOCUMENT ANALYSIS =============`);
    console.log(`📄 [DocumentAnalysis] Queuing attachment ${attachmentId} for processing`);
    
    // Check if already queued or processed (skip check for reprocessing)
    const [existingQueue] = await db.select()
      .from(documentProcessingQueue)
      .where(eq(documentProcessingQueue.attachmentId, attachmentId));
      
    const [existingContent] = await db.select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

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

      if (attachment.mimeType.startsWith('image/')) {
        console.log(`📄 [DocumentAnalysis] Processing as image file`);
        imageData = await this.imageToBase64(attachment.filePath);
      } else if (attachment.mimeType === 'application/pdf') {
        console.log(`📄 [DocumentAnalysis] Processing as PDF file`);
        imageData = await this.pdfToBase64Image(attachment.filePath);
      } else {
        throw new Error(`Unsupported file type: ${attachment.mimeType}`);
      }
      
      console.log(`📄 [DocumentAnalysis] Successfully converted file to base64, length: ${imageData.length}`);
      
      if (!imageData || imageData.length === 0) {
        throw new Error("Generated base64 data is empty");
      }

      // Process with GPT-4.1 Vision
      console.log(`📄 [DocumentAnalysis] 🤖 Calling GPT-4.1 Vision for OCR processing`);
      const result = await this.analyzeWithGPT(imageData, attachment.originalFileName);
      console.log(`📄 [DocumentAnalysis] ✅ GPT-4.1 Vision processing complete`);

      // Save results
      console.log(`📄 [DocumentAnalysis] 💾 Saving extraction results to database`);
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

      console.log(`📄 [DocumentAnalysis] ✅ Successfully processed attachment ${attachmentId}`);
      console.log(`📄 [DocumentAnalysis] ✅ Extracted text length: ${result.extractedText?.length || 0} characters`);
      console.log(`📄 [DocumentAnalysis] ✅ Document type: ${result.documentType}`);
      console.log(`📄 [DocumentAnalysis] ✅ AI title: ${result.title}`);

      // Trigger chart processing for completed documents
      console.log(`📄 [DocumentAnalysis] 🔄 Triggering chart processing for attachment ${attachmentId}`);
      console.log(`🔥 [ANALYSIS WORKFLOW] ============= DOCUMENT ANALYSIS COMPLETE =============`);
      console.log(`📄 [DocumentAnalysis] ✅ Starting transition to chart processing workflow`);
      
      this.triggerChartProcessing(attachmentId).catch(error => {
        console.error(`📄 [DocumentAnalysis] ❌ Chart processing failed for attachment ${attachmentId}:`, error);
      });

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
      
      // Convert all pages (remove -f 1 -l 1 to process entire PDF)
      const command = `pdftoppm -png -r 150 "${filePath}" "${outputPrefix}"`;
      console.log(`📄 [DocumentAnalysis] Command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      console.log(`📄 [DocumentAnalysis] pdftoppm stdout:`, stdout);
      if (stderr) console.log(`📄 [DocumentAnalysis] pdftoppm stderr:`, stderr);
      
      // Find all generated pages
      const { stdout: lsOutput } = await execAsync(`ls -1 /tmp/pdf_convert_${timestamp}*.png 2>/dev/null || echo ""`);
      const pageFiles = lsOutput.trim().split('\n').filter(f => f.length > 0);
      
      if (pageFiles.length === 0) {
        throw new Error(`No converted pages found for timestamp ${timestamp}`);
      }
      
      console.log(`📄 [DocumentAnalysis] Found ${pageFiles.length} pages: ${pageFiles.join(', ')}`);
      
      // Combine all pages into a single composite image using ImageMagick
      if (pageFiles.length === 1) {
        // Single page - simple conversion
        console.log(`📄 [DocumentAnalysis] Processing single page: ${pageFiles[0]}`);
        const imageBuffer = await fs.readFile(pageFiles[0]);
        console.log(`📄 [DocumentAnalysis] Single page buffer size: ${imageBuffer.length} bytes`);
        
        const base64String = imageBuffer.toString('base64');
        console.log(`📄 [DocumentAnalysis] Single page base64 length: ${base64String.length} characters`);
        console.log(`📄 [DocumentAnalysis] Single page base64 preview: ${base64String.substring(0, 50)}...`);
        
        // Clean up
        await fs.unlink(pageFiles[0]);
        return base64String;
      } else {
        // Multiple pages - create vertical composite using convert instead of montage
        const compositeFile = `/tmp/pdf_composite_${timestamp}.png`;
        const convertCommand = `convert ${pageFiles.join(' ')} -append "${compositeFile}"`;
        
        console.log(`📄 [DocumentAnalysis] Creating composite image from ${pageFiles.length} pages`);
        console.log(`📄 [DocumentAnalysis] Convert command: ${convertCommand}`);
        
        const { stdout: convertOut, stderr: convertErr } = await execAsync(convertCommand);
        if (convertOut) console.log(`📄 [DocumentAnalysis] Convert stdout: ${convertOut}`);
        if (convertErr) console.log(`📄 [DocumentAnalysis] Convert stderr: ${convertErr}`);
        
        // Verify composite file was created
        const compositeStats = await fs.stat(compositeFile);
        console.log(`📄 [DocumentAnalysis] Composite file created: ${compositeStats.size} bytes`);
        
        const imageBuffer = await fs.readFile(compositeFile);
        console.log(`📄 [DocumentAnalysis] Composite buffer size: ${imageBuffer.length} bytes`);
        
        const base64String = imageBuffer.toString('base64');
        console.log(`📄 [DocumentAnalysis] Composite base64 length: ${base64String.length} characters`);
        console.log(`📄 [DocumentAnalysis] Composite base64 preview: ${base64String.substring(0, 50)}...`);
        
        // Validate base64 format
        if (!base64String.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
          console.error(`📄 [DocumentAnalysis] Invalid base64 format detected in composite`);
          console.error(`📄 [DocumentAnalysis] Invalid characters found in base64 string`);
          throw new Error('Generated base64 string contains invalid characters');
        }
        
        console.log(`📄 [DocumentAnalysis] Base64 validation passed for composite image`);
        
        // Clean up all files
        await fs.unlink(compositeFile);
        for (const file of pageFiles) {
          await fs.unlink(file);
        }
        
        return base64String;
      }
      
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
    console.log(`📄 [DocumentAnalysis] Base64 prefix: ${imageBase64.substring(0, 100)}...`);
    
    // Clean and validate base64 format
    let cleanBase64 = imageBase64;
    
    // Remove data URL prefix if present
    if (imageBase64.startsWith('data:image/')) {
      const base64Index = imageBase64.indexOf('base64,');
      if (base64Index !== -1) {
        cleanBase64 = imageBase64.substring(base64Index + 7);
        console.log(`📄 [DocumentAnalysis] Stripped data URL prefix, new length: ${cleanBase64.length}`);
      }
    }
    
    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      console.error(`📄 [DocumentAnalysis] Invalid base64 format - contains invalid characters`);
      console.error(`📄 [DocumentAnalysis] First 200 chars: ${cleanBase64.substring(0, 200)}`);
      throw new Error('Base64 string validation failed - invalid characters detected');
    }
    
    // Additional validation - check for minimum length
    if (cleanBase64.length < 100) {
      console.error(`📄 [DocumentAnalysis] Base64 string too short: ${cleanBase64.length} characters`);
      throw new Error('Base64 string too short to be valid image data');
    }
    
    console.log(`📄 [DocumentAnalysis] Base64 validation passed - ${cleanBase64.length} characters`);

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
      console.log(`📄 [DocumentAnalysis] Making OpenAI API call with clean base64...`);
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
                  url: `data:image/png;base64,${cleanBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 20000
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

  /**
   * Trigger chart processing for completed documents
   */
  private async triggerChartProcessing(attachmentId: number): Promise<void> {
    console.log(`📄 [DocumentAnalysis] Triggering chart processing for attachment ${attachmentId}`);
    
    try {
      // Process in background to avoid blocking document analysis
      await attachmentChartProcessor.processCompletedAttachment(attachmentId);
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Chart processing error for attachment ${attachmentId}:`, error);
      // Don't re-throw - chart processing failures shouldn't break document analysis
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();