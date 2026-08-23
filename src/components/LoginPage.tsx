import React, { useState } from 'react';
import { Shield, Lock, User, Key, ArrowRight, AlertCircle } from 'lucide-react';
import { safePostJson } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await safePostJson<{ success: boolean; message?: string }>('/api/auth/login', {
        username: username.trim(),
        password: password.trim()
      });

      if (res.ok && res.data?.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.data?.message || res.error || 'Ungültige Zugangsdaten. Bitte prüfe UI_USERNAME & UI_PASSWORD in Railway.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentifizierungsfehler');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Header Icon & Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Agent Zero <span className="text-xs px-2 py-0.5 rounded font-mono font-normal bg-purple-950 text-purple-300 border border-purple-800">Polygon PoS</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Geschützter Zugang · Überlebens- & Wirtschafts-Dashboard
            </p>
          </div>
        </div>

        {/* Info box for Railway public domain security */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Railway Public Domain Schutz</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Dieses Web-Interface ist durch serverseitige Zugangsdaten geschützt. Die Autorisierung erfolgt über die Umgebungsvariablen <code className="text-purple-300 font-mono">UI_USERNAME</code> und <code className="text-purple-300 font-mono">UI_PASSWORD</code>.
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Benutzername (UI_USERNAME)
            </label>
            <input
              type="text"
              id="login-username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z. B. admin"
              required
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Passwort (UI_PASSWORD)
            </label>
            <input
              type="password"
              id="login-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono transition-all"
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-purple-950 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Authentifizieren</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="pt-2 text-center text-[11px] text-slate-500 font-mono">
          Polygon PoS · Live Web3 On-Chain Economy · No Simulation
        </div>
      </div>
    </div>
  );
};
