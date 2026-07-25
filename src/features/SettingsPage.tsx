import { Database, Moon, Sun } from 'lucide-react';
import type { AppSettings } from '../domain/models';
import { useSettings } from '../app/providers/SettingsProvider';
import { PageHeader } from '../shared/AppShell';

export function SettingsPage() {
  const { settings, loading, saving, error, updateSettings } = useSettings();
  const selectTheme = async (theme: AppSettings['theme']) => {
    try {
      await updateSettings({ ...settings, theme });
    } catch {
      // SettingsProvider restores the previous value and exposes the message.
    }
  };
  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Ajustes" subtitle="Catálogo oficial y apariencia" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
              <Database className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Catálogo de cartas</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Grand Line Vault usa una copia versionada del catálogo oficial. Las búsquedas y
                filtros se realizan localmente y no envían peticiones a Bandai mientras navegas.
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
              {settings.theme === 'DARK' ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Apariencia</h2>
              <p className="mt-1 text-sm text-slate-600">El tema se conserva para la próxima sesión.</p>
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
                onClick={() => void selectTheme(value)}
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
