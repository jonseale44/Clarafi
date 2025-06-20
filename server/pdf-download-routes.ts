import { Router, Request, Response } from "express";
// Simple auth middleware
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
    
    if (!fs.existsSync(filepath)) {
      console.log(`📄 [PDFDownload] ❌ PDF not found: ${filepath}`);
      return res.status(404).json({ error: "PDF not found" });
    }
    
    const stat = fs.statSync(filepath);
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

/**
 * GET /api/pdfs
 * List available PDF files
 */
router.get("/pdfs", requireAuth, async (req: Request, res: Response) => {
  try {
    const pdfDir = '/tmp/pdfs';
    
    if (!fs.existsSync(pdfDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(pdfDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filepath = path.join(pdfDir, file);
        const stat = fs.statSync(filepath);
        return {
          filename: file,
          size: stat.size,
          created: stat.birthtime,
          downloadUrl: `/api/pdfs/${file}`
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    console.log(`📄 [PDFList] Found ${files.length} PDF files`);
    res.json({ files });
  } catch (error) {
    console.error(`📄 [PDFList] ❌ Error listing PDFs:`, error);
    res.status(500).json({ error: "Failed to list PDFs" });
  }
});

export default router;