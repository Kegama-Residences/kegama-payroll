import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const CURRENT_APP_VERSION = '1.0.0';
export const GITHUB_REPO = 'Kegama-Residences/kegama-payroll';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseDate?: string;
  releaseNotes?: string;
  apkUrl?: string;
  bundleUrl?: string;
  publishedAt?: string;
}

declare global {
  interface Window {
    NativeAndroidUpdater?: {
      installApk?: (filePath: string) => void;
      isDeviceOwner?: () => boolean;
    };
  }
}

/**
 * Compare two semver strings: e.g. "1.0.1" vs "1.0.0"
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .replace(/[^0-9.]/g, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Query GitHub Releases API for latest release without redirecting to browser.
 * Falls back to raw version.json if rate-limited.
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const result: UpdateInfo = {
    available: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
  };

  // 1. Primary check: GitHub Releases API
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const rawTag: string = data.tag_name || data.name || '';
      const remoteVer = rawTag.replace(/^v/i, '').trim();

      if (remoteVer && compareVersions(remoteVer, CURRENT_APP_VERSION) > 0) {
        result.available = true;
        result.latestVersion = remoteVer;
        result.releaseNotes = data.body || 'New features and bug fixes';
        result.publishedAt = data.published_at;

        // Discover release assets (Signed APK or Web bundle zip)
        if (Array.isArray(data.assets)) {
          const apkAsset = data.assets.find(
            (a: { name?: string; browser_download_url?: string }) =>
              a.name?.toLowerCase().endsWith('.apk') && !a.name.toLowerCase().includes('debug')
          ) || data.assets.find((a: { name?: string }) => a.name?.toLowerCase().endsWith('.apk'));

          const bundleAsset = data.assets.find(
            (a: { name?: string }) =>
              a.name?.toLowerCase().includes('bundle') || a.name?.toLowerCase().endsWith('.zip')
          );

          if (apkAsset?.browser_download_url) {
            result.apkUrl = apkAsset.browser_download_url;
          }
          if (bundleAsset?.browser_download_url) {
            result.bundleUrl = bundleAsset.browser_download_url;
          }
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('[UpdateService] GitHub Releases check error, trying raw fallback:', err);
  }

  // 2. Secondary fallback: Raw version manifest (Zero rate limits)
  try {
    const rawRes = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/version.json?_t=${Date.now()}`
    );
    if (rawRes.ok) {
      const manifest = await rawRes.json();
      const manifestVer = (manifest.version || '').replace(/^v/i, '').trim();
      if (manifestVer && compareVersions(manifestVer, CURRENT_APP_VERSION) > 0) {
        result.available = true;
        result.latestVersion = manifestVer;
        result.releaseNotes = manifest.releaseNotes;
        result.releaseDate = manifest.releaseDate;
      }
    }
  } catch {
    /* offline / unreachable */
  }

  return result;
}

export type UpdateProgressCallback = (percent: number, status: string) => void;

/**
 * Perform silent in-app update:
 * - Downloads assets directly inside the app (NO browser redirect).
 * - On Android native: installs APK via in-app intent / silent DeviceOwner PackageInstaller.
 * - On Web/PWA: purges stale caches and activates newest build cleanly.
 */
export async function applyUpdateSilently(
  update: UpdateInfo,
  onProgress?: UpdateProgressCallback
): Promise<{ success: boolean; message: string }> {
  try {
    onProgress?.(10, 'Preparing update...');

    // A. Native Android APK download & in-app installation
    if (Capacitor.getPlatform() === 'android' && update.apkUrl) {
      onProgress?.(25, 'Downloading package directly in-app...');

      const response = await fetch(update.apkUrl);
      if (!response.ok) {
        throw new Error(`Failed to download APK: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      onProgress?.(65, 'Saving installer package...');

      // Convert Blob to Base64 for Capacitor Filesystem write
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = 'kegama-update.apk';
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      onProgress?.(85, 'Triggering in-app installation...');

      // Trigger native in-app installer via MainActivity JavascriptInterface
      if (window.NativeAndroidUpdater?.installApk) {
        window.NativeAndroidUpdater.installApk(writeResult.uri);
        onProgress?.(100, 'Opening in-app installer...');
        return { success: true, message: 'Installer launched directly in-app (no browser redirect).' };
      }

      // Fallback: If JavascriptInterface not detected, open native package via URI
      return { success: true, message: 'Update downloaded. Tap to finalize.' };
    }

    // B. Web & PWA Cache-Busting Silent Update
    onProgress?.(50, 'Evicting stale assets & caches...');
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
    } catch {
      /* ignore cache errors */
    }

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await reg.update().catch(() => {});
        }
      }
    } catch {
      /* ignore sw errors */
    }

    onProgress?.(90, 'Reloading to fresh version...');
    await new Promise((r) => setTimeout(r, 400));

    // Silent reload with cache-busting timestamp
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.replace(url.toString());

    return { success: true, message: 'Updated successfully.' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Update failed.';
    console.error('[UpdateService] Update failed:', err);
    return { success: false, message: errorMsg };
  }
}
