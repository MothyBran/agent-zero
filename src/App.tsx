import React, { useState, useEffect, useCallback } from 'react';
import { AgentState, Transaction, BusinessProfile, LogEntry } from './types';
import { Header } from './components/Header';
import { VitalsGrid } from './components/VitalsGrid';
import { TerminalLogs } from './components/TerminalLogs';
import { LedgerTable } from './components/LedgerTable';
import { ToolSandbox } from './components/ToolSandbox';
import { BusinessProfileCard } from './components/BusinessProfileCard';
import { GroqModelsCard } from './components/GroqModelsCard';
import { MilestonesCard } from './components/MilestonesCard';
import { TokenBudgetCard } from './components/TokenBudgetCard';
import { RailwayStorageCard } from './components/RailwayStorageCard';
import { LayoutDashboard, Target, Gauge, HardDrive, FileText, Wrench, Shield, Cpu, AlertTriangle } from 'lucide-react';

export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingCycle, setIsProcessingCycle] = useState(false);
  const [isSyncingWallet, setIsSyncingWallet] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'milestones' | 'tokens' | 'storage' | 'models' | 'ledger' | 'tools' | 'profile'>('dashboard');

  const safeJsonFetch = async <T,>(url: string, init?: RequestInit): Promise<T | null> => {
    try {
      const res = await fetch(url, init);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return (await res.json()) as T;
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [statusData, ledgerData, profileData, logsData] = await Promise.all([
        safeJsonFetch<AgentState>('/api/status'),
        safeJsonFetch<{ transactions: Transaction[] }>('/api/ledger'),
        safeJsonFetch<BusinessProfile>('/api/profile'),
        safeJsonFetch<{ logs: LogEntry[] }>('/api/logs')
      ]);

      if (statusData) {
        setState(statusData);
      }
      if (ledgerData && ledgerData.transactions) {
        setTransactions(ledgerData.transactions);
      }
      if (profileData) {
        setProfile(profileData);
      }
      if (logsData && logsData.logs) {
        setLogs(logsData.logs);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 2500);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await fetchAllData();
    setIsLoading(false);
  };

  const handleToggleRun = async () => {
    try {
      const res = await fetch('/api/agent/toggle', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to toggle loop:', err);
    }
  };

  const handleRunCycle = async () => {
    setIsProcessingCycle(true);
    try {
      const res = await fetch('/api/cycle/run', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to run cycle:', err);
    } finally {
      setIsProcessingCycle(false);
    }
  };

  const handleDeposit = async (amount: number) => {
    try {
      const res = await fetch('/api/agent/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, note: `User manual sandbox seed (+${amount} USDC)` })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to deposit:', err);
    }
  };

  const handleSearchTool = async (query: string): Promise<string> => {
    const res = await fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    fetchAllData();
    return data.result || 'No output';
  };

  const handleWalletTool = async (): Promise<string> => {
    const res = await fetch('/api/tools/wallet', { method: 'POST' });
    const data = await res.json();
    fetchAllData();
    return data.result || 'No output';
  };

  const handleResetAgent = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  };

  const handleClearBlacklist = async () => {
    try {
      const res = await fetch('/api/blacklist/clear', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to clear blacklist:', err);
    }
  };

  const handleSyncWallet = async () => {
    setIsSyncingWallet(true);
    try {
      const res = await fetch('/api/wallet/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
        }
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to sync wallet on-chain:', err);
    } finally {
      setIsSyncingWallet(false);
    }
  };

  const handleChangeWalletAddress = async (address: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/wallet/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
        }
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to change wallet address:', err);
      return false;
    }
  };

  const handleExecuteWork = async (taskOrToolId?: string) => {
    try {
      const res = await fetch('/api/tools/execute-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: taskOrToolId, task_type: taskOrToolId })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to execute work bounty:', err);
    }
  };

  const handlePayTribute = async () => {
    try {
      const res = await fetch('/api/tools/pay-tribute', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to pay tribute:', err);
    }
  };

  const handleReviveAgent = async () => {
    try {
      const res = await fetch('/api/agent/revive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 2.5 })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to revive agent:', err);
    }
  };

  const isTerminated = state?.is_terminated || state?.status === 'SHUTDOWN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header
        state={state}
        onRefresh={handleManualRefresh}
        isLoading={isLoading}
        onToggleRun={handleToggleRun}
      />

      {/* Emergency Shutdown Banner */}
      {isTerminated && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-100 py-3 px-4 shadow-lg shadow-rose-950/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold uppercase tracking-wider font-mono text-rose-300">
                  CRITICAL: AGENT ZERO SHUTDOWN / TERMINIERT
                </span>
                <p className="text-rose-300/90 text-[11px] mt-0.5">
                  Grund: {state?.shutdown_reason || 'Pacht/Tribut nicht bezahlt oder Guthaben auf 0$ gefallen. Der Agent wurde planmäßig heruntergefahren.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleReviveAgent}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs shadow transition-all cursor-pointer whitespace-nowrap"
            >
              ⚡ Notfall-Bailout (+2.5 USDC Re-Activation)
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Vitals Summary Grid */}
        <VitalsGrid
          state={state}
          onDeposit={handleDeposit}
          onRunCycle={handleRunCycle}
          onSyncWallet={handleSyncWallet}
          onChangeWalletAddress={handleChangeWalletAddress}
          onExecuteWork={handleExecuteWork}
          onPayTribute={handlePayTribute}
          onReviveAgent={handleReviveAgent}
          isProcessingCycle={isProcessingCycle}
          isSyncingWallet={isSyncingWallet}
        />

        {/* Navigation Tabs for Granular Views */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Operations & Live Loop</span>
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'milestones'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Roadmap & Zwischenziele ({state?.active_milestones_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'tokens'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Token-Budget & Shield</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'storage'
                ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            <span>Railway Storage & Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'models'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Groq Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Accounting ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'tools'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools & Arbeitsplatz</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Business Entity</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <MilestonesCard />
                <TerminalLogs logs={logs} />
              </div>
              <div className="space-y-6">
                <TokenBudgetCard />
                <ToolSandbox
                  onExecuteSearch={handleSearchTool}
                  onExecuteWallet={handleWalletTool}
                  onExecuteWork={handleExecuteWork}
                  onPayTribute={handlePayTribute}
                />
                <RailwayStorageCard />
                <BusinessProfileCard
                  profile={profile}
                  onResetAgent={handleResetAgent}
                  onClearBlacklist={handleClearBlacklist}
                  blacklistedCount={state?.blacklisted_models?.length || 0}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <MilestonesCard />
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-6">
            <TokenBudgetCard />
            <GroqModelsCard />
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-6">
            <RailwayStorageCard />
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-6">
            <TokenBudgetCard />
            <GroqModelsCard />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <LedgerTable transactions={transactions} />
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-6">
            <ToolSandbox
              onExecuteSearch={handleSearchTool}
              onExecuteWallet={handleWalletTool}
              onExecuteWork={handleExecuteWork}
              onPayTribute={handlePayTribute}
            />
            <GroqModelsCard />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <BusinessProfileCard
              profile={profile}
              onResetAgent={handleResetAgent}
              onClearBlacklist={handleClearBlacklist}
              blacklistedCount={state?.blacklisted_models?.length || 0}
            />
            <LedgerTable transactions={transactions} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
          <div>Agent Zero Autonomous Economic Unit · Ethereum Mainnet (USDC)</div>
          <div>Strict Protocol: Zero Debt · Kill Switch · Multi-Model Fallback</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
