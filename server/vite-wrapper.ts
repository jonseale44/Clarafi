import type { Express } from "express";
import type { Server } from "http";

// This wrapper prevents vite.ts from being loaded in production
// to avoid import.meta.dirname errors during bundling

export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === "production") {
    // In production, do nothing - static files are served differently
    return;
  }
  
  // Only load vite in development
  // Use eval to prevent esbuild from following the import
  const viteModule = await eval('import("./vite.js")');
  await viteModule.setupVite(app, server);
}