import {
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Heart,
  Library,
  Menu,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { config } from '../app/config';
import { useAuth } from '../app/providers/AuthProvider';

const navigation = [
  { to: '/catalog', label: 'Explorar cartas', icon: BookOpen },
  { to: '/collection', label: 'Mi colección', icon: Library },
  { to: '/boxes', label: 'Organización', icon: Archive },
  { to: '/sales-packs', label: 'Ventas', icon: ShoppingBag },
  { to: '/statistics', label: 'Estadísticas', icon: BarChart3 },
  { to: '/catalog-statistics', label: 'Catálogo', icon: ChartNoAxesColumnIncreasing },
  { to: '/favorites', label: 'Favoritos y deseos', icon: Heart },
] as const;

function SidebarContent({ close }: { close?: () => void }) {
  const auth = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col items-center justify-start px-3 pb-2 pt-16 lg:pt-2">
        <p className="brand-one-piece whitespace-nowrap text-[24px] leading-none text-white">
          GRAND LINE VAULT
        </p>
        <div className="mt-2 w-[68%]" aria-label="One Piece">
          <img src="/one-piece.svg" alt="One Piece" className="block h-auto w-full invert" />
        </div>
      </div>
      <nav className="flex flex-1 flex-col justify-center px-3" aria-label="Navegación principal">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={close}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-violet to-indigo-600 text-white shadow-lg shadow-indigo-950/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="space-y-1 p-3">
        <NavLink
          to="/settings"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
        >
          <Settings className="size-5" /> Ajustes
        </NavLink>
        <button
          onClick={() => void auth.logout().then(() => navigate('/login'))}
          className="flex w-full items-center gap-3 rounded-xl border-t border-white/10 px-2 pt-4 text-left"
        >
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-200 p-1.5">
            <img
              src="/one-piece-user.svg?v=1"
              alt=""
              className="size-full object-contain"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">
              {auth.user?.email ?? 'Usuario'}
            </span>
            <span className="block text-xs text-slate-400">Cerrar sesión</span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-navy lg:block">
        <SidebarContent />
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-white/5 bg-navy px-4 text-white lg:hidden">
        <button
          className="grid size-11 place-items-center rounded-lg"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
        <span className="brand-one-piece flex min-w-0 flex-1 items-center justify-center self-stretch px-2 text-center text-[clamp(17px,5.5vw,28px)] uppercase leading-none">
          {config.VITE_APP_NAME}
        </span>
        <button className="grid size-11 place-items-center rounded-lg" aria-label="Notificaciones">
          <Bell className="size-5" />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(84vw,320px)] bg-navy text-white shadow-2xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-2 top-2 grid size-11 place-items-center"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            <SidebarContent close={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}
      <main className="min-h-dvh lg:ml-60">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </div>
  );
}

export function SimplePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
      <PageHeader title={title} />
      {children}
    </div>
  );
}
