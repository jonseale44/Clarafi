import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from './db';
import { patients } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const router = Router();

// Temporary photo capture sessions
interface PhotoCaptureSession {
  sessionId: string;
  patientId: number;
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
        const photoPath = path.join(getUploadsDir('patient-photos/temp'), photo.filename);
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

// Configure multer for patient photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = getUploadsDir('patient-photos/temp');
    await fs.mkdir(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `patient-${uniqueSuffix}${ext}`);
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

    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID required' });
    }

    const userId = req.user.id;
    const healthSystemId = req.user.healthSystemId;
    
    // Verify user has access to this patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.healthSystemId, healthSystemId)
        )
      );

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create session
    const session: PhotoCaptureSession = {
      sessionId,
      patientId,
      userId,
      createdAt: new Date(),
      expiresAt,
      photos: []
    };
    
    photoCaptureSessions.set(sessionId, session);

    // Generate QR code
    const captureUrl = `${req.protocol}://${req.get('host')}/patient-photo/capture/${sessionId}`;
    const qrCode = await QRCode.toDataURL(captureUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log(`📸 [PatientPhoto] Created capture session ${sessionId} for patient ${patientId}`);

    res.json({
      sessionId,
      qrCode,
      captureUrl,
      expiresAt
    });
  } catch (error) {
    console.error('❌ [PatientPhoto] Error creating capture session:', error);
    res.status(500).json({ error: 'Failed to create capture session' });
  }
});

// Upload patient photo (direct upload or from capture session)
router.post('/upload/:patientId', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const healthSystemId = req.user.healthSystemId;
    const file = req.file;
    const { sessionId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify user has access to this patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.healthSystemId, healthSystemId)
        )
      );

    if (!patient) {
      await fs.unlink(file.path); // Clean up uploaded file
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Process image: resize and optimize
    const filename = `patient-${patientId}-${Date.now()}.jpg`;
    const finalDir = getUploadsDir('patient-photos');
    await fs.mkdir(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, filename);

    // Process with sharp: resize to max 800x800, optimize for web
    await sharp(file.path)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(finalPath);

    // Delete the old photo if exists
    if (patient.profilePhotoFilename) {
      const oldPath = path.join(finalDir, patient.profilePhotoFilename);
      await fs.unlink(oldPath).catch(() => {});
    }

    // Update patient record
    await db
      .update(patients)
      .set({
        profilePhotoFilename: filename,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId));

    // Clean up temp file
    await fs.unlink(file.path);

    // If from session, track the upload
    if (sessionId) {
      const session = photoCaptureSessions.get(sessionId);
      if (session && session.patientId === patientId) {
        session.photos.push({
          filename,
          uploadedAt: new Date()
        });
      }
    }

    console.log(`✅ [PatientPhoto] Uploaded photo for patient ${patientId}: ${filename}`);

    res.json({
      filename,
      url: `/api/patient-photos/${filename}`
    });
  } catch (error) {
    console.error('❌ [PatientPhoto] Upload error:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Serve patient photos
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const filename = req.params.filename;
    const photoPath = path.join(getUploadsDir('patient-photos'), filename);

    // Check if file exists
    try {
      await fs.access(photoPath);
    } catch {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Send the file
    res.sendFile(photoPath);
  } catch (error) {
    console.error('❌ [PatientPhoto] Error serving photo:', error);
    res.status(500).json({ error: 'Failed to retrieve photo' });
  }
});

// Delete patient photo
router.delete('/:patientId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patientId = parseInt(req.params.patientId);
    const healthSystemId = req.user.healthSystemId;

    // Verify user has access to this patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.healthSystemId, healthSystemId)
        )
      );

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (!patient.profilePhotoFilename) {
      return res.status(404).json({ error: 'No photo to delete' });
    }

    // Delete the file
    const photoPath = path.join(getUploadsDir('patient-photos'), patient.profilePhotoFilename);
    await fs.unlink(photoPath).catch(() => {});

    // Update patient record
    await db
      .update(patients)
      .set({
        profilePhotoFilename: null,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId));

    console.log(`🗑️ [PatientPhoto] Deleted photo for patient ${patientId}`);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('❌ [PatientPhoto] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Get session info (for mobile capture page)
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const session = photoCaptureSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (session.expiresAt < new Date()) {
      photoCaptureSessions.delete(sessionId);
      return res.status(404).json({ error: 'Session expired' });
    }

    // Get patient info
    const [patient] = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth
      })
      .from(patients)
      .where(eq(patients.id, session.patientId));

    res.json({
      sessionId,
      patientId: session.patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
      expiresAt: session.expiresAt,
      photosUploaded: session.photos.length
    });
  } catch (error) {
    console.error('❌ [PatientPhoto] Session info error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

export const patientProfilePhotoRoutes = router;