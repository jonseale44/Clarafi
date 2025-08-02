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
import { eq, and, sql } from "drizzle-orm";
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
    // Use Drizzle query builder which handles camelCase to snake_case conversion
    const existingQueue = await db
      .select({
        id: documentProcessingQueue.id,
        attachmentId: documentProcessingQueue.attachmentId,
        status: documentProcessingQueue.status
      })
      .from(documentProcessingQueue)
      .where(eq(documentProcessingQueue.attachmentId, attachmentId))
      .limit(1);
    
    const existingQueueItem = existingQueue[0];

    const [existingContent] = await db
      .select()
      .from(attachmentExtractedContent)
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));

    // Add to queue using Drizzle query builder
    await db.insert(documentProcessingQueue).values({
      attachmentId: attachmentId,
      status: 'queued',
      attempts: 0,
      processorType: 'document_analysis'
    });

    // Create processing record using Drizzle query builder
    await db.insert(attachmentExtractedContent).values({
      attachmentId: attachmentId,
      processingStatus: 'pending',
      contentType: 'document'
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

      if (attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf") {
        console.log(`📄 [DocumentAnalysis] Processing ${attachment.mimeType} file`);
        const base64Images = await this.extractPageImages(attachment.filePath, attachment.mimeType);
        
        if (base64Images.length === 1) {
          console.log(`📄 [DocumentAnalysis] Single page processing`);
          result = await this.analyzeWithGPT(base64Images[0], attachment.originalFileName);
        } else {
          console.log(`📄 [DocumentAnalysis] Multi-page processing (${base64Images.length} pages)`);
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
      console.log(`🔥 [DEBUG] IMAGING WORKFLOW - About to trigger chart processing that includes imaging extraction`);
      console.log(`🔥 [DEBUG] IMAGING WORKFLOW - This will process 8 sections in parallel: vitals + medical problems + surgical history + family history + social history + allergies + medications + imaging`);

      // Wait for chart processing to complete and handle errors properly
      try {
        await this.triggerChartProcessing(attachmentId);
        console.log(
          `📄 [DocumentAnalysis] ✅ Chart processing completed successfully for attachment ${attachmentId}`,
        );
      } catch (chartError) {
        console.error(
          `📄 [DocumentAnalysis] ❌ Chart processing failed for attachment ${attachmentId}:`,
          chartError,
        );
        console.error(
          `📄 [DocumentAnalysis] ❌ Chart processing error stack:`,
          chartError.stack,
        );
        // Don't throw - document analysis was successful even if chart processing failed
      }
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
        })
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));
    }
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(filePath: string): Promise<string> {
    console.log(`📄 [DocumentAnalysis] Converting single image to base64: ${filePath}`);

    try {
      await fs.access(filePath);

      const imageBuffer = await sharp(filePath)
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 95 })
        .toBuffer();

      const base64String = imageBuffer.toString("base64");
      console.log(`📄 [DocumentAnalysis] Single image base64 length: ${base64String.length} characters`);

      if (base64String.length === 0) {
        throw new Error("Generated base64 string is empty");
      }

      return base64String;
    } catch (error) {
      console.error(`📄 [DocumentAnalysis] Single image conversion failed:`, error);
      throw new Error(
        `Failed to convert image to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Clean up temporary files with error handling
   */
  private async cleanupTempFiles(filePattern: string): Promise<void> {
    try {
      const { stdout } = await execAsync(`ls -1 ${filePattern} 2>/dev/null || echo ""`);
      const files = stdout.trim().split('\n').filter(f => f.length > 0);
      
      for (const file of files) {
        try {
          await fs.unlink(file);
        } catch (unlinkError) {
          console.warn(`📄 [DocumentAnalysis] Failed to clean up temp file ${file}:`, unlinkError);
        }
      }
    } catch (error) {
      console.warn(`📄 [DocumentAnalysis] Failed to list temp files for cleanup:`, error);
    }
  }

  /**
   * Extract pages from documents (PDF or multi-page images) to base64 images
   * Unified function that handles both PDFs and multi-page PNGs
   */
  private async extractPageImages(filePath: string, mimeType: string): Promise<string[]> {
    console.log(`📄 [DocumentAnalysis] === EXTRACT PAGE IMAGES START ===`);
    console.log(`📄 [DocumentAnalysis] Environment: ${process.env.NODE_ENV}`);
    console.log(`📄 [DocumentAnalysis] Input file: ${filePath}`);
    console.log(`📄 [DocumentAnalysis] MIME type: ${mimeType}`);

    // Generate UUID-based temp directory to avoid collisions
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempPattern = `/tmp/page_extract_${sessionId}*`;

    try {
      // Verify file exists and is readable
      try {
        await fs.access(filePath, fs.constants.R_OK);
        const stats = await fs.stat(filePath);
        console.log(`📄 [DocumentAnalysis] ✅ File exists and is readable`);
        console.log(`📄 [DocumentAnalysis] File size: ${stats.size} bytes`);
      } catch (accessError) {
        console.error(`📄 [DocumentAnalysis] ❌ File access error:`, accessError);
        throw new Error(`Cannot access file at ${filePath}: ${accessError.message}`);
      }

      let command: string;
      let expectedExtension: string;
      
      if (mimeType === "application/pdf") {
        // Use pdftoppm for PDFs (most reliable)
        const outputPrefix = `/tmp/page_extract_${sessionId}`;
        command = `pdftoppm -jpeg -r 150 "${filePath}" "${outputPrefix}"`;
        expectedExtension = ".jpg";
        console.log(`📄 [DocumentAnalysis] === PDF PROCESSING ===`);
        console.log(`📄 [DocumentAnalysis] Command: ${command}`);
        
        // Test if pdftoppm is available in production
        if (process.env.NODE_ENV === 'production') {
          console.log(`📄 [DocumentAnalysis] PRODUCTION: Checking pdftoppm availability...`);
          try {
            const { stdout: whichOutput } = await execAsync(`which pdftoppm`);
            console.log(`📄 [DocumentAnalysis] ✅ pdftoppm found at: ${whichOutput.trim()}`);
            
            const { stdout: versionOutput } = await execAsync(`pdftoppm -v 2>&1 || echo "version check failed"`);
            console.log(`📄 [DocumentAnalysis] pdftoppm version: ${versionOutput.trim()}`);
          } catch (whichError) {
            console.error(`📄 [DocumentAnalysis] ❌ pdftoppm not found in PATH!`);
            console.error(`📄 [DocumentAnalysis] Error:`, whichError);
            throw new Error(`pdftoppm is not installed or not in PATH`);
          }
        }
      } else {
        // Use ImageMagick convert for multi-page images
        const outputPrefix = `/tmp/page_extract_${sessionId}`;
        command = `convert "${filePath}" "${outputPrefix}_%d.png"`;
        expectedExtension = ".png";
        console.log(`📄 [DocumentAnalysis] === IMAGE PROCESSING ===`);
        console.log(`📄 [DocumentAnalysis] Command: ${command}`);
      }

      console.log(`📄 [DocumentAnalysis] Executing command...`);
      let stdout: string;
      let stderr: string;
      
      try {
        const result = await execAsync(command);
        stdout = result.stdout;
        stderr = result.stderr;
        console.log(`📄 [DocumentAnalysis] ✅ Command executed successfully`);
        if (stdout) console.log(`📄 [DocumentAnalysis] Command stdout: ${stdout}`);
        if (stderr) console.log(`📄 [DocumentAnalysis] Command stderr: ${stderr}`);
      } catch (execError) {
        console.error(`📄 [DocumentAnalysis] ❌ Command execution failed!`);
        console.error(`📄 [DocumentAnalysis] Exit code:`, execError.code);
        console.error(`📄 [DocumentAnalysis] Error message:`, execError.message);
        console.error(`📄 [DocumentAnalysis] Stderr:`, execError.stderr);
        console.error(`📄 [DocumentAnalysis] Stdout:`, execError.stdout);
        
        if (process.env.NODE_ENV === 'production' && mimeType === "application/pdf") {
          console.error(`📄 [DocumentAnalysis] === PRODUCTION PDF PROCESSING FAILURE ===`);
          console.error(`📄 [DocumentAnalysis] This suggests pdftoppm is not available in AWS App Runner`);
          console.error(`📄 [DocumentAnalysis] Consider using alternative PDF processing method`);
        }
        
        throw new Error(`Command execution failed: ${execError.message}`);
      }

      // Find all generated pages
      const listPattern = mimeType === "application/pdf" 
        ? `/tmp/page_extract_${sessionId}*.jpg`
        : `/tmp/page_extract_${sessionId}_*.png`;
      
      const { stdout: lsOutput } = await execAsync(`ls -1 ${listPattern} 2>/dev/null || echo ""`);
      const pageFiles = lsOutput.trim().split('\n').filter(f => f.length > 0);

      if (pageFiles.length === 0) {
        console.log(`📄 [DocumentAnalysis] ⚠️ No pages extracted from command`);
        
        // For PDFs in production, try fallback method
        if (mimeType === "application/pdf" && process.env.NODE_ENV === 'production') {
          console.log(`📄 [DocumentAnalysis] === PRODUCTION PDF FALLBACK ===`);
          console.log(`📄 [DocumentAnalysis] Attempting to process PDF as image directly with sharp`);
          
          try {
            // Try to convert PDF directly to image using sharp
            // Note: This requires sharp to be built with PDF support
            const pdfBuffer = await fs.readFile(filePath);
            const imageBuffer = await sharp(pdfBuffer, { pages: -1 })
              .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 95 })
              .toBuffer();
            
            const base64String = imageBuffer.toString('base64');
            console.log(`📄 [DocumentAnalysis] ✅ Sharp PDF fallback successful`);
            console.log(`📄 [DocumentAnalysis] Base64 length: ${base64String.length} characters`);
            return [base64String];
          } catch (sharpError) {
            console.error(`📄 [DocumentAnalysis] ❌ Sharp PDF fallback failed:`, sharpError);
            console.error(`📄 [DocumentAnalysis] This PDF cannot be processed without pdftoppm`);
            throw new Error(`PDF processing failed: pdftoppm not available and sharp fallback failed`);
          }
        }
        
        // For images, fallback to single page processing
        if (mimeType.startsWith("image/")) {
          console.log(`📄 [DocumentAnalysis] No multiple pages found, processing as single image`);
          return [await this.imageToBase64(filePath)];
        }
        
        throw new Error(`No pages extracted from ${mimeType} file`);
      }

      console.log(`📄 [DocumentAnalysis] Found ${pageFiles.length} pages: ${pageFiles.join(", ")}`);

      const base64Images: string[] = [];
      
      try {
        for (let i = 0; i < pageFiles.length; i++) {
          const pageFile = pageFiles[i];
          
          // Use consistent sizing: 2048x2048 for single page, 3000x3000 for multi-page
          const maxSize = pageFiles.length === 1 ? 2048 : 3000;
          
          const imageBuffer = await sharp(pageFile)
            .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 95 })
            .toBuffer();
          
          const base64String = imageBuffer.toString('base64');
          console.log(`📄 [DocumentAnalysis] Page ${i + 1} base64 length: ${base64String.length} characters`);
          
          if (pageFiles.length === 1) {
            console.log(`📄 [DocumentAnalysis] Token efficiency: ${base64String.length < 500000 ? "✅ GOOD" : "⚠️ HIGH"} (target: <500K chars)`);
          }
          
          base64Images.push(base64String);
        }
        
        return base64Images;
        
      } finally {
        // Always clean up temp files
        await this.cleanupTempFiles(tempPattern);
      }
      
    } catch (error) {
      // Ensure cleanup on error
      await this.cleanupTempFiles(tempPattern);
      
      console.error(`📄 [DocumentAnalysis] Page extraction failed:`, error);
      
      // For images, try fallback to single page processing
      if (mimeType.startsWith("image/")) {
        console.log(`📄 [DocumentAnalysis] Attempting fallback to single image processing`);
        try {
          return [await this.imageToBase64(filePath)];
        } catch (fallbackError) {
          console.error(`📄 [DocumentAnalysis] Fallback also failed:`, fallbackError);
        }
      }
      
      throw new Error(
        `Failed to extract pages from ${mimeType}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Analyze multiple pages with GPT-4.1-mini Vision in parallel
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
   * Analyze single page with GPT-4.1-mini Vision
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
    console.log(`📄 [DocumentAnalysis] Calling GPT-4.1-mini Vision for analysis`);
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
        model: "gpt-4.1-mini",
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
        throw new Error("No response from GPT-4.1-mini");
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
      `📄 [DocumentAnalysis] 🚀 STARTING CHART PROCESSING TRIGGER for attachment ${attachmentId}`,
    );
    console.log(
      `🔥 [CHART WORKFLOW] ============= STARTING CHART PROCESSING WORKFLOW =============`,
    );
    console.log(`🔥 [IMAGING WORKFLOW DEBUG] About to call AttachmentChartProcessor.processCompletedAttachment(${attachmentId}) - this WILL trigger imaging processing`);

    try {
      // Process chart data extraction with detailed error handling
      console.log(`📄 [DocumentAnalysis] 📋 Calling AttachmentChartProcessor.processCompletedAttachment(${attachmentId})`);
      await attachmentChartProcessor.processCompletedAttachment(attachmentId);
      console.log(`📄 [DocumentAnalysis] ✅ Chart processing completed successfully for attachment ${attachmentId}`);
      console.log(
        `🔥 [CHART WORKFLOW] ============= CHART PROCESSING WORKFLOW COMPLETE =============`,
      );
    } catch (error) {
      console.error(
        `📄 [DocumentAnalysis] ❌ CRITICAL: Chart processing failed for attachment ${attachmentId}`,
        error,
      );
      console.error(
        `📄 [DocumentAnalysis] ❌ Error details:`,
        {
          message: error.message,
          stack: error.stack,
          attachmentId: attachmentId,
        },
      );
      console.log(
        `🔥 [CHART WORKFLOW] ============= CHART PROCESSING WORKFLOW FAILED =============`,
      );
      throw error; // Re-throw to handle in caller
    }
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();
