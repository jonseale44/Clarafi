import fs from 'fs';
import path from 'path';

/**
 * Shared PDF utility functions to eliminate code duplication
 * across PDF-related components and routes
 */

export const PDF_CONFIG = {
  STORAGE_DIR: '/tmp/pdfs',
  ALLOWED_EXTENSIONS: ['.pdf'],
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

/**
 * Ensures PDF storage directory exists
 */
export async function ensurePDFDirectory(): Promise<void> {
  try {
    await fs.promises.access(PDF_CONFIG.STORAGE_DIR);
  } catch {
    await fs.promises.mkdir(PDF_CONFIG.STORAGE_DIR, { recursive: true });
  }
}

/**
 * Validates PDF filename for security
 */
export function validatePDFFilename(filename: string): boolean {
  // Check extension
  if (!PDF_CONFIG.ALLOWED_EXTENSIONS.some(ext => filename.endsWith(ext))) {
    return false;
  }
  
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  // Check filename pattern (should include patient ID)
  const validPattern = /^(medication|lab|imaging)-orders-\d+-[\d\-T:Z]+\.pdf$/;
  return validPattern.test(filename);
}

/**
 * Extracts patient ID from PDF filename
 */
export function extractPatientIdFromFilename(filename: string): number | null {
  const match = filename.match(/^(medication|lab|imaging)-orders-(\d+)-/);
  return match ? parseInt(match[2], 10) : null;
}

/**
 * Checks if user has access to patient's PDFs
 */
export function canAccessPatientPDF(filename: string, requestedPatientId: number): boolean {
  const filePatientId = extractPatientIdFromFilename(filename);
  return filePatientId === requestedPatientId;
}

/**
 * Gets order type from filename
 */
export function getOrderTypeFromFilename(filename: string): string {
  if (filename.includes('medication-orders')) return 'medication';
  if (filename.includes('lab-orders')) return 'lab';
  if (filename.includes('imaging-orders')) return 'imaging';
  return 'unknown';
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets full file path for PDF
 */
export function getPDFFilePath(filename: string): string {
  return path.join(PDF_CONFIG.STORAGE_DIR, filename);
}

/**
 * Checks if PDF file exists
 */
export async function pdfExists(filename: string): Promise<boolean> {
  try {
    await fs.promises.access(getPDFFilePath(filename));
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets PDF file stats
 */
export async function getPDFStats(filename: string): Promise<fs.Stats | null> {
  try {
    return await fs.promises.stat(getPDFFilePath(filename));
  } catch {
    return null;
  }
}

/**
 * Cleanup old PDF files (optional cleanup function)
 */
export async function cleanupOldPDFs(maxAgeHours: number = 168): Promise<number> { // 7 days default
  try {
    await fs.promises.access(PDF_CONFIG.STORAGE_DIR);
  } catch {
    return 0; // Directory doesn't exist
  }

  const files = await fs.promises.readdir(PDF_CONFIG.STORAGE_DIR);
  const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  let cleanedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.pdf')) continue;
    
    const filepath = path.join(PDF_CONFIG.STORAGE_DIR, file);
    try {
      const stats = await fs.promises.stat(filepath);
      if (stats.mtime.getTime() < cutoffTime) {
        await fs.promises.unlink(filepath);
        cleanedCount++;
      }
    } catch (error) {
      // Skip files that can't be processed
      console.warn(`Failed to process ${file} during cleanup:`, error);
    }
  }

  return cleanedCount;
}