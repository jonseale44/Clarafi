import { Router, Request, Response } from "express";
import { 
  validatePDFFilename, 
  getPDFFilePath, 
  pdfExists, 
  getPDFStats,
  getOrderTypeFromFilename,
  PDF_CONFIG
} from "./pdf-utils.js";

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
    
    console.log(`📄 [PDFView] Request to view PDF: ${filename}`);
    
    // Validate filename for security
    if (!validatePDFFilename(filename)) {
      console.log(`📄 [PDFView] ❌ Invalid filename: ${filename}`);
      return res.status(400).json({ error: "Invalid filename format" });
    }
    
    // TODO: Add authorization check - verify user can access this patient's PDF
    // Extract patient ID from filename and verify user permissions
    
    // Check if file exists
    if (!(await pdfExists(filename))) {
      console.log(`📄 [PDFView] ❌ PDF not found: ${filename}`);
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const stat = await getPDFStats(filename);
    if (!stat) {
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const filepath = getPDFFilePath(filename);
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
    
    const stream = (await import('fs')).createReadStream(filepath);
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
    
    // TODO: Add authorization check - verify user can access this patient's data
    // This should check if the authenticated user has permission to view this patient's PDFs
    
    try {
      await (await import('fs')).promises.access(PDF_CONFIG.STORAGE_DIR);
    } catch {
      return res.json({ files: [] });
    }
    
    const dirFiles = await (await import('fs')).promises.readdir(PDF_CONFIG.STORAGE_DIR);
    const files = await Promise.all(
      dirFiles
        .filter(file => file.endsWith('.pdf'))
        .filter(file => file.includes(`-${patientId}-`)) // Filter by patient ID in filename
        .map(async file => {
          const stat = await getPDFStats(file);
          if (!stat) return null;
        
          const orderType = getOrderTypeFromFilename(file);
        
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
    ).then(results => results.filter(Boolean));
    
    files.sort((a, b) => b.created.getTime() - a.created.getTime());
    
    console.log(`📄 [PatientPDFs] Found ${files.length} PDF files for patient ${patientId}`);
    res.json({ files });
  } catch (error) {
    console.error(`📄 [PatientPDFs] ❌ Error listing patient PDFs:`, error);
    res.status(500).json({ error: "Failed to list patient PDFs" });
  }
});

export default router;