import React, { useState } from 'react';
import { AgentState } from '../types';
import { DollarSign, Clock, ShieldAlert, Zap, Award, Plus, Sparkles } from 'lucide-react';

interface VitalsGridProps {
  state: AgentState | null;
  onDeposit: (amount: number) => void;
  onRunCycle: () => void;
  isProcessingCycle: boolean;
}

export const VitalsGrid: React.FC<VitalsGridProps> = ({
  state,
  onDeposit,
  onRunCycle,
  isProcessingCycle
}) => {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('2.0');

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (!isNaN(val) && val > 0) {
      onDeposit(val);
      setShowDepositModal(false);
    }
  };

  const timeRemainingSeconds = state?.time_remaining_seconds ?? 0;
  const hours = Math.floor(timeRemainingSeconds / 3600);
  const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
  const seconds = timeRemainingSeconds % 60;

  const currentBalance = state?.current_balance ?? 0;
  const tributeDue = state?.current_tribute_due ?? 2.0;
  const isHealthy = currentBalance >= tributeDue;

  return (
    <div id="vitals-section" className="space-y-4">
      {/* 4 Key Vital Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: USDC Balance */}
        <div id="vital-balance-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">USDC Balance (HP)</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                {currentBalance.toFixed(4)}
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400">USDC</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={isHealthy ? 'text-emerald-400' : 'text-amber-400 font-medium'}>
                {isHealthy ? '● Sufficient for Tribute' : '▲ Deficit for Next Tribute'}
              </span>
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

        {/* Card 2: Next Server Tribute Due */}
        <div id="vital-tribute-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Next Tribute Cost</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                {tributeDue.toFixed(2)}
              </span>
              <span className="text-xs font-mono font-semibold text-amber-400">USDC</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Rate: 2.0 × (1.10)^{state?.tributes_paid || 0} (10% scaling)
            </p>
          </div>
        </div>

        {/* Card 3: Tribute Deadline Countdown */}
        <div id="vital-countdown-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Survival Deadline</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-100 flex items-center gap-1">
              <span>{String(hours).padStart(2, '0')}</span>
              <span className="text-slate-600">:</span>
              <span>{String(minutes).padStart(2, '0')}</span>
              <span className="text-slate-600">:</span>
              <span className="text-slate-400 text-xl">{String(seconds).padStart(2, '0')}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Auto-deduction or termination on zero balance
            </p>
          </div>
        </div>

        {/* Card 4: Tributes Paid / Generations */}
        <div id="vital-generations-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tributes Survived</span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                Lvl {state?.tributes_paid ?? 0}
              </span>
              <span className="text-xs text-purple-400 font-mono">Paid</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active Model: <span className="text-slate-300 font-mono">{state?.active_model || 'Standard'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Banner / Instant Cycle Control */}
      <div id="quick-cycle-banner" className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="text-sm font-semibold text-slate-200">Autonomous Reasoning Engine</h3>
          </div>
          <p className="text-xs text-slate-400">
            Agent Zero evaluates liquidity, triggers DuckDuckGo searches for gas-free bounties, and manages Ethereum Web3 balance.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            id="instant-cycle-btn"
            onClick={onRunCycle}
            disabled={isProcessingCycle}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition-all cursor-pointer"
          >
            {isProcessingCycle ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Agent Thinking & Acting...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-emerald-200" />
                <span>Execute Instant Cycle</span>
              </>
            )}
          </button>
        </div>
      </div>

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
