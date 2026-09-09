import { describe, it, expect } from 'vitest';
import { compareVersions } from '../updateService';

describe('updateService compareVersions', () => {
  it('detects newer minor version', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
  });

  it('detects newer patch version', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
  });

  it('detects newer major version', () => {
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
  });

  it('recognizes equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
  });

  it('recognizes older versions', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBeLessThan(0);
  });
});
