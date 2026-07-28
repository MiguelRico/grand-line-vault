import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { config } from '../config';
import {
  ApiPrivateRepository,
  MockPrivateRepository,
  type PrivateRepository,
} from '../../infrastructure/repositories';
import { HybridCatalogRepository } from '../../infrastructure/HybridCatalogRepository';
import { MockCardDetailRepository } from '../../infrastructure/MockCardDetailRepository';
import { CatalogUseCases } from '../../domain/catalogUseCases';

interface Services {
  catalog: CatalogUseCases;
  catalogProvider: 'FIRESTORE_INDEX';
  privateData: PrivateRepository;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo<Services>(() => {
    const catalogRepository = new HybridCatalogRepository();
    return {
      catalog: new CatalogUseCases(
        catalogRepository,
        config.VITE_USE_MOCK_CARD_DETAIL ? new MockCardDetailRepository() : catalogRepository,
      ),
      catalogProvider: 'FIRESTORE_INDEX',
      privateData: config.VITE_USE_MOCK_DATA
        ? new MockPrivateRepository()
        : new ApiPrivateRepository(),
    };
  }, []);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider no está configurado.');
  return value;
}
