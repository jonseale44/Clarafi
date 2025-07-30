import { fileURLToPath } from 'url';
import path from 'path';

// Get the base directory for the application
// In production, we use the /app directory (App Runner standard)
// In development, we use process.cwd()
const getBaseDir = (): string => {
  if (process.env.NODE_ENV === 'production') {
    // App Runner uses /app as the base directory
    return '/app';
  }
  
  // For development, use process.cwd()
  return process.cwd() || '.';
};

// Get the uploads directory path
export const getUploadsDir = (...subPaths: string[]): string => {
  const baseDir = getBaseDir();
  return path.join(baseDir, 'uploads', ...subPaths);
};

// Get the data directory path
export const getDataDir = (...subPaths: string[]): string => {
  const baseDir = getBaseDir();
  return path.join(baseDir, 'data', ...subPaths);
};

// Get the client directory path
export const getClientDir = (...subPaths: string[]): string => {
  const baseDir = getBaseDir();
  return path.join(baseDir, 'client', ...subPaths);
};

// Get the public directory path
export const getPublicDir = (...subPaths: string[]): string => {
  const baseDir = getBaseDir();
  return path.join(baseDir, 'client', 'public', ...subPaths);
};