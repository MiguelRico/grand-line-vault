var ProviderCapabilities = {
  ARJUNKAI_OPTCG: {
    supportsPagination: true, supportsSearch: true, supportsSets: true,
    supportsVariants: true, supportsPrices: true, supportsPriceHistory: true,
    supportsLanguages: false, supportsDonCards: true, supportsPromos: true,
    supportsServerSideFilters: true,
    supportedFilters: ['set', 'color', 'type', 'rarity', 'variant', 'cost', 'power', 'price', 'sort']
  },
  OPTCG_API: {
    supportsPagination: false, supportsSearch: false, supportsSets: true,
    supportsVariants: true, supportsPrices: true, supportsPriceHistory: true,
    supportsLanguages: false, supportsDonCards: true, supportsPromos: true,
    supportsServerSideFilters: true,
    supportedFilters: ['set', 'color', 'type', 'rarity', 'cost', 'power']
  }
};
