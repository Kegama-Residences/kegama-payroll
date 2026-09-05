import { Request, Response, NextFunction } from 'express';

const DEFAULT_SECRET = 'kgm_sec_d7dc82afb7e66347fa4a5b5fb9e20fe68f2a81ffd65a0131';
const DEFAULT_CLIENT_KEY = 'kgm_cli_13378cf6c6187338c9d5df4c2ec6d1a95d37756ff3fc72f7';

export function authenticateClient(req: Request, res: Response, next: NextFunction): void {
  // Allow health check and static files without auth
  if (req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/storage/files')) {
    return next();
  }

  const expectedSecret = process.env.KEGAMA_API_SECRET || DEFAULT_SECRET;
  const expectedClientKey = process.env.CLIENT_INTERFACE_KEY || DEFAULT_CLIENT_KEY;

  // Extract from header: X-Kegama-API-Key or Authorization Bearer
  const apiKey = req.header('X-Kegama-API-Key') || req.header('x-api-key');
  const authHeader = req.header('Authorization');
  let bearerToken = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  const token = apiKey || bearerToken;

  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    res.status(401).json({
      success: false,
      error: 'Access Denied: Missing X-Kegama-API-Key or Authorization Bearer token',
    });
    return;
  }

  if (token !== expectedSecret && token !== expectedClientKey) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid API credentials or secret mismatch',
    });
    return;
  }

  next();
}
