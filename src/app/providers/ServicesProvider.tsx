import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { config } from '../config';
import {
  LocalOrganizationRepository,
  type OrganizationRepository,
} from '../../infrastructure/repositories';
import { HybridCatalogRepository } from '../../infrastructure/HybridCatalogRepository';
import { MockCardDetailRepository } from '../../infrastructure/MockCardDetailRepository';
import { CatalogUseCases } from '../../domain/catalogUseCases';
import { CollectionService } from '../../domain/CollectionService';
import { IndexedDbCollectionRepository } from '../../infrastructure/IndexedDbCollectionRepository';
import { useAuth } from './AuthProvider';

interface Services {
  catalog: CatalogUseCases;
  catalogProvider: 'FIRESTORE_INDEX';
  collection: CollectionService;
  organization: OrganizationRepository;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const services = useMemo<Services>(() => {
    const catalogRepository = new HybridCatalogRepository();
    const catalog = new CatalogUseCases(
        catalogRepository,
        config.VITE_USE_MOCK_CARD_DETAIL ? new MockCardDetailRepository() : catalogRepository,
      );
    return {
      catalog,
      catalogProvider: 'FIRESTORE_INDEX',
      collection: new CollectionService(
        auth.user?.uid ?? 'UNAUTHENTICATED',
        new IndexedDbCollectionRepository(),
        catalog,
      ),
      // Organización y packs siguen siendo locales hasta implementar cloudSync.
      organization: new LocalOrganizationRepository(auth.user?.uid ?? 'UNAUTHENTICATED'),
    };
  }, [auth.user?.uid]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider no está configurado.');
  return value;
}
