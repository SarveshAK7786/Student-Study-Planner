const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const emailService = process.env.EMAIL_SERVICE || 'ethereal';

  if (emailService === 'smtp' && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[Mailer] Initialized live SMTP transport.');
  } else {
    // Attempt Ethereal with a fast timeout (3s), fallback to instant simulated mailer
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Ethereal timeout')), 3000));
      const testAccount = await Promise.race([nodemailer.createTestAccount(), timeoutPromise]);

      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Mailer] Initialized Ethereal Test Mailer (${testAccount.user})`);
    } catch (e) {
      console.log('[Mailer] Using instant zero-latency email delivery logger');
      transporter = {
        sendMail: async (options) => {
          console.log(`[Instant Email to ${options.to}]: Subject: "${options.subject}"`);
          return { messageId: 'simulated-' + Date.now(), previewUrl: null };
        }
      };
    }
  }

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"Smart Study Planner" <alerts@studyplanner.io>',
      to,
      subject,
      text: text || subject,
      html,
    });

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Mailer] Preview Email URL: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`[Mailer] Error sending email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
};
