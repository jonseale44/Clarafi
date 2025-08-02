import { fileURLToPath } from 'url';
import path from 'path';

// Get the base directory for the application
// In production, we use /tmp for writable storage (App Runner limitation)
// In development, we use process.cwd()
const getBaseDir = (): string => {
  if (process.env.NODE_ENV === 'production') {
    // AWS App Runner only allows writes to /tmp directory
    // All other directories are read-only in production
    return '/tmp/clarafi-storage';
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