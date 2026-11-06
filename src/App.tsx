import React, { useState, useEffect, useCallback } from 'react';
import { TradingSystemState, TradingMode } from './types/trading';
import { SixAgentTerminalView } from './components/trading/SixAgentTerminalView';
import { MarketScannerView } from './components/trading/MarketScannerView';
import { PortfolioPositionsView } from './components/trading/PortfolioPositionsView';
import { SelfOptimizerView } from './components/trading/SelfOptimizerView';
import { ConceptMasterplanView } from './components/trading/ConceptMasterplanView';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { safeFetchJson, safePostJson } from './lib/api';
import { RefreshCw, ShieldAlert } from 'lucide-react';

type ActiveSection = 'TERMINAL' | 'SCANNER' | 'PORTFOLIO' | 'OPTIMIZER' | 'CONCEPT';

export function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('TERMINAL');
  const [tradingState, setTradingState] = useState<TradingSystemState | null>(null);
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);

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
      })
      .catch(() => {
        setAuthStatus({ auth_required: false, configured: false });
        setIsAuthenticated(true);
      });
  }, []);

  const fetchTradingState = useCallback(async () => {
    const res = await safeFetchJson<TradingSystemState>('/api/trading/state');
    if (res.ok && res.data) {
      setTradingState(res.data);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTradingState();
      const interval = setInterval(fetchTradingState, 2500);
      return () => clearInterval(interval);
    }
  }, [fetchTradingState, isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try { localStorage.setItem('agent_zero_auth', 'true'); } catch {}
    fetchTradingState();
  };

  const handleSwitchMode = async (mode: TradingMode) => {
    const res = await safePostJson<{ success: boolean; state: TradingSystemState }>('/api/trading/mode', { mode });
    if (res.ok && res.data?.state) {
      setTradingState(res.data.state);
    }
  };

  const handleToggleAutoPilot = async () => {
    if (!tradingState) return;
    const res = await safePostJson<{ success: boolean; state: TradingSystemState }>('/api/trading/autopilot', {
      enabled: !tradingState.autoPilotEnabled
    });
    if (res.ok && res.data?.state) {
      setTradingState(res.data.state);
    }
  };

  const handleTriggerScanAndTrade = async () => {
    setIsTriggeringScan(true);
    try {
      const res = await safePostJson<{ success: boolean; state: TradingSystemState }>('/api/trading/scan');
      if (res.ok && res.data?.state) {
        setTradingState(res.data.state);
      }
    } finally {
      setIsTriggeringScan(false);
    }
  };

  const handleExecuteOrder = async (symbol: string, side: 'LONG' | 'SHORT', amountUsd: number) => {
    const res = await safePostJson<{ success: boolean; message: string; state?: TradingSystemState }>('/api/trading/order', {
      symbol,
      side,
      amountUsd
    });
    if (res.ok && res.data) {
      if (res.data.state) setTradingState(res.data.state);
      return { success: res.data.success, message: res.data.message };
    }
    return { success: false, message: res.error || 'Order fehlgeschlagen.' };
  };

  const handleClosePosition = async (positionId: string) => {
    const res = await safePostJson<{ success: boolean; state?: TradingSystemState }>('/api/trading/close', { positionId });
    if (res.ok && res.data?.state) {
      setTradingState(res.data.state);
    }
  };

  const handleRunOptimization = async () => {
    const res = await safePostJson<{ success: boolean; state?: TradingSystemState }>('/api/trading/optimize');
    if (res.ok && res.data?.state) {
      setTradingState(res.data.state);
    }
  };

  const handleResetDemo = async (capitalUsd: number) => {
    const res = await safePostJson<{ success: boolean; state?: TradingSystemState }>('/api/trading/reset-demo', { capital: capitalUsd });
    if (res.ok && res.data?.state) {
      setTradingState(res.data.state);
    }
  };

  if (authStatus?.auth_required && !isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const activeMode: TradingMode = tradingState?.activeMode || 'DEMO';
  const currentPortfolio = activeMode === 'DEMO'
    ? tradingState?.demoPortfolio
    : tradingState?.livePortfolio;

  return (
    <div className="min-h-screen w-full flex flex-col text-[#0b213a]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-white/95 shadow-xs px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#terminal"
          onClick={(e) => { e.preventDefault(); setActiveSection('TERMINAL'); }}
          className="text-lg font-bold tracking-tight text-[#08203e] font-display whitespace-nowrap shrink-0"
        >
          Agent Zero
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="flex items-center gap-6 text-xs sm:text-sm font-semibold text-[#35567c] overflow-x-auto">
          <a
            href="#terminal"
            onClick={(e) => { e.preventDefault(); setActiveSection('TERMINAL'); }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'TERMINAL'
                ? 'text-[#08203e] border-b-2 border-sky-600'
                : 'hover:text-[#08203e]'
            }`}
          >
            6-Agenten Terminal
          </a>
          <a
            href="#scanner"
            onClick={(e) => { e.preventDefault(); setActiveSection('SCANNER'); }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'SCANNER'
                ? 'text-[#08203e] border-b-2 border-sky-600'
                : 'hover:text-[#08203e]'
            }`}
          >
            Markt & Order-Ziele
          </a>
          <a
            href="#portfolio"
            onClick={(e) => { e.preventDefault(); setActiveSection('PORTFOLIO'); }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'PORTFOLIO'
                ? 'text-[#08203e] border-b-2 border-sky-600'
                : 'hover:text-[#08203e]'
            }`}
          >
            Portfolio & Trades
          </a>
          <a
            href="#optimizer"
            onClick={(e) => { e.preventDefault(); setActiveSection('OPTIMIZER'); }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'OPTIMIZER'
                ? 'text-[#08203e] border-b-2 border-sky-600'
                : 'hover:text-[#08203e]'
            }`}
          >
            KI-Selbstoptimierung
          </a>
          <a
            href="#concept"
            onClick={(e) => { e.preventDefault(); setActiveSection('CONCEPT'); }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'CONCEPT'
                ? 'text-[#08203e] border-b-2 border-sky-600'
                : 'hover:text-[#08203e]'
            }`}
          >
            Konzept & Wallet
          </a>
        </nav>

        {/* Zone 3: 1 primary action (Mode Switch Paper vs Live) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleSwitchMode(activeMode === 'DEMO' ? 'LIVE' : 'DEMO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer whitespace-nowrap shrink-0 transition-all ${
              activeMode === 'DEMO'
                ? 'waterdrop-btn-pearl text-sky-900'
                : 'bg-emerald-600 text-white shadow-sm'
            }`}
          >
            {activeMode === 'DEMO' ? 'paper-✓ → live' : 'live-✓ → paper'}
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Strict Live Mode Notice Banner when in ECHT-BETRIEB */}
        {activeMode === 'LIVE' && (
          <div className="waterdrop-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#0b213a]">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Echt-Betrieb Sicherheitsgarantie:</strong> Keine fiktiven oder simulierten Salden aktiv. Verifiziertes Polygon Wallet ({tradingState?.liveConnectors.polygonDexOnChain.walletAddress || 'Nicht verbunden'}): <strong>{tradingState?.liveConnectors.polygonDexOnChain.usdcBalance.toFixed(4)} USDC</strong> und <strong>{tradingState?.liveConnectors.polygonDexOnChain.polGasBalance.toFixed(4)} POL Gas</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSwitchMode('DEMO')}
              className="waterdrop-btn-pearl px-3 py-1 rounded-lg font-mono font-bold text-[11px] shrink-0 cursor-pointer"
            >
              Zurück in Demo-Spielgeld
            </button>
          </div>
        )}

        {/* Active View Content */}
        <ErrorBoundary fallbackTitle="Trading-Modul Schutzschild">
          {!tradingState ? (
            <div className="waterdrop-card p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-[#0b213a]">
                Starte 6-Agenten Hard-Handoff Pipeline (SCOUT → FILTER → ANALYST → EXECUTOR → RISK → LOGGER)...
              </div>
            </div>
          ) : (
            <>
              {activeSection === 'TERMINAL' && (
                <SixAgentTerminalView
                  state={tradingState}
                  onToggleAutoPilot={handleToggleAutoPilot}
                  onTriggerScan={handleTriggerScanAndTrade}
                  onRunOptimize={handleRunOptimization}
                  onClosePosition={handleClosePosition}
                  onExecuteOrder={handleExecuteOrder}
                />
              )}

              {activeSection === 'SCANNER' && currentPortfolio && (
                <MarketScannerView
                  quotes={tradingState.marketQuotes}
                  activeMode={activeMode}
                  availableCashUsd={currentPortfolio.cashBalanceUsd}
                  strategy={tradingState.strategy}
                  isScanning={tradingState.isScanning || isTriggeringScan}
                  onExecuteOrder={handleExecuteOrder}
                  onTriggerScan={handleTriggerScanAndTrade}
                />
              )}

              {activeSection === 'PORTFOLIO' && currentPortfolio && (
                <PortfolioPositionsView
                  portfolio={currentPortfolio}
                  activeMode={activeMode}
                  liveConnectors={tradingState.liveConnectors}
                  onClosePosition={handleClosePosition}
                  onResetDemo={handleResetDemo}
                  onSwitchTabToScanner={() => setActiveSection('TERMINAL')}
                />
              )}

              {activeSection === 'OPTIMIZER' && (
                <SelfOptimizerView
                  strategy={tradingState.strategy}
                  optimizationHistory={tradingState.optimizationHistory}
                  activityLogs={tradingState.recentActivityLogs}
                  onRunOptimize={handleRunOptimization}
                />
              )}

              {activeSection === 'CONCEPT' && (
                <ConceptMasterplanView
                  liveConnectors={tradingState.liveConnectors}
                  onRefreshState={fetchTradingState}
                />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
