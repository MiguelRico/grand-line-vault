import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { config } from '../config';
import {
  ApiPrivateRepository,
  MockPrivateRepository,
  type CatalogRepository,
  type PrivateRepository,
} from '../../infrastructure/repositories';
import { StaticCatalogRepository } from '../../infrastructure/StaticCatalogRepository';
import { OnePieceApiRepository } from '../../infrastructure/OnePieceApiRepository';
import { useSettings } from './SettingsProvider';

interface Services {
  catalog: CatalogRepository;
  catalogProvider: 'OFFICIAL_STATIC' | 'ONE_PIECE_API';
  privateData: PrivateRepository;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const services = useMemo<Services>(
    () => ({
      catalog:
        settings.catalogDataSource === 'ONE_PIECE_API'
          ? new OnePieceApiRepository()
          : new StaticCatalogRepository(),
      catalogProvider: settings.catalogDataSource,
      privateData: config.VITE_USE_MOCK_DATA
        ? new MockPrivateRepository()
        : new ApiPrivateRepository(),
    }),
    [settings.catalogDataSource],
  );
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider no está configurado.');
  return value;
}
