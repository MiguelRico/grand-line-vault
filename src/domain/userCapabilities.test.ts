import { describe, expect, it } from 'vitest';
import { canUseCloudSync } from './userCapabilities';

describe('canUseCloudSync', () => {
  it.each([
    [null, false],
    [{ premium: false, cloudSync: false }, false],
    [{ premium: true, cloudSync: false }, false],
    [{ premium: false, cloudSync: true }, false],
    [{ premium: true, cloudSync: true }, true],
  ])('returns the expected capability for %o', (profile, expected) => {
    expect(canUseCloudSync(profile)).toBe(expected);
  });
});
