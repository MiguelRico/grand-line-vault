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

const storageKey = 'grand-line-vault:settings';
const defaults: AppSettings = { theme: 'LIGHT' };

function readLocalSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaults;
    const value = JSON.parse(stored) as Partial<AppSettings>;
    return {
      theme: value.theme === 'DARK' ? 'DARK' : 'LIGHT',
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
  const [settings, setSettings] = useState<AppSettings>(readLocalSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'DARK');
    document.documentElement.style.colorScheme = settings.theme === 'DARK' ? 'dark' : 'light';
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback(
    async (next: AppSettings) => {
      const previous = settings;
      setSettings(next);
      setSaving(true);
      setError(null);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
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
    () => ({ settings, loading: false, saving, error, updateSettings }),
    [error, saving, settings, updateSettings],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('SettingsProvider no está configurado.');
  return value;
}
