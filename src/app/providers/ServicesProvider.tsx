import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { config } from '../config';
import {
  ApiPrivateRepository,
  MockPrivateRepository,
  type CatalogRepository,
  type PrivateRepository,
} from '../../infrastructure/repositories';
import { StaticCatalogRepository } from '../../infrastructure/StaticCatalogRepository';

interface Services {
  catalog: CatalogRepository;
  privateData: PrivateRepository;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo<Services>(
    () => ({
      catalog: new StaticCatalogRepository(),
      privateData: config.VITE_USE_MOCK_DATA
        ? new MockPrivateRepository()
        : new ApiPrivateRepository(),
    }),
    [],
  );
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider no está configurado.');
  return value;
}
