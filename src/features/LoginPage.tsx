import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../app/providers/AuthProvider';
import { OnePieceLoader } from '../shared/OnePieceLoader';
import { Button } from '../shared/ui';

const schema = z.object({
  email: z.string().email('Introduce un correo válido.'),
  password: z.string(),
});
type AccessForm = z.infer<typeof schema>;
type Mode = 'login' | 'register' | 'reset';

const modeCopy: Record<Mode, { title: string; description: string; submit: string }> = {
  login: {
    title: 'Accede a tu cuenta',
    description: 'Tu colección local está separada por usuario',
    submit: 'Entrar en mi colección',
  },
  register: {
    title: 'Crea tu cuenta',
    description: 'Empieza con un perfil gratuito',
    submit: 'Crear cuenta gratuita',
  },
  reset: {
    title: 'Recupera tu contraseña',
    description: 'Recibirás un enlace de recuperación',
    submit: 'Enviar enlace',
  },
};

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('login');
  const [serverError, setServerError] = useState('');
  const [notice, setNotice] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccessForm>({
    resolver: zodResolver(
      schema.superRefine((value, context) => {
        if (mode !== 'reset' && value.password.length < 6) {
          context.addIssue({
            code: 'custom',
            path: ['password'],
            message: 'La contraseña debe tener al menos 6 caracteres.',
          });
        }
      }),
    ),
    defaultValues: { email: '', password: '' },
  });

  if (auth.authenticated) return <Navigate to="/catalog" replace />;

  const changeMode = (next: Mode) => {
    setMode(next);
    setServerError('');
    setNotice('');
    reset(undefined, { keepValues: true });
  };

  const onSubmit = async ({ email, password }: AccessForm) => {
    setServerError('');
    setNotice('');
    try {
      if (mode === 'reset') {
        await auth.resetPassword(email);
        setNotice('Te hemos enviado el enlace de recuperación si la cuenta existe.');
        return;
      }
      if (mode === 'register') await auth.register(email, password);
      else await auth.login(email, password);
      const from = (location.state as { from?: string } | null)?.from ?? '/catalog';
      void navigate(from, { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo completar el acceso.');
    }
  };

  const copy = modeCopy[mode];
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy px-4 py-4 sm:py-6">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_10%,#4338ca_0,transparent_35%),radial-gradient(circle_at_80%_90%,#1e3a8a_0,transparent_32%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-4 text-center text-white">
          <div className="mx-auto flex w-full flex-col items-center px-5 sm:px-6">
            <h1 className="brand-one-piece whitespace-nowrap text-[clamp(32px,10vw,48px)] leading-none">
              GRAND LINE VAULT
            </h1>
            <div className="mt-3 w-[62%]" aria-label="One Piece">
              <img src="/one-piece.svg" alt="One Piece" className="block h-auto w-full invert" />
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-400">Tu colección. Tus reglas. Tu cuenta.</p>
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
              <h2 className="font-black">{copy.title}</h2>
              <p className="text-xs text-slate-500">{copy.description}</p>
            </div>
          </div>
          <label className="block text-sm font-semibold">
            Correo electrónico
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                autoFocus
                className="h-12 w-full rounded-lg border-slate-300 pl-10 text-sm focus:border-violet focus:ring-violet"
              />
            </span>
          </label>
          {mode !== 'reset' && (
            <label className="mt-4 block text-sm font-semibold">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('password')}
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="h-12 w-full rounded-lg border-slate-300 pl-10 text-sm focus:border-violet focus:ring-violet"
                />
              </span>
            </label>
          )}
          {(errors.email?.message || errors.password?.message || serverError) && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {errors.email?.message ?? errors.password?.message ?? serverError}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting} className="mt-4 w-full">
            {isSubmitting ? <OnePieceLoader size="xs" label="Comprobando acceso" /> : copy.submit}
          </Button>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold">
            {mode !== 'login' && (
              <button type="button" onClick={() => changeMode('login')} className="text-violet">
                Iniciar sesión
              </button>
            )}
            {mode !== 'register' && (
              <button type="button" onClick={() => changeMode('register')} className="text-violet">
                Crear cuenta
              </button>
            )}
            {mode !== 'reset' && (
              <button type="button" onClick={() => changeMode('reset')} className="text-violet">
                He olvidado mi contraseña
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
