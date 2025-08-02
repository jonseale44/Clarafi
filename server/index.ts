import { config } from "dotenv";

// Load environment variables first
config();

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import os from "os";
import { exec } from "child_process";
import { registerRoutes } from "./routes.js";
import { initializeDatabase } from "./init-db.js";
import { seedLabData } from "./lab-sample-data.js";
// import "./lab-order-background-processor.js"; // Auto-start background processor - temporarily disabled due to missing file
import { initializeSystemData } from "./system-initialization.js";

const app = express();

// Configure CORS for production and development
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://clarafi.ai',
      'https://www.clarafi.ai',
      'https://unmb7vc4nw.us-east-2.awsapprunner.com'
    ];
    
    // In development, allow requests without origin (like from Postman) or from any origin
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important for cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

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

// Health check endpoint - must be before authentication
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || 5000
  });
});

// AWS ALB health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    service: "clarafi-backend",
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint for AWS deployment debugging
app.get("/api/test", (req, res) => {
  res.status(200).json({
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || 5000,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

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
    const { setupVite } = await import("./vite-wrapper");
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
  // Default to 5000 for development (matches workflow expectation)
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    console.log('🚀 [STARTUP] === SERVER STARTUP DIAGNOSTICS ===');
    console.log('🚀 [STARTUP] Timestamp:', new Date().toISOString());
    console.log('🚀 [STARTUP] Server listening on http://0.0.0.0:' + port);
    console.log('🚀 [STARTUP] Environment:', process.env.NODE_ENV || 'development');
    console.log('🚀 [STARTUP] Process details:', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
    
    console.log('🚀 [STARTUP] Environment variables check:');
    console.log('🚀 [STARTUP]   DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set [' + process.env.DATABASE_URL.length + ' chars]' : '✗ Missing');
    console.log('🚀 [STARTUP]   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set [' + process.env.OPENAI_API_KEY.length + ' chars]' : '✗ Missing');
    console.log('🚀 [STARTUP]   SESSION_SECRET:', process.env.SESSION_SECRET ? '✓ Set [' + process.env.SESSION_SECRET.length + ' chars]' : '✗ Missing');
    console.log('🚀 [STARTUP]   PORT:', process.env.PORT || 'Not set (using default 5000)');
    console.log('🚀 [STARTUP]   NODE_ENV:', process.env.NODE_ENV || 'Not set (defaulting to development)');
    console.log('🚀 [STARTUP]   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing');
    console.log('🚀 [STARTUP]   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing');
    console.log('🚀 [STARTUP]   PRODUCTION_DOMAIN:', process.env.PRODUCTION_DOMAIN || 'Not set');
    console.log('🚀 [STARTUP]   AWS_REGION:', process.env.AWS_REGION || 'Not set');
    console.log('🚀 [STARTUP]   AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing');
    console.log('🚀 [STARTUP]   AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing');
    
    console.log('🚀 [STARTUP] File system analysis:');
    console.log('🚀 [STARTUP]   Current working directory:', process.cwd());
    console.log('🚀 [STARTUP]   __dirname equivalent:', import.meta.url);
    console.log('🚀 [STARTUP]   Upload directory:', process.env.UPLOAD_DIR || './uploads');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 [STARTUP] === PRODUCTION ENVIRONMENT DIAGNOSTICS ===');
      console.log('🚀 [STARTUP]   AWS App Runner:', process.env.AWS_EXECUTION_ENV ? 'Detected' : 'Not detected');
      console.log('🚀 [STARTUP]   Container ID:', process.env.HOSTNAME || 'Unknown');
      console.log('🚀 [STARTUP]   Available CPUs:', os.cpus().length);
      console.log('🚀 [STARTUP]   Total memory:', Math.round(os.totalmem() / 1024 / 1024) + ' MB');
      console.log('🚀 [STARTUP]   Free memory:', Math.round(os.freemem() / 1024 / 1024) + ' MB');
      
      // Check for system dependencies
      exec('which pdftoppm', (err: any, stdout: string) => {
        if (err) {
          console.log('🚀 [STARTUP]   pdftoppm (poppler): ✗ NOT FOUND - PDF processing will fail');
        } else {
          console.log('🚀 [STARTUP]   pdftoppm (poppler): ✓ Found at', stdout.trim());
        }
      });
      
      exec('which magick', (err: any, stdout: string) => {
        if (err) {
          exec('which convert', (err2: any, stdout2: string) => {
            if (err2) {
              console.log('🚀 [STARTUP]   ImageMagick: ✗ NOT FOUND - Image processing will fail');
            } else {
              console.log('🚀 [STARTUP]   ImageMagick: ✓ Found at', stdout2.trim());
            }
          });
        } else {
          console.log('🚀 [STARTUP]   ImageMagick: ✓ Found at', stdout.trim());
        }
      });
    }
    
    console.log('🚀 [STARTUP] Health check endpoints:');
    console.log('🚀 [STARTUP]   - GET /health');
    console.log('🚀 [STARTUP]   - GET /api/health');
    console.log('🚀 [STARTUP] === END STARTUP DIAGNOSTICS ===');
    
    log(`serving on port ${port}`);
    log("Database ready - you can register a new account or use admin/admin123 if already created");
    
    try {
      // Initialize system data (import real clinics from NPPES)
      await initializeSystemData();
      
      // Initialize archive maintenance scheduling
      const { TrialManagementService } = await import("./trial-management-service.js");
      await TrialManagementService.scheduleArchiveMaintenance();
      log("Archive maintenance scheduled for weekly purging of expired archives");
      
      console.log(`✅ [STARTUP] Server startup complete`);
    } catch (error) {
      console.error(`❌ [STARTUP] Error during initialization:`, error);
      // Don't exit - let the server continue running for health checks
    }
  });
})();
