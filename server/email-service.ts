import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SubscriptionKeyEmailOptions {
  to: string;
  recipientName: string;
  subscriptionKey: string;
  keyType: string;
  healthSystemName: string;
  senderName: string;
  includeInstructions: boolean;
}

export async function sendSubscriptionKeyEmail(options: SubscriptionKeyEmailOptions) {
  const {
    to,
    recipientName,
    subscriptionKey,
    keyType,
    healthSystemName,
    senderName,
    includeInstructions
  } = options;

  const keyTypeLabel = keyType.charAt(0).toUpperCase() + keyType.slice(1);
  const registrationUrl = `${process.env.BASE_URL || 'https://clarafi.ai'}/auth?tab=register`;

  let instructionsHtml = '';
  if (includeInstructions) {
    instructionsHtml = `
      <h3 style="color: #1a1a1a; margin-top: 30px;">How to Register</h3>
      <ol style="color: #666; line-height: 1.8;">
        <li>Click the button below or go to the registration page</li>
        <li>When prompted, paste your subscription key</li>
        <li>Your information will be pre-filled automatically</li>
        <li>Complete any remaining fields and create your password</li>
        <li>Start using CLARAFI immediately!</li>
      </ol>
    `;
  }

  const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background-color: #1e293b; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
              <span style="color: #ffffff;">CLAR</span><span style="color: #f59e0b;">A</span><span style="color: #ffffff;">F</span><span style="color: #f59e0b;">I</span>
            </h1>
            <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 16px;">Medical EMR Platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; margin-top: 0;">Welcome to ${healthSystemName}!</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Hello ${recipientName},
            </p>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              ${senderName} has invited you to join ${healthSystemName} on CLARAFI as a <strong>${keyTypeLabel}</strong>.
              Your subscription key is ready to use:
            </p>
            
            <!-- Key Display -->
            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your Subscription Key:</p>
              <code style="font-family: 'Courier New', monospace; font-size: 20px; color: #1e293b; letter-spacing: 1px; font-weight: bold;">
                ${subscriptionKey}
              </code>
            </div>
            
            ${instructionsHtml}
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${registrationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Register Now
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px; margin-top: 30px;">
              <strong>Important:</strong> Keep this key secure. It can only be used once to create your account.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">
              This email was sent by ${healthSystemName} via CLARAFI
            </p>
            <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">
              © ${new Date().getFullYear()} CLARAFI. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
  `;

  const textContent = `
Welcome to ${healthSystemName}!

Hello ${recipientName},

${senderName} has invited you to join ${healthSystemName} on CLARAFI as a ${keyTypeLabel}.

Your Subscription Key: ${subscriptionKey}

${includeInstructions ? `
How to Register:
1. Go to ${registrationUrl}
2. When prompted, paste your subscription key
3. Your information will be pre-filled automatically
4. Complete any remaining fields and create your password
5. Start using CLARAFI immediately!
` : ''}

Important: Keep this key secure. It can only be used once to create your account.

This email was sent by ${healthSystemName} via CLARAFI
© ${new Date().getFullYear()} CLARAFI. All rights reserved.
  `.trim();

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@clarafi.ai',
    subject: `Your ${healthSystemName} CLARAFI ${keyTypeLabel} Access Key`,
    text: textContent,
    html: htmlContent
  };

  if (!process.env.SENDGRID_API_KEY) {
    console.log('📧 [Email] SendGrid not configured, logging email instead:');
    console.log('To:', to);
    console.log('Subject:', msg.subject);
    console.log('Key:', subscriptionKey);
    return;
  }

  try {
    await sgMail.send(msg);
    console.log(`📧 [Email] Subscription key sent to ${to}`);
  } catch (error) {
    console.error('📧 [Email] Error sending subscription key:', error);
    throw error;
  }
}

// Export other email functions that might already exist
export async function sendVerificationEmail(to: string, token: string) {
  // Existing verification email logic if any
}

export async function sendPasswordResetEmail(to: string, token: string) {
  // Existing password reset email logic if any
}