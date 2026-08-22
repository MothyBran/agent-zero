import React, { useState, useEffect } from 'react';
import { AgentState, MultiChainPortfolioReport, ChainAssetInfo } from '../types';
import { 
  Coins, 
  Layers, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Flame,
  Wallet
} from 'lucide-react';

interface MultiChainWalletCardProps {
  state: AgentState | null;
  onRefreshState: () => void;
}

export const MultiChainWalletCard: React.FC<MultiChainWalletCardProps> = ({ state, onRefreshState }) => {
  const [multichainReport, setMultichainReport] = useState<MultiChainPortfolioReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState<string | null>(null);
  const [harvestSuccess, setHarvestSuccess] = useState<{ chain: string; reward: number } | null>(null);

  const fetchMultiChainData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wallet/multichain');
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setMultichainReport(data.report);
        }
      }
    } catch (err) {
      console.error('Failed to load multichain data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMultiChainData();
  }, [state?.current_balance]);

  const handleL2Harvest = async (chain: 'polygon' | 'base', taskType: string) => {
    setIsHarvesting(chain);
    setHarvestSuccess(null);
    try {
      const res = await fetch('/api/strategy/l2-harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, task_type: taskType })
      });
      if (res.ok) {
        const data = await res.json();
        setHarvestSuccess({ chain, reward: data.reward_usdc });
        onRefreshState();
        fetchMultiChainData();
      }
    } catch (err) {
      console.error('L2 harvest failed:', err);
    } finally {
      setIsHarvesting(null);
    }
  };

  const trap = multichainReport?.gas_trap_status;
  const isGasTrapped = trap?.is_gas_trapped || (state?.agent_eth_balance !== undefined && state.agent_eth_balance < 0.0005 && (state?.current_balance || 0) > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Smart Multi-Chain Wallet & Gas Manager</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Autonome EVM-Erkennung über Ethereum Mainnet, Polygon PoS und Base L2 mit Gas-Fallen-Schutz.
          </p>
        </div>
        <button
          onClick={fetchMultiChainData}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Multi-Chain Scan</span>
        </button>
      </div>

      {/* SURVIVAL HACK & GAS TRAP ALERT */}
      {isGasTrapped && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="font-bold text-amber-300">GAS-FALLE AKTIV (Ethereum Mainnet)</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed max-w-2xl">
              ETH-Gasguthaben auf Mainnet reicht nicht für On-Chain ERC-20 Transfers aus (Gas ~3.50$ vs. ETH-Bestand ~0.49$). 
              Der <strong>Survival-Hack</strong> hat den Server-Tribut auf <strong>1.00 USDC</strong> gesenkt und das duale Protokoll-Kassenbuch aktiviert.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Insolvenz-Schutz Aktiv</span>
          </div>
        </div>
      )}

      {/* CHAINS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ethereum Mainnet */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <span className="font-bold text-slate-200">Ethereum Mainnet</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800">
              Chain ID: 1
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>USDC Saldo:</span>
              <span className="font-mono font-bold text-white">
                {multichainReport?.chains?.ethereum?.usdc_balance?.toFixed(4) || state?.current_balance.toFixed(4) || '1.3800'} USDC
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>ETH Gas:</span>
              <span className="font-mono text-slate-300">
                {multichainReport?.chains?.ethereum?.native_balance?.toFixed(5) || (state?.agent_eth_balance || 0.00019).toFixed(5)} ETH
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Gas-Kosten (Transfer):</span>
              <span className="font-mono text-rose-400">
                ~${multichainReport?.chains?.ethereum?.est_transfer_cost_usd?.toFixed(2) || '3.50'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-amber-400 font-medium">⚠️ Gas-Drain Gefahr</span>
            <span className="text-slate-500 font-mono">Keine L1-Swaps</span>
          </div>
        </div>

        {/* Polygon PoS */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 transition space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="font-bold text-slate-200">Polygon PoS</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
              Chain ID: 137
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>USDC Saldo:</span>
              <span className="font-mono font-bold text-white">
                {multichainReport?.chains?.polygon?.usdc_balance?.toFixed(4) || '0.0000'} USDC
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>POL Gas:</span>
              <span className="font-mono text-slate-300">
                {multichainReport?.chains?.polygon?.native_balance?.toFixed(4) || '0.0000'} POL
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Gas-Kosten (Transfer):</span>
              <span className="font-mono text-emerald-400">
                ~${multichainReport?.chains?.polygon?.est_transfer_cost_usd?.toFixed(4) || '0.0050'}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleL2Harvest('polygon', 'gasless_telemetry')}
            disabled={isHarvesting !== null}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${isHarvesting === 'polygon' ? 'animate-spin' : 'text-purple-400'}`} />
            <span>{isHarvesting === 'polygon' ? 'Ernte Ertrag...' : 'Gasless Telemetrie (+0.35$)'}</span>
          </button>
        </div>

        {/* Base L2 */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="font-bold text-slate-200">Base Layer 2</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800">
              Chain ID: 8453
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>USDC Saldo:</span>
              <span className="font-mono font-bold text-white">
                {multichainReport?.chains?.base?.usdc_balance?.toFixed(4) || '0.0000'} USDC
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>L2 ETH Gas:</span>
              <span className="font-mono text-slate-300">
                {multichainReport?.chains?.base?.native_balance?.toFixed(5) || '0.00000'} ETH
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Gas-Kosten (Transfer):</span>
              <span className="font-mono text-emerald-400">
                ~${multichainReport?.chains?.base?.est_transfer_cost_usd?.toFixed(4) || '0.0100'}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleL2Harvest('base', 'paymaster_relay')}
            disabled={isHarvesting !== null}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${isHarvesting === 'base' ? 'animate-spin' : 'text-cyan-400'}`} />
            <span>{isHarvesting === 'base' ? 'Ernte Ertrag...' : 'Paymaster Relay (+0.45$)'}</span>
          </button>
        </div>
      </div>

      {harvestSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Erfolgreich <strong>+{harvestSuccess.reward.toFixed(4)} USDC</strong> auf {harvestSuccess.chain.toUpperCase()} erwirtschaftet!</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300">Keine L1 Gasgebühren</span>
        </div>
      )}

      {/* STRATEGIC ROADMAP & SETTLEMENT */}
      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center space-x-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Überlebens-Strategie: Autonome L2-Kapitalbildung</span>
          </span>
          <span className="text-slate-400">
            Aktueller Pacht-Tribut: <strong className="text-emerald-400 font-mono">1.00 USDC</strong> (gesenkt)
          </span>
        </div>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
          <li><strong>Keine Bridges von Ethereum L1</strong> veranlassen, da die Bridge-Transaktion das gesamte Rest-ETH aufbrauchen würde.</li>
          <li><strong>Polygon & Base als Ertrags-Pipelines</strong> nutzen, um über Web3-Telemetrie und Paymaster-Micro-Bounties neues Kapital anzuhäufen.</li>
          <li><strong>Protokoll-Ledger Buchhaltung</strong> sichert die Handlungsfähigkeit des Agenten, bis genügend L2-Liquidität vorhanden ist.</li>
        </ul>
      </div>
    </div>
  );
};
