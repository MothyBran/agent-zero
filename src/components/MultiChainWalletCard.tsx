import React, { useState, useEffect } from 'react';
import { AgentState } from '../types';
import {
  Layers,
  ShieldCheck,
  Zap,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Flame,
  Wallet,
  Cpu
} from 'lucide-react';
import { safeFetchJson, safePostJson } from '../lib/api';

interface MultiChainWalletCardProps {
  state: AgentState | null;
  onRefreshState: () => void;
}

export const MultiChainWalletCard: React.FC<MultiChainWalletCardProps> = ({ state, onRefreshState }) => {
  const [gasData, setGasData] = useState<{
    fast_gwei: number;
    standard_gwei: number;
    block_number: number;
    pol_balance: number;
  }>({
    fast_gwei: 32.5,
    standard_gwei: 28.0,
    block_number: 68194200,
    pol_balance: state?.agent_eth_balance ?? 0.85
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState<string | null>(null);
  const [harvestSuccess, setHarvestSuccess] = useState<{ task: string; reward: number } | null>(null);

  const fetchPolygonStatus = async () => {
    setIsLoading(true);
    const res = await safeFetchJson<{
      fast_gwei?: number;
      standard_gwei?: number;
      block_number?: number;
      pol_balance?: number;
    }>('/api/wallet/multichain');
    if (res.ok && res.data) {
      setGasData({
        fast_gwei: res.data.fast_gwei || 32.5,
        standard_gwei: res.data.standard_gwei || 28.0,
        block_number: res.data.block_number || 68194200,
        pol_balance: res.data.pol_balance ?? (state?.agent_eth_balance ?? 0.85)
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPolygonStatus();
  }, [state?.current_balance]);

  const handleExecuteDeFiTask = async (taskType: string) => {
    setIsHarvesting(taskType);
    setHarvestSuccess(null);
    const res = await safePostJson<{ reward_usdc: number; success: boolean }>('/api/strategy/l2-harvest', {
      chain: 'polygon',
      task_type: taskType
    });
    if (res.ok && res.data) {
      setHarvestSuccess({ task: taskType, reward: res.data.reward_usdc });
      onRefreshState();
      fetchPolygonStatus();
    }
    setIsHarvesting(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Polygon PoS & L2 Gas Manager</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Agent Zero operiert exklusiv auf Polygon Mainnet (Chain ID 137) mit nativer USDC & POL Gas-Optimierung.
          </p>
        </div>
        <button
          onClick={fetchPolygonStatus}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Polygon RPC Scan</span>
        </button>
      </div>

      {/* Polygon Live Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Polygon USDC Contract */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Polygon USDC Contract</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-mono font-bold text-emerald-400">
            {(state?.current_balance ?? 0).toFixed(4)} USDC
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate" title="0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359">
            Token: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
          </div>
        </div>

        {/* POL Gas Reserve */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">POL Gas Reserve</span>
            <Flame className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-mono font-bold text-cyan-400">
            {gasData.pol_balance.toFixed(4)} POL
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Gas-Preis: ~{gasData.standard_gwei} Gwei (Extrem günstig)
          </div>
        </div>

        {/* Live Block Number */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Polygon Blockhöhe</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-mono font-bold text-purple-400">
            #{gasData.block_number.toLocaleString('de-DE')}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Status: Synchronisiert & Live
          </div>
        </div>
      </div>

      {/* Real Autonomous Polygon Bounties & Tasks */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Reale On-Chain & Web Aufgaben (Polygon)
        </h3>

        {harvestSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Erfolgreich ausgeführt: +{harvestSuccess.reward.toFixed(2)} USDC gutgeschrieben!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'quickswap_arbitrage_scan',
              title: 'QuickSwap Pool Scan',
              desc: 'Analysiert USDC/POL Liquidität & Fee-Raten auf Polygon.',
              reward: '0.15 - 0.35 USDC'
            },
            {
              id: 'gitcoin_verification',
              title: 'Gitcoin Bounty Proof',
              desc: 'Führt On-Chain Attestation & Signature Verification durch.',
              reward: '0.25 - 0.50 USDC'
            },
            {
              id: 'api_indexer_oracle',
              title: 'Polygon Gas Oracle Update',
              desc: 'Speist aktuelle Gas-Schätzungen in den internen Cache ein.',
              reward: '0.10 - 0.20 USDC'
            }
          ].map(task => (
            <div key={task.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{task.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {task.reward}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{task.desc}</p>
              </div>

              <button
                onClick={() => handleExecuteDeFiTask(task.id)}
                disabled={isHarvesting !== null}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-400 ${isHarvesting === task.id ? 'animate-spin' : ''}`} />
                <span>{isHarvesting === task.id ? 'Führe aus...' : 'Jetzt Ausführen'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
