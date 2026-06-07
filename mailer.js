import nodemailer from 'nodemailer';

const enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

let transporter = null;
if (enabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail({ subject, text, html, replyTo }) {
  if (!transporter) {
    console.log('[mail:dev]', subject, '\n', text, '\n---');
    return { mocked: true };
  }
  return transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: process.env.TO_EMAIL,
    subject,
    text,
    html,
    replyTo,
  });
}

export const mailEnabled = enabled;
