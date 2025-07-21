import { Router } from "express";
import { importUSHealthcareData, getUSHealthcareStats } from './texas-healthcare-data.js';
import { downloadNPPESData } from './download-nppes-data.js';

const router = Router();

// Import status tracking
interface ImportStatus {
  status: 'idle' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  errors: string[];
  startTime?: Date;
  endTime?: Date;
  totalRecords?: number;
  processedRecords?: number;
  successfulRecords?: number;
  failedRecords?: number;
}

let currentImportStatus: ImportStatus = {
  status: 'idle',
  progress: 0,
  message: 'Ready to start import',
  errors: []
};

// Import all US healthcare data from NPPES
router.post('/api/admin/import-us-healthcare-data', async (req, res) => {
  try {
    console.log('🏥 [Admin] Starting US healthcare data import...');
    
    // Reset import status
    currentImportStatus = {
      status: 'downloading',
      progress: 0,
      message: 'Starting healthcare data import...',
      errors: [],
      startTime: new Date()
    };
    
    // This is a long-running operation - respond immediately
    res.json({
      success: true,
      message: 'Healthcare data import started. This will take several hours to complete.',
      status: 'started'
    });

    // Start import process asynchronously with comprehensive error tracking
    importUSHealthcareData()
      .then(() => {
        console.log('✅ [Admin] US healthcare data import completed successfully');
        currentImportStatus.status = 'completed';
        currentImportStatus.progress = 100;
        currentImportStatus.message = 'Healthcare data import completed successfully';
        currentImportStatus.endTime = new Date();
      })
      .catch(error => {
        console.error('❌ [Admin] US healthcare data import failed:', error);
        
        currentImportStatus.status = 'failed';
        currentImportStatus.progress = 0;
        currentImportStatus.endTime = new Date();
        
        // Capture specific error types and provide helpful feedback
        if (error.message.includes('too small') || error.message.includes('bytes')) {
          currentImportStatus.message = 'Download failed: NPPES file appears to be corrupted or incomplete';
          currentImportStatus.errors.push('NPPES download URL may be incorrect or file is not available');
          currentImportStatus.errors.push('Check https://download.cms.gov/nppes/NPI_Files.html for current URLs');
        } else if (error.message.includes('violates not-null constraint')) {
          currentImportStatus.message = 'Data validation failed: Some records have missing required fields';
          currentImportStatus.errors.push('NPPES data contains records with missing required information (address, city, state, etc.)');
          currentImportStatus.errors.push('Consider updating data validation rules or NPPES data source');
        } else {
          currentImportStatus.message = `Import failed: ${error.message}`;
          currentImportStatus.errors.push(error.message);
        }
      });

  } catch (error: any) {
    console.error('❌ [Admin] Error starting healthcare data import:', error);
    currentImportStatus.status = 'failed';
    currentImportStatus.message = `Failed to start import: ${error.message}`;
    currentImportStatus.errors = [error.message];
    
    res.status(500).json({
      success: false,
      message: 'Failed to start healthcare data import',
      error: error.message
    });
  }
});

// Get current import status
router.get('/api/admin/import-status', (req, res) => {
  try {
    res.json({
      success: true,
      status: currentImportStatus
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get import status',
      error: error.message
    });
  }
});

// Get healthcare data statistics
router.get('/api/admin/healthcare-data-stats', async (req, res) => {
  try {
    const stats = await getUSHealthcareStats();
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error fetching healthcare data stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch healthcare data statistics',
      error: error.message
    });
  }
});

// Download NPPES data only (for testing)
router.post('/api/admin/download-nppes-data', async (req, res) => {
  try {
    console.log('📥 [Admin] Starting NPPES data download...');
    
    const csvPath = await downloadNPPESData();
    
    res.json({
      success: true,
      message: 'NPPES data downloaded successfully',
      csvPath
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error downloading NPPES data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download NPPES data',
      error: error.message
    });
  }
});

export default router;