import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const router = Router();

// Temporary photo capture sessions
interface PhotoCaptureSession {
  sessionId: string;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
  photos: Array<{
    filename: string;
    uploadedAt: Date;
  }>;
}

const photoCaptureSessions = new Map<string, PhotoCaptureSession>();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of photoCaptureSessions.entries()) {
    if (session.expiresAt < now) {
      // Clean up uploaded photos
      session.photos.forEach(photo => {
        const photoPath = path.join(getUploadsDir('temp'), photo.filename);
        fs.unlink(photoPath).catch(() => {});
      });
      photoCaptureSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Helper function to get upload directory
function getUploadsDir(subdir: string = '') {
  const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
  return subdir ? path.join(baseDir, subdir) : baseDir;
}

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = getUploadsDir('temp');
    await fs.mkdir(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Create photo capture session for QR code
router.post('/photo-capture/create-session', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create session
    const session: PhotoCaptureSession = {
      sessionId,
      userId,
      createdAt: new Date(),
      expiresAt,
      photos: []
    };
    
    photoCaptureSessions.set(sessionId, session);

    // Generate QR code
    const captureUrl = `${req.protocol}://${req.get('host')}/mobile-capture/${sessionId}`;
    const qrCode = await QRCode.toDataURL(captureUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log(`📸 [ProfilePhoto] Created capture session ${sessionId} for user ${userId}`);

    res.json({
      sessionId,
      qrCode,
      captureUrl,
      expiresAt
    });
  } catch (error) {
    console.error('❌ [ProfilePhoto] Error creating capture session:', error);
    res.status(500).json({ error: 'Failed to create capture session' });
  }
});

// Upload photo to capture session (for mobile)
router.post('/photo-capture/:sessionId/upload', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = photoCaptureSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (new Date() > session.expiresAt) {
      photoCaptureSessions.delete(sessionId);
      return res.status(410).json({ error: 'Session expired' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    // Add photo to session
    session.photos.push({
      filename: req.file.filename,
      uploadedAt: new Date()
    });

    console.log(`📸 [ProfilePhoto] Added photo to session ${sessionId}: ${req.file.filename}`);

    res.json({
      success: true,
      photoCount: session.photos.length,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ [ProfilePhoto] Error uploading to session:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Complete capture session and select photo
router.post('/photo-capture/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { selectedPhotoIndex = 0 } = req.body;
    
    const session = photoCaptureSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (session.photos.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Get selected photo
    const selectedPhoto = session.photos[selectedPhotoIndex];
    if (!selectedPhoto) {
      return res.status(400).json({ error: 'Invalid photo selection' });
    }

    // Process and save the selected photo
    const tempPath = path.join(getUploadsDir('temp'), selectedPhoto.filename);
    const result = await processAndSaveProfilePhoto(session.userId, tempPath);

    // Clean up session
    for (const photo of session.photos) {
      const photoPath = path.join(getUploadsDir('temp'), photo.filename);
      await fs.unlink(photoPath).catch(() => {});
    }
    photoCaptureSessions.delete(sessionId);

    console.log(`📸 [ProfilePhoto] Completed session ${sessionId}, saved profile photo for user ${session.userId}`);

    res.json({
      success: true,
      profileImageUrl: result.profileImageUrl
    });
  } catch (error) {
    console.error('❌ [ProfilePhoto] Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete photo capture' });
  }
});

// Direct profile photo upload
router.post('/profile-photo', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    const userId = req.user.id;
    const result = await processAndSaveProfilePhoto(userId, req.file.path);

    // Clean up temp file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`📸 [ProfilePhoto] Updated profile photo for user ${userId}`);

    res.json({
      success: true,
      profileImageUrl: result.profileImageUrl
    });
  } catch (error) {
    console.error('❌ [ProfilePhoto] Error uploading profile photo:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Get user's profile photo
router.get('/profile-photo/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = parseInt(req.params.userId);
    
    // Check if user can view this profile photo
    // In an EMR, if you can see patient data, you can see photos
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check health system match for HIPAA compliance
    if (user.healthSystemId !== req.user.healthSystemId) {
      console.warn(`⚠️ [ProfilePhoto] Access denied: User ${req.user.id} tried to access photo from different health system`);
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      profileImageUrl: user.profileImageUrl
    });
  } catch (error) {
    console.error('❌ [ProfilePhoto] Error getting profile photo:', error);
    res.status(500).json({ error: 'Failed to get profile photo' });
  }
});

// Helper function to process and save profile photo
async function processAndSaveProfilePhoto(userId: number, sourcePath: string): Promise<{ profileImageUrl: string }> {
  const pathModule = await getPathModule();
  const profilePhotosDir = getUploadsDir('profile-photos');
  await fs.mkdir(profilePhotosDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const hash = createHash('sha256').update(`${userId}-${timestamp}`).digest('hex').substring(0, 8);
  const filename = `profile-${userId}-${hash}.jpg`;
  const outputPath = pathModule.join(profilePhotosDir, filename);

  // Process image: resize to reasonable size, convert to JPEG for consistency
  await sharp(sourcePath)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  // Generate thumbnail for performance
  const thumbFilename = `profile-${userId}-${hash}-thumb.jpg`;
  const thumbPath = pathModule.join(profilePhotosDir, thumbFilename);
  
  await sharp(sourcePath)
    .resize(100, 100, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  // Update user record
  const profileImageUrl = `/uploads/profile-photos/${filename}`;
  await db.update(users)
    .set({ 
      profileImageUrl,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  // Log for HIPAA audit trail
  await db.insert(auditLogs).values({
    userId,
    action: 'UPDATE_PROFILE_PHOTO',
    entityType: 'user',
    entityId: userId,
    details: {
      filename,
      action: 'profile_photo_updated'
    },
    ipAddress: null,
    userAgent: null,
    createdAt: new Date()
  });

  return { profileImageUrl };
}

// Delete profile photo
router.delete('/profile-photo', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;

    // Get current user data
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.profileImageUrl) {
      return res.status(404).json({ error: 'No profile photo found' });
    }

    // Delete the file
    const pathModule = await getPathModule();
    const filename = pathModule.basename(user.profileImageUrl);
    const filePath = pathModule.join(getUploadsDir('profile-photos'), filename);
    
    await fs.unlink(filePath).catch(() => {});

    // Also delete thumbnail
    const thumbFilename = filename.replace('.jpg', '-thumb.jpg');
    const thumbPath = pathModule.join(getUploadsDir('profile-photos'), thumbFilename);
    await fs.unlink(thumbPath).catch(() => {});

    // Update user record
    await db.update(users)
      .set({ 
        profileImageUrl: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log for HIPAA audit trail
    await db.insert(auditLogs).values({
      userId,
      action: 'DELETE_PROFILE_PHOTO',
      entityType: 'user',
      entityId: userId,
      details: {
        filename,
        action: 'profile_photo_deleted'
      },
      ipAddress: null,
      userAgent: null,
      createdAt: new Date()
    });

    console.log(`📸 [ProfilePhoto] Deleted profile photo for user ${userId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ProfilePhoto] Error deleting profile photo:', error);
    res.status(500).json({ error: 'Failed to delete profile photo' });
  }
});

export default router;