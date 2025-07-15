import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./init-db";
import { seedLabData } from "./lab-sample-data";
import "./lab-order-background-processor.js"; // Auto-start background processor
import { initializeSystemData } from "./system-initialization";

const app = express();

// Add VERY FIRST middleware to catch ALL requests
app.use((req, res, next) => {
  console.log(`📍 [FIRST] ${req.method} ${req.url}`);
  if (req.url.includes('webauthn') || req.method === 'POST') {
    console.log('🚨 [CRITICAL WebAuthn/POST Request]:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
      headers: req.headers,
      rawHeaders: req.rawHeaders
    });
    
    // Log raw body for POST requests
    if (req.method === 'POST') {
      let rawBody = '';
      req.on('data', chunk => {
        rawBody += chunk.toString();
        console.log('📦 [POST Body Chunk]:', chunk.toString().substring(0, 100));
      });
      req.on('end', () => {
        console.log('📦 [POST Body Complete]:', rawBody.substring(0, 200));
      });
    }
  }
  
  // Add response interceptor for WebAuthn routes
  if (req.url.includes('webauthn')) {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data: any) {
      console.log('📤 [WebAuthn Response] send() called:', {
        url: req.url,
        statusCode: res.statusCode,
        contentType: res.getHeader('content-type'),
        dataType: typeof data,
        dataLength: data?.length || JSON.stringify(data).length,
        dataPreview: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
      });
      return originalSend.call(this, data);
    };
    
    res.json = function(data: any) {
      console.log('📤 [WebAuthn Response] json() called:', {
        url: req.url,
        statusCode: res.statusCode,
        dataKeys: data ? Object.keys(data) : null,
        dataPreview: JSON.stringify(data).substring(0, 200)
      });
      return originalJson.call(this, data);
    };
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    log("Database ready - you can register a new account or use admin/admin123 if already created");
    
    // Initialize system data (import real clinics from NPPES)
    await initializeSystemData();
  });
})();
