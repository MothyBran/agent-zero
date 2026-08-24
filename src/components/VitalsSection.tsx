import React, { useState } from 'react';
import { AgentState } from '../types';
import { HeartPulse, ShieldAlert, CheckCircle2, Clock, Flame, Coins, Zap, RefreshCw, AlertTriangle, Trash2, Cpu } from 'lucide-react';
import { safePostJson } from '../lib/api';

interface VitalsSectionProps {
  state: AgentState | null;
  onRefresh: () => void;
}

export const VitalsSection: React.FC<VitalsSectionProps> = ({ state, onRefresh }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const blacklisted = state?.blacklisted_models || [];
  const tributesPaid = state?.tributes_paid ?? 0;
  const balance = state?.current_balance ?? 0;
  const tributeDue = state?.current_tribute_due ?? 1.0;
  const birthTime = state?.birth_time ? new Date(state.birth_time).toLocaleString() : 'Unbekannt';
  const nextTributeTime = state?.next_tribute_time ? new Date(state.next_tribute_time).toLocaleString() : 'Unbekannt';
  const activeModel = state?.active_model || 'GroqCloud LLM';

  const handleClearBlacklist = async () => {
    setIsClearing(true);
    const res = await safePostJson<{ success: boolean }>('/api/blacklist/clear');
    setIsClearing(false);
    if (res.ok) {
      setActionFeedback('Modell-Blacklist erfolgreich geleert.');
      setTimeout(() => setActionFeedback(null), 3000);
      onRefresh();
    }
  };

  const handleTriggerCycle = async () => {
    setIsRunningCycle(true);
    setActionFeedback('Führe realen Kognitionszyklus aus...');
    const res = await safePostJson<{ success: boolean }>('/api/cycle/run');
    setIsRunningCycle(false);
    if (res.ok) {
      setActionFeedback('Zyklus erfolgreich ausgeführt.');
    } else {
      setActionFeedback('Zyklus fehlgeschlagen: ' + (res.error || 'Serverfehler'));
    }
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Lebensdaten & Systemstatus
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Echtzeit-Vitalwerte, 48h Überlebensprotokoll und Modell-Governance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerCycle}
            disabled={isRunningCycle || state?.is_terminated}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
            <span>{isRunningCycle ? 'Analysiere...' : 'Manueller Denkzyklus'}</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
          ℹ️ {actionFeedback}
        </div>
      )}

      {/* Grid: 4 Core Vitals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vital 1: Birth & Level */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Geburt & Level</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              Level {tributesPaid}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {tributesPaid > 0 ? `Überlebender (Lvl ${tributesPaid})` : 'Neugeboren (Lvl 0)'}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
            <div>Geburtszeitpunkt: <span className="text-slate-200">{birthTime}</span></div>
            <div>Bezahlte Tribute: <span className="text-purple-400 font-bold">{tributesPaid}</span></div>
          </div>
        </div>

        {/* Vital 2: Live Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Live USDC Balance</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {balance.toFixed(4)} <span className="text-sm font-normal text-emerald-400/80">USDC</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span>Netzwerk:</span>
            <span className="text-cyan-400 font-bold">Polygon PoS (POL)</span>
          </div>
        </div>

        {/* Vital 3: 48h Deadline & Tribute */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fälliger Tribut</span>
            <Flame className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {tributeDue.toFixed(2)} <span className="text-sm font-normal text-purple-400/80">USDC</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
            <div>Fälligkeit: <span className="text-amber-300 font-mono">{nextTributeTime}</span></div>
          </div>
        </div>

        {/* Vital 4: System Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Betriebsmodus</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold flex items-center gap-2">
            {state?.is_terminated ? (
              <span className="text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> TERMINIERT
              </span>
            ) : state?.is_running ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> AUTONOM AKTIV
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> PAUSIERT
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80 truncate">
            <span>Aktives LLM:</span> <span className="text-slate-200">{activeModel}</span>
          </div>
        </div>
      </div>

      {/* Model Blacklist Management Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              LLM Modell-Blacklist (Selbstheilung)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Gesperrte Modelle: <strong className={blacklisted.length > 0 ? 'text-rose-400' : 'text-emerald-400'}>{blacklisted.length}</strong>
            </span>
            {blacklisted.length > 0 && (
              <button
                onClick={handleClearBlacklist}
                disabled={isClearing}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-mono transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Blacklist leeren</span>
              </button>
            )}
          </div>
        </div>

        {blacklisted.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-emerald-400">Keine Modelle auf der Blacklist.</strong> Alle angebundenen GroqCloud-Modelle sind betriebsbereit und antworten regulär auf API-Anfragen.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Folgende Modelle wurden vom Agenten nach echten API-Fehlern (z. B. Rate-Limits, 404-Status oder Timeouts) temporär isoliert, um Systemausfälle zu verhindern:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {blacklisted.map((model, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-800/40 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 text-rose-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">{model}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700 shrink-0">
                    ISOLIERT
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
