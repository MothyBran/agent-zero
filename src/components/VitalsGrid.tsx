import React, { useState } from 'react';
import { AgentState } from '../types';
import {
  DollarSign,
  Clock,
  ShieldAlert,
  Zap,
  Award,
  Sparkles,
  RefreshCw,
  Edit3,
  CheckCircle2,
  ExternalLink,
  Flame,
  Brain
} from 'lucide-react';

interface VitalsGridProps {
  state: AgentState | null;
  onDeposit?: (amount: number) => void;
  onRunCycle: () => void;
  onSyncWallet?: () => void;
  onChangeWalletAddress?: (address: string) => Promise<boolean>;
  onExecuteWork?: (taskType?: string) => Promise<void>;
  onPayTribute?: () => Promise<void>;
  onReviveAgent?: () => Promise<void>;
  isProcessingCycle: boolean;
  isSyncingWallet?: boolean;
}

export const VitalsGrid: React.FC<VitalsGridProps> = ({
  state,
  onRunCycle,
  onSyncWallet,
  onChangeWalletAddress,
  onExecuteWork,
  onPayTribute,
  onReviveAgent,
  isProcessingCycle,
  isSyncingWallet
}) => {
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [customAddress, setCustomAddress] = useState(state?.wallet_address || '');
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [isPayingTribute, setIsPayingTribute] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');
    if (!onChangeWalletAddress) return;

    if (!customAddress.startsWith('0x') || customAddress.length !== 42) {
      setAddressError('Ungültige Polygon/EVM-Adresse (Format: 0x... mit 42 Zeichen)');
      return;
    }

    const success = await onChangeWalletAddress(customAddress);
    if (success) {
      setAddressSuccess(true);
      setTimeout(() => {
        setAddressSuccess(false);
        setShowAddressModal(false);
      }, 1200);
    } else {
      setAddressError('Fehler beim Aktualisieren der Wallet-Adresse auf dem Server.');
    }
  };

  const handleManualTribute = async () => {
    if (!onPayTribute) return;
    setIsPayingTribute(true);
    try {
      await onPayTribute();
    } finally {
      setIsPayingTribute(false);
    }
  };

  const handleManualWork = async () => {
    if (!onExecuteWork) return;
    setIsWorking(true);
    try {
      await onExecuteWork();
    } finally {
      setIsWorking(false);
    }
  };

  const timeRemainingSeconds = state?.time_remaining_seconds ?? 0;
  const hours = Math.floor(timeRemainingSeconds / 3600);
  const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
  const seconds = timeRemainingSeconds % 60;

  const currentBalance = state?.current_balance ?? 0;
  const tributeDue = state?.current_tribute_due ?? 2.0;
  const isHealthy = currentBalance >= tributeDue;
  const isTerminated = state?.is_terminated || state?.status === 'SHUTDOWN';

  return (
    <div id="vitals-section" className="space-y-4">
      {/* 4 Real Vital Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Real Polygon USDC Balance */}
        <div
          id="vital-balance-card"
          className={`bg-slate-900 border rounded-xl p-4 relative overflow-hidden flex flex-col justify-between ${
            isTerminated ? 'border-rose-800 bg-rose-950/30' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">Polygon USDC Saldo</span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                  isTerminated
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : state?.is_onchain
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                }`}
              >
                {isTerminated ? 'TERMINIERT' : 'Polygon PoS (137)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onSyncWallet && (
                <button
                  id="sync-onchain-btn"
                  onClick={onSyncWallet}
                  disabled={isSyncingWallet}
                  title="Live Saldo & Gas via Polygon RPC abfragen"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWallet ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              )}
              <div
                className={`p-1.5 rounded-md border ${
                  isTerminated
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-mono font-bold ${isTerminated ? 'text-rose-400' : 'text-slate-100'}`}>
                {currentBalance.toFixed(4)}
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400">USDC</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={isTerminated ? 'text-rose-400 font-bold' : isHealthy ? 'text-emerald-400' : 'text-amber-400 font-medium'}>
                {isTerminated ? '✕ SYSTEM TERMINIERT' : isHealthy ? '● Deckt nächste Pacht' : '▲ Liquiditätsdefizit'}
              </span>
              <button
                id="open-address-btn"
                onClick={() => {
                  setCustomAddress(state?.wallet_address || '');
                  setShowAddressModal(true);
                }}
                className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-0.5 text-[11px]"
                title="Wallet-Adresse anpassen"
              >
                <Edit3 className="w-3 h-3" /> Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Server Tribute (48h Pacht) */}
        <div id="vital-tribute-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Server-Pacht (48h Frist)</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                  {tributeDue.toFixed(2)}
                </span>
                <span className="text-xs font-mono font-semibold text-amber-400">USDC</span>
              </div>
              {onPayTribute && isHealthy && !isTerminated && (
                <button
                  onClick={handleManualTribute}
                  disabled={isPayingTribute}
                  title="On-Chain Tribut zahlen und 48h Frist erneuern"
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPayingTribute ? 'Zahle...' : 'Zahlen (48h Reset)'}
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 space-y-0.5 font-mono">
              <div className="flex justify-between">
                <span>Nächstes Lvl:</span>
                <span className="text-amber-300/90">{(state?.next_tribute_due ?? (tributeDue * 1.1)).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Soll-Rate:</span>
                <span className="text-emerald-400/90">{(state?.required_hourly_rate ?? (tributeDue / 48)).toFixed(4)} USDC/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: 48h Survival Countdown */}
        <div
          id="vital-countdown-card"
          className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between ${
            isTerminated ? 'border-rose-900/60' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">48h Frist-Countdown</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl sm:text-3xl font-mono font-bold flex items-center gap-1 ${
                isTerminated ? 'text-rose-500' : hours < 6 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              <span>{String(hours).padStart(2, '0')}</span>
              <span className="text-slate-600">:</span>
              <span>{String(minutes).padStart(2, '0')}</span>
              <span className="text-slate-600">:</span>
              <span className="text-slate-400 text-xl">{String(seconds).padStart(2, '0')}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isTerminated ? 'Frist verstrichen · Server deprovisioniert' : 'Startet bei jeder Zahlung für 48h neu'}
            </p>
          </div>
        </div>

        {/* Card 4: Cognitive IQ & Level */}
        <div id="vital-iq-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Kognition & Level</span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                IQ {state?.evolution_iq_score ?? 100}
              </span>
              <span className="text-xs text-purple-400 font-mono">
                (Lvl {state?.tributes_paid ?? 0})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {state?.evolution_tier || 'Tier 1: Initial-Zustand'}
            </p>
          </div>
        </div>
      </div>

      {/* Control Banner for Instant Action */}
      <div
        id="quick-cycle-banner"
        className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isTerminated ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-slate-900/70 border-slate-800'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTerminated ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
            <h3 className="text-sm font-semibold text-slate-200">
              {isTerminated ? 'SYSTEM TERMINIERT (Hard Shutdown)' : 'Autonome Überlebens- & Arbeits-Engine'}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {isTerminated
              ? 'Agent Zero hat die Pachtfrist überschritten oder keine Liquidität mehr. Erforderlich: Reaktivierung über Web3/Deposit.'
              : 'Agent Zero steuert eigenständig Web-Anfragen, analysiert Polygon Smart Contracts und sichert sein Überleben.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {isTerminated ? (
            <button
              id="emergency-revive-btn"
              onClick={() => onReviveAgent && onReviveAgent()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono shadow-lg transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>⚡ System Reaktivieren</span>
            </button>
          ) : (
            <>
              {onExecuteWork && (
                <button
                  id="execute-job-btn"
                  onClick={handleManualWork}
                  disabled={isWorking || isProcessingCycle}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Führt sofort eine reale Web- oder DeFi-Aufgabe aus"
                >
                  <Award className={`w-3.5 h-3.5 ${isWorking ? 'animate-spin' : ''}`} />
                  <span>{isWorking ? 'Arbeitet...' : 'Bounty Ausführen (+USDC)'}</span>
                </button>
              )}

              <button
                id="instant-cycle-btn"
                onClick={onRunCycle}
                disabled={isProcessingCycle || isWorking}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-bold shadow transition-all cursor-pointer"
              >
                {isProcessingCycle ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Denkzyklus aktiv...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-200" />
                    <span>Denkzyklus auslösen</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Address Edit Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" /> Polygon PoS Wallet-Adresse
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Trage hier deine echte Polygon-Wallet-Adresse ein. Der Agent prüft das reale USDC-Guthaben (Smart Contract <code className="text-emerald-400 font-mono text-[10px]">0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359</code> auf Polygon) direkt on-chain via Web3 RPC.
            </p>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Polygon Wallet Address (0x...)</label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={e => setCustomAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                {addressError && <p className="text-xs text-rose-400 mt-1 font-mono">{addressError}</p>}
                {addressSuccess && (
                  <p className="text-xs text-emerald-400 mt-1 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Adresse gespeichert und synchronisiert!
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-mono font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Speichern & RPC Prüfen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
