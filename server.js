import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import contactRouter from './routes/contact.js';
import bookingRouter from './routes/bookings.js';
import subscribeRouter from './routes/subscribe.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend dir regardless of cwd
import { config as loadEnv } from 'dotenv';
loadEnv({ path: path.join(__dirname, '.env') });

const app = express();

// Hardening
app.use(helmet({
  contentSecurityPolicy: false, // we serve inline admin page
}));
app.use(express.json({ limit: '100kb' }));

// Rate limit public form endpoints
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'too many requests, try again later' },
});
app.use(['/api/contact', '/api/booking', '/api/subscribe'], formLimiter);

// Routes
app.use('/api/contact', contactRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/subscribe', subscribeRouter);
app.use('/api/admin', adminRouter);

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Static: serve the marketing site
app.use(express.static(path.join(__dirname, 'public')));

// Admin dashboard
app.get('/admin', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(adminPage);
});

// 404
app.use((_req, res) => res.status(404).json({ ok: false, error: 'not found' }));

// Error
app.use((err, _req, res, _next) => {
  console.error('[err]', err);
  res.status(500).json({ ok: false, error: 'server error' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] admin at   http://localhost:${PORT}/admin`);
});

// ---------- ADMIN PAGE (inline) ----------
const adminPage = /* html */`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin · Egypt Itinerary</title>
<style>
  :root{--bg:#0a0805;--panel:#161109;--line:#2a2218;--ink:#f5ead0;--ink-dim:#a8987a;--gold:#e3b863;--gold-2:#b88a36;--red:#c45a4a;--green:#7ba668;--serif:"Cormorant Garamond",Georgia,serif;--sans:"Inter",-apple-system,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);font-family:var(--serif);font-size:16px;padding:32px;min-height:100vh}
  h1{font-size:36px;font-weight:500;background:linear-gradient(180deg,#fbe9b8,#b88a36);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px}
  .sub{color:var(--ink-dim);font-family:var(--sans);font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:32px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:40px}
  .stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px}
  .stat .label{font-family:var(--sans);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-dim);margin-bottom:8px}
  .stat .val{font-family:var(--serif);font-size:32px;color:var(--gold)}
  .stat.warn .val{color:var(--red)}
  .tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
  .tabs button{appearance:none;cursor:pointer;background:transparent;color:var(--ink-dim);border:1px solid var(--line);padding:10px 20px;border-radius:999px;font-family:var(--sans);font-size:12px;letter-spacing:.2em;text-transform:uppercase;transition:.2s}
  .tabs button.active{background:linear-gradient(180deg,var(--gold),var(--gold-2));color:#1a1208;border-color:transparent}
  .tabs button:hover{color:var(--ink)}
  .table-wrap{background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:auto}
  table{width:100%;border-collapse:collapse;font-family:var(--sans);font-size:13px;min-width:600px}
  th,td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--gold);font-weight:600;letter-spacing:.05em;text-transform:uppercase;font-size:10px;background:rgba(227,184,99,.04)}
  tr:last-child td{border-bottom:none}
  tr.unread td{background:rgba(227,184,99,.05)}
  tr.unread td:first-child{box-shadow:inset 3px 0 0 var(--gold)}
  .pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
  .pill.new{background:rgba(196,90,74,.2);color:#e08574}
  .pill.contacted{background:rgba(123,166,104,.2);color:#a8c98f}
  .pill.confirmed{background:rgba(123,166,104,.3);color:#b8d99f}
  .pill.declined{background:rgba(168,152,122,.2);color:var(--ink-dim)}
  .btn-sm{appearance:none;cursor:pointer;background:transparent;border:1px solid var(--gold-2);color:var(--gold);padding:5px 10px;border-radius:6px;font-family:var(--sans);font-size:11px;letter-spacing:.05em;text-transform:uppercase;margin-right:4px}
  .btn-sm:hover{background:rgba(227,184,99,.1);color:var(--ink)}
  .empty{padding:40px;text-align:center;color:var(--ink-dim);font-style:italic}
  .actions{margin-top:24px}
  .actions a{font-family:var(--sans);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-dim)}
  .actions a:hover{color:var(--gold)}
  .msg{white-space:pre-wrap;max-width:420px}
  pre.msg{font-family:var(--sans);font-size:12px;line-height:1.5}
  .hidden{display:none}
  select.status-sel{background:var(--bg);color:var(--ink);border:1px solid var(--line);padding:4px 8px;border-radius:4px;font-family:var(--sans);font-size:11px}
</style>
</head>
<body>
  <h1>Egypt Itinerary · Admin</h1>
  <div class="sub">Backend dashboard</div>

  <div class="stats" id="stats">
    <div class="stat"><div class="label">Contacts</div><div class="val" id="s-contacts">—</div></div>
    <div class="stat warn"><div class="label">Unread</div><div class="val" id="s-unread">—</div></div>
    <div class="stat"><div class="label">Bookings</div><div class="val" id="s-bookings">—</div></div>
    <div class="stat warn"><div class="label">New Bookings</div><div class="val" id="s-new">—</div></div>
    <div class="stat"><div class="label">Subscribers</div><div class="val" id="s-subs">—</div></div>
  </div>

  <div class="tabs">
    <button data-tab="contacts" class="active">Contacts</button>
    <button data-tab="bookings">Bookings</button>
    <button data-tab="subscribers">Subscribers</button>
  </div>

  <div id="panel-contacts" class="table-wrap"></div>
  <div id="panel-bookings" class="table-wrap hidden"></div>
  <div id="panel-subscribers" class="table-wrap hidden"></div>

  <div class="actions"><a href="/">← back to site</a> · <a href="#" id="refresh">refresh</a></div>

<script>
  const authH = 'Basic ' + btoa((prompt('Admin user') || '') + ':' + (prompt('Admin pass') || ''));
  const hdr = { 'Authorization': authH, 'Content-Type': 'application/json' };

  async function api(url, opts = {}) {
    const r = await fetch(url, { ...opts, headers: { ...hdr, ...(opts.headers || {}) } });
    if (r.status === 401) { alert('Auth failed'); location.reload(); }
    return r.json();
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderContacts(rows) {
    const p = document.getElementById('panel-contacts');
    if (!rows.length) return p.innerHTML = '<div class="empty">No contacts yet</div>';
    p.innerHTML = \`<table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>Message</th><th></th></tr></thead><tbody>
      \${rows.map(r => \`<tr class="\${r.read ? '' : 'unread'}">
        <td>\${esc(r.created_at)}</td>
        <td><strong>\${esc(r.name)}</strong></td>
        <td>\${esc(r.email)}</td>
        <td><pre class="msg">\${esc(r.message)}</pre></td>
        <td>\${r.read ? '' : \`<button class="btn-sm" onclick="markRead(\${r.id})">mark read</button>\`}</td>
      </tr>\`).join('')}
    </tbody></table>\`;
  }

  function renderBookings(rows) {
    const p = document.getElementById('panel-bookings');
    if (!rows.length) return p.innerHTML = '<div class="empty">No bookings yet</div>';
    p.innerHTML = \`<table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>Itinerary</th><th>Start</th><th>Group</th><th>Tier</th><th>Status</th><th>Notes</th></tr></thead><tbody>
      \${rows.map(r => \`<tr>
        <td>\${esc(r.created_at)}</td>
        <td><strong>\${esc(r.name)}</strong><br><small>\${esc(r.phone || '')}</small></td>
        <td>\${esc(r.email)}</td>
        <td>\${esc(r.itinerary)}</td>
        <td>\${esc(r.start_date)}</td>
        <td>\${r.group_size}</td>
        <td>\${esc(r.tier)}</td>
        <td>
          <select class="status-sel" onchange="setStatus(\${r.id}, this.value)">
            \${['new','contacted','confirmed','declined'].map(s => \`<option \${s===r.status?'selected':''}>\${s}</option>\`).join('')}
          </select>
          <br><span class="pill \${esc(r.status)}">\${esc(r.status)}</span>
        </td>
        <td><pre class="msg">\${esc(r.notes || '')}</pre></td>
      </tr>\`).join('')}
    </tbody></table>\`;
  }

  function renderSubs(rows) {
    const p = document.getElementById('panel-subscribers');
    if (!rows.length) return p.innerHTML = '<div class="empty">No subscribers yet</div>';
    p.innerHTML = \`<table><thead><tr><th>When</th><th>Email</th><th>Confirmed</th></tr></thead><tbody>
      \${rows.map(r => \`<tr>
        <td>\${esc(r.created_at)}</td>
        <td>\${esc(r.email)}</td>
        <td>\${r.confirmed ? '✓' : '—'}</td>
      </tr>\`).join('')}
    </tbody></table>\`;
  }

  async function load() {
    const [stats, contacts, bookings, subs] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/contacts'),
      api('/api/admin/bookings'),
      api('/api/admin/subscribers'),
    ]);
    if (stats.ok) {
      document.getElementById('s-contacts').textContent = stats.stats.contacts;
      document.getElementById('s-unread').textContent = stats.stats.unread;
      document.getElementById('s-bookings').textContent = stats.stats.bookings;
      document.getElementById('s-new').textContent = stats.stats.new_bookings;
      document.getElementById('s-subs').textContent = stats.stats.subscribers;
    }
    renderContacts(contacts.rows || []);
    renderBookings(bookings.rows || []);
    renderSubs(subs.rows || []);
  }

  window.markRead = async (id) => {
    await api('/api/admin/contacts/' + id + '/read', { method: 'POST' });
    load();
  };
  window.setStatus = async (id, status) => {
    await api('/api/admin/bookings/' + id + '/status', { method: 'POST', body: JSON.stringify({ status }) });
    load();
  };

  document.querySelectorAll('.tabs button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const t = b.dataset.tab;
      document.getElementById('panel-contacts').classList.toggle('hidden', t !== 'contacts');
      document.getElementById('panel-bookings').classList.toggle('hidden', t !== 'bookings');
      document.getElementById('panel-subscribers').classList.toggle('hidden', t !== 'subscribers');
    });
  });
  document.getElementById('refresh').addEventListener('click', (e) => { e.preventDefault(); load(); });
  load();
</script>
</body></html>`;
