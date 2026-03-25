# Deployment Guide

## Option A — Docker (Recommended)

This is the easiest way to run the full system. You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### Quick Start

```bash
# Clone or copy the project folder
cd rugby-ics-calendar

# Start everything
docker-compose up --build

# Open in browser
# → http://localhost:3000
```

That's it. Fixture data is automatically saved between restarts.

### Stopping

```bash
docker-compose down
```

Data is preserved in the Docker named volume `fixture-data`. To also delete the data:

```bash
docker-compose down -v
```

### Viewing Logs

```bash
docker-compose logs -f backend     # backend logs
docker-compose logs -f frontend    # nginx logs
```

### Updating After Code Changes

```bash
docker-compose up --build
```

---

## Option B — Local Development (VSCode)

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- npm

### Backend

```bash
cd backend
npm install
npm run dev
# → API running at http://localhost:3001
```

Data is saved to `./data/fixtures.json` (relative to backend directory).

### Frontend

```bash
cd frontend
npm install
npm run dev
# → UI running at http://localhost:3000
```

The Vite dev server proxies `/api/*` to `http://localhost:3001`.

---

## Option C — Portable Tool (No install)

Open `portable-tool/index.html` directly in any browser. No server required.

This is ideal for occasional, one-off ICS generation on any computer.

---

## Hosting the ICS File for Calendar Subscriptions

Once you have a `calendar.ics` file, club members can subscribe to it for automatic updates.

### GitHub (Free)

1. Create a public GitHub repository (e.g. `my-club-calendar`)
2. Add your `calendar.ics` file
3. Go to the file on GitHub → click **Raw** → copy the URL
4. Share the raw URL with members

**In Google Calendar:**
- Click "+" → "From URL" → paste the raw URL

**In Apple Calendar:**
- File → New Calendar Subscription → paste the URL

**In Outlook:**
- Calendar → Add calendar → Subscribe from web → paste the URL

### Dropbox

1. Upload `calendar.ics` to Dropbox
2. Share the file → get a link
3. Change `dl=0` to `raw=1` at the end of the URL
4. Share the modified URL

### Update cycle

Calendar apps re-fetch the ICS file on their own schedule (typically every 24 hours for subscriptions). When you re-export and re-upload, subscribers will see the updated fixtures automatically.

---

## Data Backup

The fixture data is stored in a Docker named volume. To back it up:

```bash
# Create a backup
docker run --rm -v fixture-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/fixtures-backup.tar.gz /data

# Restore from backup
docker run --rm -v fixture-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/fixtures-backup.tar.gz -C /
```

Or simply export your fixtures as CSV (which you can re-import at any time).

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `DATA_PATH` | `/data/fixtures.json` | Path to data file |
| `NODE_ENV` | `production` | Environment |

---

## Troubleshooting

### "Cannot connect to backend"

The UI shows "Could not load fixtures — Is the backend running?"

- Check Docker containers are running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Ensure port 3000 is not in use by another application

### "Import failed: Invalid date format"

Your CSV has a date that isn't in `YYYY-MM-DD` format. For example:
- ❌ `12/05/2026`
- ❌ `May 12 2026`
- ✓ `2026-05-12`

Open your CSV in Excel/Sheets and format the date column as `YYYY-MM-DD`.

### "Port 3000 is already in use"

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"   # Use port 3001 instead
```

### Calendar app shows wrong times

This tool uses local/floating times (no timezone indicator). The event time will be interpreted in the local timezone of the device running the calendar app. This is the correct behaviour for a local club tool.

### ICS file not updating in subscribed calendar

Calendar apps typically sync every 24 hours. You can force a refresh:
- **Google Calendar:** settings for the calendar → "Refresh" is not manual; wait up to 24h
- **Apple Calendar:** right-click calendar → Refresh
- **Outlook:** manual sync or wait for automatic sync
