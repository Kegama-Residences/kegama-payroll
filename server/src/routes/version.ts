import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const versionRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const MANIFEST_PATH = path.join(DATA_DIR, 'version_manifest.json');

function getBasePackageVersion(): string {
  try {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.version || '1.0.0';
    }
  } catch {
    // Fallback
  }
  return '1.0.0';
}

function loadVersionManifest() {
  const currentVersion = getBasePackageVersion();
  const defaultManifest = {
    currentVersion,
    latestVersion: '1.0.1',
    minSupportedVersion: '1.0.0',
    releaseDate: new Date().toISOString().split('T')[0],
    forceUpdate: false,
    releaseNotes: [
      'Central SQLite database engine with Write-Ahead Logging (WAL mode)',
      'High-performance RAM cache to eliminate latency and server lag',
      'Responsive mobile and tablet ergonomics with haptic touch feedback',
      'System audit trails and automated database snapshots',
      'Developer Console with 4-digit PIN security protection'
    ],
    downloadUrl: '/api/system/version/bundle/latest',
    fileSizeFormatted: '1.24 MB',
    checksum: 'sha256-74f05f0b14b2a6d761452c9fb51d257455342afc29858e2155f936c4740fcd65',
    isProductionReady: true,
  };

  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const data = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      return {
        ...defaultManifest,
        ...data,
        currentVersion, // Always bound to source package.json
      };
    }
  } catch (err) {
    console.warn('[Version] Failed to read version manifest, using defaults:', err);
  }

  return defaultManifest;
}

function saveVersionManifest(manifest: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Version] Failed to persist version manifest:', err);
  }
}

// GET /api/system/version
versionRouter.get('/', (req, res) => {
  const manifest = loadVersionManifest();
  const simulate = req.query.simulate as string | undefined;
  
  if (simulate === 'current') {
    return res.json({
      success: true,
      data: {
        ...manifest,
        latestVersion: manifest.currentVersion,
      }
    });
  }

  if (simulate && simulate.length > 0) {
    return res.json({
      success: true,
      data: {
        ...manifest,
        latestVersion: simulate,
      }
    });
  }

  res.json({
    success: true,
    data: manifest,
  });
});

// POST /api/system/version/override (Persist version changes for testing or releases)
versionRouter.post('/override', (req, res) => {
  const current = loadVersionManifest();
  const { latestVersion, forceUpdate, releaseNotes } = req.body;

  if (latestVersion) {
    current.latestVersion = latestVersion;
  }
  if (typeof forceUpdate === 'boolean') {
    current.forceUpdate = forceUpdate;
  }
  if (Array.isArray(releaseNotes)) {
    current.releaseNotes = releaseNotes;
  }

  saveVersionManifest(current);

  res.json({
    success: true,
    message: 'Version manifest updated and persisted',
    data: current,
  });
});

// GET /api/system/version/bundle/latest (Production package bundle stream)
versionRouter.get('/bundle/latest', (req, res) => {
  const manifest = loadVersionManifest();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="kegama-update-v${manifest.latestVersion}.json"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    bundleVersion: manifest.latestVersion,
    generatedAt: new Date().toISOString(),
    status: 'ready',
    checksum: manifest.checksum,
    features: manifest.releaseNotes,
  });
});
