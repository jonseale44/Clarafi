import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs/promises";
import { db } from "./db.js";
import { patientAttachments, insertPatientAttachmentSchema, attachmentExtractedContent, documentProcessingQueue, vitals, medicalProblems } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { documentAnalysisService } from "./document-analysis-service.js";
import { getUploadsDir } from "./utils/paths.js";

// Dynamic imports for path module to avoid bundling issues
const getPathModule = async () => {
  const pathModule = await import("path");
  return pathModule.default;
};

const router = Router();

// Production EMR file handling standards:
// - Epic/Athena typically allow up to 100MB for medical documents
// - Support PDF, JPEG, PNG, TIFF, DICOM
// - Store files with encrypted names for security
// - Generate thumbnails for quick preview
// - Virus scanning integration points

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = getUploadsDir('attachments');
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: async (req, file, cb) => {
    // Generate secure filename: hash + timestamp + extension
    const path = await getPathModule();
    const hash = createHash('md5').update(file.originalname + Date.now()).digest('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${hash}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (Epic/Athena standard)
  },
  fileFilter: (req, file, cb) => {
    // Production EMR supported formats
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/tiff',
      'image/gif',
      'application/dicom', // Medical imaging
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Supported formats: PDF, Images (JPEG, PNG, TIFF), DICOM, DOC, DOCX, TXT`));
    }
  }
});

// Generate thumbnail for images and PDFs
async function generateThumbnail(filePath: string, mimeType: string): Promise<string | null> {
  try {
    const path = await getPathModule();
    const thumbnailsDir = getUploadsDir('thumbnails');
    await fs.mkdir(thumbnailsDir, { recursive: true });
    
    const filename = path.basename(filePath, path.extname(filePath));
    const thumbnailPath = path.join(thumbnailsDir, `${filename}_thumb.jpg`);
    
    if (mimeType.startsWith('image/')) {
      await sharp(filePath)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      return thumbnailPath;
    }
    
    // For PDFs, would need PDF-to-image conversion (placeholder for now)
    if (mimeType === 'application/pdf') {
      // In production, use pdf2pic or similar library
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}

// Upload single attachment
router.post('/:patientId/attachments', upload.single('file'), async (req: Request, res: Response) => {
  console.log('🔥 [UPLOAD WORKFLOW] ============= STARTING ATTACHMENT UPLOAD =============');
  console.log('📎 [AttachmentUpload] Single upload request received');
  console.log('📎 [AttachmentUpload] Patient ID:', req.params.patientId);
  console.log('📎 [AttachmentUpload] Auth status:', !!req.isAuthenticated?.());
  console.log('📎 [AttachmentUpload] User:', req.user?.id);
  console.log('📎 [AttachmentUpload] File info:', req.file ? {
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  } : 'No file');
  console.log('📎 [AttachmentUpload] Request body:', req.body);
  
  try {
    if (!req.isAuthenticated()) {
      console.log('📎 [Backend] Authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      console.log('📎 [Backend] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const patientId = parseInt(req.params.patientId);
    const { title, description, encounterId, isConfidential } = req.body;
    
    // Calculate file hash for duplicate detection
    console.log('📎 [AttachmentUpload] Calculating file hash for duplicate detection...');
    const hash = createHash('sha256');
    const stream = createReadStream(req.file.path);
    
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
    const contentHash = hash.digest('hex');
    console.log(`📎 [AttachmentUpload] File hash calculated: ${contentHash}`);
    
    // Check for existing attachment with same hash for this patient
    console.log(`📎 [AttachmentUpload] Checking for duplicate files for patient ${patientId}...`);
    const existingAttachment = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.patientId, patientId),
        eq(patientAttachments.contentHash, contentHash)
      ))
      .limit(1);
    
    if (existingAttachment.length > 0) {
      console.log(`📎 [AttachmentUpload] ⚠️ Duplicate file detected! Returning existing attachment ID: ${existingAttachment[0].id}`);
      console.log(`📎 [AttachmentUpload] Existing file details:`, {
        id: existingAttachment[0].id,
        originalFileName: existingAttachment[0].originalFileName,
        uploadedAt: existingAttachment[0].createdAt
      });
      
      // Clean up the newly uploaded duplicate file
      try {
        await fs.unlink(req.file.path);
        console.log('📎 [AttachmentUpload] ✅ Duplicate file cleaned up');
      } catch (error) {
        console.error('📎 [AttachmentUpload] ❌ Failed to clean up duplicate file:', error);
      }
      
      // Return the existing attachment
      return res.status(200).json({
        ...existingAttachment[0],
        isDuplicate: true,
        message: 'This file has already been uploaded for this patient'
      });
    }
    
    console.log('📎 [AttachmentUpload] ✅ No duplicate found, proceeding with upload');
    
    // Generate thumbnail if applicable
    const thumbnailPath = await generateThumbnail(req.file.path, req.file.mimetype);
    
    const attachmentData = {
      patientId,
      encounterId: encounterId ? parseInt(encounterId) : undefined,
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileExtension: path.extname(req.file.originalname).toLowerCase(),
      filePath: req.file.path,
      thumbnailPath,
      title: title || req.file.originalname,
      description: description || null,
      uploadedBy: req.user!.id,
      isConfidential: isConfidential === 'true',
      category: 'general', // Single category for now as requested
      contentHash: contentHash, // Add the hash to prevent future duplicates
    };

    const validatedData = insertPatientAttachmentSchema.parse(attachmentData);
    const [attachment] = await db.insert(patientAttachments).values(validatedData).returning();

    console.log(`📎 [AttachmentUpload] ✅ File uploaded successfully: ${req.file.originalname} for patient ${patientId}`);
    console.log(`📎 [AttachmentUpload] ✅ Attachment created with ID: ${attachment.id}`);
    console.log(`📎 [AttachmentUpload] ✅ Database record: ${JSON.stringify({
      id: attachment.id,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType
    })}`);
    
    // Queue for document analysis
    try {
      console.log(`📎 [AttachmentUpload] 🔄 Queuing attachment ${attachment.id} for document analysis`);
      await documentAnalysisService.queueDocument(attachment.id);
      console.log(`📎 [AttachmentUpload] ✅ Successfully queued for analysis`);
    } catch (analysisError) {
      console.error('📎 [AttachmentUpload] ❌ Failed to queue document for analysis:', analysisError);
      // Continue - don't fail the upload if analysis queueing fails
    }
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('📎 [AttachmentUpload] ❌ File upload error:', error);
    console.error('📎 [AttachmentUpload] ❌ Error type:', typeof error);
    console.error('📎 [AttachmentUpload] ❌ Error name:', (error as any)?.name);
    console.error('📎 [AttachmentUpload] ❌ Error message:', (error as any)?.message);
    console.error('📎 [AttachmentUpload] ❌ Error stack:', (error as any)?.stack);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('📎 [AttachmentUpload] ❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });
    }
    
    // Clean up file if database insertion fails
    if (req.file) {
      try {
        console.log('📎 [AttachmentUpload] 🗑️ Cleaning up uploaded file:', req.file.path);
        await fs.unlink(req.file.path);
        console.log('📎 [AttachmentUpload] ✅ File cleanup successful');
      } catch (unlinkError) {
        console.error('📎 [AttachmentUpload] ❌ Failed to clean up file:', unlinkError);
      }
    }
    
    // Send detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'File upload failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Upload multiple attachments
router.post('/:patientId/attachments/bulk', upload.array('files', 10), async (req: Request, res: Response) => {
  console.log('🔥 [UPLOAD WORKFLOW] ============= STARTING BULK ATTACHMENT UPLOAD =============');
  console.log('📎 [AttachmentUpload] Patient ID:', req.params.patientId);
  console.log('📎 [AttachmentUpload] Auth status:', !!req.isAuthenticated?.());
  console.log('📎 [AttachmentUpload] User:', req.user?.id);
  console.log('📎 [AttachmentUpload] Files count:', req.files ? (req.files as Express.Multer.File[]).length : 0);
  console.log('📎 [AttachmentUpload] Request body:', req.body);
  
  const uploadedFiles: Express.Multer.File[] = [];
  const createdAttachments: any[] = [];
  
  try {
    if (!req.isAuthenticated()) {
      console.log('📎 [Backend] Authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.log('📎 [AttachmentUpload] ❌ No files provided in bulk upload');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const patientId = parseInt(req.params.patientId);
    const { encounterId, isConfidential, globalDescription } = req.body;
    
    console.log(`📎 [AttachmentUpload] Processing ${files.length} files for patient ${patientId}`);
    
    // Process each file
    for (const file of files) {
      uploadedFiles.push(file);
      
      try {
        // Calculate file hash for duplicate detection
        console.log(`📎 [AttachmentUpload] Calculating hash for ${file.originalname}...`);
        const hash = createHash('sha256');
        const stream = createReadStream(file.path);
        
        await new Promise((resolve, reject) => {
          stream.on('data', (data) => hash.update(data));
          stream.on('end', resolve);
          stream.on('error', reject);
        });
        
        const contentHash = hash.digest('hex');
        console.log(`📎 [AttachmentUpload] Hash calculated: ${contentHash.substring(0, 16)}...`);
        
        // Check for existing attachment with same hash for this patient
        const existingAttachment = await db.select()
          .from(patientAttachments)
          .where(and(
            eq(patientAttachments.patientId, patientId),
            eq(patientAttachments.contentHash, contentHash)
          ))
          .limit(1);
        
        if (existingAttachment.length > 0) {
          console.log(`📎 [AttachmentUpload] ⚠️ Duplicate detected: ${file.originalname} matches existing attachment ID: ${existingAttachment[0].id}`);
          
          // Clean up the duplicate file
          try {
            await fs.unlink(file.path);
            console.log(`📎 [AttachmentUpload] ✅ Duplicate file cleaned up: ${file.originalname}`);
          } catch (error) {
            console.error(`📎 [AttachmentUpload] ❌ Failed to clean up duplicate: ${file.originalname}`, error);
          }
          
          // Add the existing attachment to results with duplicate flag
          createdAttachments.push({
            ...existingAttachment[0],
            isDuplicate: true,
            message: `${file.originalname} was already uploaded`
          });
          
          continue; // Skip to next file
        }
        
        // Generate thumbnail if applicable
        const thumbnailPath = await generateThumbnail(file.path, file.mimetype);
        
        const attachmentData = {
          patientId,
          encounterId: encounterId ? parseInt(encounterId) : undefined,
          fileName: file.filename,
          originalFileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileExtension: path.extname(file.originalname).toLowerCase(),
          filePath: file.path,
          thumbnailPath,
          title: file.originalname, // Use original filename as title for bulk uploads
          description: globalDescription || null,
          uploadedBy: req.user!.id,
          isConfidential: isConfidential === 'true',
          category: 'general',
          contentHash: contentHash, // Add the hash to prevent future duplicates
        };

        const validatedData = insertPatientAttachmentSchema.parse(attachmentData);
        const [attachment] = await db.insert(patientAttachments).values(validatedData).returning();
        
        createdAttachments.push(attachment);
        console.log(`📎 [AttachmentUpload] ✅ File processed: ${file.originalname} -> Attachment ID: ${attachment.id}`);
        console.log(`📎 [AttachmentUpload] File details: ${file.mimetype}, ${file.size} bytes`);
        
        // Queue for document analysis
        try {
          console.log(`📎 [AttachmentUpload] 🔄 Queuing attachment ${attachment.id} for document analysis`);
          await documentAnalysisService.queueDocument(attachment.id);
          console.log(`📎 [AttachmentUpload] ✅ Document analysis queued successfully for ${attachment.id}`);
        } catch (analysisError) {
          console.error(`📎 [AttachmentUpload] ❌ Failed to queue document ${attachment.id} for analysis:`, analysisError);
          // Continue with other files
        }
      } catch (fileError) {
        console.error(`📎 [Backend] Error processing file ${file.originalname}:`, fileError);
        // Clean up this specific file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to clean up file:', unlinkError);
        }
        
        // Continue with other files but track the error
        throw new Error(`Failed to process file: ${file.originalname}`);
      }
    }

    console.log(`🔥 [UPLOAD WORKFLOW] ============= BULK UPLOAD COMPLETE =============`);
    console.log(`📎 [AttachmentUpload] ✅ Successfully uploaded ${createdAttachments.length} files for patient ${patientId}`);
    console.log(`📎 [AttachmentUpload] ✅ All files queued for document analysis`);
    
    res.status(201).json({
      message: `Successfully uploaded ${createdAttachments.length} files`,
      attachments: createdAttachments,
      count: createdAttachments.length
    });
    
  } catch (error) {
    console.error('Bulk file upload error:', error);
    
    // Clean up all uploaded files if any error occurred
    for (const file of uploadedFiles) {
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    
    // Also clean up any created attachments from DB
    if (createdAttachments.length > 0) {
      try {
        const attachmentIds = createdAttachments.map(a => a.id);
        await db.delete(patientAttachments).where(
          and(
            eq(patientAttachments.patientId, parseInt(req.params.patientId)),
            // @ts-ignore - drizzle inArray typing issue
            patientAttachments.id.in?.(attachmentIds)
          )
        );
        console.log('📎 [Backend] Cleaned up partial attachments from DB');
      } catch (cleanupError) {
        console.error('📎 [Backend] Failed to cleanup partial attachments:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Bulk file upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get patient attachments with extracted content
router.get('/:patientId/attachments', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const { encounterId } = req.query;
    
    let query = db.select({
      ...patientAttachments,
      extractedContent: {
        id: attachmentExtractedContent.id,
        extractedText: attachmentExtractedContent.extractedText,
        aiGeneratedTitle: attachmentExtractedContent.aiGeneratedTitle,
        documentType: attachmentExtractedContent.documentType,
        processingStatus: attachmentExtractedContent.processingStatus,
        errorMessage: attachmentExtractedContent.errorMessage,
        processedAt: attachmentExtractedContent.processedAt
      }
    })
    .from(patientAttachments)
    .leftJoin(attachmentExtractedContent, eq(patientAttachments.id, attachmentExtractedContent.attachmentId))
    .where(eq(patientAttachments.patientId, patientId));
    
    if (encounterId) {
      query = query.where(and(
        eq(patientAttachments.patientId, patientId),
        eq(patientAttachments.encounterId, parseInt(encounterId as string))
      ));
    }
    
    const attachments = await query.orderBy(desc(patientAttachments.createdAt));
    
    res.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// Download attachment
router.get('/:patientId/attachments/:attachmentId/download', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const attachmentId = parseInt(req.params.attachmentId);
    
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Check file exists
    try {
      await fs.access(attachment.filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalFileName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    
    // Send file
    const path = await getPathModule();
    res.sendFile(path.resolve(attachment.filePath));
    
    console.log(`📎 [Attachments] File downloaded: ${attachment.originalFileName} by user ${req.user!.id}`);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Get thumbnail
router.get('/:patientId/attachments/:attachmentId/thumbnail', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const attachmentId = parseInt(req.params.attachmentId);
    
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    if (!attachment || !attachment.thumbnailPath) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    try {
      await fs.access(attachment.thumbnailPath);
      const path = await getPathModule();
      res.sendFile(path.resolve(attachment.thumbnailPath));
    } catch {
      return res.status(404).json({ error: 'Thumbnail file not found' });
    }
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ error: 'Thumbnail fetch failed' });
  }
});

// Delete attachment
router.delete('/:patientId/attachments/:attachmentId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const attachmentId = parseInt(req.params.attachmentId);
    
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Delete related records in correct order to avoid foreign key violations
    
    // 1. Delete vitals records that reference this attachment
    await db.delete(vitals).where(eq(vitals.extractedFromAttachmentId, attachmentId));
    
    // 2. Delete medical problems - no direct attachment reference needed
    
    // 3. Delete extracted content
    await db.delete(attachmentExtractedContent).where(eq(attachmentExtractedContent.attachmentId, attachmentId));
    
    // 4. Delete from processing queue
    await db.delete(documentProcessingQueue).where(eq(documentProcessingQueue.attachmentId, attachmentId));

    // Delete from database
    await db.delete(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    // Delete files from disk
    try {
      await fs.unlink(attachment.filePath);
      if (attachment.thumbnailPath) {
        await fs.unlink(attachment.thumbnailPath);
      }
    } catch (error) {
      console.error('File deletion error:', error);
      // Continue - database deletion succeeded
    }
    
    console.log(`📎 [Attachments] File deleted: ${attachment.originalFileName} by user ${req.user!.id}`);
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Delete all attachments for a patient
router.delete('/:patientId/attachments', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const { encounterId } = req.query;
    
    console.log('📎 [Backend] Bulk delete request received');
    console.log('📎 [Backend] Patient ID:', patientId);
    console.log('📎 [Backend] Encounter ID filter:', encounterId);
    console.log('📎 [Backend] User:', req.user!.id);
    
    // Get all attachments to be deleted
    let query = db.select().from(patientAttachments).where(eq(patientAttachments.patientId, patientId));
    
    if (encounterId) {
      query = query.where(and(
        eq(patientAttachments.patientId, patientId),
        eq(patientAttachments.encounterId, parseInt(encounterId as string))
      ));
    }
    
    const attachmentsToDelete = await query;
    
    if (attachmentsToDelete.length === 0) {
      return res.json({ 
        message: 'No attachments found to delete',
        deletedCount: 0 
      });
    }
    
    console.log(`📎 [Backend] Found ${attachmentsToDelete.length} attachments to delete`);
    
    // Delete related records first (foreign key constraints)
    const attachmentIds = attachmentsToDelete.map(a => a.id);
    
    // Delete vitals records that reference these attachments
    for (const attachmentId of attachmentIds) {
      await db.delete(vitals).where(eq(vitals.extractedFromAttachmentId, attachmentId));
    }
    
    // Delete extracted content for all attachment IDs
    for (const attachmentId of attachmentIds) {
      await db.delete(attachmentExtractedContent)
        .where(eq(attachmentExtractedContent.attachmentId, attachmentId));
    }
    
    // Delete processing queue entries for all attachment IDs
    for (const attachmentId of attachmentIds) {
      await db.delete(documentProcessingQueue)
        .where(eq(documentProcessingQueue.attachmentId, attachmentId));
    }
    
    // Delete from database
    let deleteQuery = db.delete(patientAttachments).where(eq(patientAttachments.patientId, patientId));
    
    if (encounterId) {
      deleteQuery = deleteQuery.where(and(
        eq(patientAttachments.patientId, patientId),
        eq(patientAttachments.encounterId, parseInt(encounterId as string))
      ));
    }
    
    await deleteQuery;
    
    // Delete files from disk
    let filesDeleted = 0;
    let fileErrors = 0;
    
    for (const attachment of attachmentsToDelete) {
      try {
        await fs.unlink(attachment.filePath);
        filesDeleted++;
        
        if (attachment.thumbnailPath) {
          try {
            await fs.unlink(attachment.thumbnailPath);
          } catch (thumbError) {
            console.error(`📎 [Backend] Failed to delete thumbnail for ${attachment.originalFileName}:`, thumbError);
          }
        }
      } catch (error) {
        console.error(`📎 [Backend] Failed to delete file ${attachment.originalFileName}:`, error);
        fileErrors++;
      }
    }
    
    console.log(`📎 [Attachments] Bulk delete completed: ${attachmentsToDelete.length} attachments deleted from DB, ${filesDeleted} files deleted from disk, ${fileErrors} file errors by user ${req.user!.id}`);
    
    res.json({ 
      message: `Successfully deleted ${attachmentsToDelete.length} attachments`,
      deletedCount: attachmentsToDelete.length,
      filesDeleted,
      fileErrors
    });
    
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Get extracted content for an attachment
router.get('/:patientId/attachments/:attachmentId/content', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const attachmentId = parseInt(req.params.attachmentId);
    
    // Verify attachment belongs to patient
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const content = await documentAnalysisService.getExtractedContent(attachmentId);
    
    if (!content) {
      return res.status(404).json({ error: 'No extracted content found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching extracted content:', error);
    res.status(500).json({ error: 'Failed to fetch extracted content' });
  }
});

// Update extracted content (for manual edits)
router.put('/:patientId/attachments/:attachmentId/content', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const attachmentId = parseInt(req.params.attachmentId);
    const { extractedText, aiGeneratedTitle, documentType } = req.body;
    
    // Verify attachment belongs to patient
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Update extracted content
    const [updatedContent] = await db.update(attachmentExtractedContent)
      .set({
        extractedText,
        aiGeneratedTitle,
        documentType
      })
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId))
      .returning();
    
    console.log(`📎 [Attachments] Content updated for attachment ${attachmentId} by user ${req.user!.id}`);
    res.json(updatedContent);
  } catch (error) {
    console.error('Error updating extracted content:', error);
    res.status(500).json({ error: 'Failed to update extracted content' });
  }
});

// Manual reprocess endpoint for testing
router.post('/:patientId/attachments/:attachmentId/reprocess', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const attachmentId = parseInt(req.params.attachmentId);
    
    // Verify attachment belongs to patient
    const [attachment] = await db.select()
      .from(patientAttachments)
      .where(and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patientId)
      ));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Reset processing status
    await db.update(attachmentExtractedContent)
      .set({ processingStatus: 'pending', errorMessage: null })
      .where(eq(attachmentExtractedContent.attachmentId, attachmentId));
    
    // Trigger reprocessing in background
    documentAnalysisService.reprocessDocument(attachmentId).catch(error => {
      console.error(`📄 [DocumentAnalysis] Background reprocessing failed for attachment ${attachmentId}:`, error);
    });
    
    console.log(`📎 [Attachments] Reprocessing triggered for attachment ${attachmentId} by user ${req.user!.id}`);
    res.json({ message: 'Reprocessing started' });
  } catch (error) {
    console.error('Error triggering reprocess:', error);
    res.status(500).json({ error: 'Failed to trigger reprocessing' });
  }
});

export default router;