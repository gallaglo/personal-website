import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Creates and configures an OAuth2 client for Gmail API
 */
function getOAuth2Client(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * Creates a MIME message for Gmail API
 */
function createMimeMessage(params: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const { to, from, replyTo, subject, text, html } = params;

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    text,
    '',
    '--boundary',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    '',
    '--boundary--',
  ];

  return messageParts.join('\r\n');
}

/**
 * Sends an email using Gmail API
 */
export async function sendEmail(params: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const mimeMessage = createMimeMessage(params);
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  } catch (error) {
    console.error('Gmail API error:', error);
    throw new Error('Failed to send email via Gmail API');
  }
}

/**
 * Validates that Gmail API credentials are configured
 */
export function validateGmailConfig(): void {
  const requiredEnvVars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'GMAIL_USER',
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Gmail API environment variables: ${missing.join(', ')}`
    );
  }
}
