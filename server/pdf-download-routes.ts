import { Router, Request, Response } from "express";
import { validatePDFFilename, getPDFFilePath, pdfExists, getPDFStats } from "./pdf-utils.js";

// Use centralized auth check instead of local middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const router = Router();

/**
 * GET /api/pdfs/:filename
 * Download generated PDF files
 */
router.get("/pdfs/:filename", requireAuth, async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    console.log(`📄 [PDFDownload] Request for PDF: ${filename}`);
    
    // Validate filename for security
    if (!validatePDFFilename(filename)) {
      console.log(`📄 [PDFDownload] ❌ Invalid filename: ${filename}`);
      return res.status(400).json({ error: "Invalid filename format" });
    }
    
    // TODO: Add authorization check - verify user can access this patient's PDF
    // Extract patient ID from filename and verify user permissions
    
    // Check if file exists
    if (!(await pdfExists(filename))) {
      console.log(`📄 [PDFDownload] ❌ PDF not found: ${filename}`);
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const stat = await getPDFStats(filename);
    if (!stat) {
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const filepath = getPDFFilePath(filename);
    console.log(`📄 [PDFDownload] ✅ PDF found, size: ${stat.size} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    
    const stream = (await import('fs')).createReadStream(filepath);
    stream.pipe(res);
    
    console.log(`📄 [PDFDownload] ✅ PDF download started for: ${filename}`);
  } catch (error) {
    console.error(`📄 [PDFDownload] ❌ Error downloading PDF:`, error);
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

// Legacy global PDF listing removed - PDFs are now patient-specific only

export default router;