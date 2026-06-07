# Deploy to Vercel

## 1. Create Neon database (free)

1. Sign up at https://neon.tech
2. Create a new project (e.g. `egypt-itinerary`)
3. Copy the **connection string** — looks like:
   `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

## 2. Push to GitHub

```bash
cd /Users/soumya/.claude/egypt-backend
git init && git add . && git commit -m "initial"
gh repo create egypt-itinerary --public --source=. --push
```

(Or create the repo on github.com first, then push.)

## 3. Deploy to Vercel

**Option A — CLI:**
```bash
npm i -g vercel
vercel
# follow prompts, accept defaults
```

**Option B — dashboard:**
1. Go to https://vercel.com/new
2. Import the GitHub repo
3. Framework: **Other** (it's just Express)
4. Root directory: leave blank (or `.`)

## 4. Set environment variables

In Vercel → Project → Settings → Environment Variables, add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | the Neon connection string | **required** |
| `ADMIN_USER` | e.g. `admin` | pick your own |
| `ADMIN_PASS` | strong password | **required** |
| `SMTP_HOST` | smtp.gmail.com (etc) | optional |
| `SMTP_PORT` | 587 | optional |
| `SMTP_USER` | you@gmail.com | optional |
| `SMTP_PASS` | app password | optional |
| `FROM_EMAIL` | noreply@yoursite.com | optional |
| `TO_EMAIL` | hello@yoursite.com | optional |

Click **Deploy**. Done.

## 5. Verify

Once live, your site is at `https://<project>.vercel.app`. Test:
- `/` — marketing site loads
- `/#book` — booking form submits
- `/#contact` — contact form submits
- `/admin` — admin dashboard (Basic auth)

## Notes

- `node:sqlite` does NOT work on Vercel (read-only filesystem, no persistence).
  Production must use `DATABASE_URL` pointing to Neon.
- The Neon HTTP driver (`Pool`) is what we use — Vercel doesn't need
  TCP connections, all queries are HTTPS.
- The first request after deploy will create the schema automatically.
- Local dev (no `DATABASE_URL`) falls back to `node:sqlite` file DB at `data/app.db`.

## Custom domain

Vercel → Project → Settings → Domains → add your domain. Update DNS as shown.
