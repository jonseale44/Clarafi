import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";

// Use centralized auth check instead of local middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const router = Router();

/**
 * GET /api/pdfs/:filename/view
 * View PDF inline in browser (for embedded viewer)
 */
router.get("/pdfs/:filename/view", requireAuth, async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const pdfDir = '/tmp/pdfs';
    const filepath = path.join(pdfDir, filename);
    
    console.log(`📄 [PDFView] Request to view PDF: ${filename}`);
    
    // Use async file operations to avoid blocking
    try {
      await fs.promises.access(filepath);
    } catch {
      console.log(`📄 [PDFView] ❌ PDF not found: ${filepath}`);
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const stat = await fs.promises.stat(filepath);
    console.log(`📄 [PDFView] ✅ PDF found for viewing, size: ${stat.size} bytes`);
    
    // Set headers for inline viewing with proper CORS and security
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    
    console.log(`📄 [PDFView] ✅ PDF viewing started for: ${filename}`);
  } catch (error) {
    console.error(`📄 [PDFView] ❌ Error viewing PDF:`, error);
    res.status(500).json({ error: "Failed to view PDF" });
  }
});

/**
 * GET /api/patients/:patientId/pdfs
 * Get PDFs specific to a patient
 */
router.get("/patients/:patientId/pdfs", requireAuth, async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const pdfDir = '/tmp/pdfs';
    
    try {
      await fs.promises.access(pdfDir);
    } catch {
      return res.json({ files: [] });
    }
    
    const dirFiles = await fs.promises.readdir(pdfDir);
    const files = await Promise.all(
      dirFiles
        .filter(file => file.endsWith('.pdf'))
        .filter(file => file.includes(`-${patientId}-`)) // Filter by patient ID in filename
        .map(async file => {
          const filepath = path.join(pdfDir, file);
          const stat = await fs.promises.stat(filepath);
        
        // Extract order type from filename
        let orderType = 'document';
        if (file.includes('medication-orders')) orderType = 'medication';
        else if (file.includes('lab-orders')) orderType = 'lab';
        else if (file.includes('imaging-orders')) orderType = 'imaging';
        
          return {
            filename: file,
            size: stat.size,
            created: stat.birthtime,
            downloadUrl: `/api/pdfs/${file}`,
            viewUrl: `/api/pdfs/${file}/view`,
            patientId: patientId,
            orderType: orderType
          };
        })
    );
    
    files.sort((a, b) => b.created.getTime() - a.created.getTime());
    
    console.log(`📄 [PatientPDFs] Found ${files.length} PDF files for patient ${patientId}`);
    res.json({ files });
  } catch (error) {
    console.error(`📄 [PatientPDFs] ❌ Error listing patient PDFs:`, error);
    res.status(500).json({ error: "Failed to list patient PDFs" });
  }
});

export default router;