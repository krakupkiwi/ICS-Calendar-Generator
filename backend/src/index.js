/**
 * index.js
 * Rugby League ICS Calendar Generator — Express Backend
 *
 * Starts the REST API server.
 * Data is persisted to /data/fixtures.json (Docker volume mount).
 */

import express from 'express';
import cors from 'cors';
import fixturesRouter from './routes/fixtures.js';
import exportRouter from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from the frontend dev server and any local origin
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (file://, curl, etc.) and any localhost
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all in self-hosted context
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/fixtures', fixturesRouter);
app.use('/api', exportRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏉 Rugby League ICS Calendar Generator`);
  console.log(`   Backend API: http://localhost:${PORT}`);
  console.log(`   Health:      http://localhost:${PORT}/api/health\n`);
});
