import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnePieceLoader } from './OnePieceLoader';

describe('OnePieceLoader', () => {
  it('exposes an accessible loading status', () => {
    render(<OnePieceLoader label="Cargando colección" size="sm" />);

    expect(screen.getByRole('status', { name: 'Cargando colección' })).toBeInTheDocument();
  });

  it('renders the six supplied animation frames in order', () => {
    const { container } = render(<OnePieceLoader />);
    const sources = Array.from(container.querySelectorAll('img'), (image) =>
      image.getAttribute('src'),
    );

    expect(sources).toEqual(
      Array.from({ length: 6 }, (_, index) => `/one-piece-spinner-${index + 1}.svg`),
    );
  });
});
