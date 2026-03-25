# System Architecture

## Overview

The Rugby League ICS Calendar Generator is a self-hosted web application that manages fixture data and generates standards-compliant ICS calendar files.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Host                              │
│                                                                  │
│   ┌─────────────────────┐     ┌─────────────────────────────┐   │
│   │   Frontend (Nginx)   │────▶│    Backend (Node/Express)    │   │
│   │   Port 3000          │     │    Port 3001 (internal)      │   │
│   │                      │     │                              │   │
│   │  React SPA           │     │  REST API                    │   │
│   │  - Fixture editor    │     │  - CRUD /api/fixtures        │   │
│   │  - Import/Export UI  │     │  - POST /api/import/csv      │   │
│   │  - Calendar preview  │     │  - GET  /api/export/ics      │   │
│   │                      │     │  - GET  /api/export/csv      │   │
│   └─────────────────────┘     └────────────┬────────────────┘   │
│                                            │                     │
│                                   ┌────────▼───────┐            │
│                                   │  Named Volume   │            │
│                                   │  /data/         │            │
│                                   │  fixtures.json  │            │
│                                   └────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Frontend (`/frontend`)
- **React 18** single-page app built with Vite
- Served by **Nginx** in production (Docker)
- Nginx proxies `/api/*` requests to the backend container
- Three views: Editor (spreadsheet), Preview (cards), Help

### Backend (`/backend`)
- **Node.js 20 + Express 4**
- Stateless API — data persisted to JSON file
- Modules:
  - `dataStore.js` — in-memory + file-backed storage
  - `csvService.js` — CSV parsing and serialisation
  - `icsService.js` — ICS calendar generation
  - Routes: `fixtures.js` (CRUD), `export.js` (import/export)

### Data Store
- Runtime: in-memory JavaScript array
- Persistence: `/data/fixtures.json` (Docker named volume)
- No database required — suitable for small club use

### Portable Tool (`/portable-tool/index.html`)
- **Single HTML file** — no server, no install
- All logic in vanilla JavaScript
- Works completely offline once loaded
- ICS generation built-in (no library dependency)

## Data Flow

```
User uploads CSV
      │
      ▼
csvService.parseCSV()
      │  validates format
      │  normalises column names
      │
      ▼
dataStore.replaceAll()
      │  stores as flat row array
      │  persists to fixtures.json
      │
      ▼
User clicks "Download ICS"
      │
      ▼
icsService.generateICS()
      │  groups rows by (date, opponent)
      │  calculates event time window
      │  generates stable UIDs
      │  builds VCALENDAR string
      │
      ▼
calendar.ics → User's calendar app
```

## Security Considerations

This tool is designed for **local/self-hosted use only**:
- No authentication (single user/club use case)
- CORS allows all local origins
- File uploads limited to 5MB
- Input validation on dates and times
- No external network calls at runtime

**Do not expose port 3000 to the public internet without adding authentication.**

## Technology Choices

| Choice | Reason |
|--------|--------|
| Node.js + Express | Minimal, well-known, easy to extend |
| React + Vite | Fast builds, excellent DX, component model |
| JSON file storage | No database dependency, easy backup, portable |
| Nginx | Efficient static serving + reverse proxy |
| ical-generator | Well-maintained, RFC 5545 compliant |
| csv-parse | Battle-tested, handles edge cases |
