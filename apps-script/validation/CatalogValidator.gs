var CatalogValidator = {
  card: function (card) {
    if (!card || !card.id || !card.code || !card.name || !card.imageUrl)
      throw CatalogError.retryable('INVALID_NORMALIZED_CARD', 'Carta normalizada incompleta.');
    return card;
  }
};
