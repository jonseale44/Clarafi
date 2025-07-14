import { Express } from 'express';
import { ClinicAdminVerificationService, ClinicAdminVerificationRequest } from './clinic-admin-verification-service';
import { z } from 'zod';

// Validation schema for admin verification request
const adminVerificationSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  organizationType: z.enum(['private_practice', 'clinic', 'hospital', 'health_system']),
  taxId: z.string().regex(/^\d{2}-\d{7}$/, 'Tax ID must be in format XX-XXXXXXX'),
  npiNumber: z.string().regex(/^\d{10}$/).optional(),
  businessLicense: z.string().optional(),
  medicalLicense: z.string().optional(),
  baaAccepted: z.boolean(),
  termsAccepted: z.boolean(),
  currentEmr: z.string().optional(),
  expectedProviderCount: z.number().min(1),
  expectedMonthlyPatientVolume: z.number().min(0)
});

export function registerAdminVerificationRoutes(app: Express) {
  console.log('✅ [AdminVerificationRoutes] Registering admin verification routes...');
  
  /**
   * Start admin verification process
   * This endpoint is PUBLIC - anyone can request to become an admin
   */
  app.post('/api/admin-verification/start', async (req, res) => {
    console.log('🎯 [AdminVerification] POST /api/admin-verification/start endpoint hit');
    console.log('📥 [AdminVerification] Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔐 [AdminVerification] Request headers:', req.headers);
    
    try {
      // Validate request data
      console.log('🔍 [AdminVerification] Validating request data with Zod schema...');
      const validatedData = adminVerificationSchema.parse(req.body);
      console.log('✅ [AdminVerification] Request data validated successfully');
      
      // Ensure legal agreements are accepted
      if (!validatedData.baaAccepted || !validatedData.termsAccepted) {
        console.log('⚠️ [AdminVerification] Legal agreements not accepted');
        return res.status(400).json({
          message: 'You must accept the Business Associate Agreement and Terms of Service'
        });
      }
      
      // Store IP and User Agent for security
      const request: ClinicAdminVerificationRequest = {
        ...validatedData,
      };
      
      console.log('🚀 [AdminVerification] Starting verification process...');
      const result = await ClinicAdminVerificationService.initiateAdminVerification(request);
      console.log('✅ [AdminVerification] Verification result:', result);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('❌ [AdminVerification] Error starting verification:', error);
      console.error('❌ [AdminVerification] Error stack:', error.stack);
      
      if (error instanceof z.ZodError) {
        console.error('❌ [AdminVerification] Zod validation errors:', error.errors);
        return res.status(400).json({
          message: 'Invalid request data',
          errors: error.errors
        });
      }
      
      res.status(400).json({
        message: error.message || 'Failed to start verification process'
      });
    }
  });
  
  /**
   * Complete manual verification (for higher-risk organizations)
   */
  app.post('/api/admin-verification/complete', async (req, res) => {
    try {
      const { verificationId, code, documents } = req.body;
      
      if (!verificationId || !code) {
        return res.status(400).json({
          message: 'Verification ID and code are required'
        });
      }
      
      const result = await ClinicAdminVerificationService.completeVerification(
        verificationId,
        code,
        documents || { signedBaaUrl: 'electronically-signed' }
      );
      
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('❌ [AdminVerification] Error completing verification:', error);
      res.status(400).json({
        message: error.message || 'Failed to complete verification'
      });
    }
  });
  
  /**
   * Check verification status
   */
  app.get('/api/admin-verification/status/:email', async (req, res) => {
    try {
      const { email } = req.params;
      
      const { db } = await import('./db');
      const { clinicAdminVerifications } = await import('../shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const verifications = await db.select({
        id: clinicAdminVerifications.id,
        status: clinicAdminVerifications.status,
        organizationName: clinicAdminVerifications.organizationName,
        submittedAt: clinicAdminVerifications.submittedAt,
        approvedAt: clinicAdminVerifications.approvedAt
      })
      .from(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.email, email))
      .orderBy(desc(clinicAdminVerifications.submittedAt))
      .limit(1);
      
      if (verifications.length === 0) {
        return res.status(404).json({
          message: 'No verification found for this email'
        });
      }
      
      res.json({
        success: true,
        verification: verifications[0]
      });
    } catch (error: any) {
      console.error('❌ [AdminVerification] Error checking status:', error);
      res.status(500).json({
        message: 'Failed to check verification status'
      });
    }
  });
  
  /**
   * Get available organization types and their requirements
   */
  app.get('/api/admin-verification/organization-types', (req, res) => {
    res.json({
      types: [
        {
          value: 'private_practice',
          label: 'Private Practice',
          description: 'Individual or small group practice (1-5 providers)',
          requirements: {
            npi: 'optional',
            businessLicense: 'optional',
            medicalLicense: 'recommended',
            typicalApprovalTime: 'Instant for low-risk'
          }
        },
        {
          value: 'clinic',
          label: 'Medical Clinic',
          description: 'Multi-specialty clinic or urgent care (5-50 providers)',
          requirements: {
            npi: 'required',
            businessLicense: 'required',
            medicalLicense: 'optional',
            typicalApprovalTime: '1-2 business days'
          }
        },
        {
          value: 'hospital',
          label: 'Hospital',
          description: 'Hospital or medical center (50+ providers)',
          requirements: {
            npi: 'required',
            businessLicense: 'required',
            medicalLicense: 'optional',
            typicalApprovalTime: '2-5 business days'
          }
        },
        {
          value: 'health_system',
          label: 'Health System',
          description: 'Multi-facility health system',
          requirements: {
            npi: 'required',
            businessLicense: 'required',
            medicalLicense: 'optional',
            typicalApprovalTime: '5-10 business days'
          }
        }
      ]
    });
  });

  // Development endpoints for testing
  if (process.env.NODE_ENV === 'development') {
    // Clear test data endpoint
    app.delete('/api/admin-verification/clear-test-data', async (req, res) => {
      try {
        console.log('🧹 [AdminVerification] Clearing test verification data...');
        
        // Clear test health systems with test tax IDs
        const deletedHealthSystems = await db.delete(healthSystems)
          .where(eq(healthSystems.taxId, '12-3456789'))
          .returning();
        
        console.log(`✅ [AdminVerification] Cleared ${deletedHealthSystems.length} health systems`);
        
        res.json({
          success: true,
          deletedHealthSystems: deletedHealthSystems.length
        });
      } catch (error) {
        console.error('❌ [AdminVerification] Error clearing test data:', error);
        res.status(500).json({ error: 'Failed to clear test data' });
      }
    });
    
    // Clear verification by email
    app.delete('/api/admin-verification/clear-by-email/:email', async (req, res) => {
      try {
        const { email } = req.params;
        console.log('🧹 [AdminVerification] Clearing verification for email:', email);
        
        const deletedVerifications = await db.delete(clinicAdminVerifications)
          .where(eq(clinicAdminVerifications.email, email))
          .returning();
        
        console.log(`✅ [AdminVerification] Cleared ${deletedVerifications.length} verifications`);
        
        res.json({
          success: true,
          deletedVerifications: deletedVerifications.length
        });
      } catch (error) {
        console.error('❌ [AdminVerification] Error clearing verification by email:', error);
        res.status(500).json({ error: 'Failed to clear verification' });
      }
    });
  }
}