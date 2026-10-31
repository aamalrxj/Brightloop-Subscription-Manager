
import 'dotenv/config';
import {
  sendEmail,
  verifyEmailConnection,
} from './src/services/emailService.js';

try {
  await verifyEmailConnection();

  await sendEmail({
    to: process.env.TEST_EMAIL,
    subject: 'Brightloop Email Test',
    text: 'Congratulations! Brightloop can now send emails through Brevo.',
    html: `
      <h2>Brightloop Email Test</h2>
      <p>Congratulations! Your Brevo SMTP integration is working.</p>
    `,
  });

  console.log('Test email sent successfully.');
} catch (error) {
  console.error('Email test failed:', error.message);
  process.exitCode = 1;
}
