import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '../../domain/models';
import { firebaseAuth } from '../../infrastructure/firebaseClient';
import { FirebaseUserProfileRepository } from '../../infrastructure/FirebaseUserProfileRepository';

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
  getIdToken(): Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const profiles = new FirebaseUserProfileRepository();

function authMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/too-many-requests': 'Demasiados intentos. Inténtalo de nuevo más tarde.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  };
  return (
    messages[code] ?? (error instanceof Error ? error.message : 'No se pudo completar el acceso.')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let unsubscribeProfile: () => void = () => undefined;
    let active = true;
    try {
      const auth = firebaseAuth();
      void setPersistence(auth, browserLocalPersistence);
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        unsubscribeProfile();
        unsubscribeProfile = () => undefined;
        setUser(nextUser);
        setProfile(null);
        if (!nextUser) {
          setLoading(false);
          return;
        }
        setLoading(true);
        profiles
          .getOrCreate(nextUser)
          .then((nextProfile) => {
            if (!active || auth.currentUser?.uid !== nextUser.uid) return;
            setProfile(nextProfile);
            unsubscribeProfile = profiles.watch(nextUser.uid, setProfile, () => void signOut(auth));
          })
          .catch(() => {
            if (!active || auth.currentUser?.uid !== nextUser.uid) return;
            setProfile(null);
            void signOut(auth);
          })
          .finally(() => {
            if (active && auth.currentUser?.uid === nextUser.uid) setLoading(false);
          });
      });
    } catch {
      setLoading(false);
    }
    return () => {
      active = false;
      unsubscribeProfile();
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await setPersistence(firebaseAuth(), browserLocalPersistence);
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
    } catch (error) {
      throw new Error(authMessage(error));
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      await setPersistence(firebaseAuth(), browserLocalPersistence);
      await createUserWithEmailAndPassword(firebaseAuth(), email, password);
    } catch (error) {
      throw new Error(authMessage(error));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(firebaseAuth(), email);
    } catch (error) {
      throw new Error(authMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth());
    setProfile(null);
  }, []);

  const getIdToken = useCallback(async () => {
    const current = firebaseAuth().currentUser;
    if (!current) throw new Error('La sesión ha caducado.');
    return current.getIdToken();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated: Boolean(user && profile),
      loading,
      user,
      profile,
      login,
      register,
      resetPassword,
      logout,
      getIdToken,
    }),
    [getIdToken, loading, login, logout, profile, register, resetPassword, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no está configurado.');
  return value;
}
