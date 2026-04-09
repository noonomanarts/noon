import nodemailer from 'nodemailer';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { defaultEmailSettings, type EmailSettings } from '@/lib/adminSettings';

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedSettingsKey: string | null = null;

/**
 * Get or create SMTP transporter with current settings
 * @param skipEnabledCheck - If true, returns transporter even if email is disabled (for testing)
 * @param forceRefresh - If true, recreate transporter even if cached (for testing after settings change)
 */
async function getTransporter(skipEnabledCheck = false, forceRefresh = false): Promise<{ transporter: nodemailer.Transporter; settings: EmailSettings } | null> {
  const saved = await getAdminSettingsByKey<EmailSettings>('email-settings');
  const settings = saved ?? defaultEmailSettings;
  
  if (!skipEnabledCheck && !settings.enabled) {
    return null;
  }

  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
    console.warn('Email settings incomplete: missing SMTP configuration');
    return null;
  }

  // Check if settings changed and recreate transporter
  const settingsKey = `${settings.smtpHost}:${settings.smtpPort}:${settings.smtpUser}:${settings.smtpSecure}:${settings.smtpPassword}`;

  if (!forceRefresh && cachedTransporter && settingsKey === cachedSettingsKey) {
    return { transporter: cachedTransporter, settings };
  }

  // Close existing transporter if any
  if (cachedTransporter) {
    cachedTransporter.close();
    cachedTransporter = null;
  }

  // Create new transporter
  cachedTransporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure, // true for 465, false for 587
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  cachedSettingsKey = settingsKey;
  return { transporter: cachedTransporter, settings };
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send an email using configured SMTP settings
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const config = await getTransporter();
    
    if (!config) {
      return { ok: false, error: 'Email service not configured or disabled' };
    }

    const { transporter, settings } = config;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${settings.senderName}" <${settings.senderEmail}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo || settings.replyToEmail || settings.senderEmail,
    };

    const result = await transporter.sendMail(mailOptions);

    return {
      ok: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

/**
 * Test email connection and settings
 */
export async function testEmailConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = await getTransporter(true, true); // Skip enabled check and force refresh for testing
    
    if (!config) {
      return { ok: false, error: 'Email settings incomplete: missing SMTP configuration' };
    }

    await config.transporter.verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(toEmail: string): Promise<SendEmailResult> {
  try {
    const config = await getTransporter(true, true); // Skip enabled check and force refresh for testing
    
    if (!config) {
      return { ok: false, error: 'Email settings incomplete: missing SMTP configuration' };
    }

    const { transporter, settings } = config;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${settings.senderName}" <${settings.senderEmail}>`,
      to: toEmail,
      subject: 'Noon Email Test',
      text: 'This is a test email from Noon. If you received this, your email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #14b8a6, #fb7185); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Noon Email Test</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              This is a test email from <strong>Noon</strong>. If you received this message, your email configuration is working correctly.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `,
      replyTo: settings.replyToEmail || settings.senderEmail,
    };

    const result = await transporter.sendMail(mailOptions);

    return {
      ok: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Failed to send test email:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}
