import React, { useState, useEffect } from 'react';
import { AgentState } from '../types';
import { safePostJson } from '../lib/api';
import { Copy, Check, Clock, LogOut, RefreshCw, AlertTriangle, Coins, Flame, Power, RotateCcw } from 'lucide-react';

interface MinimalVitalsBarProps {
  state: AgentState | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  onLogout?: () => void;
  onRevive?: () => void;
  onToggleRun?: () => void; // NEU: Prop für den Button
}

export const MinimalVitalsBar: React.FC<MinimalVitalsBarProps> = ({
  state,
  onRefresh,
  isLoading,
  onLogout,
  onRevive,
  onToggleRun
}) => {
  const [copied, setCopied] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; formatted: string }>({
    hours: 48, minutes: 0, seconds: 0, formatted: '48:00:00'
  });

  useEffect(() => {
    const updateCountdown = () => {
      if (!state?.next_tribute_time) {
        setCountdown({ hours: 48, minutes: 0, seconds: 0, formatted: '48:00:00' });
        return;
      }
      const target = new Date(state.next_tribute_time).getTime();
      const now = Date.now();
      const diffMs = target - now;
      if (diffMs <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00 (EXPIRED)' });
        return;
      }
      const totalSec = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      setCountdown({ hours: h, minutes: m, seconds: s, formatted: `${pad(h)}:${pad(m)}:${pad(s)}` });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [state?.next_tribute_time]);

  const handleConfirmReset = async () => {
    setIsResetting(true);
    const res = await safePostJson('/api/factory-reset');
    if (res.ok) {
      if (onRefresh) await onRefresh();
      setShowResetModal(false);
    }
    setIsResetting(false);
  };

  const copyAddress = () => {
    if (state?.wallet_address) {
      navigator.clipboard.writeText(state.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isTerminated = state?.is_terminated || state?.status === 'SHUTDOWN';
  const isCritical = state?.status === 'SURVIVAL_CRITICAL' || countdown.hours < 6;
  const balance = state?.current_balance ?? 0;
  const polBalance = state?.agent_eth_balance ?? 0;
  const tributeDue = state?.current_tribute_due ?? 1.0;
  const level = state?.tributes_paid ?? 0;
  const totalSecondsIn48h = 48 * 3600;
  const remainingSeconds = Math.max(0, (countdown.hours * 3600) + (countdown.minutes * 60) + countdown.seconds);
  const remainingPercent = Math.min(100, Math.max(0, (remainingSeconds / totalSecondsIn48h) * 100));

  return (
    <header className="border-b border-slate-800/90 bg-[#060913]/95 backdrop-blur-md px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 font-mono select-none sticky top-0 z-30 shadow-lg shadow-black/40">
      {/* 1. Left: Identity & Core Status */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm transition-all ${
            isTerminated
              ? 'bg-rose-950/80 border-rose-600 text-rose-300 shadow-[0_0_12px_rgba(225,29,72,0.4)] animate-pulse'
              : isCritical
              ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          }`}>
            {isTerminated ? '✕' : 'Ø'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 tracking-wider">AGENT_ZERO</span>
              <span className="text-[10px] text-slate-500">v2.0_AUTONOMIC</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border uppercase font-bold flex items-center gap-1 ${
                isTerminated
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : isCritical
                  ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isTerminated ? 'bg-rose-500' : isCritical ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                }`} />
                {isTerminated ? 'DEALLOCATED' : isCritical ? 'CRITICAL' : 'AUTONOMOUS'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>NET: <span className="text-slate-200">POLYGON PoS (137)</span></span>
              {polBalance > 0 && (
                <span className="text-purple-300">GAS: {polBalance.toFixed(3)} POL</span>
              )}
              {state?.wallet_address && (
                <button
                  onClick={copyAddress}
                  title="Click to copy full address"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>ADDR: {state.wallet_address.slice(0, 6)}...{state.wallet_address.slice(-4)}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle: THE 3 PURIST VITALS */}
      <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto justify-center flex-wrap">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90 shadow-inner">
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">POLYGON USDC</div>
            <div className="text-sm font-bold text-emerald-300 leading-tight flex items-baseline gap-1 mt-0.5">
              <span>{balance.toFixed(4)}</span>
              <span className="text-[10px] font-normal text-emerald-400/80">USDC</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90 shadow-inner">
          <div className="w-7 h-7 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none flex items-center justify-between gap-1">
              <span>FÄLLIGER TRIBUT</span>
              <span className="text-[9px] text-purple-400 font-semibold">LVL {level + 1}</span>
            </div>
            <div className="text-sm font-bold text-purple-300 leading-tight flex items-baseline gap-1 mt-0.5">
              <span>{tributeDue.toFixed(2)}</span>
              <span className="text-[10px] font-normal text-purple-400/80">USDC</span>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border shadow-inner transition-colors ${
          isTerminated
            ? 'bg-rose-950/80 border-rose-700 text-rose-300'
            : isCritical
            ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)] animate-pulse'
            : 'bg-slate-900/90 border-slate-800/90 text-amber-300'
        }`}>
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
            isCritical ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none flex items-center justify-between gap-2">
              <span>48H SURVIVAL DEADLINE</span>
              <span className="text-[9px] text-slate-500">{remainingPercent.toFixed(0)}%</span>
            </div>
            <div className="text-sm font-bold tracking-widest leading-tight mt-0.5">
              {countdown.formatted}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right: Action Controls (Start/Pause, Refresh, Exit) */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {onToggleRun && (
          <button
            onClick={onToggleRun}
            disabled={isTerminated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
              isTerminated
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : state?.is_running
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950 cursor-pointer'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{state?.is_running ? 'Pause Loop' : 'Start Auto Loop'}</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Poll Latest Telemetry"
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        )}

        <button
          onClick={() => setShowResetModal(true)}
          title="Factory Reset (Alle Daten löschen)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-rose-950/40 hover:border-rose-800 border border-slate-800 text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">RESET ALL</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Logout Session"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-rose-950/40 hover:border-rose-800 border border-slate-800 text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">EXIT</span>
          </button>
        )}
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
              Agent Zero startet danach aus dem Nichts und baut sein Wissen durch autonome Zyklen schrittweise neu auf.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shadow-lg shadow-rose-950 disabled:opacity-50 cursor-pointer"
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
