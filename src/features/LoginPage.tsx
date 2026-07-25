import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../app/providers/AuthProvider';
import { config } from '../app/config';
import { OnePieceLoader } from '../shared/OnePieceLoader';
import { Button } from '../shared/ui';

const schema = z.object({ password: z.string().min(1, 'Introduce la contraseña.') });
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  if (auth.authenticated) return <Navigate to="/catalog" replace />;

  const onSubmit = async ({ password }: LoginForm) => {
    setServerError('');
    try {
      await auth.login(password);
      const from = (location.state as { from?: string } | null)?.from ?? '/catalog';
      void navigate(from, { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy px-4 py-4 sm:py-6">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_10%,#4338ca_0,transparent_35%),radial-gradient(circle_at_80%_90%,#1e3a8a_0,transparent_32%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-4 text-center text-white">
          <div className="mx-auto flex w-full flex-col items-center px-5 sm:px-6">
            <div className="w-full" aria-label="One Piece">
              <img src="/one-piece.svg" alt="One Piece" className="block h-auto w-full invert" />
            </div>
            <h1 className="brand-one-piece whitespace-nowrap text-[23px] leading-none text-white">
              GRAND LINE VAULT
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Tu colección. Tus reglas. Un único acceso.</p>
        </div>
        <form
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="rounded-2xl border border-white/10 bg-white p-5 shadow-2xl sm:p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-violet">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-black">Acceso privado</h2>
              <p className="text-xs text-slate-500">Introduce tu contraseña para continuar</p>
            </div>
          </div>
          <label className="block text-sm font-semibold">
            Contraseña
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                autoFocus
                className="h-12 w-full rounded-lg border-slate-300 pl-10 text-sm focus:border-violet focus:ring-violet"
              />
            </span>
          </label>
          {(errors.password?.message || serverError) && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {errors.password?.message ?? serverError}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting} className="mt-4 w-full">
            {isSubmitting ? (
              <>
                <OnePieceLoader size="xs" label="Comprobando acceso" />
                Comprobando…
              </>
            ) : (
              'Entrar en mi colección'
            )}
          </Button>
          {config.VITE_USE_MOCK_DATA && (
            <p className="mt-3 rounded-lg bg-indigo-50 p-2.5 text-center text-xs text-indigo-900">
              Acceso de desarrollo: <strong>nakama</strong>
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
