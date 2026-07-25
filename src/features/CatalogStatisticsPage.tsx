import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Image,
  Layers3,
  LibraryBig,
  Palette,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../shared/AppShell';
import { ErrorState } from '../shared/ui';
import { OnePieceLoader } from '../shared/OnePieceLoader';
import {
  loadStaticCatalog,
  type LoadedStaticCatalog,
  type StaticCatalogCard,
} from '../infrastructure/staticCatalog';

interface DistributionItem {
  label: string;
  value: number;
}

export interface CatalogStatistics {
  totalRecords: number;
  totalBaseCards: number;
  totalVariants: number;
  totalSets: number;
  cardsWithImages: number;
  imageCoverage: number;
  categories: DistributionItem[];
  rarities: DistributionItem[];
  colors: DistributionItem[];
  variantTypes: DistributionItem[];
  topSets: DistributionItem[];
}

function distribution(values: string[]): DistributionItem[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const label = value.trim() || 'Sin especificar';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

export function calculateCatalogStatistics(catalog: LoadedStaticCatalog): CatalogStatistics {
  const baseCards = catalog.cards.filter((card) => card.variant.type === 'base');
  const distributionSource = baseCards.length > 0 ? baseCards : catalog.cards;
  const colorValues = distributionSource.flatMap((card) => card.colors);
  const variantLabels: Record<StaticCatalogCard['variant']['type'], string> = {
    base: 'Arte base',
    parallel: 'Paralelas',
    reprint: 'Reimpresiones',
    unknown: 'Sin clasificar',
  };
  const totalRecords = catalog.cards.length;
  const cardsWithImages = catalog.cards.filter((card) => Boolean(card.imageUrl)).length;

  return {
    totalRecords,
    totalBaseCards: catalog.manifest.totalBaseCards,
    totalVariants: catalog.manifest.totalVariants,
    totalSets: catalog.sets.length,
    cardsWithImages,
    imageCoverage: totalRecords > 0 ? (cardsWithImages / totalRecords) * 100 : 0,
    categories: distribution(distributionSource.map((card) => card.category)),
    rarities: distribution(distributionSource.map((card) => card.rarity)),
    colors: distribution(colorValues),
    variantTypes: distribution(
      catalog.cards.map((card) => variantLabels[card.variant.type]),
    ),
    topSets: catalog.sets
      .map((set) => ({ label: set.name, value: set.cardCount }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
      .slice(0, 10),
  };
}

function DistributionList({
  title,
  items,
  color,
}: {
  title: string;
  items: DistributionItem[];
  color: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{item.label}</span>
              <strong className="text-slate-950">{item.value}</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CatalogStatisticsPage() {
  const catalogQuery = useQuery({
    queryKey: ['static-catalog'],
    queryFn: loadStaticCatalog,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (catalogQuery.isPending) {
    return (
      <div className="grid min-h-[70dvh] place-items-center p-6">
        <div className="flex flex-col items-center gap-4">
          <OnePieceLoader size="lg" label="Calculando estadísticas del catálogo" />
          <p className="text-sm font-semibold text-slate-600">Analizando el catálogo oficial…</p>
        </div>
      </div>
    );
  }

  if (catalogQuery.isError) {
    return (
      <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        <ErrorState
          message="No se pudieron calcular las estadísticas del catálogo."
          retry={() => void catalogQuery.refetch()}
        />
      </div>
    );
  }

  const catalog = catalogQuery.data;
  const stats = calculateCatalogStatistics(catalog);
  const summary = [
    {
      label: 'Cartas base',
      value: stats.totalBaseCards,
      icon: BookOpen,
      style: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Artes y ediciones',
      value: stats.totalRecords,
      icon: Image,
      style: 'bg-violet-50 text-violet',
    },
    {
      label: 'Variantes',
      value: stats.totalVariants,
      icon: Sparkles,
      style: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Expansiones',
      value: stats.totalSets,
      icon: LibraryBig,
      style: 'bg-emerald-50 text-emerald-700',
    },
  ] as const;

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Estadísticas del catálogo"
        subtitle={`Versión ${catalog.manifest.catalogVersion} · Actualizado el ${new Date(
          catalog.manifest.generatedAt,
        ).toLocaleDateString('es-ES')}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <span className={`grid size-11 place-items-center rounded-xl ${item.style}`}>
              <item.icon className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-3xl font-black text-slate-950">
              {item.value.toLocaleString('es-ES')}
            </p>
          </article>
        ))}
      </div>

      <section className="mt-5 rounded-2xl bg-gradient-to-br from-navy to-indigo-950 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-200">
              <Layers3 className="size-5" />
              <span className="text-sm font-semibold">Cobertura de imágenes</span>
            </div>
            <p className="mt-3 text-4xl font-black">{stats.imageCoverage.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-slate-300">
              {stats.cardsWithImages.toLocaleString('es-ES')} de{' '}
              {stats.totalRecords.toLocaleString('es-ES')} artes con imagen oficial
            </p>
          </div>
          <div className="w-full max-w-xl">
            <div className="h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet"
                style={{ width: `${stats.imageCoverage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <DistributionList title="Tipos de carta" items={stats.categories} color="bg-indigo-500" />
        <DistributionList title="Rarezas" items={stats.rarities} color="bg-amber-500" />
        <DistributionList title="Colores" items={stats.colors} color="bg-rose-500" />
        <DistributionList
          title="Tipos de arte"
          items={stats.variantTypes}
          color="bg-emerald-500"
        />
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-violet" />
          <h2 className="font-black text-slate-950">Expansiones con más registros</h2>
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {stats.topSets.map((set, index) => (
            <div key={set.label} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{set.label}</span>
              <strong>{set.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
