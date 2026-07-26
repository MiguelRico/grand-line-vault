import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppSettings } from '../../domain/models';
import { config } from '../config';
import { useAuth } from './AuthProvider';

const storageKey = 'grand-line-vault:settings';
const defaults: AppSettings = { theme: 'LIGHT', catalogDataSource: 'OFFICIAL_STATIC' };

function readLocalSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaults;
    const value = JSON.parse(stored) as Partial<AppSettings>;
    return {
      theme: value.theme === 'DARK' ? 'DARK' : 'LIGHT',
      catalogDataSource:
        value.catalogDataSource === 'ONE_PIECE_API' ? 'ONE_PIECE_API' : 'OFFICIAL_STATIC',
    };
  } catch {
    return defaults;
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateSettings: (next: AppSettings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [settings, setSettings] = useState<AppSettings>(readLocalSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'DARK');
    document.documentElement.style.colorScheme = settings.theme === 'DARK' ? 'dark' : 'light';
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!auth.authenticated || config.VITE_USE_MOCK_DATA) return;
    let active = true;
    setLoading(true);
    fetch('/api/settings')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar los ajustes.');
        const payload = (await response.json()) as { data: AppSettings };
        if (active) setSettings({ ...defaults, ...payload.data });
      })
      .catch(() => {
        if (active) setError('Se están usando los ajustes guardados en este dispositivo.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.authenticated]);

  const updateSettings = useCallback(
    async (next: AppSettings) => {
      const previous = settings;
      setSettings(next);
      setSaving(true);
      setError(null);
      try {
        if (!config.VITE_USE_MOCK_DATA) {
          const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(next),
          });
          if (!response.ok) throw new Error('No se pudieron guardar los ajustes.');
        }
      } catch (saveError) {
        setSettings(previous);
        setError(
          saveError instanceof Error ? saveError.message : 'No se pudieron guardar los ajustes.',
        );
        throw saveError;
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );

  const value = useMemo(
    () => ({ settings, loading, saving, error, updateSettings }),
    [error, loading, saving, settings, updateSettings],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('SettingsProvider no está configurado.');
  return value;
}
