import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeSchema } from './schema.js';
import { seedInitialData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server root data directory
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'kegama.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure data and backup directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const storageDir = path.join(DATA_DIR, 'storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Open SQLite database
  dbInstance = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? undefined : undefined,
  });

  // Enable WAL mode & foreign key constraints
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  // Memory & Cache Optimizations: Limit page cache to ~2 MB and disable mmap to minimize RAM usage
  dbInstance.pragma('cache_size = -2000');
  dbInstance.pragma('mmap_size = 0');
  dbInstance.pragma('temp_store = MEMORY');

  // Initialize Tables & Seed if empty
  initializeSchema(dbInstance);
  seedInitialData(dbInstance, false);

  console.log(`[Kegama Database] SQLite connected at ${DB_PATH} (WAL mode, RAM optimized)`);

  return dbInstance;
}

// Prepared statements cache to eliminate SQL compilation overhead on repetitive health checks
let countStatements: {
  employeeCountStmt?: Database.Statement;
  activeEmployeesStmt?: Database.Statement;
  runsCountStmt?: Database.Statement;
  payslipsCountStmt?: Database.Statement;
  auditLogsCountStmt?: Database.Statement;
} = {};

function getCountStatements(db: Database.Database) {
  if (!countStatements.employeeCountStmt) {
    countStatements = {
      employeeCountStmt: db.prepare('SELECT COUNT(*) as count FROM employees'),
      activeEmployeesStmt: db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'active'"),
      runsCountStmt: db.prepare('SELECT COUNT(*) as count FROM payroll_runs'),
      payslipsCountStmt: db.prepare('SELECT COUNT(*) as count FROM payslips'),
      auditLogsCountStmt: db.prepare('SELECT COUNT(*) as count FROM audit_logs'),
    };
  }
  return countStatements;
}

// In-memory stats cache (10 seconds TTL) to prevent disk I/O lag and RAM churn on health pings
interface CachedStats {
  data: any;
  timestamp: number;
}
let statsCache: CachedStats | null = null;
const STATS_CACHE_TTL_MS = 10000;

export function invalidateDatabaseStatsCache(): void {
  statsCache = null;
}

export function closeDb(): void {
  if (dbInstance) {
    countStatements = {};
    statsCache = null;
    dbInstance.close();
    dbInstance = null;
    console.log('[Kegama Database] SQLite connection closed.');
  }
}

export function getDatabaseStats(forceFresh: boolean = false) {
  const now = Date.now();
  if (!forceFresh && statsCache && now - statsCache.timestamp < STATS_CACHE_TTL_MS) {
    return statsCache.data;
  }

  const db = getDb();
  let sizeBytes = 0;
  try {
    const stat = fs.statSync(DB_PATH);
    sizeBytes = stat.size;
  } catch {
    sizeBytes = 0;
  }

  const stmts = getCountStatements(db);
  const employeeCount = (stmts.employeeCountStmt!.get() as any).count;
  const activeEmployees = (stmts.activeEmployeesStmt!.get() as any).count;
  const runsCount = (stmts.runsCountStmt!.get() as any).count;
  const payslipsCount = (stmts.payslipsCountStmt!.get() as any).count;
  const auditLogsCount = (stmts.auditLogsCountStmt!.get() as any).count;

  const data = {
    path: DB_PATH,
    sizeBytes,
    sizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
    journalMode: 'WAL',
    cached: true,
    counts: {
      employees: employeeCount,
      activeEmployees,
      payrollRuns: runsCount,
      payslips: payslipsCount,
      auditLogs: auditLogsCount,
    },
    cachedAt: new Date(now).toISOString(),
  };

  statsCache = {
    data,
    timestamp: now,
  };

  return data;
}

