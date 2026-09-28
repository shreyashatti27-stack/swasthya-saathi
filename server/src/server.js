import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { initDB, updateMissedVisits } from './db.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import visitRoutes from './routes/visits.js';
import reminderRoutes, { processAutomatedReminders } from './routes/reminders.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database
initDB();
updateMissedVisits();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'SwasthyaSaathi API',
    timestamp: new Date().toISOString(),
  });
});

// Daily Cron Job (Runs every day at midnight to transition missed visits & queue reminders)
cron.schedule('0 0 * * *', () => {
  console.log('[CRON] Running daily maintenance: updating missed visits & dispatching reminders...');
  try {
    updateMissedVisits();
    processAutomatedReminders();
  } catch (err) {
    console.error('[CRON ERROR]', err);
  }
});

// Serve client production build statically if available (for unified cloud deployment)
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {

  console.log(`🚀 SwasthyaSaathi API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
