import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { config } from '../config';
import {
  ApiPrivateRepository,
  AppsScriptCatalogRepository,
  MockCatalogRepository,
  MockPrivateRepository,
  type CatalogRepository,
  type PrivateRepository,
} from '../../infrastructure/repositories';
import { useSettings } from './SettingsProvider';

interface Services {
  catalog: CatalogRepository;
  privateData: PrivateRepository;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const services = useMemo<Services>(
    () => ({
      catalog: config.VITE_USE_MOCK_DATA
        ? new MockCatalogRepository()
        : new AppsScriptCatalogRepository(config.VITE_APPS_SCRIPT_URL, settings.catalogProvider),
      privateData: config.VITE_USE_MOCK_DATA
        ? new MockPrivateRepository()
        : new ApiPrivateRepository(),
    }),
    [settings.catalogProvider],
  );
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider no está configurado.');
  return value;
}
