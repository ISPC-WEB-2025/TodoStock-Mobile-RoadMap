import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { validateCredentials } from '../config/auth';
import { saveSessionAuth } from '../utils/storage';

export default function LoginGate({ onAuthenticated }) {
  const [username, setUsername] = useState('CodeLab');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isValid = await validateCredentials(username, password);
      if (isValid) {
        saveSessionAuth(remember);
        onAuthenticated();
      } else {
        setError('Usuario o contraseña incorrectos. Verifique sus credenciales.');
      }
    } catch (err) {
      setError('Ocurrió un error al validar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b12] p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Lock className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TodoStock Mobile
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Roadmap Dinámico en Grafo (DAG) del Equipo
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="CodeLab"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
              />
              Recordar sesión
            </label>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SHA-256
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Ingresar al Roadmap'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center text-[11px] text-slate-500">
          Autenticación protegida con SHA-256 · Solo miembros autorizados del equipo CodeLab
        </div>
      </div>
    </div>
  );
}
