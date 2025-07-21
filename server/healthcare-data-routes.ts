import { Router } from "express";
import { importUSHealthcareData, getUSHealthcareStats } from './texas-healthcare-data.js';
import { downloadNPPESData } from './download-nppes-data.js';

const router = Router();

// Import all US healthcare data from NPPES
router.post('/api/admin/import-us-healthcare-data', async (req, res) => {
  try {
    console.log('🏥 [Admin] Starting US healthcare data import...');
    
    // This is a long-running operation - respond immediately
    res.json({
      success: true,
      message: 'Healthcare data import started. This will take several hours to complete.',
      status: 'started'
    });

    // Start import process asynchronously with better error handling
    importUSHealthcareData()
      .then(() => {
        console.log('✅ [Admin] US healthcare data import completed successfully');
      })
      .catch(error => {
        console.error('❌ [Admin] US healthcare data import failed:', error);
        
        // Log specific error details for troubleshooting
        if (error.message.includes('too small') || error.message.includes('bytes')) {
          console.error('💡 [Admin] This suggests the NPPES download URL may be incorrect or the file is not available');
          console.error('💡 [Admin] Check https://download.cms.gov/nppes/NPI_Files.html for current URLs');
        }
      });

  } catch (error: any) {
    console.error('❌ [Admin] Error starting healthcare data import:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start healthcare data import',
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