import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    res.set('WWW-Authenticate', 'Basic realm="admin"');
    return res.status(401).json({ ok: false, error: 'auth required' });
  }
  const [u, p] = Buffer.from(encoded, 'base64').toString().split(':');
  if (u === process.env.ADMIN_USER && p === process.env.ADMIN_PASS) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="admin"');
  return res.status(401).json({ ok: false, error: 'invalid credentials' });
}

router.use(auth);

router.get('/stats', async (_req, res) => {
  const c = await db.get('SELECT COUNT(*) AS c FROM contacts');
  const u = await db.get('SELECT COUNT(*) AS c FROM contacts WHERE read = 0');
  const b = await db.get('SELECT COUNT(*) AS c FROM bookings');
  const n = await db.get("SELECT COUNT(*) AS c FROM bookings WHERE status = 'new'");
  const s = await db.get('SELECT COUNT(*) AS c FROM subscribers');
  res.json({
    ok: true,
    stats: {
      contacts: Number(c.c),
      unread: Number(u.c),
      bookings: Number(b.c),
      new_bookings: Number(n.c),
      subscribers: Number(s.c),
    },
  });
});

router.get('/contacts', async (_req, res) => {
  const rows = await db.all('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 200');
  res.json({ ok: true, rows });
});

router.post('/contacts/:id/read', async (req, res) => {
  await db.run('UPDATE contacts SET read = 1 WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

router.get('/bookings', async (_req, res) => {
  const rows = await db.all('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200');
  res.json({ ok: true, rows });
});

router.post('/bookings/:id/status', async (req, res) => {
  const { status } = req.body || {};
  const allowed = new Set(['new', 'contacted', 'confirmed', 'declined']);
  if (!allowed.has(status)) return res.status(400).json({ ok: false, error: 'invalid status' });
  await db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
  res.json({ ok: true });
});

router.get('/subscribers', async (_req, res) => {
  const rows = await db.all('SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 500');
  res.json({ ok: true, rows });
});

export default router;
