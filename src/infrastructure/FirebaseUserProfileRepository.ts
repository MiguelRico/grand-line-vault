import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../domain/models';
import { firestoreClient } from './firebaseClient';

function freeProfile(user: User, timestamp: string): UserProfile {
  if (!user.email) throw new Error('La cuenta de Firebase no tiene un correo asociado.');
  return {
    schemaVersion: 1,
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    premium: false,
    cloudSync: false,
    adsEnabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<UserProfile>;
  return (
    profile.schemaVersion === 1 &&
    typeof profile.uid === 'string' &&
    typeof profile.email === 'string' &&
    typeof profile.premium === 'boolean' &&
    typeof profile.cloudSync === 'boolean' &&
    typeof profile.adsEnabled === 'boolean' &&
    typeof profile.createdAt === 'string' &&
    typeof profile.updatedAt === 'string'
  );
}

export class FirebaseUserProfileRepository {
  async getOrCreate(user: User): Promise<UserProfile> {
    const reference = doc(firestoreClient(), 'users', user.uid);
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) {
      const value = snapshot.data();
      if (!isUserProfile(value) || value.uid !== user.uid)
        throw new Error('El perfil de usuario almacenado no es válido.');
      return value;
    }
    const timestamp = new Date().toISOString();
    const profile = freeProfile(user, timestamp);
    await setDoc(reference, profile);
    return profile;
  }

  watch(
    uid: string,
    onProfile: (profile: UserProfile) => void,
    onError: (error: Error) => void,
  ): () => void {
    const reference = doc(firestoreClient(), 'users', uid);
    return onSnapshot(
      reference,
      (snapshot) => {
        const value = snapshot.data();
        if (!snapshot.exists() || !isUserProfile(value) || value.uid !== uid) {
          onError(new Error('El perfil de usuario almacenado no es válido.'));
          return;
        }
        onProfile(value);
      },
      (error) => onError(error),
    );
  }
}
