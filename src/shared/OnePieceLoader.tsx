import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

const frames = Array.from({ length: 6 }, (_, index) => `/one-piece-spinner-${index + 1}.svg`);

const sizes = {
  xs: 'size-6',
  sm: 'size-10',
  md: 'size-16',
  lg: 'size-24',
} as const;

export function OnePieceLoader({
  label = 'Cargando',
  size = 'md',
  className,
}: {
  label?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const [frame] = useState(
    () => frames[Math.floor(Math.random() * frames.length)] ?? frames[0],
  );

  return (
    <span
      role="status"
      aria-label={label}
      className={twMerge(
        'relative inline-grid shrink-0 place-items-center',
        sizes[size],
        className,
      )}
    >
      <span className="absolute inset-0 rounded-full border-2 border-indigo-200/80 border-t-violet one-piece-loader-orbit" />
      <span className="absolute inset-[4px] rounded-full bg-white/90 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-900/90 dark:ring-slate-700" />
      <span className="relative size-[72%] overflow-hidden rounded-full">
        <img
          src={frame}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-contain"
        />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
