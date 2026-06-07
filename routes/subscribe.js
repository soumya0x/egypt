import { Router } from 'express';
import { db } from '../db.js';
import { sendMail } from '../mailer.js';

const router = Router();

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' });
  }

  try {
    const info = await db.run(
      'INSERT INTO subscribers (email) VALUES (?)',
      [email]
    );
    sendMail({
      subject: `[New subscriber] ${email}`,
      text: `Subscribed: ${email}`,
      replyTo: email,
    }).catch(() => {});
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    // postgres SQLSTATE 23505 = unique_violation, sqlite also throws UNIQUE
    const msg = String(e?.message || e);
    const isUnique =
      e?.code === '23505' ||
      e?.errcode === 2067 ||
      e?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      /unique|duplicate/i.test(msg);
    if (isUnique) return res.json({ ok: true, already: true });
    throw e;
  }
});

export default router;
