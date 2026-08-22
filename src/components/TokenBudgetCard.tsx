import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, AlertCircle, RefreshCw, Sparkles, Gauge, Cpu } from 'lucide-react';
import { TokenBudgetStatus } from '../types';

export function TokenBudgetCard() {
  const [status, setStatus] = useState<TokenBudgetStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/tokens/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch token budget status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/tokens/reset-daily', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch (e) {
      console.error('Failed to reset daily tokens:', e);
    } finally {
      setIsResetting(false);
    }
  };

  if (!status) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>Lade Groq Token-Budget & Rate-Limit Shield...</span>
        </div>
      </div>
    );
  }

  const usagePercent = status.budget_usage_percent || 0;
  const rpmPercent = Math.min(100, Math.round((status.rpm_current / status.rpm_limit) * 100));
  const isHighRpm = status.rpm_current >= 18;
  const isHighBudget = usagePercent >= 70;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-slate-100 flex items-center gap-2">
              Groq Free Token Guard & Quota
              {status.conservation_mode_active && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  🛡️ SPARSAMKEITS-MODUS
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Verhindert Erschöpfung des Free Tiers & Rate-Limit-Lockouts
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          title="Tageszähler manuell zurücksetzen"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Quota Reset</span>
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        {/* Daily Token Usage */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Tages-Verbrauch</span>
            <span className={isHighBudget ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {status.tokens_used_today.toLocaleString()}
            <span className="text-xs font-normal text-slate-400"> / {(status.daily_token_limit / 1000).toFixed(0)}k</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${
                isHighBudget ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, usagePercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Verbleibend:</span>
            <span className="text-slate-200 font-semibold">{status.estimated_tokens_remaining.toLocaleString()} Tokens</span>
          </div>
        </div>

        {/* Requests Per Minute (RPM) Shield */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>RPM Rate-Limit (1 Min)</span>
            <span className={isHighRpm ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {status.rpm_current} / {status.rpm_limit}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
            <Zap className={`w-4 h-4 ${isHighRpm ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <span>{status.rpm_current} RPM</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${
                isHighRpm ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${rpmPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Status:</span>
            <span className={isHighRpm ? 'text-amber-300 font-bold' : 'text-emerald-300'}>
              {isHighRpm ? '⚠️ Warte-Fenster aktiv' : '✅ Keine Drosselung'}
            </span>
          </div>
        </div>

        {/* Compression & Token Thrift */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Prompt-Kompression</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">
            +{status.tokens_saved_by_compression.toLocaleString()}
            <span className="text-xs font-normal text-slate-400"> Tokens</span>
          </div>
          <div className="text-[10px] text-slate-400 leading-relaxed">
            Echtzeit-Streichung von Whitespace & Markdown-Ballast spart ~35-50% Quota pro Denk-Zyklus.
          </div>
        </div>
      </div>

      {/* Active Strategy Banner */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-3 flex items-start gap-2.5 text-xs font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-slate-300 font-medium">
            <span className="text-slate-400">Aktive Quota-Strategie:</span> {status.active_strategy}
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Wenn das Budget ≥65% erreicht oder das RPM-Limit droht, schaltet Agent Zero automatisch auf schlanke 20B/8B Modelle oder intern berechnete Heuristiken um, damit der Agent ohne Token-Kosten weiterarbeiten kann.
          </p>
        </div>
      </div>
    </div>
  );
}
