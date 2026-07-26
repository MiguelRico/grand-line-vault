import { Database, Moon, Sun } from 'lucide-react';
import type { AppSettings } from '../domain/models';
import { useSettings } from '../app/providers/SettingsProvider';
import { PageHeader } from '../shared/AppShell';

export function SettingsPage() {
  const { settings, loading, saving, error, updateSettings } = useSettings();

  const update = async (patch: Partial<AppSettings>) => {
    try {
      await updateSettings({ ...settings, ...patch });
    } catch {
      // SettingsProvider restores the previous value and exposes the message.
    }
  };

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Ajustes" subtitle="Fuentes del catálogo y apariencia" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
              <Database className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Catálogo de cartas</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Elige la fuente utilizada para búsquedas, detalles, artes y precios.
              </p>
            </div>
          </div>
          <div
            className="mt-5 grid gap-3 sm:grid-cols-2"
            role="group"
            aria-label="Fuente del catálogo"
          >
            {(
              [
                [
                  'OFFICIAL_STATIC',
                  'Catálogo estático',
                  'Fuente principal incluida en la aplicación. Funciona sin conexión externa.',
                ],
                [
                  'ONE_PIECE_API',
                  'One Piece API',
                  'Catálogo y precios remotos. Requiere ONE_PIECE_API_KEY en el servidor.',
                ],
              ] as const
            ).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                disabled={loading || saving}
                onClick={() => void update({ catalogDataSource: value })}
                className={`rounded-xl border p-4 text-left transition ${
                  settings.catalogDataSource === value
                    ? 'border-violet bg-indigo-50 ring-1 ring-violet'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <span className="block font-black text-slate-950">{label}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
              {settings.theme === 'DARK' ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Apariencia</h2>
              <p className="mt-1 text-sm text-slate-600">
                El tema se conserva para la próxima sesión.
              </p>
            </div>
          </div>
          <div className="mt-5 grid max-w-md grid-cols-2 gap-3" role="group" aria-label="Tema">
            {(
              [
                ['LIGHT', 'Claro', Sun],
                ['DARK', 'Oscuro', Moon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                disabled={loading || saving}
                onClick={() => void update({ theme: value })}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border font-bold transition ${
                  settings.theme === value
                    ? 'border-violet bg-violet text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </section>
        {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      </div>
    </div>
  );
}
