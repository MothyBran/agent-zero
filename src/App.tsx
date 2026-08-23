import React, { useState, useEffect, useCallback } from 'react';
import { AgentState, Transaction, BusinessProfile, LogEntry } from './types';
import { Header } from './components/Header';
import { VitalsGrid } from './components/VitalsGrid';
import { TerminalLogs } from './components/TerminalLogs';
import { LedgerTable } from './components/LedgerTable';
import { RealIntelligenceCard } from './components/RealIntelligenceCard';
import { KnowledgeStorageManager } from './components/KnowledgeStorageManager';
import { LiveAutomatonWorkbench } from './components/LiveAutomatonWorkbench';
import { BusinessProfileCard } from './components/BusinessProfileCard';
import { GroqModelsCard } from './components/GroqModelsCard';
import { MilestonesCard } from './components/MilestonesCard';
import { TokenBudgetCard } from './components/TokenBudgetCard';
import { RailwayStorageCard } from './components/RailwayStorageCard';
import { MultiChainWalletCard } from './components/MultiChainWalletCard';
import { LoginPage } from './components/LoginPage';
import {
  LayoutDashboard,
  Brain,
  Database,
  Globe,
  Layers,
  Target,
  FileText,
  Shield,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { safeFetchJson, safePostJson } from './lib/api';

export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingCycle, setIsProcessingCycle] = useState(false);
  const [isSyncingWallet, setIsSyncingWallet] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'intelligence' | 'knowledge' | 'workbench' | 'multichain' | 'milestones' | 'ledger' | 'models' | 'profile'
  >('dashboard');

  const [localBackupSnapshot, setLocalBackupSnapshot] = useState<any>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Authentication gate state
  const [authStatus, setAuthStatus] = useState<{ auth_required: boolean; configured: boolean } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agent_zero_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Check auth requirement on mount
  useEffect(() => {
    safeFetchJson<{ auth_required: boolean; configured: boolean }>('/api/auth/status')
      .then(res => {
        if (res.ok && res.data) {
          setAuthStatus(res.data);
          if (!res.data.auth_required) {
            setIsAuthenticated(true);
          }
        } else {
          setAuthStatus({ auth_required: false, configured: false });
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        setAuthStatus({ auth_required: false, configured: false });
        setIsAuthenticated(true);
      });
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('agent_zero_auth');
    } catch {}
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('agent_zero_auth', 'true');
    } catch {}
    fetchAllData();
  };

  const fetchAllData = useCallback(async () => {
    const [statusData, ledgerData, profileData, logsData] = await Promise.all([
      safeFetchJson<AgentState>('/api/status'),
      safeFetchJson<{ transactions: Transaction[] }>('/api/ledger'),
      safeFetchJson<BusinessProfile>('/api/profile'),
      safeFetchJson<{ logs: LogEntry[] }>('/api/logs')
    ]);

    if (statusData.ok && statusData.data) {
      setState(statusData.data);

      // Auto-save snapshot into localStorage if the agent has accumulated progress
      if ((statusData.data.tributes_paid || 0) > 0 || (statusData.data.active_jobs_completed || 0) > 0 || (statusData.data.total_learnings_count || 0) > 0) {
        safeFetchJson<{ snapshot: any }>('/api/storage/snapshot/export')
          .then(res => {
            if (res.ok && res.data?.snapshot) {
              localStorage.setItem('agent_zero_last_snapshot', JSON.stringify(res.data.snapshot));
            }
          })
          .catch(() => {});
      }
    }
    if (ledgerData.ok && ledgerData.data?.transactions) {
      setTransactions(ledgerData.data.transactions);
    }
    if (profileData.ok && profileData.data) {
      setProfile(profileData.data);
    }
    if (logsData.ok && logsData.data?.logs) {
      setLogs(logsData.data.logs);
    }
  }, []);

  // Check if browser has a saved snapshot to recover from a fresh server deploy
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agent_zero_last_snapshot');
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedLevel = parsed.state?.tributes_paid ?? 0;
        const savedJobs = parsed.state?.jobs_completed ?? 0;
        if (savedLevel > 0 || savedJobs > 0) {
          setLocalBackupSnapshot(parsed);
        }
      }
    } catch {}
  }, [state?.tributes_paid, state?.active_jobs_completed]);

  const handleRestoreLocalSnapshot = async () => {
    if (!localBackupSnapshot) return;
    setIsRestoringBackup(true);
    const res = await safePostJson('/api/storage/snapshot/import', {
      snapshot: localBackupSnapshot,
      source: 'Browser LocalStorage Auto-Backup'
    });
    if (res.ok) {
      await fetchAllData();
      setLocalBackupSnapshot(null);
    }
    setIsRestoringBackup(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchAllData, isAuthenticated]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await fetchAllData();
    setIsLoading(false);
  };

  const handleToggleRun = async () => {
    const res = await safePostJson<{ state: AgentState }>('/api/agent/toggle');
    if (res.ok && res.data?.state) {
      setState(res.data.state);
      fetchAllData();
    }
  };

  const handleRunCycle = async () => {
    setIsProcessingCycle(true);
    const res = await safePostJson('/api/cycle/run');
    if (res.ok) {
      await fetchAllData();
    }
    setIsProcessingCycle(false);
  };

  const handleResetAgent = async () => {
    const res = await safePostJson('/api/reset');
    if (res.ok) {
      await fetchAllData();
    }
  };

  const handleClearBlacklist = async () => {
    const res = await safePostJson('/api/blacklist/clear');
    if (res.ok) {
      await fetchAllData();
    }
  };

  const handleSyncWallet = async () => {
    setIsSyncingWallet(true);
    const res = await safePostJson<{ state?: AgentState }>('/api/wallet/sync');
    if (res.ok && res.data?.state) {
      setState(res.data.state);
      await fetchAllData();
    }
    setIsSyncingWallet(false);
  };

  const handleChangeWalletAddress = async (address: string): Promise<boolean> => {
    const res = await safePostJson<{ state?: AgentState }>('/api/wallet/address', { address });
    if (res.ok && res.data?.state) {
      setState(res.data.state);
      await fetchAllData();
      return true;
    }
    return false;
  };

  const handleExecuteWork = async (taskOrToolId?: string) => {
    const res = await safePostJson('/api/tools/execute-work', { tool_id: taskOrToolId, task_type: taskOrToolId });
    if (res.ok) {
      await fetchAllData();
    }
  };

  const handlePayTribute = async () => {
    const res = await safePostJson('/api/tools/pay-tribute');
    if (res.ok) {
      await fetchAllData();
    }
  };

  const handleReviveAgent = async () => {
    const res = await safePostJson('/api/agent/revive', { amount: 2.5 });
    if (res.ok) {
      await fetchAllData();
    }
  };

  const isTerminated = state?.is_terminated || state?.status === 'SHUTDOWN';

  // If server requires authentication and user is not authenticated yet, show Login Page
  if (authStatus?.auth_required && !isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header
        state={state}
        onRefresh={handleManualRefresh}
        isLoading={isLoading}
        onToggleRun={handleToggleRun}
        authRequired={authStatus?.auth_required}
        onLogout={handleLogout}
      />

      {/* Emergency Shutdown Banner */}
      {isTerminated && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-100 py-3 px-4 shadow-lg shadow-rose-950/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold uppercase tracking-wider font-mono text-rose-300">
                  CRITICAL: AGENT ZERO TERMINIERT
                </span>
                <p className="text-rose-300/90 text-[11px] mt-0.5">
                  Grund: {state?.shutdown_reason || 'Pacht/Tribut nicht innerhalb 48h bezahlt oder Liquidität erschöpft.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleReviveAgent}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs shadow transition-all cursor-pointer whitespace-nowrap"
            >
              ⚡ Reaktivieren (Notfall-Restart)
            </button>
          </div>
        </div>
      )}

      {/* Fresh Re-Deployment Auto-Recovery Banner */}
      {localBackupSnapshot && state && state.tributes_paid === 0 && state.active_jobs_completed === 0 && ((localBackupSnapshot.state?.tributes_paid ?? 0) > 0 || (localBackupSnapshot.state?.jobs_completed ?? 0) > 0) && (
        <div className="bg-blue-950/90 border-b border-blue-600 text-blue-100 py-3.5 px-4 shadow-lg shadow-blue-950/40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-start sm:items-center gap-2.5">
              <Brain className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-cyan-300 text-sm">
                  🔄 Re-Deployment / Reset erkannt — Lokales Backup gefunden!
                </span>
                <p className="text-blue-200/90 text-[11px] mt-0.5">
                  Im Browser ist ein Snapshot mit <strong>Level {localBackupSnapshot.state?.tributes_paid}</strong>, <strong>{localBackupSnapshot.state?.jobs_completed} Aufträgen</strong> und <strong>{localBackupSnapshot.knowledge?.length || 0} Erkenntnissen</strong> vorhanden.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRestoreLocalSnapshot}
                disabled={isRestoringBackup}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{isRestoringBackup ? 'Stelle wieder her...' : '✨ Snapshot jetzt wiederherstellen'}</span>
              </button>
              <button
                onClick={() => setLocalBackupSnapshot(null)}
                className="px-2.5 py-2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                Ignorieren
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Vitals Summary Grid */}
        <VitalsGrid
          state={state}
          onRunCycle={handleRunCycle}
          onSyncWallet={handleSyncWallet}
          onChangeWalletAddress={handleChangeWalletAddress}
          onExecuteWork={handleExecuteWork}
          onPayTribute={handlePayTribute}
          onReviveAgent={handleReviveAgent}
          isProcessingCycle={isProcessingCycle}
          isSyncingWallet={isSyncingWallet}
        />

        {/* Navigation Tabs for Granular Real-Data Views */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Operations & Live Loop</span>
          </button>

          <button
            onClick={() => setActiveTab('intelligence')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'intelligence'
                ? 'bg-slate-900 text-purple-400 border-t-2 border-purple-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>Kognitive Intelligenz & IQ</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'knowledge'
                ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Wissens-Storage & Memory ({state?.total_learnings_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('workbench')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'workbench'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live HTTP & API Workbench</span>
          </button>

          <button
            onClick={() => setActiveTab('multichain')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'multichain'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Polygon PoS & L2 Gas</span>
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'milestones'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Roadmap & Zwischenziele ({state?.active_milestones_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Accounting ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'models'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>LLM Telemetrie</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
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
            <MultiChainWalletCard state={state} onRefreshState={fetchAllData} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <RealIntelligenceCard onRefresh={fetchAllData} />
                <KnowledgeStorageManager onRefresh={fetchAllData} />
                <MilestonesCard />
                <TerminalLogs logs={logs} />
              </div>
              <div className="space-y-6">
                <LiveAutomatonWorkbench
                  onRefresh={fetchAllData}
                  walletAddress={state?.wallet_address}
                  creatorAddress={state?.creator_address}
                  tributesPaid={state?.tributes_paid}
                />
                <RailwayStorageCard />
                <TokenBudgetCard />
                <BusinessProfileCard
                  profile={profile}
                  state={state}
                  onResetAgent={handleResetAgent}
                  onClearBlacklist={handleClearBlacklist}
                  blacklistedCount={state?.blacklisted_models?.length || 0}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            <RealIntelligenceCard onRefresh={fetchAllData} />
            <GroqModelsCard />
            <TokenBudgetCard />
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <KnowledgeStorageManager onRefresh={fetchAllData} />
            <RailwayStorageCard />
          </div>
        )}

        {activeTab === 'workbench' && (
          <div className="space-y-6">
            <LiveAutomatonWorkbench
              onRefresh={fetchAllData}
              walletAddress={state?.wallet_address}
              creatorAddress={state?.creator_address}
              tributesPaid={state?.tributes_paid}
            />
          </div>
        )}

        {activeTab === 'multichain' && (
          <div className="space-y-6">
            <MultiChainWalletCard state={state} onRefreshState={fetchAllData} />
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <MilestonesCard />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <LedgerTable transactions={transactions} />
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-6">
            <TokenBudgetCard />
            <GroqModelsCard />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <BusinessProfileCard
              profile={profile}
              state={state}
              onResetAgent={handleResetAgent}
              onClearBlacklist={handleClearBlacklist}
              blacklistedCount={state?.blacklisted_models?.length || 0}
            />
            <LedgerTable transactions={transactions} />
          </div>
        )}
      </main>

      {/* Puristic Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
          <div>Agent Zero Autonomous Economic Unit · {state?.network || 'Polygon PoS (USDC)'}</div>
          <div>Hard Survival Protocol: 48h Kill Switch · Reale Daten & Autonomes Lernen</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
