import React, { useState } from 'react';
import { AgentState } from '../types';
import { Shield, Activity, Copy, Check, Power, RefreshCw, Cpu, Wallet, LogOut, Lock, RotateCcw, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  state: AgentState | null;
  onRefresh: () => void;
  isLoading: boolean;
  onToggleRun: () => void;
  onReset?: () => void;
  authRequired?: boolean;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ state, onRefresh, isLoading, onToggleRun, onReset, authRequired, onLogout }) => {
  const [copied, setCopied] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const copyAddress = () => {
    if (state?.wallet_address) {
      navigator.clipboard.writeText(state.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmReset = async () => {
    if (!onReset) return;
    setIsResetting(true);
    try {
      await onReset();
      setShowResetModal(false);
    } catch {}
    setIsResetting(false);
  };

  const isRunning = state?.is_running ?? false;
  const isTerminated = state?.is_terminated || state?.status === 'SHUTDOWN';
  const isCritical = state?.status === 'SURVIVAL_CRITICAL';

  return (
    <header id="agent-header" className={`border-b backdrop-blur sticky top-0 z-30 transition-colors ${
      isTerminated ? 'border-rose-900 bg-rose-950/80' : 'border-slate-800 bg-slate-900/80'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-mono font-bold text-lg ${
              isTerminated
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            }`}>
              {isTerminated ? '✕' : '0'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">Agent Zero</h1>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                  isTerminated
                    ? 'bg-rose-900/80 text-rose-200 border-rose-700'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isTerminated ? 'SHUTDOWN' : 'Autonomous Unit'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isTerminated ? 'System offline – Server-Pacht nicht bezahlt' : `${state?.network || 'Polygon (USDC)'} · Economic Survival Protocol`}
              </p>
            </div>
          </div>

          {/* Status Indicator Mobile */}
          <div className="sm:hidden flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
              isTerminated
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : isCritical
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                : isRunning
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isTerminated
                  ? 'bg-rose-500'
                  : isRunning
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`} />
              {isTerminated ? 'SHUTDOWN' : isCritical ? 'CRITICAL' : isRunning ? 'AUTONOMOUS' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Middle & Right Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
          {/* Wallet Address Chip */}
          {state?.wallet_address && (
            <button
              id="copy-wallet-btn"
              onClick={copyAddress}
              title="Click to copy full Ethereum address"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {state.wallet_address.substring(0, 6)}...{state.wallet_address.substring(state.wallet_address.length - 4)}
              </span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          )}

          {/* Status Indicator Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium ${
              isTerminated
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : isCritical
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : isRunning
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isTerminated
                  ? 'bg-rose-500 animate-ping'
                  : isRunning
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400'
              }`} />
              {isTerminated ? 'STATUS: HARD SHUTDOWN' : isCritical ? 'SURVIVAL CRITICAL' : isRunning ? 'AUTONOMOUS WORK ACTIVE' : 'CYCLE PAUSED'}
            </span>
          </div>

          {/* Autonomous Loop Toggle */}
          <button
            id="toggle-agent-run-btn"
            onClick={onToggleRun}
            disabled={isTerminated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isTerminated
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : isRunning
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-950 cursor-pointer'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isTerminated ? 'Terminated' : isRunning ? 'Pause Loop' : 'Start Auto Loop'}</span>
          </button>

          {/* Refresh Button */}
          <button
            id="refresh-status-btn"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Agent State"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Reset / Factory Wipe Button */}
          {onReset && (
            <button
              id="header-factory-reset-btn"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-rose-950/70 hover:text-rose-300 hover:border-rose-700 text-slate-400 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
              title="Agent Zero & Wissen komplett auf 0 zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset auf 0</span>
            </button>
          )}

          {/* Logout / Lock Button */}
          {authRequired && onLogout && (
            <button
              id="logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-slate-400 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
              title="Dashboard sperren / Abmelden"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sperren</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Reset auf Null */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/70 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Vollständiger Neustart (Reset auf 0)</h3>
                <p className="text-xs text-rose-300">Tabula Rasa: Wissen, Aufgaben & Meilensteine löschen</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Möchtest du Agent Zero und sein gesamtes gesammeltes Wissen, alle Meilensteine, erledigten Jobs und Notizen auf Anfang zurücksetzen? 
              Agent Zero startet danach als <span className="text-emerald-400 font-semibold">Tier 1 Intelligenz</span> aus dem Nichts und baut sein Wissen durch autonome Zyklen schrittweise neu auf.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
              <div>• Wissensdatenbank: auf 0 geleert</div>
              <div>• Aufgabenhistorie: auf 0 geleert</div>
              <div>• Meilensteine: Neu initialisiert</div>
              <div>• Loop-Intervall: 3 Minuten Zyklus</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-reset-btn"
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                id="confirm-factory-reset-btn"
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shadow-lg shadow-rose-950 disabled:opacity-50"
              >
                {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{isResetting ? 'Wird zurückgesetzt...' : 'Ja, komplett auf 0 setzen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
