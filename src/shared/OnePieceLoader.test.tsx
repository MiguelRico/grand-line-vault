import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnePieceLoader } from './OnePieceLoader';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OnePieceLoader', () => {
  it('exposes an accessible loading status', () => {
    render(<OnePieceLoader label="Cargando colección" size="sm" />);

    expect(screen.getByRole('status', { name: 'Cargando colección' })).toBeInTheDocument();
  });

  it('renders only one randomly selected SVG', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { container } = render(<OnePieceLoader />);
    const sources = Array.from(container.querySelectorAll('img'), (image) =>
      image.getAttribute('src'),
    );

    expect(sources).toEqual(['/one-piece-spinner-4.svg']);
  });
});
