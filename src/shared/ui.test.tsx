import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardImage } from './ui';

afterEach(() => {
  vi.useRealTimers();
});

describe('CardImage', () => {
  it('shows one loader SVG until the card image loads', () => {
    vi.useFakeTimers();
    const { container } = render(<CardImage src="/card.png" alt="Carta Luffy" />);
    const cardImage = screen.getByAltText('Carta Luffy');

    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(container.querySelectorAll('img[src^="/one-piece-spinner-"]')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveClass('w-[64%]');
    expect(cardImage).toHaveClass('opacity-0');
    expect(cardImage).not.toHaveAttribute('src');

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(cardImage).toHaveAttribute('src', '/card.png');

    fireEvent.load(cardImage);

    expect(container.querySelector('img[src^="/one-piece-spinner-"]')).not.toBeInTheDocument();
    expect(cardImage).toHaveClass('opacity-100');
  });

  it('replaces a failed image with the One Piece user SVG', () => {
    const { container } = render(<CardImage src="/missing.png" alt="Carta desconocida" />);

    fireEvent.error(screen.getByAltText('Carta desconocida'));

    expect(screen.getByText('Imagen no disponible')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/one-piece-user.svg');
    expect(container.querySelector('img')).toHaveClass('w-[64%]');
  });
});
