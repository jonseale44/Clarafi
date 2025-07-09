import crypto from 'crypto';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
   * Send verification email (placeholder - needs SMTP configuration)
   */
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    // In development, log the verification link
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
    
    console.log('📧 [EmailVerification] Verification email would be sent to:', email);
    console.log('🔗 [EmailVerification] Verification link:', verificationUrl);
    
    // TODO: Implement actual email sending with SMTP
    // This will require SMTP configuration (host, port, user, pass)
    // You can use libraries like nodemailer or sendgrid
    
    // For now, in development, we'll just log the link
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