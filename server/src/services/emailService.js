
import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email SMTP configuration is incomplete');
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    requireTLS: Number(SMTP_PORT) === 587,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Recipient, subject and email content are required');
  }

  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error('EMAIL_FROM is missing from environment variables');
  }

  const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  console.log('[Email] Successfully sent:', {
    to,
    messageId: info.messageId,
  });

  return info;
}

export async function verifyEmailConnection() {
  await getTransporter().verify();
  console.log('[Email] SMTP connection verified successfully');
}
