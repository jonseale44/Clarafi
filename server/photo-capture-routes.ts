import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { db } from "./db.js";
import { insertPatientAttachmentSchema, patientAttachments } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// Store active photo capture sessions in memory
// In production, this would be stored in Redis or database
const photoCaptureSessions = new Map<string, {
  sessionId: string;
  createdAt: Date;
  uploadedPhotos: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: Date;
  }>;
  status: 'active' | 'completed' | 'expired';
}>();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of photoCaptureSessions.entries()) {
    const sessionAge = now.getTime() - session.createdAt.getTime();
    if (sessionAge > 10 * 60 * 1000) { // 10 minutes
      session.status = 'expired';
      // Clean up after another 5 minutes
      setTimeout(() => photoCaptureSessions.delete(sessionId), 5 * 60 * 1000);
    }
  }
}, 5 * 60 * 1000);

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'photo-capture');
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.createHash('md5').update(file.originalname + Date.now()).digest('hex');
    const ext = path.extname(file.originalname);
    cb(null, `photo_${hash}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for photos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heif', 'image/heic'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, HEIF/HEIC images are allowed'));
    }
  }
});

// Create a new photo capture session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    photoCaptureSessions.set(sessionId, {
      sessionId,
      createdAt: new Date(),
      uploadedPhotos: [],
      status: 'active'
    });
    
    // Generate the capture URL that will be encoded in QR code
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const captureUrl = `${protocol}://${host}/capture/${sessionId}`;
    
    console.log('📸 [PhotoCapture] Created new session:', sessionId);
    console.log('📸 [PhotoCapture] Capture URL:', captureUrl);
    
    res.json({
      sessionId,
      captureUrl,
      expiresIn: 600 // 10 minutes
    });
  } catch (error) {
    console.error('📸 [PhotoCapture] Error creating session:', error);
    res.status(500).json({ error: 'Failed to create photo capture session' });
  }
});

// Get session status and photos
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = photoCaptureSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    sessionId: session.sessionId,
    status: session.status,
    photoCount: session.uploadedPhotos.length,
    photos: session.uploadedPhotos.map(photo => ({
      filename: photo.filename,
      originalName: photo.originalName,
      size: photo.size,
      uploadedAt: photo.uploadedAt
    }))
  });
});

// Upload photo to a session
router.post('/sessions/:sessionId/upload', upload.single('photo'), async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = photoCaptureSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.status !== 'active') {
    return res.status(400).json({ error: 'Session is no longer active' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }
  
  // Add photo to session
  session.uploadedPhotos.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date()
  });
  
  console.log('📸 [PhotoCapture] Photo uploaded to session:', sessionId, req.file.filename);
  
  res.json({
    success: true,
    filename: req.file.filename,
    photoCount: session.uploadedPhotos.length
  });
});

// Complete session and return all photos
router.post('/sessions/:sessionId/complete', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = photoCaptureSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.uploadedPhotos.length === 0) {
    return res.status(400).json({ error: 'No photos uploaded in this session' });
  }
  
  session.status = 'completed';
  
  // Return photo URLs for the client to use
  const photos = session.uploadedPhotos.map(photo => ({
    url: `/uploads/photo-capture/${photo.filename}`,
    filename: photo.filename,
    originalName: photo.originalName,
    size: photo.size
  }));
  
  console.log('📸 [PhotoCapture] Session completed:', sessionId, 'Photos:', photos.length);
  
  res.json({
    success: true,
    photos
  });
});

// Mobile-friendly camera capture page
router.get('/capture/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = photoCaptureSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Session Expired</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h1 class="error">Session Expired</h1>
          <p>This photo capture session has expired. Please scan a new QR code.</p>
        </body>
      </html>
    `);
  }
  
  // Return a mobile-friendly camera capture page
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CLARAFI Photo Capture</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #f8f9fa;
            color: #333;
          }
          .header {
            background: #1e3a8a;
            color: white;
            padding: 15px;
            text-align: center;
          }
          .container {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
          }
          .capture-btn {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            background: #1e3a8a;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }
          .capture-btn:hover { background: #1e40af; }
          .capture-btn input[type="file"] {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
          }
          .photo-preview {
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .photo-preview img {
            width: 100%;
            height: auto;
            display: block;
          }
          .photo-list {
            margin: 20px 0;
          }
          .photo-item {
            background: white;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .status {
            text-align: center;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
          }
          .status.success { background: #d4edda; color: #155724; }
          .status.error { background: #f8d7da; color: #721c24; }
          .status.info { background: #d1ecf1; color: #0c5460; }
          .finish-btn {
            background: #28a745;
            color: white;
            padding: 15px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            width: 100%;
            cursor: pointer;
            margin-top: 20px;
          }
          .finish-btn:hover { background: #218838; }
          .finish-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #1e3a8a;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            vertical-align: middle;
            margin-left: 10px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CLARAFI Photo Capture</h1>
        </div>
        <div class="container">
          <p style="text-align: center; margin-bottom: 20px;">
            Take photos of patient ID cards, insurance cards, or other documents.
          </p>
          
          <button class="capture-btn">
            <input type="file" id="photoInput" accept="image/*" capture="camera" multiple>
            📷 Take Photo
          </button>
          
          <div id="status"></div>
          <div id="photoList" class="photo-list"></div>
          
          <button id="finishBtn" class="finish-btn" disabled>
            Finish & Return to Form
          </button>
        </div>
        
        <script>
          const sessionId = '${sessionId}';
          const photos = [];
          let isUploading = false;
          
          const photoInput = document.getElementById('photoInput');
          const statusDiv = document.getElementById('status');
          const photoList = document.getElementById('photoList');
          const finishBtn = document.getElementById('finishBtn');
          
          photoInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            for (const file of files) {
              await uploadPhoto(file);
            }
          });
          
          async function uploadPhoto(file) {
            if (isUploading) return;
            isUploading = true;
            
            statusDiv.className = 'status info';
            statusDiv.innerHTML = 'Uploading photo...<span class="loading"></span>';
            
            const formData = new FormData();
            formData.append('photo', file);
            
            try {
              const response = await fetch(\`/api/photo-capture/sessions/\${sessionId}/upload\`, {
                method: 'POST',
                body: formData
              });
              
              if (!response.ok) {
                throw new Error('Upload failed');
              }
              
              const result = await response.json();
              photos.push({ name: file.name, filename: result.filename });
              
              statusDiv.className = 'status success';
              statusDiv.textContent = 'Photo uploaded successfully!';
              
              updatePhotoList();
              finishBtn.disabled = false;
            } catch (error) {
              statusDiv.className = 'status error';
              statusDiv.textContent = 'Failed to upload photo. Please try again.';
            } finally {
              isUploading = false;
              photoInput.value = '';
            }
          }
          
          function updatePhotoList() {
            photoList.innerHTML = '<h3>Uploaded Photos (' + photos.length + ')</h3>';
            photos.forEach((photo, index) => {
              const item = document.createElement('div');
              item.className = 'photo-item';
              item.innerHTML = \`
                <span>📸 \${photo.name}</span>
                <span style="color: #28a745;">✓</span>
              \`;
              photoList.appendChild(item);
            });
          }
          
          finishBtn.addEventListener('click', async () => {
            if (photos.length === 0) return;
            
            finishBtn.disabled = true;
            finishBtn.innerHTML = 'Finishing...<span class="loading"></span>';
            
            try {
              const response = await fetch(\`/api/photo-capture/sessions/\${sessionId}/complete\`, {
                method: 'POST'
              });
              
              if (!response.ok) {
                throw new Error('Failed to complete session');
              }
              
              statusDiv.className = 'status success';
              statusDiv.innerHTML = '<h2>✅ Success!</h2><p>Photos have been sent to the form. You can close this page.</p>';
              
              // Disable all buttons
              photoInput.disabled = true;
              finishBtn.style.display = 'none';
              
              // Auto-close after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            } catch (error) {
              finishBtn.disabled = false;
              finishBtn.textContent = 'Finish & Return to Form';
              statusDiv.className = 'status error';
              statusDiv.textContent = 'Failed to complete. Please try again.';
            }
          });
        </script>
      </body>
    </html>
  `);
});

export default router;