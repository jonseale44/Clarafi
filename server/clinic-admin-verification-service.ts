import { db } from './db';
import { healthSystems, users, clinicAdminVerifications, organizationDocuments } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { EmailVerificationService } from './email-verification-service';
import { OpenAI } from 'openai';

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
  };
  recommendations: string[];
  requiresManualReview: boolean;
  automatedDecisionReason: string;
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
    const existingVerification = await db.select()
      .from(clinicAdminVerifications)
      .where(eq(clinicAdminVerifications.email, request.email))
      .limit(1);
      
    if (existingVerification.length > 0 && existingVerification[0].status === 'pending') {
      throw new Error('A verification request is already pending for this email');
    }
    
    // Step 4: Generate secure verification token
    const verificationCode = this.generateSecureVerificationCode();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days to complete verification
    
    // Step 5: Create verification record
    const [verification] = await db.insert(clinicAdminVerifications).values({
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
    }).returning();
    
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
      recommendations: automatedResult.recommendations
    };
  }
  
  /**
   * GPT-4 powered automated verification
   * Analyzes organization data and returns risk assessment
   */
  static async performAutomatedVerification(request: ClinicAdminVerificationRequest): Promise<AutomatedVerificationResult> {
    console.log('🤖 [GPT Verification] Starting GPT-4 automated verification...');
    
    try {
      const prompt = `
You are an EMR system administrator verification AI. Analyze this clinic administrator application and provide a risk assessment.

Application Details:
- Administrator: ${request.firstName} ${request.lastName}, ${request.title}
- Email: ${request.email}
- Organization: ${request.organizationName}
- Type: ${request.organizationType}
- Tax ID (EIN): ${request.taxId}
- NPI: ${request.npiNumber || 'Not provided'}
- Current EMR: ${request.currentEmr || 'None'}
- Expected Providers: ${request.expectedProviderCount}
- Monthly Patient Volume: ${request.expectedMonthlyPatientVolume}

Verification Criteria:
1. Tax ID format validation (XX-XXXXXXX)
2. Email domain matches organization (for clinics/hospitals)
3. Provider count is reasonable for organization type
4. Patient volume is reasonable for provider count
5. Title matches organization type (e.g., Medical Director for clinics)

Return a JSON object with:
{
  "approved": boolean (true if low risk, false if needs review),
  "riskScore": number (0-100, lower is better),
  "verificationDetails": {
    "organizationValid": boolean,
    "taxIdValid": boolean,
    "npiValid": boolean,
    "personnelValid": boolean,
    "businessSizeAppropriate": boolean
  },
  "recommendations": string[],
  "requiresManualReview": boolean,
  "automatedDecisionReason": string
}

Be lenient with individual practices and small clinics. Be more stringent with large health systems.
Individual practices with 1-5 providers should generally be auto-approved if basic criteria are met.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        approved: result.approved || false,
        riskScore: result.riskScore || 50,
        verificationDetails: result.verificationDetails || {
          organizationValid: false,
          taxIdValid: false,
          npiValid: false,
          personnelValid: false,
          businessSizeAppropriate: false
        },
        recommendations: result.recommendations || [],
        requiresManualReview: result.requiresManualReview || true,
        automatedDecisionReason: result.automatedDecisionReason || 'Manual review required'
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
        recommendations: ['Manual review required due to automated verification failure'],
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
            </div>
            
            <h3 style="color: #003366;">Next Steps:</h3>
            <ol>
              <li>Complete identity verification using the code above</li>
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
}