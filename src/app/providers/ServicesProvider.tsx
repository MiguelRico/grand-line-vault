import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { config } from '../config';
import {
  LocalOrganizationRepository,
  type OrganizationRepository,
} from '../../infrastructure/repositories';
import { HybridCatalogRepository } from '../../infrastructure/HybridCatalogRepository';
import { MockCardDetailRepository } from '../../infrastructure/MockCardDetailRepository';
import { CatalogUseCases } from '../../domain/catalogUseCases';
import { CollectionService } from '../../domain/CollectionService';
import { WishlistService } from '../../domain/WishlistService';
import { canUseCloudSync } from '../../domain/userCapabilities';
import {
  IndexedDbCollectionRepository,
  IndexedDbWishlistRepository,
} from '../../infrastructure/IndexedDbCollectionRepository';
import {
  CloudSyncCollectionRepository,
  CloudSyncOrganizationRepository,
  CloudSyncWishlistRepository,
} from '../../infrastructure/CloudSyncRepositories';
import { useAuth } from './AuthProvider';

interface Services {
  catalog: CatalogUseCases;
  catalogProvider: 'FIRESTORE_INDEX';
  collection: CollectionService;
  wishlist: WishlistService;
  organization: OrganizationRepository;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const cloudSyncEnabled = canUseCloudSync(auth.profile);
  const dataMode = `${auth.user?.uid ?? 'UNAUTHENTICATED'}:${cloudSyncEnabled ? 'cloud' : 'local'}`;
  const previousDataMode = useRef(dataMode);

  useEffect(() => {
    if (previousDataMode.current === dataMode) return;
    previousDataMode.current = dataMode;
    for (const queryKey of [['collection'], ['wishlist'], ['boxes'], ['sales-packs']]) {
      void queryClient.resetQueries({ queryKey });
    }
  }, [dataMode, queryClient]);

  const services = useMemo<Services>(() => {
    const ownerId = auth.user?.uid ?? 'UNAUTHENTICATED';
    const catalogRepository = new HybridCatalogRepository();
    const catalog = new CatalogUseCases(
      catalogRepository,
      config.VITE_USE_MOCK_CARD_DETAIL ? new MockCardDetailRepository() : catalogRepository,
    );
    const localCollection = new IndexedDbCollectionRepository();
    const localWishlist = new IndexedDbWishlistRepository();
    const localOrganization = new LocalOrganizationRepository(ownerId);
    return {
      catalog,
      catalogProvider: 'FIRESTORE_INDEX',
      collection: new CollectionService(
        ownerId,
        cloudSyncEnabled
          ? new CloudSyncCollectionRepository(ownerId, localCollection)
          : localCollection,
        catalog,
      ),
      wishlist: new WishlistService(
        ownerId,
        cloudSyncEnabled ? new CloudSyncWishlistRepository(ownerId, localWishlist) : localWishlist,
        catalog,
      ),
      organization: cloudSyncEnabled
        ? new CloudSyncOrganizationRepository(ownerId, localOrganization)
        : localOrganization,
    };
  }, [auth.user?.uid, cloudSyncEnabled]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider no está configurado.');
  return value;
}
