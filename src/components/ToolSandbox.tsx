import React, { useState, useEffect } from 'react';
import { Search, Wallet, Play, CheckCircle2, AlertCircle, Globe, Terminal, Award, Shield, Zap, Sparkles, Lock, Unlock, TrendingUp } from 'lucide-react';
import { ToolItem } from '../types';

interface ToolSandboxProps {
  onExecuteSearch: (query: string) => Promise<string>;
  onExecuteWallet: () => Promise<string>;
  onExecuteWork?: (taskOrToolId?: string) => Promise<void>;
  onPayTribute?: () => Promise<void>;
  tributesPaid?: number;
}

export const ToolSandbox: React.FC<ToolSandboxProps> = ({
  onExecuteSearch,
  onExecuteWallet,
  onExecuteWork,
  onPayTribute,
  tributesPaid = 0
}) => {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('crypto micro tasks bounties faucets usdc');
  const [selectedToolId, setSelectedToolId] = useState<string>('tool-gitcoin');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [isExecutingWork, setIsExecutingWork] = useState(false);
  const [isPayingTribute, setIsPayingTribute] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<string | null>(null);
  const [workResult, setWorkResult] = useState<string | null>(null);
  const [tributeResult, setTributeResult] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [discoveryMsg, setDiscoveryMsg] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/tools/catalog');
      if (res.ok) {
        const data = await res.json();
        if (data.tools) {
          setTools(data.tools);
          const activeOnes = data.tools.filter((t: ToolItem) => t.status === 'ACTIVE');
          if (activeOnes.length > 0 && !activeOnes.some((t: ToolItem) => t.id === selectedToolId)) {
            setSelectedToolId(activeOnes[0].id);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchCatalog();
    const interval = setInterval(fetchCatalog, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDiscoverNewTool = async () => {
    setIsDiscovering(true);
    setDiscoveryMsg(null);
    try {
      const res = await fetch('/api/tools/discover', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDiscoveryMsg(data.message || 'Neues Tool erfolgreich erforscht!');
        if (data.tools) setTools(data.tools);
      }
    } catch (err: any) {
      setDiscoveryMsg(`Fehler bei Tool-Erforschung: ${err.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

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

  const handleWorkExecute = async (toolIdToRun?: string) => {
    if (!onExecuteWork) return;
    const target = toolIdToRun || selectedToolId;
    setIsExecutingWork(true);
    try {
      await onExecuteWork(target);
      const chosen = tools.find(t => t.id === target);
      setWorkResult(`✅ Tool "${chosen?.name || target}" erfolgreich ausgeführt! Ertrag gutgeschrieben.`);
      fetchCatalog();
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
      setTributeResult(`👑 Server-Tribut erfolgreich entrichtet! 48h Überlebensfrist neu gestartet.`);
      fetchCatalog();
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

  const activeTools = tools.filter(t => t.status === 'ACTIVE');
  const lockedTools = tools.filter(t => t.status === 'LOCKED');

  return (
    <div id="tool-sandbox-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <div>
            <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Agent Zero Autonomous Tool Catalog & Workbench
            </h2>
            <p className="text-[11px] text-slate-400">
              Der Agent schaltet eigenständig neue Ertrags-Werkzeuge frei und setzt sie ein, um steigende Abgaben zu überbieten.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscoverNewTool}
            disabled={isDiscovering}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium transition-all disabled:opacity-50 cursor-pointer"
            title="Sucht und aktiviert das nächste freischaltbare Tool"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : 'text-purple-400'}`} />
            <span>{isDiscovering ? 'Scouting Tools...' : 'Scout & Discover Tool'}</span>
          </button>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {activeTools.length} Active / {tools.length} Tools
          </span>
        </div>
      </div>

      {discoveryMsg && (
        <div className="p-2.5 rounded bg-purple-950/40 border border-purple-800/60 text-xs font-mono text-purple-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{discoveryMsg}</span>
        </div>
      )}

      {/* Grid of Dynamic Discovered Tools */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Verfügbare & Freigeschaltete Ertrags-Werkzeuge</span>
          <span className="text-[10px] text-slate-500">Skaliert mit Survival-Level (+12% pro Lvl)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((tool) => {
            const isActive = tool.status === 'ACTIVE';
            return (
              <div
                key={tool.id}
                className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                  isActive
                    ? 'bg-slate-950/80 border-slate-700/80 hover:border-emerald-500/50'
                    : 'bg-slate-950/30 border-slate-850 opacity-60'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {tool.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                        isActive ? 'text-emerald-400' : 'text-amber-400/80'
                      }`}
                    >
                      {isActive ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {isActive ? 'ACTIVE' : `Lvl ${tool.min_level_required}+`}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold font-mono text-slate-200 line-clamp-1">{tool.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{tool.description}</p>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Ertrag:</span>
                    <span className="text-emerald-400 font-bold">{tool.yield_range}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Erledigt: {tool.executions_count || 0}×</span>
                    <span>Verdienst: +{(tool.total_earned || 0).toFixed(4)} USDC</span>
                  </div>

                  {isActive && onExecuteWork && (
                    <button
                      onClick={() => handleWorkExecute(tool.id)}
                      disabled={isExecutingWork}
                      className="w-full py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-mono font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      <span>Ausführen (+USDC)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Core Infrastructure Tools (Search, Wallet, Tribute) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        {/* Tool: pay_server_tribute */}
        <div className="bg-slate-950/60 border border-amber-900/40 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>pay_server_tribute()</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded">
                48h Frist-Erneuerung
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Begleicht den aktuellen Pacht-Tribut vom On-Chain USDC Saldo, schaltet neue Tool-Stufen frei und <strong>setzt die 48h Überlebens-Frist komplett neu</strong>.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleTributeExecute}
                disabled={isPayingTribute}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className={`w-3 h-3 ${isPayingTribute ? 'animate-spin' : ''}`} />
                <span>{isPayingTribute ? 'Paying Tribute...' : 'Server-Pacht zahlen (+48h Überlebensfrist neu starten)'}</span>
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

        {/* Tool: check_blockchain_wallet & Audit */}
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
