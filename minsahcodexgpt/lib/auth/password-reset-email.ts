import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:password-reset-email');

type PasswordResetOtpEmailParams = {
  email: string;
  otp: string;
  expiresInMinutes: number;
};

/**
 * Sends the password reset OTP through a configurable server-side webhook.
 *
 * Configure PASSWORD_RESET_OTP_WEBHOOK_URL to a trusted internal mailer endpoint.
 * The OTP is never logged and is never returned by the API response.
 */
export async function sendPasswordResetOtpEmail({
  email,
  otp,
  expiresInMinutes,
}: PasswordResetOtpEmailParams): Promise<boolean> {
  const webhookUrl = process.env.PASSWORD_RESET_OTP_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    logger.warn('PASSWORD_RESET_OTP_WEBHOOK_URL is not configured; password reset OTP was not emailed');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PASSWORD_RESET_OTP_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.PASSWORD_RESET_OTP_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        to: email,
        subject: 'Your Minsah Beauty password reset code',
        template: 'password-reset-otp',
        data: {
          otp,
          expiresInMinutes,
        },
      }),
    });

    if (!response.ok) {
      logger.error('Password reset OTP webhook returned a non-2xx response', undefined, {
        status: response.status,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Password reset OTP email dispatch failed', error);
    return false;
  }
}
