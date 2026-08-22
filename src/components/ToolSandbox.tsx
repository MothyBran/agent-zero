import React, { useState } from 'react';
import { Search, Wallet, Play, CheckCircle2, AlertCircle, Globe, Terminal, Award, Shield, Zap } from 'lucide-react';

interface ToolSandboxProps {
  onExecuteSearch: (query: string) => Promise<string>;
  onExecuteWallet: () => Promise<string>;
  onExecuteWork?: (taskType?: string) => Promise<void>;
  onPayTribute?: () => Promise<void>;
}

export const ToolSandbox: React.FC<ToolSandboxProps> = ({
  onExecuteSearch,
  onExecuteWallet,
  onExecuteWork,
  onPayTribute
}) => {
  const [searchQuery, setSearchQuery] = useState('crypto micro tasks bounties faucets usdc');
  const [selectedTask, setSelectedTask] = useState('Gitcoin Gasless Quest: Node Telemetry & Uptime Validation');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [isExecutingWork, setIsExecutingWork] = useState(false);
  const [isPayingTribute, setIsPayingTribute] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<string | null>(null);
  const [workResult, setWorkResult] = useState<string | null>(null);
  const [tributeResult, setTributeResult] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<string | null>(null);

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

  const handleWorkExecute = async () => {
    if (!onExecuteWork) return;
    setIsExecutingWork(true);
    try {
      await onExecuteWork(selectedTask);
      setWorkResult(`✅ Arbeitsauftrag "${selectedTask}" erfolgreich abgeschlossen. Vergütung wurde gutgeschrieben.`);
    } catch (err: any) {
      setWorkResult(`Fehler: ${err.message}`);
    } finally {
      setIsExecutingWork(false);
    }
  };

  const handleTributeExecute = async () => {
    if (!onPayTribute) return;
    setIsPayingTribute(true);
    try {
      await onPayTribute();
      setTributeResult(`👑 Server-Tribut erfolgreich bezahlt! Pacht um 48h verlängert.`);
    } catch (err: any) {
      setTributeResult(`Fehler: ${err.message}`);
    } finally {
      setIsPayingTribute(false);
    }
  };

  const handleSecurityAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/tools/security-audit', { method: 'POST' });
      const data = await res.json();
      setAuditResult(JSON.stringify(data.audit, null, 2));
    } catch (err: any) {
      setAuditResult(`Fehler: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div id="tool-sandbox-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Agent Zero Autonomous Tools Sandbox (Live Arbeitsplatz)
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          5 Work & Survival Tools Mounted
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tool 1: execute_work_bounty */}
        <div className="bg-slate-950/60 border border-blue-900/40 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Award className="w-3.5 h-3.5 text-blue-400" />
                <span>execute_work_bounty(task)</span>
              </div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 rounded">
                Revenue Earning Worker
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Führt einen verifizierten Arbeitsauftrag für Web3-Protokolle aus und bucht echte USDC-Erträge in das Ledger.
            </p>

            <div className="space-y-2 pt-1">
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="Gitcoin Gasless Quest: Node Telemetry & Uptime Validation">Gitcoin Gasless Quest (~0.22 - 0.42 USDC)</option>
                <option value="Web3 Protocol Bounty: Smart Contract Interface Verification">Web3 Protocol Bounty (~0.35 - 0.60 USDC)</option>
                <option value="Layer-2 Gasless Bridge Activity & Attestation Task">Layer-2 Bridge Task (~0.18 - 0.33 USDC)</option>
                <option value="Decentralized AI Telemetry & Prompt Quality Verification">AI Telemetry Verification (~0.28 - 0.50 USDC)</option>
                <option value="ERC-4337 Paymaster Sponsor Settlement Bounty">Paymaster Settlement (~0.40 - 0.65 USDC)</option>
              </select>

              <button
                type="button"
                onClick={handleWorkExecute}
                disabled={isExecutingWork}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isExecutingWork ? 'animate-spin' : ''}`} />
                <span>{isExecutingWork ? 'Working & Verifying...' : 'Arbeitsauftrag ausführen (+USDC)'}</span>
              </button>
            </div>
          </div>

          {workResult && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-blue-900/60 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <div className="text-[10px] text-blue-400 font-bold mb-1">RESULT:</div>
              {workResult}
            </div>
          )}
        </div>

        {/* Tool 2: pay_server_tribute */}
        <div className="bg-slate-950/60 border border-amber-900/40 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>pay_server_tribute()</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded">
                Survival Life Extension
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Begleicht den anstehenden Server-Tribut vorzeitig vom USDC-Guthaben, erhöht das Level und setzt die 48h-Deadline zurück.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleTributeExecute}
                disabled={isPayingTribute}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isPayingTribute ? 'animate-spin' : ''}`} />
                <span>{isPayingTribute ? 'Paying Tribute...' : 'Server-Pacht zahlen (+48h Überleben)'}</span>
              </button>
            </div>
          </div>

          {tributeResult && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-amber-900/60 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <div className="text-[10px] text-amber-400 font-bold mb-1">RESULT:</div>
              {tributeResult}
            </div>
          )}
        </div>

        {/* Tool 3: search_internet */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>search_internet(query)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                DuckDuckGo Live Search
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Durchsucht Live-Quellen nach gasfreien Faucets, Bounties, Airdrops und Yield-Möglichkeiten.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 pt-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchbegriff eingeben..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
                <span>Scout</span>
              </button>
            </form>
          </div>

          {searchResult && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <div className="text-[10px] text-emerald-400 font-bold mb-1">OUTPUT:</div>
              {searchResult}
            </div>
          )}
        </div>

        {/* Tool 4: check_blockchain_wallet */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Wallet className="w-3.5 h-3.5 text-purple-400" />
                <span>check_blockchain_wallet()</span>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 border border-purple-800/60 px-1.5 py-0.5 rounded">
                Web3 ERC-20 RPC
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Fragt die Ethereum Mainnet RPC-Nodes direkt nach dem aktuellen On-Chain USDC Saldo ab.
            </p>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleWalletCheck}
                disabled={isCheckingWallet}
                className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isCheckingWallet ? 'animate-spin' : ''}`} />
                <span>Sync On-Chain Wallet</span>
              </button>
              <button
                type="button"
                onClick={handleSecurityAudit}
                disabled={isAuditing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
                title="Relayer & Paymaster Audit"
              >
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Audit</span>
              </button>
            </div>
          </div>

          {(walletResult || auditResult) && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <div className="text-[10px] text-purple-400 font-bold mb-1">
                {auditResult ? 'SECURITY AUDIT REPORT:' : 'OUTPUT:'}
              </div>
              {auditResult || walletResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
