import { Router, Request, Response, NextFunction } from 'express';
import { TrialManagementService } from './trial-management-service.js';
import { storage } from './storage.js';
import { labCatalogService } from './lab-catalog-service.js';
import { InsertLabTestCatalog, InsertLabInterfaceMapping, InsertLabOrderSet } from '@shared/schema';

const router = Router();
const trialManagementService = new TrialManagementService();

// Middleware to check authentication and trial status for all routes
router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user!;
    const trialStatus = await trialManagementService.getTrialStatus(user.healthSystemId);
    if (!trialStatus.hasAccess) {
      return res.status(403).json({ error: 'Trial expired or access denied' });
    }
    next();
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error checking auth/trial status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search lab tests
router.get('/search', async (req, res) => {
  try {
    const query = {
      searchTerm: req.query.q as string,
      category: req.query.category as string,
      lab: req.query.lab as 'quest' | 'labcorp' | 'hospital' | undefined,
      includeObsolete: req.query.includeObsolete === 'true'
    };

    const tests = await storage.searchLabTests(query);
    res.json(tests);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error searching lab tests:', error);
    res.status(500).json({ error: 'Failed to search lab tests' });
  }
});

// Get test by LOINC code
router.get('/tests/loinc/:loincCode', async (req, res) => {
  try {
    const test = await storage.getLabTestByLoincCode(req.params.loincCode);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error fetching test by LOINC code:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Get test by external lab code
router.get('/tests/external/:lab/:code', async (req, res) => {
  try {
    const lab = req.params.lab as 'quest' | 'labcorp';
    if (lab !== 'quest' && lab !== 'labcorp') {
      return res.status(400).json({ error: 'Invalid lab. Must be "quest" or "labcorp"' });
    }

    const test = await storage.getLabTestByExternalCode(lab, req.params.code);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error fetching test by external code:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Create or update lab test
router.post('/tests', async (req, res) => {
  try {
    const user = req.user!;
    
    // Only admins can manage lab catalog
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can manage lab catalog' });
    }

    const testData: InsertLabTestCatalog = {
      ...req.body,
      validatedBy: user.id
    };

    const test = await storage.createOrUpdateLabTest(testData);
    res.json(test);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error creating/updating lab test:', error);
    res.status(500).json({ error: 'Failed to create/update lab test' });
  }
});

// Import lab test catalog
router.post('/import', async (req, res) => {
  try {
    const user = req.user!;
    
    // Only admins can import lab catalog
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can import lab catalog' });
    }

    const { tests, source } = req.body as { tests: InsertLabTestCatalog[]; source: string };
    
    if (!tests || !Array.isArray(tests)) {
      return res.status(400).json({ error: 'Invalid tests array' });
    }

    const imported = await storage.importLabTestCatalog(tests, source);
    res.json({ imported, total: tests.length });
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error importing lab catalog:', error);
    res.status(500).json({ error: 'Failed to import lab catalog' });
  }
});

// Get lab interface mappings
router.get('/mappings/:externalLabId', async (req, res) => {
  try {
    const mappings = await storage.getLabMappingsForLab(parseInt(req.params.externalLabId));
    res.json(mappings);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error fetching lab mappings:', error);
    res.status(500).json({ error: 'Failed to fetch lab mappings' });
  }
});

// Create lab interface mapping
router.post('/mappings', async (req, res) => {
  try {
    const user = req.user!;
    
    // Only admins can manage mappings
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can manage lab mappings' });
    }

    const mapping = await storage.createLabMapping(req.body as InsertLabInterfaceMapping);
    res.json(mapping);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error creating lab mapping:', error);
    res.status(500).json({ error: 'Failed to create lab mapping' });
  }
});

// Map internal code to external
router.get('/mappings/map/:externalLabId/:direction/:internalCode', async (req, res) => {
  try {
    const { externalLabId, direction, internalCode } = req.params;
    
    if (direction !== 'inbound' && direction !== 'outbound') {
      return res.status(400).json({ error: 'Invalid direction. Must be "inbound" or "outbound"' });
    }

    const externalCode = await storage.mapInternalToExternal(
      parseInt(externalLabId),
      internalCode,
      direction as 'inbound' | 'outbound'
    );

    if (!externalCode) {
      return res.status(404).json({ error: 'No mapping found' });
    }

    res.json({ externalCode });
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error mapping internal to external:', error);
    res.status(500).json({ error: 'Failed to map code' });
  }
});

// Get lab order sets
router.get('/order-sets', async (req, res) => {
  try {
    const department = req.query.department as string | undefined;
    const orderSets = await storage.getLabOrderSets(department);
    res.json(orderSets);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error fetching order sets:', error);
    res.status(500).json({ error: 'Failed to fetch order sets' });
  }
});

// Get order set by code
router.get('/order-sets/:setCode', async (req, res) => {
  try {
    const orderSet = await storage.getLabOrderSetByCode(req.params.setCode);
    if (!orderSet) {
      return res.status(404).json({ error: 'Order set not found' });
    }
    res.json(orderSet);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error fetching order set:', error);
    res.status(500).json({ error: 'Failed to fetch order set' });
  }
});

// Create order set
router.post('/order-sets', async (req, res) => {
  try {
    const user = req.user!;
    
    const orderSetData: InsertLabOrderSet = {
      ...req.body,
      createdBy: user.id
    };

    const orderSet = await storage.createLabOrderSet(orderSetData);
    res.json(orderSet);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error creating order set:', error);
    res.status(500).json({ error: 'Failed to create order set' });
  }
});

// Track order set usage
router.post('/order-sets/:setCode/track-usage', async (req, res) => {
  try {
    await storage.trackLabOrderSetUsage(req.params.setCode);
    res.json({ success: true });
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error tracking order set usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Validate lab catalog
router.get('/validate', async (req, res) => {
  try {
    const user = req.user!;
    
    // Only admins can validate catalog
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can validate lab catalog' });
    }

    const validation = await labCatalogService.validateTestCatalog();
    res.json(validation);
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error validating catalog:', error);
    res.status(500).json({ error: 'Failed to validate catalog' });
  }
});

// Initialize default order sets
router.post('/order-sets/initialize-defaults', async (req, res) => {
  try {
    const user = req.user!;
    
    // Only admins can initialize defaults
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can initialize default order sets' });
    }

    await labCatalogService.createDefaultOrderSets();
    res.json({ success: true, message: 'Default order sets created' });
  } catch (error) {
    console.error('🚨 [LabCatalogRoutes] Error initializing default order sets:', error);
    res.status(500).json({ error: 'Failed to initialize default order sets' });
  }
});

export default router;