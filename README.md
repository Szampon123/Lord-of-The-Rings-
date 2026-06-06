# Middle-earth Brick Index — Netlify Edition

A serverless, auto-updating price tracker for **LEGO® The Lord of the Rings** and **The Hobbit** sets, hosted entirely on **Netlify**. Prices come from Brickset, organized into:

1. **New (sealed) sets** — official LEGO retail price (RRP) from the Brickset API
2. **Used sets** — second-hand resale value (available via pluggable provider)
3. **Minifigure prices** — per-minifigure new/used values

The dashboard is a static single-page app; the backend runs as serverless Netlify Functions with automatic daily refresh via Netlify Scheduled Functions.

---

## Deploy to Netlify in 5 minutes

### 1. Get a Brickset API key
- Create a free account at https://brickset.com/signup
- Request a key at https://brickset.com/tools/webservices/requestkey
- Copy the key (you'll paste it into Netlify shortly)

### 2. Push this code to GitHub (or GitLab / Bitbucket)
```bash
git init
git add .
git commit -m "Initial Netlify deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
git push -u origin main
```

### 3. Connect to Netlify
- Go to **https://app.netlify.com**
- Click **New site from Git**
- Connect your repository
- Netlify auto-detects the `netlify.toml` config (no manual setup needed)

### 4. Add your API key
- In Netlify dashboard: **Site settings → Environment**
- Add environment variable `BRICKSET_API_KEY` = your key from step 1
- Save

### 5. Deploy
- Netlify rebuilds automatically on git push
- When the build completes, your site is live at `https://your-netlify-site.netlify.app`
- The **scheduled refresh** runs daily at **04:00 UTC** (configurable in `lib/config.js`)

Visit your site → the dashboard loads immediately, showing the sample data (Rivendell + Barad-dûr). On first refresh, it populates with live data from Brickset.

---

## Architecture on Netlify

| Component | What it does |
|-----------|---|
| `public/` | Static dashboard (HTML/CSS/JS) — served instantly by Netlify's CDN |
| `netlify/functions/sets.js` | API endpoint `GET /api/sets` — reads catalog from Blobs |
| `netlify/functions/meta.js` | API endpoint `GET /api/meta` — metadata + last refresh time |
| `netlify/functions/refresh.js` | API endpoint `POST /api/refresh` — manual refresh trigger |
| `netlify/functions/scheduled-refresh.ts` | **Scheduled Function** — daily cron job (runs `runRefresh()`, writes to Blobs) |
| `lib/` | Shared code (Brickset API client, catalog builder, page reader, price providers) |
| `@netlify/blobs` | Serverless storage — persists catalog between function invocations |

---

## How daily refresh works

1. **04:00 UTC daily**, the scheduled function wakes up automatically
2. Calls the Brickset API for LOTR + Hobbit sets (~10-15 API calls)
3. Enriches with minifig values (if `ENABLE_PAGE_READER=true`; opt-in due to timeout risk)
4. Writes the result to **Netlify Blobs** (persists across function invocations)
5. Logs the result; you can see the details in Netlify **Functions → Logs**

The dashboard fetches `/api/sets` on page load and displays it. Manual refresh via the **Refresh** button in the UI calls `POST /api/refresh` and re-populates instantly.

---

## Configuration

Environment variables (set in **Netlify Site settings → Environment**):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `BRICKSET_API_KEY` | **yes** | — | Your Brickset API key |
| `THEMES` | no | `The Lord of the Rings,The Hobbit` | Which themes to include |
| `SUBTHEMES` | no | `The Lord of the Rings,The Hobbit` | Which subthemes to include |
| `ENABLE_PAGE_READER` | no | `false` | Read minifig value pages (see note below) |
| `PAGE_READER_DELAY_MS` | no | `4000` | Delay between page reads (politeness) |
| `USER_AGENT` | no | MiddleEarthBrickIndex/1.0 (Netlify; ...) | Identify yourself to Brickset |
| `SET_VALUE_PROVIDER` | no | `null` | Used-set resale provider (see note below) |

### ⚠️ Notes on minifig reader and timeouts

- **ENABLE_PAGE_READER**: Reads the public minifigure pages on Brickset (politely, with delays) to gather per-minifig new/used values. **Disabled by default** because reading 20+ pages at 4s each takes ~80s, which exceeds Netlify's default 30s function timeout.
- **To enable safely**: Either (a) keep it off (minifig values show as unavailable, which is the default compliant state), or (b) upgrade your Netlify plan to use **Background Functions** (15-minute timeout) for the scheduled refresh. See [Netlify Functions configuration](https://docs.netlify.com/functions/overview/).

### Used-set resale values

The **Used tab** is wired to a pluggable `PriceProvider`. The default is `null` (returns unavailable). To fill it, you'd need to:
- Obtain written production permission from Brickset (they prohibit "copycat" sites)
- Or implement an authorized price source (BrickLink, BrickEconomy, etc.)
- Register it in `lib/priceProviders/` and set `SET_VALUE_PROVIDER` to its ID

For now, the Used tab shows a compliance notice — honest and intentional.

---

## Preview the dashboard locally

Before deploying, test the UI with sample data:

```bash
npm install
netlify dev
```

This runs a local Netlify dev environment. Visit `http://localhost:8888` — the dashboard loads with sample data (Rivendell 10316 + Barad-dûr 10333, with real minifig values for Rivendell).

To use live data locally:
1. Add your `BRICKSET_API_KEY` to `.env`
2. Trigger refresh: `curl -X POST http://localhost:8888/api/refresh`
3. Page reloads with live data from Brickset

---

## Costs

- **Netlify**: Free tier includes serverless functions with monthly limits. A daily refresh (~0.3 function invocations/month at 30s each) is trivial and well within free tier. No cost.
- **Brickset API**: Free tier allows ~100 `getSets` calls/day. A full refresh uses only 2-3 calls, so you're easily within limits.

Scaling to 10+ refreshes/day (e.g., every 2-4 hours) would still fit the free tier. You'd only need to contact Brickset for a higher limit if you intend thousands of calls/day or a public-facing "copy" of their site (which their terms prohibit anyway).

---

## Troubleshooting

**"No data yet" on first visit?**
- The scheduled function runs daily at 04:00 UTC. If you just deployed, wait for that time or manually trigger: click **Refresh** in the dashboard, or `curl -X POST https://your-site.netlify.app/api/refresh`

**502 error on `/api/sets`?**
- Check the Netlify **Functions** dashboard for logs. Common issues:
  - Missing `BRICKSET_API_KEY` env var → set it
  - Blobs not initialized → happens on first run; retry

**Scheduled function not running?**
- Verify Scheduled Functions are enabled (they are by default for all accounts)
- Check **Functions → Logs** in Netlify dashboard; you'll see if the job ran or failed
- Ensure you have at least one site on a paying Netlify plan, or use the free tier (it's supported)

---

## License & Trademarks

LEGO® is a trademark of the LEGO Group, which does not sponsor or endorse this project. This app sources data from Brickset and displays it in compliance with their terms. You are responsible for ensuring your use of this app (and any derivative sites) respects Brickset's API terms, robots.txt, and prohibition on "copycat" sites.
