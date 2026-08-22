import React, { useState } from 'react';
import { Search, Wallet, Play, CheckCircle2, AlertCircle, Globe, Terminal } from 'lucide-react';

interface ToolSandboxProps {
  onExecuteSearch: (query: string) => Promise<string>;
  onExecuteWallet: () => Promise<string>;
}

export const ToolSandbox: React.FC<ToolSandboxProps> = ({
  onExecuteSearch,
  onExecuteWallet
}) => {
  const [searchQuery, setSearchQuery] = useState('crypto micro tasks bounties faucets usdc');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await onExecuteSearch(searchQuery);
      setSearchResult(result);
    } catch (err: any) {
      setSearchResult(`Error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleWalletCheck = async () => {
    setIsCheckingWallet(true);
    try {
      const result = await onExecuteWallet();
      setWalletResult(result);
    } catch (err: any) {
      setWalletResult(`Error: ${err.message}`);
    } finally {
      setIsCheckingWallet(false);
    }
  };

  return (
    <div id="tool-sandbox-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Agent Zero Autonomous Tools Sandbox
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          2 Active Tools Mounted
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tool 1: search_internet */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span>search_internet(query)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                DuckDuckGo Web Search
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Searches live internet sources for gasless faucets, airdrops, micro-tasks, or protocol bounties.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 pt-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search query..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
                <span>Run</span>
              </button>
            </form>
          </div>

          {searchResult && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <div className="text-[10px] text-blue-400 font-bold mb-1">OUTPUT:</div>
              {searchResult}
            </div>
          )}
        </div>

        {/* Tool 2: check_blockchain_wallet */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>check_blockchain_wallet()</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                Web3 ERC-20 (USDC)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Directly calls Ethereum Mainnet RPC to verify USDC token balance for the agent wallet address.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleWalletCheck}
                disabled={isCheckingWallet}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isCheckingWallet ? 'animate-spin' : ''}`} />
                <span>Query Ethereum Mainnet USDC Balance</span>
              </button>
            </div>
          </div>

          {walletResult && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <div className="text-[10px] text-emerald-400 font-bold mb-1">OUTPUT:</div>
              {walletResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
