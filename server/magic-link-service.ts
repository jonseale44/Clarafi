import { db } from "./db";
import { users, magicLinks } from "@shared/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { EmailVerificationService } from "./email-verification-service";

export interface MagicLinkOptions {
  purpose: 'login' | 'registration' | 'password_reset';
  expirationMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export class MagicLinkService {
  static readonly DEFAULT_EXPIRATION_MINUTES = 15;
  static readonly TOKEN_LENGTH = 32;

  /**
   * Generate a secure magic link token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create a magic link for email authentication
   */
  static async createMagicLink(
    email: string,
    options: MagicLinkOptions
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateToken();
    const expirationMinutes = options.expirationMinutes || this.DEFAULT_EXPIRATION_MINUTES;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Find user if exists (for login), null for registration
    const user = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Insert magic link record
    await db.insert(magicLinks).values({
      userId: user[0]?.id || null,
      email: email.toLowerCase(),
      token,
      purpose: options.purpose,
      expiresAt,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null
    });

    return { token, expiresAt };
  }

  /**
   * Validate a magic link token
   */
  static async validateToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    userId?: number;
    purpose?: string;
    error?: string;
  }> {
    // Get magic link record
    const result = await db.select()
      .from(magicLinks)
      .where(and(
        eq(magicLinks.token, token),
        gt(magicLinks.expiresAt, new Date()),
        isNull(magicLinks.usedAt)
      ))
      .limit(1);

    if (!result || result.length === 0) {
      return { valid: false, error: 'Invalid or expired link' };
    }

    const magicLink = result[0];

    // Mark as used
    await db.update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, magicLink.id));

    return {
      valid: true,
      email: magicLink.email,
      userId: magicLink.user_id,
      purpose: magicLink.purpose
    };
  }

  /**
   * Send magic link email
   */
  static async sendMagicLinkEmail(
    email: string,
    token: string,
    purpose: MagicLinkOptions['purpose']
  ): Promise<void> {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    const linkUrl = `${baseUrl}/auth/magic-link/${token}`;

    const subject = purpose === 'login' 
      ? 'Login to Clarafi EMR'
      : purpose === 'registration'
      ? 'Complete your Clarafi EMR registration'
      : 'Reset your Clarafi EMR password';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 36px; font-weight: bold;">
          <span style="color: #003366;">CLAR</span><span style="color: #FFD700;">AFI</span>
        </h1>
        <p style="color: #666; margin-top: 5px;">Electronic Medical Records</p>
      </div>

      <!-- Content -->
      <div style="margin-bottom: 30px;">
        ${purpose === 'login' ? `
          <h2 style="color: #333; font-size: 24px; margin-bottom: 16px;">Login to your account</h2>
          <p style="color: #666; line-height: 1.6;">Click the button below to securely log in to your Clarafi EMR account. This link will expire in 15 minutes.</p>
        ` : purpose === 'registration' ? `
          <h2 style="color: #333; font-size: 24px; margin-bottom: 16px;">Complete your registration</h2>
          <p style="color: #666; line-height: 1.6;">Welcome to Clarafi EMR! Click the button below to complete your registration and set up your account. This link will expire in 15 minutes.</p>
        ` : `
          <h2 style="color: #333; font-size: 24px; margin-bottom: 16px;">Reset your password</h2>
          <p style="color: #666; line-height: 1.6;">Click the button below to reset your password. This link will expire in 15 minutes.</p>
        `}
      </div>

      <!-- Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${linkUrl}" 
           style="display: inline-block; background-color: #003366; color: white; text-decoration: none; 
                  padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          ${purpose === 'login' ? 'Log In' : purpose === 'registration' ? 'Complete Registration' : 'Reset Password'}
        </a>
      </div>

      <!-- Alternative link -->
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #003366; font-size: 14px; word-break: break-all;">
          ${linkUrl}
        </p>
      </div>

      <!-- Security notice -->
      <div style="margin-top: 30px; padding: 16px; background-color: #f8f9fa; border-radius: 6px;">
        <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Security Notice:</strong> This is an automated email from Clarafi EMR. 
          If you didn't request this link, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
      <p>&copy; 2025 Clarafi EMR. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
${subject}

${purpose === 'login' 
  ? 'Click the link below to log in to your Clarafi EMR account:'
  : purpose === 'registration'
  ? 'Click the link below to complete your Clarafi EMR registration:'
  : 'Click the link below to reset your Clarafi EMR password:'}

${linkUrl}

This link will expire in 15 minutes.

If you didn't request this link, please ignore this email.

© 2025 Clarafi EMR. All rights reserved.
    `;

    // Use existing email service
    await EmailVerificationService.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }

  /**
   * Clean up expired magic links
   */
  static async cleanupExpiredLinks(): Promise<number> {
    const result = await db.execute(
      `DELETE FROM magic_links 
       WHERE expires_at < NOW() 
       OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')
       RETURNING id`
    );

    return result.rowCount || 0;
  }
}