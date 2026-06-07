import { Router } from 'express';
import { db } from '../db.js';
import { sendMail } from '../mailer.js';

const router = Router();

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'name, email, message required' });
  }
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'invalid email' });
  if (String(message).length > 5000) return res.status(400).json({ ok: false, error: 'message too long' });

  const info = await db.run(
    'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
    [String(name).slice(0, 200), email, message]
  );

  sendMail({
    subject: `[Contact] ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    replyTo: email,
  }).catch((e) => console.error('[mail]', e.message));

  res.json({ ok: true, id: info.lastInsertRowid });
});

export default router;
