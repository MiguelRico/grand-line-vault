import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Card } from '../domain/models';
import { OnePieceLoader } from './OnePieceLoader';

const LOCAL_IMAGE_DELAY_MS = 1_500;
const unavailableCardImage = `${import.meta.env.BASE_URL}one-piece-user.svg`.replace(/^\/{2,}/, '/');

export function Button({
  className,
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const variants = {
    primary: 'bg-violet text-white hover:bg-indigo-700',
    secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      className={twMerge(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar por nombre o código...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Buscar</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-500"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border-slate-300 bg-white pr-10 text-sm focus:border-violet focus:ring-violet"
      />
    </label>
  );
}

export function CardImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [imageSrc, setImageSrc] = useState(import.meta.env.DEV ? '' : src);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    if (!import.meta.env.DEV) {
      setImageSrc(src);
      return;
    }

    setImageSrc('');
    const timeout = window.setTimeout(() => setImageSrc(src), LOCAL_IMAGE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [src]);

  return (
    <div
      className={twMerge(
        'relative aspect-[5/7] overflow-hidden rounded-lg bg-gradient-to-br from-slate-200 to-slate-100',
        className,
      )}
    >
      {failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-100 p-3">
          <img
            src={unavailableCardImage}
            alt=""
            aria-hidden="true"
            className="h-auto max-h-[58%] w-[64%] object-contain opacity-65"
          />
          <span className="brand-one-piece text-center text-lg leading-none text-slate-600">
            Imagen no disponible
          </span>
        </div>
      ) : (
        <>
          {loading && (
            <span className="absolute inset-0 grid place-items-center">
              <OnePieceLoader
                label={`Cargando ${alt}`}
                className="pointer-events-none aspect-square h-auto w-[64%]"
              />
            </span>
          )}
          <img
            src={imageSrc || undefined}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            className={twMerge(
              'h-full w-full object-cover transition-opacity duration-200',
              loading ? 'opacity-0' : 'opacity-100',
            )}
          />
        </>
      )}
    </div>
  );
}

export function CardTile({
  card,
  owned,
  quantity,
  onOpen,
}: {
  card: Card;
  owned?: boolean;
  quantity?: number;
  onOpen: () => void;
}) {
  return (
    <article className="group min-w-0">
      <button
        onClick={onOpen}
        className="relative block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
        aria-label={`Ver ${card.name}, ${card.code}`}
      >
        <CardImage
          src={card.imageUrl}
          alt={`Carta ${card.name}`}
          className="border border-slate-200 shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-soft"
        />
        {owned && (
          <span className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-emerald-500 text-white shadow">
            <Check className="size-4" aria-hidden />
            <span className="sr-only">En tu colección</span>
          </span>
        )}
        {quantity !== undefined && (
          <span className="absolute right-2 top-2 rounded-full bg-ink/90 px-2 py-1 text-xs font-bold text-white">
            ×{quantity}
          </span>
        )}
      </button>
      <div className="mt-2 min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{card.code}</p>
        <h3 className="truncate text-sm font-semibold text-slate-950">{card.name}</h3>
      </div>
    </article>
  );
}

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
      <button
        className="grid size-11 place-items-center hover:bg-slate-50 disabled:opacity-40"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Reducir cantidad"
      >
        <Minus className="size-4" />
      </button>
      <output className="grid min-w-11 place-items-center border-x border-slate-300 font-bold">
        {value}
      </output>
      <button
        className="grid size-11 place-items-center hover:bg-slate-50 disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Aumentar cantidad"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sheet focus:outline-none md:left-1/2 md:top-1/2 md:bottom-auto md:max-h-[88vh] md:w-[min(880px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:p-7">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-300 md:hidden" />
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Close className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full hover:bg-slate-100">
            <X className="size-5" />
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
      <Button
        variant="ghost"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm font-medium">
        {page} de {pages}
      </span>
      <Button
        variant="ghost"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Página siguiente"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-slate-100">
        <Search className="size-5 text-slate-500" />
      </div>
      <h2 className="font-bold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
      <AlertTriangle className="mb-3 size-6" />
      <p className="font-semibold">Algo no ha salido bien</p>
      <p className="mt-1 text-sm">{message}</p>
      {retry && (
        <Button className="mt-4" onClick={retry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function FavoriteButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="grid size-11 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
      aria-pressed={active}
      aria-label={active ? 'Quitar de favoritas' : 'Marcar como favorita'}
    >
      <Heart className={twMerge('size-5', active && 'fill-red-500 text-red-500')} />
    </button>
  );
}
