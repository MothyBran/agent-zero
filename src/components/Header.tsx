import React, { useState } from 'react';
import { AgentState } from '../types';
import { Shield, Activity, Copy, Check, Power, RefreshCw, Cpu, Wallet } from 'lucide-react';

interface HeaderProps {
  state: AgentState | null;
  onRefresh: () => void;
  isLoading: boolean;
  onToggleRun: () => void;
}

export const Header: React.FC<HeaderProps> = ({ state, onRefresh, isLoading, onToggleRun }) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (state?.wallet_address) {
      navigator.clipboard.writeText(state.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
                {isTerminated ? 'System offline – Server-Pacht nicht bezahlt' : 'Ethereum Mainnet · Economic Survival Protocol'}
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
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Agent State"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
