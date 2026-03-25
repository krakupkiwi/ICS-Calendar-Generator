# API Reference

Base URL: `http://localhost:3001` (or `/api` via the frontend proxy)

---

## Fixtures

### GET /api/fixtures
Returns all fixture rows, sorted by date then time.

**Response:**
```json
[
  {
    "id": "uuid",
    "date": "2026-05-12",
    "round": "Round 5",
    "opponent": "Norths",
    "location": "Home",
    "grade": "First Grade",
    "time": "15:30"
  }
]
```

---

### POST /api/fixtures
Add a new fixture row.

**Body:**
```json
{
  "date": "2026-05-12",
  "round": "Round 5",
  "opponent": "Norths",
  "location": "Home",
  "grade": "First Grade",
  "time": "15:30"
}
```

**Validation:**
- `date` — required, must be `YYYY-MM-DD`
- `opponent` — required
- `time` — optional, must be `HH:MM` if provided

**Response:** `201 Created` with the new row (including generated `id`)

---

### PUT /api/fixtures/:id
Update an existing row.

**Body:** Same as POST (all fields optional, only send what you want to change)

**Response:** Updated row, or `404` if not found

---

### DELETE /api/fixtures/:id
Delete a single row.

**Response:** `{ "success": true }` or `404`

---

### DELETE /api/fixtures
Delete ALL fixture rows.

**Response:** `{ "success": true, "message": "..." }`

---

## Import / Export

### POST /api/import/csv
Import fixtures from a CSV file. **Replaces all existing fixtures.**

**Request:** `multipart/form-data` with field `file` (CSV file), or JSON body `{ "csv": "..." }`

**CSV format:**
```
Date,Round,Opponent,Location,Grade,Time
2026-05-12,Round 5,Norths,Home,First Grade,15:30
```

**Response:**
```json
{
  "success": true,
  "imported": 15,
  "message": "Successfully imported 15 fixture rows"
}
```

---

### GET /api/export/csv
Download all fixtures as a CSV file.

**Response:** `text/csv` file download (`fixtures.csv`)

---

### GET /api/export/ics
Download all fixtures as an ICS calendar file.

**Query params:**
- `name` — calendar name (default: "Rugby League Fixtures")

**Response:** `text/calendar` file download (`calendar.ics`)

---

### GET /api/health
Health check endpoint.

**Response:**
```json
{ "status": "ok", "version": "1.0.0" }
```

---

## Error Responses

All errors return JSON:
```json
{ "error": "Human-readable error message" }
```

Common status codes:
- `400` — validation error (bad date format, missing required field)
- `404` — fixture not found
- `500` — server error
