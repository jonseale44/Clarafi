import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

export class EmailService {
  private static readonly DEFAULT_FROM_EMAIL = "noreply@clarafi.com";
  private static readonly DEFAULT_FROM_NAME = "CLARAFI";

  static async sendEmail(options: EmailOptions): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("[EmailService] SendGrid API key not configured, skipping email send");
      return;
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: options.from || this.DEFAULT_FROM_EMAIL,
          name: this.DEFAULT_FROM_NAME,
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        templateId: options.templateId,
        dynamicTemplateData: options.templateData,
      };

      await sgMail.send(msg);
      console.log(`[EmailService] Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error("[EmailService] Failed to send email:", error);
      throw error;
    }
  }

  static async sendPaymentReceiptEmail(
    userEmail: string,
    receiptData: {
      amountPaid: number;
      paymentDate: Date;
      invoiceNumber: string;
      billingPeriod: string;
      paymentMethod: string;
      lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; }
          .content { padding: 20px 0; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .table th { background: #f8f9fa; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CLARAFI</div>
            <h2>Payment Receipt</h2>
          </div>
          
          <div class="content">
            <p>Thank you for your payment!</p>
            
            <p><strong>Invoice Number:</strong> ${receiptData.invoiceNumber}<br/>
            <strong>Payment Date:</strong> ${receiptData.paymentDate.toLocaleDateString()}<br/>
            <strong>Billing Period:</strong> ${receiptData.billingPeriod}<br/>
            <strong>Payment Method:</strong> ${receiptData.paymentMethod}</p>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${receiptData.lineItems
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.unitPrice.toFixed(2)}</td>
                    <td>$${item.total.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div class="total">
              Total Paid: $${receiptData.amountPaid.toFixed(2)}
            </div>
          </div>
          
          <div class="footer">
            <p>If you have any questions about this receipt, please contact support@clarafi.com</p>
            <p>&copy; ${new Date().getFullYear()} CLARAFI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: `CLARAFI Payment Receipt - ${receiptData.invoiceNumber}`,
      html,
      text: `Payment Receipt\n\nThank you for your payment!\n\nInvoice Number: ${
        receiptData.invoiceNumber
      }\nPayment Date: ${receiptData.paymentDate.toLocaleDateString()}\nAmount Paid: $${receiptData.amountPaid.toFixed(
        2
      )}\n\nFor details, please view this email in HTML format.`,
    });
  }

  static async sendPaymentFailedEmail(
    userEmail: string,
    failureData: {
      attemptDate: Date;
      reason: string;
      nextRetryDate?: Date;
      updatePaymentUrl: string;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fee; padding: 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; }
          .content { padding: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CLARAFI</div>
            <h2>Payment Failed</h2>
          </div>
          
          <div class="content">
            <p>We were unable to process your subscription payment.</p>
            
            <p><strong>Date:</strong> ${failureData.attemptDate.toLocaleDateString()}<br/>
            <strong>Reason:</strong> ${failureData.reason}</p>
            
            ${
              failureData.nextRetryDate
                ? `<p>We'll automatically retry your payment on ${failureData.nextRetryDate.toLocaleDateString()}.</p>`
                : ""
            }
            
            <p>To avoid service interruption, please update your payment method:</p>
            
            <div style="text-align: center;">
              <a href="${failureData.updatePaymentUrl}" class="button">Update Payment Method</a>
            </div>
          </div>
          
          <div class="footer">
            <p>If you have any questions, please contact support@clarafi.com</p>
            <p>&copy; ${new Date().getFullYear()} CLARAFI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: "CLARAFI - Payment Failed",
      html,
      text: `Payment Failed\n\nWe were unable to process your subscription payment.\n\nDate: ${
        failureData.attemptDate.toLocaleDateString()
      }\nReason: ${failureData.reason}\n\nPlease update your payment method at: ${
        failureData.updatePaymentUrl
      }`,
    });
  }

  static async sendUpcomingChargeEmail(
    userEmail: string,
    chargeData: {
      amount: number;
      chargeDate: Date;
      billingPeriod: string;
    }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; }
          .content { padding: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CLARAFI</div>
            <h2>Upcoming Charge Notification</h2>
          </div>
          
          <div class="content">
            <p>This is a reminder about your upcoming subscription charge.</p>
            
            <p><strong>Amount:</strong> $${chargeData.amount.toFixed(2)}<br/>
            <strong>Charge Date:</strong> ${chargeData.chargeDate.toLocaleDateString()}<br/>
            <strong>Billing Period:</strong> ${chargeData.billingPeriod}</p>
            
            <p>Your payment method on file will be charged automatically. No action is required.</p>
            
            <p>To manage your subscription or update your payment method, please log in to your account.</p>
          </div>
          
          <div class="footer">
            <p>If you have any questions, please contact support@clarafi.com</p>
            <p>&copy; ${new Date().getFullYear()} CLARAFI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: `CLARAFI - Upcoming Charge: $${chargeData.amount.toFixed(2)}`,
      html,
      text: `Upcoming Charge Notification\n\nThis is a reminder about your upcoming subscription charge.\n\nAmount: $${chargeData.amount.toFixed(
        2
      )}\nCharge Date: ${chargeData.chargeDate.toLocaleDateString()}\nBilling Period: ${
        chargeData.billingPeriod
      }\n\nYour payment method on file will be charged automatically.`,
    });
  }
}