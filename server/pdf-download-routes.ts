import { Router, Request, Response } from "express";
// Use centralized auth check instead of local middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
import path from "path";
import fs from "fs";

const router = Router();

/**
 * GET /api/pdfs/:filename
 * Download generated PDF files
 */
router.get("/pdfs/:filename", requireAuth, async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const pdfDir = '/tmp/pdfs';
    const filepath = path.join(pdfDir, filename);
    
    console.log(`📄 [PDFDownload] Request for PDF: ${filename}`);
    console.log(`📄 [PDFDownload] Full path: ${filepath}`);
    
    // Use async file operations to avoid blocking
    try {
      await fs.promises.access(filepath);
    } catch {
      console.log(`📄 [PDFDownload] ❌ PDF not found: ${filepath}`);
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const stat = await fs.promises.stat(filepath);
    console.log(`📄 [PDFDownload] ✅ PDF found, size: ${stat.size} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    
    console.log(`📄 [PDFDownload] ✅ PDF download started for: ${filename}`);
  } catch (error) {
    console.error(`📄 [PDFDownload] ❌ Error downloading PDF:`, error);
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

// Legacy global PDF listing removed - PDFs are now patient-specific only

export default router;