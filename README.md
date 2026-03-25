# 🏉 Rugby League ICS Calendar Generator

A self-hosted fixture management system for rugby league clubs. Manage your season draw in a spreadsheet-style interface and export standards-compliant ICS calendar files for Apple Calendar, Google Calendar, and Outlook.

---

## ✨ Features

- **Spreadsheet-style editor** — add, edit, and delete fixture rows
- **Multi-grade support** — multiple games per match day (First Grade, Reserve, Women's, U/18, etc.)
- **ICS export** — one calendar event per match day with all grades in the description
- **Stable UIDs** — re-exporting updates existing calendar subscriptions (no duplicates)
- **CSV import/export** — manage fixtures in Excel or Google Sheets
- **Calendar preview** — card-based view grouped by round
- **Portable tool** — single HTML file that works offline with no server
- **Docker-based** — runs locally with no internet dependency

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
docker-compose up --build
```

Then open **http://localhost:3000** in your browser.

> **Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### Portable Tool (No install)

Open `portable-tool/index.html` in any browser. That's it.

---

### Local Development

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Open **http://localhost:3000**

---

## 📊 CSV Format

```csv
Date,Round,Opponent,Location,Grade,Time
2026-05-12,Round 5,Norths,Home,Womens League Tag,11:00
2026-05-12,Round 5,Norths,Home,First Grade,15:30
```

- One row per grade per match day
- `Date` must be `YYYY-MM-DD`
- `Time` must be `HH:MM` (24-hour)
- See `examples/fixtures.csv` for a complete example

---

## 📅 How ICS Generation Works

1. Rows are grouped by `(Date + Opponent)`
2. Each group becomes **one calendar event**
3. Event start = earliest kickoff time
4. Event end = latest kickoff + 2 hours
5. Description lists all grades and their times
6. UIDs are stable: `fixture-{date}-{opponent-slug}@rugbyleaguecal`

---

## 📁 Project Structure

```
/
├── backend/            Node.js + Express API
├── frontend/           React + Vite UI
├── portable-tool/      Standalone offline HTML tool
├── docker/             Nginx config
├── docs/               Full documentation
│   ├── architecture.md
│   ├── api.md
│   ├── data-model.md
│   └── deployment.md
├── examples/
│   └── fixtures.csv    Example fixture data
├── data/               (created at runtime — fixture storage)
├── docker-compose.yml
└── README.md
```

---

## 🌐 Hosting Your ICS for Subscriptions

1. Export `calendar.ics` from the app
2. Upload to a public location:
   - **GitHub** — commit the file, use the Raw URL
   - **Dropbox** — share link (change `dl=0` to `raw=1`)
3. Share the URL with club members
4. Members add it as a **subscribed calendar** in their app

When you re-export and re-upload, subscribed calendars update automatically (within ~24 hours).

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and data flow |
| [API Reference](docs/api.md) | Backend API endpoints |
| [Data Model](docs/data-model.md) | Fixture data structure and ICS rules |
| [Deployment](docs/deployment.md) | Setup, hosting, and troubleshooting |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express 4 |
| Frontend | React 18 + Vite 5 |
| Storage | JSON file (Docker volume) |
| ICS | ical-generator |
| CSV | csv-parse + csv-stringify |
| Serving | Nginx (Docker production) |

---

## 🔒 Privacy

All data stays on your machine. No analytics, no cloud sync, no external API calls. The portable tool runs entirely in your browser.

---

Built for small rugby league clubs. Keep it simple.
