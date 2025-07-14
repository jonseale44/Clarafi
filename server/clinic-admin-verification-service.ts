import { db } from './db';
import { healthSystems, users, clinicAdminVerifications, organizationDocuments } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { EmailVerificationService } from './email-verification-service';
import { OpenAI } from 'openai';
import { VerificationAPIs } from './verification-apis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ClinicAdminVerificationRequest {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string; // e.g., "Practice Administrator", "Medical Director"
  
  // Organization Information
  organizationName: string;
  organizationType: 'private_practice' | 'clinic' | 'hospital' | 'health_system';
  taxId: string; // EIN for verification
  npiNumber?: string; // Organization NPI if applicable
  
  // Organization Address (required for verification)
  address: string;
  city: string;
  state: string;
  zip: string;
  website?: string;
  
  // Verification Documents
  businessLicense?: string; // Business license number
  medicalLicense?: string; // Medical license if physician admin
  
  // Legal Agreement
  baaAccepted: boolean;
  termsAccepted: boolean;
  
  // Additional Context
  currentEmr?: string; // What EMR they're switching from
  expectedProviderCount: number;
  expectedMonthlyPatientVolume: number;
}

interface AutomatedVerificationResult {
  approved: boolean;
  riskScore: number; // 0-100, lower is better
  verificationDetails: {
    organizationValid: boolean;
    taxIdValid: boolean;
    npiValid: boolean;
    personnelValid: boolean;
    businessSizeAppropriate: boolean;
    addressValid?: boolean;
    domainVerified?: boolean;
    googleTrustScore?: number;
  };
  recommendations: string[];
  requiresManualReview: boolean;
  automatedDecisionReason: string;
  apiVerificationData?: any; // Detailed API results for audit trail
}

export class ClinicAdminVerificationService {
  /**
   * Fully automated clinic administrator verification using GPT-4
   * Instant approval for low-risk organizations, minimal manual review
   */
  static async initiateAdminVerification(request: ClinicAdminVerificationRequest) {
    console.log('🏥 [AdminVerification] Starting automated clinic admin verification');
    console.log('📊 [AdminVerification] Request details:', {
      organizationName: request.organizationName,
      organizationType: request.organizationType,
      taxId: request.taxId,
      email: request.email,
      expectedProviders: request.expectedProviderCount,
      expectedPatientVolume: request.expectedMonthlyPatientVolume
    });
    
    // Step 1: GPT-powered automated verification
    console.log('🤖 [AdminVerification] Calling GPT-4 for automated verification...');
    const automatedResult = await this.performAutomatedVerification(request);
    console.log(`✅ [AdminVerification] Automated verification complete - Risk Score: ${automatedResult.riskScore}`);
    console.log('📋 [AdminVerification] Verification details:', automatedResult);
    
    // Step 2: Basic format validation
    console.log('🔐 [AdminVerification] Validating organization credentials...');
    const orgValidation = await this.validateOrganization(request);
    if (!orgValidation.valid) {
      console.error('❌ [AdminVerification] Organization validation failed:', orgValidation.reason);
      throw new Error(`Organization validation failed: ${orgValidation.reason}`);
    }
    console.log('✅ [AdminVerification] Organization credentials validated');
    
    // Step 3: Check for duplicate requests
    console.log('🔍 [AdminVerification] Checking for existing verification requests...');
    let existingVerification;
    try {
      existingVerification = await db.select()
        .from(clinicAdminVerifications)
        .where(eq(clinicAdminVerifications.email, request.email))
        .limit(1);
      console.log('✅ [AdminVerification] Database query successful, found', existingVerification.length, 'existing verifications');
    } catch (dbError: any) {
      console.error('❌ [AdminVerification] Database error checking existing verifications:', dbError.message);
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    if (existingVerification.length > 0 && existingVerification[0].status === 'pending') {
      console.log('⚠️ [AdminVerification] Duplicate request detected for email:', request.email);
      throw new Error('A verification request is already pending for this email');
    }
    
    // Step 4: Generate secure verification token
    const verificationCode = this.generateSecureVerificationCode();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days to complete verification
    
    // Step 5: Create verification record
    console.log('💾 [AdminVerification] Creating verification record in database...');
    const verificationData = {
      email: request.email,
      organizationName: request.organizationName,
      verificationCode,
      verificationData: {
        ...request,
        automatedVerificationResult: automatedResult
      },
      status: automatedResult.approved && automatedResult.riskScore < 20 ? 'auto-approved' : 'pending',
      expiresAt: expires,
      submittedAt: new Date()
    };
    
    console.log('📋 [AdminVerification] Verification record data:', {
      email: verificationData.email,
      organizationName: verificationData.organizationName,
      status: verificationData.status,
      riskScore: automatedResult.riskScore,
      approved: automatedResult.approved
    });
    
    let verification;
    try {
      const result = await db.insert(clinicAdminVerifications).values(verificationData).returning();
      verification = result[0];
      console.log('✅ [AdminVerification] Verification record created successfully with ID:', verification.id);
    } catch (insertError: any) {
      console.error('❌ [AdminVerification] Database error inserting verification record:', insertError.message);
      console.error('❌ [AdminVerification] Full error:', insertError);
      throw new Error(`Failed to create verification record: ${insertError.message}`);
    }
    
    // Step 6: Handle automated approval for low-risk organizations
    if (automatedResult.approved && automatedResult.riskScore < 20) {
      console.log(`✅ [AdminVerification] Auto-approved low-risk organization: ${request.organizationName}`);
      
      // Automatically create the health system and admin account
      const result = await this.completeVerification(
        verification.id,
        verificationCode,
        {
          signedBaaUrl: 'auto-accepted-baa', // Electronic BAA acceptance
          businessLicenseUrl: request.businessLicense || 'verified-via-api',
          medicalLicenseUrl: request.medicalLicense || 'verified-via-api'
        }
      );
      
      return {
        verificationId: verification.id,
        message: 'Congratulations! Your organization has been automatically approved. Check your email for login credentials.',
        expiresAt: expires,
        autoApproved: true,
        ...result
      };
    }
    
    // Step 7: Send verification for higher-risk organizations
    await this.sendVerificationNotifications(request, verificationCode);
    
    // Step 8: Log for compliance
    console.log(`📋 [AdminVerification] Manual verification required for ${request.organizationName} - Risk Score: ${automatedResult.riskScore}`);
    
    return {
      verificationId: verification.id,
      message: automatedResult.riskScore < 50 
        ? 'Your application looks good! Complete the quick verification process in your email.'
        : 'Verification required. Please check your email for next steps.',
      expiresAt: expires,
      riskScore: automatedResult.riskScore,
      recommendations: automatedResult.recommendations,
      // Reviewer recommendations are stored in database for internal use only
      // They are not sent to the applicant
    };
  }
  
  /**
   * Production-ready automated verification using real data sources
   * Combines multiple APIs for comprehensive verification
   */
  static async performAutomatedVerification(request: ClinicAdminVerificationRequest): Promise<AutomatedVerificationResult> {
    console.log('🔍 [Verification] Starting comprehensive automated verification...');
    
    try {
      // Step 1: Run comprehensive API verifications
      const apiResults = await VerificationAPIs.performComprehensiveVerification({
        organizationName: request.organizationName,
        address: request.address,
        city: request.city,
        state: request.state,
        zip: request.zip,
        npi: request.npiNumber,
        email: request.email,
        phone: request.phone,
        website: request.website,
        taxId: request.taxId
      });
      
      console.log('📊 [Verification] API verification results:', {
        overallScore: apiResults.overallScore,
        googleVerified: apiResults.googleVerification?.verified,
        npiVerified: apiResults.npiVerification?.verified,
        emailVerified: apiResults.emailVerification?.verified,
        addressVerified: apiResults.addressVerification?.verified
      });
      
      // Step 2: Calculate risk score (inverse of verification score)
      const riskScore = 100 - apiResults.overallScore;
      
      // Step 3: Determine approval based on comprehensive criteria
      const approved = this.determineApproval(apiResults, request);
      
      // Step 4: Generate detailed verification report
      const verificationDetails = {
        organizationValid: apiResults.googleVerification?.verified || false,
        taxIdValid: apiResults.einVerification?.verified || false,
        npiValid: apiResults.npiVerification?.verified || false,
        personnelValid: apiResults.emailVerification?.verified || false,
        businessSizeAppropriate: this.validateBusinessSize(request),
        addressValid: apiResults.addressVerification?.verified || false,
        domainVerified: apiResults.emailVerification?.data?.domain === request.website?.replace(/^https?:\/\//, ''),
        googleTrustScore: apiResults.googleVerification?.data?.trustScore || 0
      };
      
      // Step 5: Use GPT for final risk assessment and recommendations
      const gptAssessment = await this.getGPTRiskAssessment(request, apiResults);
      
      // Only include applicant-facing recommendations from both sources
      const applicantRecommendations = [
        ...apiResults.recommendations, // These are already applicant-focused from API verifications
        ...gptAssessment.applicantRecommendations // These are explicitly for the applicant from GPT
      ];
      
      return {
        approved,
        riskScore,
        verificationDetails,
        recommendations: applicantRecommendations, // Only applicant-facing recommendations
        reviewerRecommendations: gptAssessment.reviewerRecommendations, // Stored for internal use
        requiresManualReview: riskScore > 30 || apiResults.riskFactors.length > 2,
        automatedDecisionReason: this.generateDecisionReason(apiResults, approved, riskScore),
        apiVerificationData: apiResults
      };
      
    } catch (error: any) {
      console.error('❌ [Verification] Error in automated verification:', error);
      throw new Error(`Automated verification failed: ${error.message}`);
    }
  }
  
  /**
   * Determine approval based on comprehensive API verification results
   */
  private static determineApproval(apiResults: any, request: ClinicAdminVerificationRequest): boolean {
    // Must have at least 3 successful verifications
    let successfulVerifications = 0;
    
    if (apiResults.googleVerification?.verified) successfulVerifications++;
    if (apiResults.npiVerification?.verified) successfulVerifications++;
    if (apiResults.emailVerification?.verified) successfulVerifications++;
    if (apiResults.addressVerification?.verified) successfulVerifications++;
    if (apiResults.einVerification?.verified) successfulVerifications++;
    
    // Small practices (1-5 providers) need fewer verifications
    if (request.organizationType === 'private_practice' && request.expectedProviderCount <= 5) {
      return successfulVerifications >= 2 && apiResults.overallScore >= 50;
    }
    
    // Larger organizations need more verification
    return successfulVerifications >= 3 && apiResults.overallScore >= 70;
  }
  
  /**
   * Validate business size is appropriate for organization type
   */
  private static validateBusinessSize(request: ClinicAdminVerificationRequest): boolean {
    const sizeRanges = {
      private_practice: { min: 1, max: 10 },
      clinic: { min: 5, max: 50 },
      hospital: { min: 20, max: 500 },
      health_system: { min: 50, max: 10000 }
    };
    
    const range = sizeRanges[request.organizationType];
    return request.expectedProviderCount >= range.min && request.expectedProviderCount <= range.max;
  }
  
  /**
   * Generate human-readable decision reason based on verification results
   */
  private static generateDecisionReason(apiResults: any, approved: boolean, riskScore: number): string {
    const verifiedSources: string[] = [];
    const failedSources: string[] = [];
    
    if (apiResults.googleVerification?.verified) {
      verifiedSources.push(`Google verified business at ${apiResults.googleVerification.data.verifiedAddress}`);
    } else {
      failedSources.push('Google business verification');
    }
    
    if (apiResults.npiVerification?.verified) {
      verifiedSources.push(`NPI registry confirmed (${apiResults.npiVerification.data.primarySpecialty})`);
    } else if (apiResults.npiVerification) {
      failedSources.push('NPI verification');
    }
    
    if (apiResults.emailVerification?.verified) {
      verifiedSources.push('Organizational email verified');
    } else {
      failedSources.push('Email domain verification');
    }
    
    if (apiResults.einVerification?.verified) {
      verifiedSources.push(`EIN/Tax ID verified with IRS (${apiResults.einVerification.matchDescription})`);
    } else if (apiResults.einVerification) {
      failedSources.push('EIN/Tax ID verification');
    }
    
    if (apiResults.addressVerification?.verified) {
      verifiedSources.push('Business address confirmed');
    } else {
      failedSources.push('Address verification');
    }
    
    if (approved) {
      return `Approved based on successful verification from ${verifiedSources.length} sources: ${verifiedSources.join(', ')}. Risk score: ${riskScore}/100.`;
    } else {
      return `Manual review required. Failed verifications: ${failedSources.join(', ')}. Risk score: ${riskScore}/100. ${apiResults.riskFactors.join('. ')}`;
    }
  }
  
  /**
   * Use GPT for intelligent risk assessment based on API results
   */
  private static async getGPTRiskAssessment(request: ClinicAdminVerificationRequest, apiResults: any) {
    try {
      const prompt = `
You are an EMR system administrator verification AI. Analyze this clinic administrator application and the comprehensive API verification results to provide additional risk assessment.

Application Details:
- Administrator: ${request.firstName} ${request.lastName}, ${request.title}
- Email: ${request.email}
- Organization: ${request.organizationName}
- Type: ${request.organizationType}
- Tax ID (EIN): ${request.taxId}
- NPI: ${request.npiNumber || 'Not provided'}
- Address: ${request.address}, ${request.city}, ${request.state} ${request.zip}
- Website: ${request.website || 'Not provided'}
- Current EMR: ${request.currentEmr || 'None'}
- Expected Providers: ${request.expectedProviderCount}
- Monthly Patient Volume: ${request.expectedMonthlyPatientVolume}

API Verification Results:
- Overall Score: ${apiResults.overallScore}/100
- Google Business Verified: ${apiResults.googleVerification?.verified ? 'Yes' : 'No'} ${apiResults.googleVerification?.data?.verifiedAddress ? `(${apiResults.googleVerification.data.verifiedAddress})` : ''}
- NPI Registry Verified: ${apiResults.npiVerification?.verified ? 'Yes' : 'No'} ${apiResults.npiVerification?.data?.primarySpecialty ? `(${apiResults.npiVerification.data.primarySpecialty})` : ''}
- Email Domain Verified: ${apiResults.emailVerification?.verified ? 'Yes' : 'No'}
- Address Verified: ${apiResults.addressVerification?.verified ? 'Yes' : 'No'}
- Risk Factors: ${apiResults.riskFactors.join(', ') || 'None identified'}

Additional Context to Consider:
1. Does the administrator's title match the organization type?
2. Is the expected provider count reasonable for the organization type?
3. Does the patient volume align with the provider count?
4. Are there any red flags or inconsistencies in the application?
5. Should we recommend any additional verification steps?

Return a JSON object with:
{
  "applicantRecommendations": string[],  // Things the APPLICANT can do to improve their verification (e.g., "Register with Google My Business", "Use organizational email")
  "reviewerRecommendations": string[]    // Things the SYSTEM REVIEWER should check manually (e.g., "Verify NPI in database", "Request documentation")
}

IMPORTANT: 
- applicantRecommendations should be actionable steps the clinic admin can take themselves
- reviewerRecommendations should be verification steps for Clarafi staff reviewing the application
Keep recommendations concise and specific.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        applicantRecommendations: result.applicantRecommendations || [],
        reviewerRecommendations: result.reviewerRecommendations || []
      };
    } catch (error) {
      console.error('❌ [AdminVerification] GPT verification failed:', error);
      // Default to manual review if GPT fails
      return {
        approved: false,
        riskScore: 75,
        verificationDetails: {
          organizationValid: false,
          taxIdValid: false,
          npiValid: false,
          personnelValid: false,
          businessSizeAppropriate: false
        },
        applicantRecommendations: ['Contact support if verification continues to fail'],
        reviewerRecommendations: ['Manual review required due to automated verification failure'],
        requiresManualReview: true,
        automatedDecisionReason: 'Automated verification unavailable'
      };
    }
  }
  
  /**
   * Validate organization credentials against external sources
   * In production, this would integrate with:
   * - IRS API for EIN validation
   * - NPPES API for NPI validation
   * - State licensing boards for medical licenses
   */
  static async validateOrganization(request: ClinicAdminVerificationRequest) {
    const validations = [];
    
    // Validate Tax ID format (EIN: XX-XXXXXXX)
    const einRegex = /^\d{2}-\d{7}$/;
    if (!einRegex.test(request.taxId)) {
      return { valid: false, reason: 'Invalid EIN format' };
    }
    
    // Validate NPI if provided (10 digits)
    if (request.npiNumber) {
      const npiRegex = /^\d{10}$/;
      if (!npiRegex.test(request.npiNumber)) {
        return { valid: false, reason: 'Invalid NPI format' };
      }
    }
    
    // Check if organization already exists
    const existingOrg = await db.select()
      .from(healthSystems)
      .where(eq(healthSystems.taxId, request.taxId))
      .limit(1);
      
    if (existingOrg.length > 0) {
      return { valid: false, reason: 'Organization already registered' };
    }
    
    // In production: Call external APIs for verification
    // const irsValidation = await this.validateWithIRS(request.taxId);
    // const npiValidation = await this.validateWithNPPES(request.npiNumber);
    
    return { valid: true };
  }
  
  /**
   * Generate cryptographically secure 6-digit verification code
   */
  static generateSecureVerificationCode(): string {
    // Generate 6 random digits
    return crypto.randomInt(100000, 999999).toString();
  }
  
  /**
   * Send verification through multiple channels for security
   */
  static async sendVerificationNotifications(
    request: ClinicAdminVerificationRequest, 
    code: string
  ) {
    // Email verification with detailed instructions
    await this.sendAdminVerificationEmail(request, code);
    
    // In production: Also send SMS verification
    // await this.sendAdminVerificationSMS(request.phone, code);
    
    // In production: Create a verification dashboard entry
    // await this.createVerificationDashboardEntry(request);
  }
  
  /**
   * Send professional admin verification email
   */
  static async sendAdminVerificationEmail(
    request: ClinicAdminVerificationRequest,
    code: string
  ) {
    const emailContent = {
      to: request.email,
      subject: 'Clarafi EMR Administrator Verification Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #003366; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Clarafi EMR</h1>
            <p style="margin: 10px 0 0 0;">Administrator Account Verification</p>
          </div>
          
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #003366;">Hello ${request.firstName} ${request.lastName},</h2>
            
            <p>Thank you for requesting administrator access for <strong>${request.organizationName}</strong>.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #003366; margin-top: 0;">Your Verification Code:</h3>
              <div style="font-size: 32px; font-weight: bold; color: #FFD700; text-align: center; 
                          padding: 20px; background-color: #003366; border-radius: 5px;">
                ${code}
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/admin-verification-complete" 
                   style="background-color: #FFD700; color: #003366; padding: 15px 30px; text-decoration: none; 
                          border-radius: 5px; font-weight: bold; display: inline-block;">
                  Complete Verification
                </a>
              </div>
            </div>
            
            <h3 style="color: #003366;">Next Steps:</h3>
            <ol>
              <li>
                <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/admin-verification-complete" 
                   style="color: #003366; font-weight: bold;">
                  Click here to complete identity verification
                </a> using the code above
              </li>
              <li>Upload required documentation:
                <ul>
                  <li>Business license or incorporation documents</li>
                  <li>Proof of medical practice (if applicable)</li>
                  <li>Signed Business Associate Agreement (BAA)</li>
                </ul>
              </li>
              <li>Schedule an onboarding call with our implementation team</li>
            </ol>
            
            <p><strong>Important:</strong> This verification code expires in 7 days.</p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; 
                        border-radius: 5px; margin: 20px 0;">
              <strong>Security Notice:</strong> Administrator accounts have full access to patient 
              data and system configuration. This verification process ensures HIPAA compliance 
              and protects patient privacy.
            </div>
            
            <p>If you have questions, please contact our implementation team at 
               <a href="mailto:implementation@clarafi.com">implementation@clarafi.com</a> 
               or call 1-800-CLARAFI.</p>
          </div>
          
          <div style="background-color: #003366; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 12px;">
              This email contains confidential information. If you received this in error, 
              please delete it and notify us immediately.
            </p>
          </div>
        </div>
      `,
      text: `
        Clarafi EMR Administrator Verification
        
        Hello ${request.firstName} ${request.lastName},
        
        Your verification code is: ${code}
        
        This code expires in 7 days.
        
        Next steps:
        1. Complete identity verification
        2. Upload required documentation
        3. Schedule onboarding call
        
        Contact: implementation@clarafi.com or 1-800-CLARAFI
      `
    };
    
    // Use existing email service
    const { MailService } = await import('@sendgrid/mail');
    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY!);
    
    await mailService.send({
      ...emailContent,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@clarafi.com'
    });
  }
  
  /**
   * Complete the verification process and create admin account
   * Handles both auto-approved and manual verification flows
   */
  static async completeVerification(
    verificationId: number,
    code: string,
    documents: {
      businessLicenseUrl?: string;
      medicalLicenseUrl?: string;
      signedBaaUrl: string;
    }
  ) {
    // Get verification record
    const [verification] = await db.select()
      .from(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.id, verificationId))
      .limit(1);
      
    if (!verification) {
      throw new Error('Verification request not found');
    }
    
    // Allow processing for both pending and auto-approved statuses
    if (verification.status !== 'pending' && verification.status !== 'auto-approved') {
      throw new Error('Verification already processed');
    }
    
    if (new Date() > verification.expiresAt) {
      throw new Error('Verification code expired');
    }
    
    // Skip code validation for auto-approved cases
    if (verification.status !== 'auto-approved' && verification.verificationCode !== code) {
      // Log failed attempt for security
      await this.logFailedVerification(verificationId);
      throw new Error('Invalid verification code');
    }
    
    // Validate required documents (relaxed for auto-approved)
    if (!documents.signedBaaUrl && verification.status !== 'auto-approved') {
      throw new Error('Signed BAA is required');
    }
    
    const verificationData = verification.verificationData as ClinicAdminVerificationRequest;
    
    // Create health system
    const [healthSystem] = await db.insert(healthSystems).values({
      name: verificationData.organizationName,
      shortName: verificationData.organizationName.substring(0, 10),
      systemType: verificationData.organizationType,
      taxId: verificationData.taxId,
      npi: verificationData.npiNumber,
      subscriptionTier: 2, // Start as enterprise
      subscriptionStatus: 'trial', // 30-day trial period
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      primaryContact: `${verificationData.firstName} ${verificationData.lastName}`,
      email: verificationData.email,
      phone: verificationData.phone
    }).returning();
    
    // Store verification documents
    await db.insert(organizationDocuments).values({
      healthSystemId: healthSystem.id,
      documentType: 'baa',
      documentUrl: documents.signedBaaUrl,
      uploadedAt: new Date(),
      verifiedAt: new Date()
    });
    
    // Update verification status
    await db.update(clinicAdminVerifications)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        healthSystemId: healthSystem.id
      })
      .where(eq(clinicAdminVerifications.id, verificationId));
    
    // Create admin user account
    const tempPassword = this.generateTemporaryPassword();
    const { hashPassword } = await import('./auth');
    
    const [adminUser] = await db.insert(users).values({
      username: verificationData.email.split('@')[0],
      email: verificationData.email,
      password: await hashPassword(tempPassword),
      firstName: verificationData.firstName,
      lastName: verificationData.lastName,
      role: 'admin',
      healthSystemId: healthSystem.id,
      emailVerified: true, // Pre-verified through this process
      verificationStatus: 'admin_verified',
      twoFactorRequired: true, // Enforce 2FA for admins
      mustChangePassword: true // Force password change on first login
    }).returning();
    
    // Send welcome email with credentials
    await this.sendAdminWelcomeEmail(verificationData, tempPassword);
    
    // Schedule implementation call
    await this.scheduleImplementationCall(healthSystem.id, verificationData);
    
    console.log(`✅ [AdminVerification] Admin account created for ${verificationData.organizationName}`);
    
    return {
      success: true,
      healthSystemId: healthSystem.id,
      userId: adminUser.id,
      message: 'Administrator account created. Check your email for login credentials.'
    };
  }
  
  /**
   * Generate secure temporary password
   */
  static generateTemporaryPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(crypto.randomInt(0, charset.length));
    }
    
    return password;
  }
  
  /**
   * Log failed verification attempts for security monitoring
   */
  static async logFailedVerification(verificationId: number) {
    // In production: Log to security monitoring system
    console.warn(`⚠️  [AdminVerification] Failed verification attempt for ID: ${verificationId}`);
  }
  
  /**
   * Send welcome email to new admin
   */
  static async sendAdminWelcomeEmail(
    admin: ClinicAdminVerificationRequest,
    tempPassword: string
  ) {
    // Implementation would send professional onboarding email
    console.log(`📧 [AdminVerification] Sending welcome email to ${admin.email}`);
  }
  
  /**
   * Schedule implementation call with new admin
   */
  static async scheduleImplementationCall(
    healthSystemId: number,
    admin: ClinicAdminVerificationRequest
  ) {
    // In production: Integrate with calendar system
    console.log(`📅 [AdminVerification] Scheduling implementation call for ${admin.organizationName}`);
  }

  /**
   * Get verification status by email
   */
  static async getVerificationStatus(email: string) {
    
    const verification = await db.select()
      .from(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.email, email))
      .orderBy(desc(clinicAdminVerifications.submittedAt))
      .limit(1);
      
    if (verification.length === 0) {
      return {
        exists: false,
        status: null
      };
    }
    
    return {
      exists: true,
      status: verification[0].status,
      organizationName: verification[0].organizationName,
      submittedAt: verification[0].submittedAt,
      approvedAt: verification[0].approvedAt
    };
  }

  /**
   * Get all verification requests for Clarafi staff review
   */
  static async getAllVerificationRequests() {
    const requests = await db.select()
      .from(clinicAdminVerifications)
      .orderBy(desc(clinicAdminVerifications.submittedAt));
      
    // Parse JSON fields and format for frontend
    return requests.map(req => ({
      ...req,
      apiVerificationData: req.apiVerificationData as any,
      applicantRecommendations: req.applicantRecommendations as string[],
      reviewerRecommendations: req.reviewerRecommendations as string[],
      automatedDecisionReason: req.automatedDecisionReason || '',
      reviewerNotes: req.reviewerNotes || ''
    }));
  }

  /**
   * Process manual review decision by Clarafi staff
   */
  static async manualReview(
    verificationId: number, 
    decision: 'approve' | 'reject', 
    notes: string,
    reviewerId: number
  ) {
    // Get the verification request
    const verification = await db.select()
      .from(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.id, verificationId))
      .limit(1);
      
    if (verification.length === 0) {
      throw new Error('Verification request not found');
    }
    
    const request = verification[0];
    
    // Update verification status
    await db.update(clinicAdminVerifications)
      .set({
        status: decision === 'approve' ? 'approved' : 'rejected',
        approvedAt: decision === 'approve' ? new Date() : null,
        reviewedBy: reviewerId,
        reviewerNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(clinicAdminVerifications.id, verificationId));
    
    // If approved, create the admin account and health system
    if (decision === 'approve') {
      try {
        // Create the health system and admin user
        const result = await this.createApprovedAdminAccount(request);
        
        // Send approval email
        await this.sendDecisionEmail(request.email, 'approved', {
          organizationName: request.organizationName,
          loginUrl: 'https://clarafi.ai/login'
        });
        
        return {
          success: true,
          decision: 'approved',
          healthSystemId: result.healthSystemId,
          adminUserId: result.adminUserId
        };
      } catch (error: any) {
        // If account creation fails, revert the approval
        await db.update(clinicAdminVerifications)
          .set({
            status: 'pending',
            approvedAt: null,
            reviewerNotes: `Approval failed: ${error.message}`
          })
          .where(eq(clinicAdminVerifications.id, verificationId));
          
        throw new Error(`Failed to create admin account: ${error.message}`);
      }
    } else {
      // Send rejection email
      await this.sendDecisionEmail(request.email, 'rejected', {
        organizationName: request.organizationName,
        reason: notes
      });
      
      return {
        success: true,
        decision: 'rejected'
      };
    }
  }

  /**
   * Send communication to applicant
   */
  static async sendCommunication(
    verificationId: number,
    message: string,
    senderId: number
  ) {
    // Get the verification request
    const verification = await db.select()
      .from(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.id, verificationId))
      .limit(1);
      
    if (verification.length === 0) {
      throw new Error('Verification request not found');
    }
    
    const request = verification[0];
    
    // Send email to applicant
    await EmailVerificationService.sendEmail({
      to: request.email,
      subject: `Update on your Clarafi EMR admin verification`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366;">Update on Your Verification Request</h2>
          <p>Dear ${request.firstName} ${request.lastName},</p>
          <p>We have an update regarding your admin verification request for ${request.organizationName}:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">${message}</p>
          </div>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>The Clarafi Team</p>
        </div>
      `
    });
    
    // Log the communication
    console.log(`📧 [AdminVerification] Sent communication to ${request.email} for verification ${verificationId}`);
    
    return {
      success: true,
      message: 'Communication sent successfully'
    };
  }

  /**
   * Send decision email (internal helper)
   */
  private static async sendDecisionEmail(
    email: string, 
    decision: 'approved' | 'rejected',
    details: any
  ) {
    const subject = decision === 'approved' 
      ? `Welcome to Clarafi EMR - Your admin account is ready!`
      : `Update on your Clarafi EMR admin verification`;
      
    const html = decision === 'approved' ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #003366;">Welcome to Clarafi EMR!</h2>
        <p>Congratulations! Your admin account for ${details.organizationName} has been approved.</p>
        <p>You can now log in at: <a href="${details.loginUrl}">${details.loginUrl}</a></p>
        <p>As an administrator, you can:</p>
        <ul>
          <li>Add providers and staff members</li>
          <li>Configure your organization settings</li>
          <li>Generate subscription keys for your team</li>
          <li>Manage user permissions and access</li>
        </ul>
        <p>If you need any assistance, our support team is here to help.</p>
        <p>Best regards,<br>The Clarafi Team</p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #003366;">Verification Request Update</h2>
        <p>Thank you for your interest in Clarafi EMR.</p>
        <p>After reviewing your admin verification request for ${details.organizationName}, 
           we were unable to approve it at this time.</p>
        ${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}
        <p>If you believe this decision was made in error or if you have additional 
           documentation to provide, please contact our support team.</p>
        <p>Best regards,<br>The Clarafi Team</p>
      </div>
    `;
    
    await EmailVerificationService.sendEmail({ to: email, subject, html });
  }

  /**
   * Create approved admin account (internal helper)
   */
  private static async createApprovedAdminAccount(verification: any) {
    console.log('🔧 [AdminVerification] Starting createApprovedAdminAccount for:', verification.organizationName);
    
    const { db } = await import('./db');
    const { healthSystems, organizations, locations, users } = await import('../shared/schema');
    const { hashPassword } = await import('./auth');
    
    console.log('📦 [AdminVerification] Imports successful, generating temporary password...');
    
    // Generate a temporary password
    const tempPassword = 'ChangeMe123!';
    const hashedPassword = await hashPassword(tempPassword);
    
    console.log('🔐 [AdminVerification] Password hashed successfully');
    
    // Create health system, organization, location, and admin user
    const result = await db.transaction(async (tx) => {
      console.log('💾 [AdminVerification] Starting database transaction...');
      
      // Create health system
      console.log('🏥 [AdminVerification] Creating health system:', {
        name: verification.organizationName,
        type: verification.organizationType,
        tier: 2
      });
      
      const [healthSystem] = await tx
        .insert(healthSystems)
        .values({
          name: verification.organizationName,
          shortName: verification.organizationName.substring(0, 20),
          systemType: verification.organizationType,
          subscriptionTier: 2, // Enterprise tier for admin-created systems
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          primaryContact: `${verification.firstName} ${verification.lastName}`,
          email: verification.email,
          phone: verification.phone || null,
          npi: verification.npiNumber || null,
          taxId: verification.taxId || null,
          website: verification.website || null,
        })
        .returning();
        
      console.log('✅ [AdminVerification] Health system created with ID:', healthSystem.id);
        
      // Create default organization
      console.log('🏢 [AdminVerification] Creating organization...');
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: verification.organizationName,
          healthSystemId: healthSystem.id,
          primaryContact: `${verification.firstName} ${verification.lastName}`,
          email: verification.email,
          phone: verification.phone || null,
        })
        .returning();
        
      console.log('✅ [AdminVerification] Organization created with ID:', organization.id);
        
      // Create default location
      console.log('📍 [AdminVerification] Creating location...');
      const [location] = await tx
        .insert(locations)
        .values({
          name: `${verification.organizationName} - Main`,
          organizationId: organization.id,
          healthSystemId: healthSystem.id,
          address: verification.address,
          city: verification.city,
          state: verification.state,
          zip: verification.zip,
          phone: verification.phone || null,
          isActive: true,
          locationType: 'primary',
        })
        .returning();
        
      console.log('✅ [AdminVerification] Location created with ID:', location.id);
        
      // Create admin user
      console.log('👤 [AdminVerification] Creating admin user...');
      const username = verification.email.split('@')[0];
      console.log('👤 [AdminVerification] Username will be:', username);
      
      const [adminUser] = await tx
        .insert(users)
        .values({
          username: verification.email.split('@')[0], // Use email prefix as username
          email: verification.email,
          password: hashedPassword,
          healthSystemId: healthSystem.id,
          firstName: verification.firstName,
          lastName: verification.lastName,
          role: 'admin',
          npi: verification.npiNumber || '0000000000',
          credentials: verification.title || 'Admin',
          emailVerified: true, // Pre-verified since admin approved
          active: true,
        })
        .returning();
        
      console.log('✅ [AdminVerification] Admin user created with ID:', adminUser.id);
      console.log('✅ [AdminVerification] Transaction completed successfully');
        
      return {
        healthSystemId: healthSystem.id,
        adminUserId: adminUser.id,
        tempPassword,
      };
    });
    
    // Send welcome email with temporary password
    console.log('📧 [AdminVerification] Sending welcome email to:', verification.email);
    const { EmailVerificationService } = await import('./email-verification-service');
    
    try {
      await EmailVerificationService.sendEmail({
      to: verification.email,
      subject: 'Welcome to Clarafi EMR - Your Admin Account is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366;">Your Clarafi EMR Admin Account</h2>
          <p>Dear ${verification.firstName} ${verification.lastName},</p>
          <p>Your admin account has been created. Here are your login credentials:</p>
          <div style="background-color: #f0f7ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${verification.email.split('@')[0]}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #d9534f;"><strong>Important:</strong> Please change your password immediately after logging in.</p>
          <p>You can log in at: <a href="https://clarafi.ai/auth">https://clarafi.ai/auth</a></p>
          <p>Best regards,<br>The Clarafi Team</p>
        </div>
      `
      });
      console.log('✅ [AdminVerification] Welcome email sent successfully');
    } catch (emailError) {
      console.error('⚠️  [AdminVerification] Failed to send welcome email:', emailError);
      // Don't fail the whole process if email fails
    }
    
    console.log('🎉 [AdminVerification] Admin account creation completed successfully');
    return result;
  }
}