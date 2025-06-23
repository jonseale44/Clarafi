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
  patientAttachments,
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
    console.log(
      `🔥 [ANALYSIS WORKFLOW] ============= STARTING DOCUMENT ANALYSIS =============`,
    );
    console.log(
      `📄 [DocumentAnalysis] Queuing attachment ${attachmentId} for processing`,
    );

    // Check if already queued or processed (skip check for reprocessing)
    const [existingQueue] = await db
      .select()
      .from(documentProcessingQueue)
      .where(eq(documentProcessingQueue.attachmentId, attachmentId));

    const [existingContent] = await db
      .select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

    // Add to queue
    await db.insert(documentProcessingQueue).values({
      attachmentId,
      status: "queued",
    });

    // Create processing record
    await db.insert(attachmentExtractedContent).values({
      attachmentId,
      processingStatus: "pending",
    });

    console.log(
      `📄 [DocumentAnalysis] Attachment ${attachmentId} queued for processing`,
    );

    // Process immediately in background
    this.processDocument(attachmentId).catch((error) => {
      console.error(
        `📄 [DocumentAnalysis] Background processing failed for attachment ${attachmentId}:`,
        error,
      );
    });
  }

  /**
   * Process a single document
   */
  async processDocument(attachmentId: number): Promise<void> {
    console.log(
      `📄 [DocumentAnalysis] Starting processing for attachment ${attachmentId}`,
    );

    try {
      // Update status to processing
      await db
        .update(documentProcessingQueue)
        .set({
          status: "processing",
          lastAttempt: new Date(),
        })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));

      await db
        .update(attachmentExtractedContent)
        .set({ processingStatus: "processing" })
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      // Get attachment details
      const [attachment] = await db
        .select()
        .from(patientAttachments)
        .where(eq(patientAttachments.id, attachmentId));

      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }

      console.log(
        `📄 [DocumentAnalysis] Processing ${attachment.originalFileName} (${attachment.mimeType})`,
      );
      console.log(`📄 [DocumentAnalysis] File path: ${attachment.filePath}`);

      let result: {
        extractedText: string;
        title: string;
        documentType: string;
        summary: string;
      };

      if (attachment.mimeType.startsWith("image/")) {
        console.log(`📄 [DocumentAnalysis] Processing as image file (checking for multi-page)`);
        const base64Images = await this.multiPagePngToBase64Images(attachment.filePath);
        
        if (base64Images.length === 1) {
          console.log(`📄 [DocumentAnalysis] Single page image processing`);
          result = await this.analyzeWithGPT(base64Images[0], attachment.originalFileName);
        } else {
          console.log(`📄 [DocumentAnalysis] Multi-page image processing (${base64Images.length} pages)`);
          result = await this.analyzeMultiplePagesWithGPT(base64Images, attachment.originalFileName);
        }
      } else if (attachment.mimeType === "application/pdf") {
        console.log(`📄 [DocumentAnalysis] Processing as PDF file (page-by-page)`);
        const base64Images = await this.pdfToBase64Images(attachment.filePath);
        
        if (base64Images.length === 1) {
          console.log(`📄 [DocumentAnalysis] Single page PDF processing`);
          result = await this.analyzeWithGPT(base64Images[0], attachment.originalFileName);
        } else {
          console.log(`📄 [DocumentAnalysis] Multi-page PDF processing (${base64Images.length} pages)`);
          result = await this.analyzeMultiplePagesWithGPT(base64Images, attachment.originalFileName);
        }
      } else {
        throw new Error(`Unsupported file type: ${attachment.mimeType}`);
      }

      console.log(`📄 [DocumentAnalysis] ✅ Document processing complete`);

      // Save results
      console.log(
        `📄 [DocumentAnalysis] 💾 Saving extraction results to database`,
      );
      await db
        .update(attachmentExtractedContent)
        .set({
          extractedText: result.extractedText,
          aiGeneratedTitle: result.title,
          documentType: result.documentType,
          processingStatus: "completed",
          processedAt: new Date(),
        })
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      await db
        .update(documentProcessingQueue)
        .set({ status: "completed" })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));

      console.log(
        `📄 [DocumentAnalysis] ✅ Successfully processed attachment ${attachmentId}`,
      );
      console.log(
        `📄 [DocumentAnalysis] ✅ Extracted text length: ${result.extractedText?.length || 0} characters`,
      );
      console.log(
        `📄 [DocumentAnalysis] ✅ Document type: ${result.documentType}`,
      );
      console.log(`📄 [DocumentAnalysis] ✅ AI title: ${result.title}`);

      // Trigger chart processing for completed documents
      console.log(
        `📄 [DocumentAnalysis] 🔄 Triggering chart processing for attachment ${attachmentId}`,
      );
      console.log(
        `🔥 [ANALYSIS WORKFLOW] ============= DOCUMENT ANALYSIS COMPLETE =============`,
      );
      console.log(
        `📄 [DocumentAnalysis] ✅ Starting transition to chart processing workflow`,
      );

      this.triggerChartProcessing(attachmentId).catch((error) => {
        console.error(
          `📄 [DocumentAnalysis] ❌ Chart processing failed for attachment ${attachmentId}:`,
          error,
        );
      });
    } catch (error) {
      console.error(
        `📄 [DocumentAnalysis] Processing failed for attachment ${attachmentId}:`,
        error,
      );

      // Update failure status
      await db
        .update(attachmentExtractedContent)
        .set({
          processingStatus: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

      // Increment attempts
      const [currentQueue] = await db
        .select()
        .from(documentProcessingQueue)
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));

      await db
        .update(documentProcessingQueue)
        .set({
          status: "failed",
          attempts: (currentQueue?.attempts || 0) + 1,
          lastAttempt: new Date(),
        })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));
    }
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(filePath: string): Promise<string> {
    console.log(
      `📄 [DocumentAnalysis] Converting image to base64: ${filePath}`,
    );

    try {
      // Check if file exists
      await fs.access(filePath);

      const imageBuffer = await sharp(filePath)
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 95 })
        .toBuffer();

      const base64String = imageBuffer.toString("base64");
      console.log(
        `📄 [DocumentAnalysis] Image converted to base64, length: ${base64String.length} characters`,
      );

      // Validate base64 string
      if (base64String.length === 0) {
        throw new Error("Generated base64 string is empty");
      }

      // Test base64 validity
      const testBuffer = Buffer.from(base64String, "base64");
      if (testBuffer.length === 0) {
        throw new Error("Invalid base64 string generated");
      }

      return base64String;
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Image conversion failed:`, error);
      throw new Error(
        `Failed to convert image to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Convert multi-page PNG to individual page base64 images
   */
  private async multiPagePngToBase64Images(filePath: string): Promise<string[]> {
    console.log(`📄 [DocumentAnalysis] Processing multi-page PNG: ${filePath}`);
    
    try {
      await fs.access(filePath);
      
      // Use ImageMagick to extract all pages from PNG
      const timestamp = Date.now();
      const outputPrefix = `/tmp/png_page_${timestamp}`;
      
      // Extract all pages from multi-page PNG
      const command = `convert "${filePath}" "${outputPrefix}_%d.png"`;
      console.log(`📄 [DocumentAnalysis] Extracting PNG pages: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stderr.includes('Warning')) {
        console.log(`📄 [DocumentAnalysis] ImageMagick stderr: ${stderr}`);
      }
      
      // Find all generated pages
      const { stdout: lsOutput } = await execAsync(`ls -1 /tmp/png_page_${timestamp}_*.png 2>/dev/null || echo ""`);
      const pageFiles = lsOutput.trim().split('\n').filter(f => f.length > 0);
      
      if (pageFiles.length === 0) {
        // Fallback to single page processing
        console.log(`📄 [DocumentAnalysis] No multiple pages found, processing as single PNG`);
        return [await this.imageToBase64(filePath)];
      }
      
      console.log(`📄 [DocumentAnalysis] Found ${pageFiles.length} PNG pages: ${pageFiles.join(', ')}`);
      
      // Process each page with high quality
      const base64Images: string[] = [];
      for (const pageFile of pageFiles) {
        const imageBuffer = await sharp(pageFile)
          .resize(3000, 3000, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 95 })
          .toBuffer();
        
        const base64String = imageBuffer.toString('base64');
        console.log(`📄 [DocumentAnalysis] PNG page base64 length: ${base64String.length} characters`);
        base64Images.push(base64String);
        
        // Clean up page file
        await fs.unlink(pageFile);
      }
      
      return base64Images;
      
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Multi-page PNG processing failed:`, error);
      // Fallback to single page processing
      return [await this.imageToBase64(filePath)];
    }
  }

  /**
   * Convert PDF to individual page base64 images (parallel processing)
   */
  private async pdfToBase64Images(filePath: string): Promise<string[]> {
    console.log(`📄 [DocumentAnalysis] Converting PDF to image: ${filePath}`);

    try {
      // Check if PDF file exists
      await fs.access(filePath);
      console.log(
        `📄 [DocumentAnalysis] PDF file exists, proceeding with direct pdftoppm conversion`,
      );

      // Use pdftoppm directly since it's the most reliable method
      const timestamp = Date.now();
      const outputPrefix = `/tmp/pdf_convert_${timestamp}`;

      console.log(`📄 [DocumentAnalysis] Running pdftoppm command...`);
      console.log(`📄 [DocumentAnalysis] Input file: ${filePath}`);
      console.log(`📄 [DocumentAnalysis] Output prefix: ${outputPrefix}`);

      // Convert all pages to high-resolution individual images
      const command = `pdftoppm -jpeg -r 150 "${filePath}" "${outputPrefix}"`;
      console.log(`📄 [DocumentAnalysis] Command: ${command}`);

      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stderr.includes('Warning')) {
        console.log(`📄 [DocumentAnalysis] pdftoppm stderr: ${stderr}`);
      }

      // Find all generated pages
      const { stdout: lsOutput } = await execAsync(
        `ls -1 /tmp/pdf_convert_${timestamp}*.jpg 2>/dev/null || echo ""`,
      );
      const pageFiles = lsOutput
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (pageFiles.length === 0) {
        throw new Error(`No converted pages found for timestamp ${timestamp}`);
      }

      console.log(
        `📄 [DocumentAnalysis] Found ${pageFiles.length} pages: ${pageFiles.join(", ")}`,
      );

      // Combine all pages into a single composite image using ImageMagick
      if (pageFiles.length === 1) {
        // Single page - apply same constraints as PNG processing
        console.log(
          `📄 [DocumentAnalysis] Processing single page: ${pageFiles[0]}`,
        );
        console.log(
          `📄 [DocumentAnalysis] Applying PNG-equivalent size constraints`,
        );
        const imageBuffer = await sharp(pageFiles[0])
          .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 95 })
          .toBuffer();

        const base64String = imageBuffer.toString("base64");
        console.log(
          `📄 [DocumentAnalysis] Single page base64 length: ${base64String.length} characters`,
        );
        console.log(
          `📄 [DocumentAnalysis] Estimated Vision API tokens: ~${Math.ceil(base64String.length / 4)}`,
        );
        console.log(
          `📄 [DocumentAnalysis] Token efficiency: ${base64String.length < 500000 ? "✅ GOOD" : "⚠️ HIGH"} (target: <500K chars)`,
        );

        // Clean up
        await fs.unlink(pageFiles[0]);
        return [base64String];
      } else {
        // Process each page with high quality (no composite)
        const base64Images: string[] = [];
        for (const pageFile of pageFiles) {
          const imageBuffer = await sharp(pageFile)
            .resize(3000, 3000, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 95 })
            .toBuffer();
          
          const base64String = imageBuffer.toString('base64');
          console.log(`📄 [DocumentAnalysis] PDF page base64 length: ${base64String.length} characters`);
          base64Images.push(base64String);
          
          // Clean up page file
          await fs.unlink(pageFile);
        }
        
        return base64Images;

      }
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] PDF conversion failed:`, error);
      console.error(`📄 [DocumentAnalysis] Error details:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(
        `Failed to convert PDF to image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Analyze multiple pages with GPT-4.1 Vision in parallel
   */
  private async analyzeMultiplePagesWithGPT(base64Images: string[], originalFileName: string): Promise<{
    extractedText: string;
    title: string;
    documentType: string;
    summary: string;
  }> {
    console.log(`📄 [DocumentAnalysis] Analyzing ${base64Images.length} pages in parallel`);
    
    // Process all pages in parallel
    const pagePromises = base64Images.map(async (imageBase64, index) => {
      console.log(`📄 [DocumentAnalysis] 🤖 Processing page ${index + 1}/${base64Images.length}`);
      return await this.analyzeWithGPT(imageBase64, `${originalFileName} - Page ${index + 1}`);
    });
    
    const pageResults = await Promise.all(pagePromises);
    console.log(`📄 [DocumentAnalysis] ✅ All ${pageResults.length} pages processed`);
    
    // Combine results
    const combinedText = pageResults.map((result, index) => 
      `=== PAGE ${index + 1} ===\n\n${result.extractedText}`
    ).join('\n\n');
    
    // Use first page for title and document type, or combine summaries
    const firstPage = pageResults[0];
    const combinedSummary = pageResults.map(result => result.summary).join(' ');
    
    return {
      extractedText: combinedText,
      title: firstPage.title,
      documentType: firstPage.documentType,
      summary: combinedSummary.length > 500 ? combinedSummary.substring(0, 497) + '...' : combinedSummary
    };
  }

  /**
   * Analyze single page with GPT-4.1 Vision
   */
  private async analyzeWithGPT(
    imageBase64: string,
    originalFileName: string,
  ): Promise<{
    extractedText: string;
    title: string;
    documentType: string;
    summary: string;
  }> {
    console.log(`📄 [DocumentAnalysis] Calling GPT-4.1 Vision for analysis`);
    console.log(
      `📄 [DocumentAnalysis] Base64 string length: ${imageBase64.length}`,
    );
    console.log(
      `📄 [DocumentAnalysis] Base64 prefix: ${imageBase64.substring(0, 100)}...`,
    );

    // Clean and validate base64 format
    let cleanBase64 = imageBase64;

    // Remove data URL prefix if present
    if (imageBase64.startsWith("data:image/")) {
      const base64Index = imageBase64.indexOf("base64,");
      if (base64Index !== -1) {
        cleanBase64 = imageBase64.substring(base64Index + 7);
        console.log(
          `📄 [DocumentAnalysis] Stripped data URL prefix, new length: ${cleanBase64.length}`,
        );
      }
    }

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      console.error(
        `📄 [DocumentAnalysis] Invalid base64 format - contains invalid characters`,
      );
      console.error(
        `📄 [DocumentAnalysis] First 200 chars: ${cleanBase64.substring(0, 200)}`,
      );
      throw new Error(
        "Base64 string validation failed - invalid characters detected",
      );
    }

    // Additional validation - check for minimum length
    if (cleanBase64.length < 100) {
      console.error(
        `📄 [DocumentAnalysis] Base64 string too short: ${cleanBase64.length} characters`,
      );
      throw new Error("Base64 string too short to be valid image data");
    }

    console.log(
      `📄 [DocumentAnalysis] Base64 validation passed - ${cleanBase64.length} characters`,
    );

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
      console.log(
        `📄 [DocumentAnalysis] Making OpenAI API call with clean base64...`,
      );
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${cleanBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.0,
        max_tokens: 30000,
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
      console.log(
        `📄 [DocumentAnalysis] Detected document type: ${result.documentType}`,
      );
      console.log(`📄 [DocumentAnalysis] Generated title: ${result.title}`);

      return {
        extractedText: result.extractedText || "",
        title: result.title || originalFileName,
        documentType: result.documentType || "other",
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
    const [content] = await db
      .select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

    return content || null;
  }

  /**
   * Process queue - run periodically to handle failed items
   */
  async processQueue(): Promise<void> {
    const queueItems = await db
      .select()
      .from(documentProcessingQueue)
      .where(and(eq(documentProcessingQueue.status, "queued")));

    console.log(
      `📄 [DocumentAnalysis] Found ${queueItems.length} items in queue to process`,
    );

    for (const item of queueItems) {
      console.log(
        `📄 [DocumentAnalysis] Processing queued item: attachment ${item.attachmentId}`,
      );
      await this.processDocument(item.attachmentId);
    }
  }

  /**
   * Manually trigger processing for testing
   */
  async reprocessDocument(attachmentId: number): Promise<void> {
    console.log(
      `📄 [DocumentAnalysis] Manually reprocessing attachment ${attachmentId}`,
    );

    // Force process regardless of current status
    try {
      await this.processDocument(attachmentId);
      console.log(
        `📄 [DocumentAnalysis] Manual reprocessing completed for attachment ${attachmentId}`,
      );
    } catch (error) {
      console.error(
        `📄 [DocumentAnalysis] Manual reprocessing failed for attachment ${attachmentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Trigger chart processing for completed documents
   */
  private async triggerChartProcessing(attachmentId: number): Promise<void> {
    console.log(
      `📄 [DocumentAnalysis] Triggering chart processing for attachment ${attachmentId}`,
    );

    try {
      // Process in background to avoid blocking document analysis
      await attachmentChartProcessor.processCompletedAttachment(attachmentId);
    } catch (error) {
      console.error(
        `📄 [DocumentAnalysis] Chart processing error for attachment ${attachmentId}:`,
        error,
      );
      // Don't re-throw - chart processing failures shouldn't break document analysis
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();
