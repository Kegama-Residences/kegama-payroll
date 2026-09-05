import { Router } from 'express';
import { getDatabaseStats, getDb } from '../db/database.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  try {
    // HTTP Caching header to prevent unnecessary re-requests from browsers/clients
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=10');

    // Quick heartbeat mode for background interval pings (0 disk I/O, minimal RAM & payload)
    if (req.query.quick === 'true') {
      const db = getDb();
      db.prepare('SELECT 1').get();
      return res.json({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }

    const forceFresh = req.query.fresh === 'true';
    const dbStats = getDatabaseStats(forceFresh);

    res.json({
      status: 'ok',
      service: 'Kegama Residences Hotel Payroll API & Storage Engine',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStats,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      error: err.message,
    });
  }
});

