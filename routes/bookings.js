import { Router } from 'express';
import { db } from '../db.js';
import { sendMail } from '../mailer.js';

const router = Router();

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const TIERS = new Set(['backpacker', 'mid-range', 'luxury']);
const ITINERARIES = new Set(['5-day', '7-day', '10-day', '14-day']);

router.post('/', async (req, res) => {
  const {
    name, email, phone, itinerary,
    start_date, group_size, tier, notes,
  } = req.body || {};

  if (!name || !email || !itinerary || !start_date || !group_size || !tier) {
    return res.status(400).json({ ok: false, error: 'missing required fields' });
  }
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'invalid email' });
  if (!isDate(start_date)) return res.status(400).json({ ok: false, error: 'start_date must be YYYY-MM-DD' });
  if (!ITINERARIES.has(itinerary)) return res.status(400).json({ ok: false, error: 'invalid itinerary' });
  if (!TIERS.has(tier)) return res.status(400).json({ ok: false, error: 'invalid tier' });
  const size = Number(group_size);
  if (!Number.isInteger(size) || size < 1 || size > 50) {
    return res.status(400).json({ ok: false, error: 'group_size must be 1–50' });
  }

  const info = await db.run(
    `INSERT INTO bookings (name, email, phone, itinerary, start_date, group_size, tier, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).slice(0, 200),
      email,
      phone ? String(phone).slice(0, 50) : null,
      itinerary,
      start_date,
      size,
      tier,
      notes ? String(notes).slice(0, 2000) : null,
    ]
  );

  sendMail({
    subject: `[Booking] ${itinerary} · ${name} · ${tier}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nItinerary: ${itinerary}\nStart: ${start_date}\nGroup: ${size}\nTier: ${tier}\n\nNotes:\n${notes || '-'}`,
    replyTo: email,
  }).catch((e) => console.error('[mail]', e.message));

  res.json({ ok: true, id: info.lastInsertRowid });
});

export default router;
