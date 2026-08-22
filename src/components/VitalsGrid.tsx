import React, { useState } from 'react';
import { AgentState } from '../types';
import { DollarSign, Clock, ShieldAlert, Zap, Award, Plus, Sparkles, RefreshCw, Edit3, CheckCircle2 } from 'lucide-react';

interface VitalsGridProps {
  state: AgentState | null;
  onDeposit: (amount: number) => void;
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
  onDeposit,
  onRunCycle,
  onSyncWallet,
  onChangeWalletAddress,
  onExecuteWork,
  onPayTribute,
  onReviveAgent,
  isProcessingCycle,
  isSyncingWallet
}) => {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('2.5');
  const [customAddress, setCustomAddress] = useState(state?.wallet_address || '');
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [isPayingTribute, setIsPayingTribute] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (!isNaN(val) && val > 0) {
      onDeposit(val);
      setShowDepositModal(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');
    if (!onChangeWalletAddress) return;

    if (!customAddress.startsWith('0x') || customAddress.length !== 42) {
      setAddressError('Ungültige Ethereum-Adresse (muss mit 0x beginnen und 42 Zeichen lang sein)');
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
      {/* 4 Key Vital Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: USDC Balance */}
        <div id="vital-balance-card" className={`bg-slate-900 border rounded-xl p-4 relative overflow-hidden flex flex-col justify-between ${
          isTerminated ? 'border-rose-800 bg-rose-950/30' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">USDC Balance (HP)</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                isTerminated
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : state?.onchain_transfer_ready
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                {isTerminated
                  ? 'BANKRUPT'
                  : state?.onchain_transfer_ready
                  ? 'Live Web3'
                  : 'Ledger-Modus'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onSyncWallet && (
                <button
                  id="sync-onchain-btn"
                  onClick={onSyncWallet}
                  disabled={isSyncingWallet}
                  title="Live On-Chain Saldo via Ethereum RPC abfragen"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWallet ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              )}
              <div className={`p-1.5 rounded-md border ${
                isTerminated
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
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
                {isTerminated ? '✕ SYSTEM SHUTDOWN' : isHealthy ? '● Sufficient for Tribute' : '▲ Deficit for Next Tribute'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="open-address-btn"
                  onClick={() => {
                    setCustomAddress(state?.wallet_address || '');
                    setShowAddressModal(true);
                  }}
                  className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-0.5"
                  title="Change monitored wallet address"
                >
                  <Edit3 className="w-3 h-3" /> Address
                </button>
                <button
                  id="open-deposit-btn"
                  onClick={() => setShowDepositModal(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Deposit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Next Server Tribute Due */}
        <div id="vital-tribute-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tribut Pacht (48h)</span>
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
                  title="Tribut zahlen und 48h Frist ab jetzt neu starten!"
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPayingTribute ? 'Zahle...' : 'Zahlen (48h Reset)'}
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Nächste Stufe (+10%):</span>
                <span className="text-amber-300/90 font-mono">{(state?.next_tribute_due ?? (tributeDue * 1.1)).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Soll-Ertrag:</span>
                <span className="font-mono text-emerald-400/90">{(state?.required_hourly_rate ?? (tributeDue / 48)).toFixed(4)} USDC/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Tribute Deadline Countdown */}
        <div id="vital-countdown-card" className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between ${
          isTerminated ? 'border-rose-900/60' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">48h Überlebens-Frist</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-mono font-bold flex items-center gap-1 ${
              isTerminated ? 'text-rose-500' : hours < 6 ? 'text-amber-400' : 'text-slate-100'
            }`}>
              <span>{String(hours).padStart(2, '0')}</span>
              <span className="text-slate-600">:</span>
              <span>{String(minutes).padStart(2, '0')}</span>
              <span className="text-slate-600">:</span>
              <span className="text-slate-400 text-xl">{String(seconds).padStart(2, '0')}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isTerminated ? 'Frist abgelaufen · Server deprovisioniert' : 'Startet bei jeder Zahlung für volle 48h neu'}
            </p>
          </div>
        </div>

        {/* Card 4: Tributes Paid / Generations */}
        <div id="vital-generations-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Level & Tools</span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                Lvl {state?.tributes_paid ?? 0}
              </span>
              <span className="text-xs text-purple-400 font-mono">
                ({state?.discovered_tools_count ?? 4} Tools aktiv)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Erledigte Aufträge: <span className="text-slate-200 font-mono">{state?.active_jobs_completed ?? 0} Jobs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Banner / Instant Work & Cycle Control */}
      <div id="quick-cycle-banner" className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isTerminated
          ? 'bg-rose-950/40 border-rose-800 text-rose-200'
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTerminated ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
            <h3 className="text-sm font-semibold text-slate-200">
              {isTerminated ? 'SYSTEM TERMINATED (Hard Shutdown Triggered)' : 'Autonomous Work & Survival Engine'}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {isTerminated
              ? 'Agent Zero konnte seine Abgaben nicht fristgerecht zahlen oder ist bankrott. Bitte Notfall-Bailout durchführen.'
              : 'Agent Zero arbeitet eigenständig für sein Überleben: Führt kontinuierlich Bounties, Gitcoin Quests & On-Chain Verifications aus.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {isTerminated ? (
            <button
              id="emergency-revive-btn"
              onClick={() => onReviveAgent && onReviveAgent()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950 transition-all cursor-pointer animate-pulse"
            >
              <Zap className="w-4 h-4" />
              <span>⚡ Notfall-Bailout & Wiederbeleben (+2.5 USDC)</span>
            </button>
          ) : (
            <>
              {onExecuteWork && (
                <button
                  id="execute-job-btn"
                  onClick={handleManualWork}
                  disabled={isWorking || isProcessingCycle}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                  title="Führt sofort einen realen Bounty-Arbeitsauftrag aus"
                >
                  <Award className={`w-3.5 h-3.5 ${isWorking ? 'animate-spin' : ''}`} />
                  <span>{isWorking ? 'Working...' : 'Work Bounty (+USDC)'}</span>
                </button>
              )}

              <button
                id="instant-cycle-btn"
                onClick={onRunCycle}
                disabled={isProcessingCycle || isWorking}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition-all cursor-pointer"
              >
                {isProcessingCycle ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Agent Thinking & Working...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-200" />
                    <span>Instant Cycle (Think & Work)</span>
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
                <Edit3 className="w-4 h-4 text-emerald-400" /> Ethereum Wallet Address
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Trage hier deine echte Ethereum-Wallet-Adresse ein. Der Agent liest das reale USDC-Guthaben (Smart Contract <code className="text-emerald-400 font-mono text-[10px]">0xA0b8...eB48</code>) direkt von der Blockchain ab.
            </p>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Ethereum Wallet Address (0x...)</label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                {addressError && <p className="text-xs text-rose-400 mt-1 font-mono">{addressError}</p>}
                {addressSuccess && (
                  <p className="text-xs text-emerald-400 mt-1 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Adresse gespeichert und On-Chain synchronisiert!
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Speichern & On-Chain Prüfen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Deposit USDC (Sandbox Seed)
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Provide test or initial operational capital to Agent Zero's autonomous ledger and wallet balance.
            </p>
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Amount (USDC)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="flex gap-2">
                {['1.0', '2.0', '5.0', '10.0'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className="flex-1 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
