import type { UserProfile } from './models';

export function canUseCloudSync(
  profile: Pick<UserProfile, 'premium' | 'cloudSync'> | null,
): boolean {
  return Boolean(profile?.premium && profile.cloudSync);
}
