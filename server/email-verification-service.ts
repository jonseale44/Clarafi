import crypto from 'crypto';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { MailService } from '@sendgrid/mail';

export class EmailVerificationService {
  /**
   * Generate a secure random verification token
   */
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create and save verification token for user
   */
  static async createVerificationToken(userId: number): Promise<string> {
    const token = this.generateVerificationToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

    await db.update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      })
      .where(eq(users.id, userId));

    return token;
  }

  /**
   * Verify token and mark email as verified
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; message: string; email?: string }> {
    // Find user with this token
    const [user] = await db.select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (!user) {
      return { success: false, message: 'Invalid verification token' };
    }

    // Check if token is expired
    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      return { success: false, message: 'Verification token has expired' };
    }

    // Check if already verified
    if (user.emailVerified) {
      return { success: true, message: 'Email already verified', email: user.email };
    }

    // Mark email as verified
    await db.update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(users.id, user.id));

    return { success: true, message: 'Email successfully verified', email: user.email };
  }

  /**
   * Send verification email using SendGrid
   */
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ [EmailVerification] SENDGRID_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);

    // Use Replit URL if available, otherwise fallback to localhost
    const replitUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null;
    const baseUrl = process.env.APP_URL || replitUrl || 'http://localhost:5000';
    // Use path parameter format to avoid issues with email clients stripping query parameters
    const verificationUrl = `${baseUrl}/api/verify-email/${token}`;
    
    // Get sender email from environment or use a default
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@clarafi.com';
    
    const emailContent = {
      to: email,
      from: fromEmail, // This email must be verified in SendGrid
      subject: 'Verify Your Clarafi Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366;">Welcome to Clarafi!</h2>
          <p>Thank you for registering with Clarafi EMR. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #FFD700; color: #003366; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create a Clarafi account, please ignore this email.
          </p>
        </div>
      `,
      text: `
        Welcome to Clarafi!
        
        Thank you for registering with Clarafi EMR. To complete your registration, please verify your email address by visiting this link:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours.
        
        If you didn't create a Clarafi account, please ignore this email.
      `
    };

    try {
      await mailService.send(emailContent);
      console.log('✅ [EmailVerification] Verification email sent successfully to:', email);
    } catch (error) {
      console.error('❌ [EmailVerification] Failed to send email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.emailVerified) {
      return { success: false, message: 'Email already verified' };
    }

    const token = await this.createVerificationToken(user.id);
    await this.sendVerificationEmail(user.email, token);

    return { success: true, message: 'Verification email sent' };
  }

  /**
   * Development utility: Reset user for testing
   * This allows you to delete a user by email for testing purposes
   */
  static async deleteTestUser(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Delete the user (cascade will handle related records)
      await db.delete(users).where(eq(users.id, user.id));

      console.log(`🧹 [Development] Test user ${email} has been deleted`);
      return { success: true, message: `Test user ${email} deleted successfully` };
    } catch (error) {
      console.error('Error deleting test user:', error);
      return { success: false, message: 'Error deleting test user' };
    }
  }
}