import React, { useState, useEffect, useCallback } from 'react';
import { AgentState, LogEntry, ReasoningStreamItem, IntelligenceEvaluation } from './types';
import { MinimalVitalsBar } from './components/MinimalVitalsBar';
import { LiveTerminal } from './components/LiveTerminal';
import { LoginPage } from './components/LoginPage';
import { AlertTriangle } from 'lucide-react';
import { safeFetchJson, safePostJson } from './lib/api';

export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reasoningStream, setReasoningStream] = useState<ReasoningStreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [authStatus, setAuthStatus] = useState<{ auth_required: boolean; configured: boolean } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try { return localStorage.getItem('agent_zero_auth') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    safeFetchJson<{ auth_required: boolean; configured: boolean }>('/api/auth/status')
      .then(res => {
        if (res.ok && res.data) {
          setAuthStatus(res.data);
          if (!res.data.auth_required) setIsAuthenticated(true);
        } else {
          setAuthStatus({ auth_required: false, configured: false });
          setIsAuthenticated(true);
        }
      }).catch(() => {
        setAuthStatus({ auth_required: false, configured: false });
        setIsAuthenticated(true);
      });
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    try { localStorage.removeItem('agent_zero_auth'); } catch {}
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try { localStorage.setItem('agent_zero_auth', 'true'); } catch {}
    fetchAllData();
  };

  const fetchAllData = useCallback(async () => {
    const [statusData, logsData, evalData] = await Promise.all([
      safeFetchJson<AgentState>('/api/status'),
      safeFetchJson<{ logs: LogEntry[] }>('/api/logs'),
      safeFetchJson<IntelligenceEvaluation>('/api/intelligence/evaluation')
    ]);

    if (statusData.ok && statusData.data) setState(statusData.data);
    if (logsData.ok && logsData.data?.logs) setLogs(logsData.data.logs);
    if (evalData.ok && evalData.data?.reasoning_stream) setReasoningStream(evalData.data.reasoning_stream);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 2500);
      return () => clearInterval(interval);
    }
  }, [fetchAllData, isAuthenticated]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await fetchAllData();
    setIsLoading(false);
  };

  const handleReviveAgent = async () => {
    const res = await safePostJson('/api/agent/revive', { amount: 2.5 });
    if (res.ok) await fetchAllData();
  };

  const handleClearLogs = () => {
    setLogs([]);
    setReasoningStream([]);
  };

  // NEU: Der Toggle-Befehl für den Agenten-Loop
  const handleToggleRun = async () => {
    const res = await safePostJson<{ state: AgentState }>('/api/agent/toggle');
    if (res.ok && res.data?.state) {
      setState(res.data.state);
      fetchAllData();
    }
  };

  const isTerminated = state?.is_terminated || state?.status === 'SHUTDOWN';

  if (authStatus?.auth_required && !isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen bg-[#05070e] text-slate-100 flex flex-col font-mono overflow-hidden select-text">
      <MinimalVitalsBar
        state={state}
        onRefresh={handleManualRefresh}
        isLoading={isLoading}
        onLogout={handleLogout}
        onRevive={handleReviveAgent}
        onToggleRun={handleToggleRun} 
      />

      {isTerminated && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-100 py-2.5 px-4 shadow-lg shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-rose-300 uppercase tracking-wider">
                [CRITICAL ALERT] AGENT ZERO TERMINIERT
              </span>
              <span className="text-rose-400/90 ml-2">
                Grund: {state?.shutdown_reason || '48h Pachtfrist abgelaufen oder Guthaben auf 0.00 USDC.'}
              </span>
            </div>
          </div>
          <button
            onClick={handleReviveAgent}
            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow cursor-pointer transition-all shrink-0"
          >
            ⚡ NOTFALL-RESTART
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <LiveTerminal
          logs={logs}
          reasoningStream={reasoningStream}
          walletAddress={state?.wallet_address}
          onClear={handleClearLogs}
        />
      </main>
    </div>
  );
}

export default App;
