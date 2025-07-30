import { config } from "dotenv";

// Load environment variables first
config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { initializeDatabase } from "./init-db";
import { seedLabData } from "./lab-sample-data";
import "./lab-order-background-processor.js"; // Auto-start background processor
import { initializeSystemData } from "./system-initialization";

const app = express();

// Simple log function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`📍 [FIRST] ${req.method} ${req.url}`);
  next();
});

// Add security headers for WebAuthn
app.use((req, res, next) => {
  // Production domain configuration
  const isProduction = process.env.PRODUCTION_DOMAIN === 'clarafi.ai';
  
  if (isProduction) {
    // For production, allow WebAuthn from the production domain
    res.setHeader('Permissions-Policy', 
      'publickey-credentials-create=(self "https://clarafi.ai"), ' +
      'publickey-credentials-get=(self "https://clarafi.ai")'
    );
    
    // Allow framing from same origin
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  } else {
    // For development, allow WebAuthn in iframes
    res.setHeader('Permissions-Policy', 
      'publickey-credentials-create=(self), publickey-credentials-get=(self)'
    );
    res.setHeader('X-Frame-Options', 'ALLOWALL');
  }
  
  // Add Feature-Policy header as well (for older browsers)
  res.setHeader('Feature-Policy', 
    'publickey-credentials-create \'self\'; publickey-credentials-get \'self\''
  );
  
  next();
});

// Parse JSON for all routes except Stripe webhook
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') {
    // Skip JSON parsing for Stripe webhook
    next();
  } else {
    express.json({ limit: '50mb' })(req, res, next);
  }
});

// Parse URL encoded for all routes except Stripe webhook  
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') {
    // Skip URL encoding parsing for Stripe webhook
    next();
  } else {
    express.urlencoded({ extended: false, limit: '50mb' })(req, res, next);
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    // In production, serve static files
    const pathModule = await import("path");
    
    const distPath = pathModule.default.resolve(process.cwd(), "public");
    
    app.use(express.static(distPath));
    
    // Fall through to index.html for client-side routing
    app.use("*", (_req, res) => {
      res.sendFile(pathModule.default.resolve(distPath, "index.html"));
    });
  }

  // Use PORT from environment variable for production deployments
  // Default to 5000 for local development
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    log("Database ready - you can register a new account or use admin/admin123 if already created");
    
    // Initialize system data (import real clinics from NPPES)
    await initializeSystemData();
    
    // Initialize archive maintenance scheduling
    const { TrialManagementService } = await import("./trial-management-service.js");
    await TrialManagementService.scheduleArchiveMaintenance();
    log("Archive maintenance scheduled for weekly purging of expired archives");
  });
})();
