import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from './db/database.js';
import { healthRouter } from './routes/health.js';
import { stateRouter } from './routes/state.js';
import { companyRouter } from './routes/company.js';
import { employeesRouter } from './routes/employees.js';
import { payrollRouter } from './routes/payroll.js';
import { reportsRouter } from './routes/reports.js';
import { storageRouter } from './routes/storage.js';
import { versionRouter } from './routes/version.js';
import { authenticateClient } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize SQLite Database immediately on boot
getDb();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploaded files & backups
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
app.use('/storage/files', express.static(path.join(DATA_DIR, 'storage')));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/api/health')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount API Routers
app.use('/api/health', healthRouter);
app.use('/api/system/version', versionRouter);
app.use('/api', authenticateClient);
app.use('/api/state', stateRouter);
app.use('/api/company', companyRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/storage', storageRouter);

// Fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(` Kegama Residences Hotel Payroll Backend & Storage`);
  console.log(` Server listening on: http://${HOST}:${PORT}`);
  console.log(` Health endpoint:     http://localhost:${PORT}/api/health`);
  console.log(` Full state endpoint: http://localhost:${PORT}/api/state`);
  console.log(` SQLite Database:     ${path.join(DATA_DIR, 'kegama.db')}`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing HTTP server and SQLite database...`);
  server.close(() => {
    closeDb();
    console.log('HTTP server and Database closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
