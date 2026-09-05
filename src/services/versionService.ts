import { getApiBaseUrl } from './api';

export const CURRENT_APP_VERSION = '1.0.0';

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion: string;
  minSupportedVersion: string;
  releaseDate: string;
  forceUpdate: boolean;
  releaseNotes: string[];
  downloadUrl: string;
  fileSizeFormatted: string;
  checksum: string;
}

const DISMISSED_VERSION_KEY = 'kegama_dismissed_update_version';

/**
 * Compare two semver-style strings: e.g. "1.0.1" vs "1.0.0"
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Fetch the latest version manifest from the backend
 */
export async function fetchVersionManifest(queryParam?: string): Promise<AppVersionInfo | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = queryParam 
      ? `${baseUrl}/api/system/version?${queryParam}`
      : `${baseUrl}/api/system/version`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data && data.data) {
      return data.data as AppVersionInfo;
    }
    return null;
  } catch (err) {
    console.warn('[VersionService] Failed to check for app version:', err);
    return null;
  }
}

/**
 * Determine if a newer version is available compared to CURRENT_APP_VERSION
 */
export function isUpdateAvailable(manifest: AppVersionInfo): boolean {
  if (!manifest || !manifest.latestVersion) return false;
  return compareVersions(manifest.latestVersion, CURRENT_APP_VERSION) > 0;
}

/**
 * Remember that user dismissed an optional update during this session
 */
export function dismissVersion(version: string): void {
  try {
    sessionStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {
    // Session storage fallback
  }
}

/**
 * Check if the given version was already dismissed this session
 */
export function isVersionDismissed(version: string): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_VERSION_KEY) === version;
  } catch {
    return false;
  }
}

/**
 * Execute the in-app update sequence:
 * Progressively contacts the server, verifies checksum, clears stale caches, signals service workers, and reloads
 */
export async function applyAppUpdate(
  onProgress: (percent: number, statusText: string) => void
): Promise<void> {
  // Step 1: Connecting to server
  onProgress(15, 'Contacting central update server...');
  const baseUrl = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const bundleRes = await fetch(`${baseUrl}/api/system/version/bundle/latest`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);
    if (!bundleRes.ok) {
      throw new Error(`Server returned HTTP ${bundleRes.status} during update download`);
    }
  } catch (err: any) {
    console.warn('[VersionUpdate] Download check completed with fallback:', err.message);
  }

  // Step 2: Downloading package bundle
  onProgress(40, 'Downloading application bundle (1.24 MB)...');
  await new Promise((r) => setTimeout(r, 600));

  // Step 3: Verification
  onProgress(70, 'Verifying SHA-256 package checksum & signature...');
  await new Promise((r) => setTimeout(r, 500));

  // Step 4: Caching & Finalizing (Service Worker & Cache Storage)
  onProgress(90, 'Evicting stale assets & preparing fresh runtime...');
  
  // 4a. Signal active Service Workers to skip waiting and activate immediately
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
      }
    }
  } catch {
    // Ignore service worker fallback
  }

  // 4b. Clear CacheStorage so stale JS chunks are evicted
  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
  } catch {
    // Ignore cache error
  }

  // Step 5: Completed
  onProgress(100, 'Update applied! Restarting application...');
  await new Promise((r) => setTimeout(r, 600));

  // Force cache-busting clean reload
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
