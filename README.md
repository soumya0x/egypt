# Egypt Itinerary — Backend

Node.js + Express + SQLite backend for the Ancient Egypt itinerary site.

## Features

- **Contact form** — name/email/message, saved to SQLite, optional email notification
- **Booking requests** — itinerary picker, start date, group size, tier, notes
- **Newsletter signup** — email capture with duplicate detection
- **Admin dashboard** at `/admin` — view stats, messages, bookings, subscribers (HTTP Basic auth)
- **Rate limiting** on all public form endpoints (30 req / 15 min / IP)
- **Security**: helmet, JSON body limit (100kb), input validation
- **Email**: nodemailer (SMTP), gracefully degrades to console log if SMTP not configured

## Setup

```bash
cd /Users/soumya/.claude/egypt-backend
cp .env.example .env       # edit SMTP + ADMIN_PASS
npm install
npm start
```

Server boots on `http://localhost:3000`.

- Site: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin` (Basic auth, default `admin:pharaoh2026`)
- Health: `http://localhost:3000/api/health`

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/health` | — | uptime check |
| POST | `/api/contact` | `{name,email,message}` | public, rate-limited |
| POST | `/api/booking` | `{name,email,phone?,itinerary,start_date,group_size,tier,notes?}` | public, rate-limited |
| POST | `/api/subscribe` | `{email}` | public, rate-limited, dedup |
| GET | `/api/admin/stats` | — | auth required |
| GET | `/api/admin/contacts` | — | auth required |
| POST | `/api/admin/contacts/:id/read` | — | auth required |
| GET | `/api/admin/bookings` | — | auth required |
| POST | `/api/admin/bookings/:id/status` | `{status}` | auth, status in {new,contacted,confirmed,declined} |
| GET | `/api/admin/subscribers` | — | auth required |

## Data

SQLite DB at `data/app.db`. Schema auto-created on first boot. Three tables:
`contacts`, `bookings`, `subscribers`.

## Project layout

```
egypt-backend/
├── server.js          Express app, inline admin page
├── db.js              SQLite setup + schema
├── mailer.js          nodemailer wrapper (console-fallback)
├── routes/
│   ├── contact.js
│   ├── bookings.js
│   ├── subscribe.js
│   └── admin.js
├── public/
│   └── index.html     Marketing site (served at /)
├── data/              SQLite files (gitignored)
├── .env.example
└── package.json
```
