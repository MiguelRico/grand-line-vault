import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import { AppShell } from '../shared/AppShell';
import { LoginPage } from '../features/LoginPage';
import { OnePieceLoader } from '../shared/OnePieceLoader';

const CatalogPage = lazy(() =>
  import('../features/CatalogPage').then((module) => ({ default: module.CatalogPage })),
);
const CollectionPage = lazy(() =>
  import('../features/CollectionPage').then((module) => ({ default: module.CollectionPage })),
);
const BoxesPage = lazy(() =>
  import('../features/SecondaryPages').then((module) => ({ default: module.BoxesPage })),
);
const SalesPacksPage = lazy(() =>
  import('../features/SecondaryPages').then((module) => ({ default: module.SalesPacksPage })),
);
const StatisticsPage = lazy(() =>
  import('../features/SecondaryPages').then((module) => ({ default: module.StatisticsPage })),
);
const CatalogStatisticsPage = lazy(() =>
  import('../features/CatalogStatisticsPage').then((module) => ({
    default: module.CatalogStatisticsPage,
  })),
);
const FavoritesPage = lazy(() =>
  import('../features/SecondaryPages').then((module) => ({ default: module.FavoritesPage })),
);
const SettingsPage = lazy(() =>
  import('../features/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading)
    return (
      <div className="grid min-h-dvh place-items-center bg-navy text-white">
        <div className="flex flex-col items-center gap-4">
          <OnePieceLoader size="lg" label="Restaurando sesión" />
          <p className="text-sm font-semibold text-slate-300">Restaurando sesión…</p>
        </div>
      </div>
    );
  if (!auth.authenticated)
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  return children;
}

function LoadingRoute() {
  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="relative grid h-9 w-56 animate-pulse place-items-center rounded bg-slate-200">
        <OnePieceLoader size="xs" label="Cargando página" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="relative grid aspect-[5/7] animate-pulse place-items-center rounded-xl bg-slate-200"
          >
            <OnePieceLoader size="sm" label={`Cargando contenido ${index + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info);
  }
  override render() {
    if (this.state.failed)
      return (
        <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
          <div>
            <h1 className="text-2xl font-black">La aplicación necesita recargarse</h1>
            <p className="mt-2 text-slate-600">Tus datos persistidos no se han eliminado.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 min-h-11 rounded-lg bg-violet px-5 font-semibold text-white"
            >
              Recargar
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingRoute />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/boxes" element={<BoxesPage />} />
            <Route path="/sales-packs" element={<SalesPacksPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/catalog-statistics" element={<CatalogStatisticsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <div className="grid min-h-[70dvh] place-items-center p-6 text-center">
                  <div>
                    <p className="text-7xl font-black text-indigo-100">404</p>
                    <h1 className="mt-3 text-2xl font-black">Esta ruta no figura en el mapa</h1>
                    <a href="/catalog" className="mt-4 inline-block font-semibold text-violet">
                      Volver al catálogo
                    </a>
                  </div>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
