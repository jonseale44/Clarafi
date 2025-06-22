import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db } from "./db.js";
import { patientAttachments, insertPatientAttachmentSchema } from "../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";
import { createHash } from "crypto";

const router = Router();

// Production EMR file handling standards:
// - Epic/Athena typically allow up to 100MB for medical documents
// - Support PDF, JPEG, PNG, TIFF, DICOM
// - Store files with encrypted names for security
// - Generate thumbnails for quick preview
// - Virus scanning integration points

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments');
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename: hash + timestamp + extension
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
    const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
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

// Upload attachment
router.post('/:patientId/attachments', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const patientId = parseInt(req.params.patientId);
    const { title, description, encounterId, isConfidential } = req.body;
    
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
    };

    const validatedData = insertPatientAttachmentSchema.parse(attachmentData);
    const [attachment] = await db.insert(patientAttachments).values(validatedData).returning();

    console.log(`📎 [Attachments] File uploaded: ${req.file.originalname} for patient ${patientId}`);
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up file if database insertion fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get patient attachments
router.get('/:patientId/attachments', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const { encounterId } = req.query;
    
    let query = db.select().from(patientAttachments).where(eq(patientAttachments.patientId, patientId));
    
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

export default router;