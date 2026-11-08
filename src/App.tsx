import React, { useState, useEffect } from 'react';
import { useGrokDeskStream } from './hooks/useGrokDeskStream';
import { GrokBootLoaderModal } from './components/grok/GrokBootLoaderModal';
import { PortfolioPerformanceHeader } from './components/grok/PortfolioPerformanceHeader';
import { NightShiftFivePacksGrid } from './components/grok/NightShiftFivePacksGrid';
import { LiveDecisionStream } from './components/grok/LiveDecisionStream';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { safeFetchJson } from './lib/api';
import { RefreshCw, ShieldAlert } from 'lucide-react';

type GrokSection = 'DESK' | 'BOOT' | 'PACKS' | 'STREAM';

export function App() {
  const [activeSection, setActiveSection] = useState<GrokSection>('DESK');
  const [selectedTickerFilter, setSelectedTickerFilter] = useState<string | null>(null);

  const [authStatus, setAuthStatus] = useState<{ auth_required: boolean; configured: boolean } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agent_zero_auth') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    safeFetchJson<{ auth_required: boolean; configured: boolean }>('/api/auth/status')
      .then((res) => {
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

  const {
    state,
    isBusy,
    toastMessage,
    triggerBootSequence,
    switchExecutionMode,
    toggleAutoPilot,
    triggerManualTick,
    executeTradeAction,
    resetPaperLedger
  } = useGrokDeskStream();

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('agent_zero_auth', 'true');
    } catch {}
  };

  if (authStatus?.auth_required && !isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const handleBootClick = async () => {
    setActiveSection('BOOT');
    await triggerBootSequence();
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-[#F4F4F5] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md border-b border-[#1E1E24] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#desk"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('DESK');
          }}
          className="text-lg font-bold tracking-tight text-[#F4F4F5] font-display whitespace-nowrap shrink-0"
        >
          Grok desk
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm font-medium text-[#A1A1AA] overflow-x-auto">
          <a
            href="#desk"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('DESK');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'DESK'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'hover:text-[#F4F4F5]'
            }`}
          >
            Night Shift #2
          </a>
          <a
            href="#boot"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('BOOT');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'BOOT'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'hover:text-[#F4F4F5]'
            }`}
          >
            Boot / 5 Packs
          </a>
          <a
            href="#packs"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('PACKS');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'PACKS'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'hover:text-[#F4F4F5]'
            }`}
          >
            Five Packs Grid
          </a>
          <a
            href="#stream"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('STREAM');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'STREAM'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'hover:text-[#F4F4F5]'
            }`}
          >
            Decision Stream
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleBootClick}
            className="px-3.5 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#09090B] text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Boot 5 Packs
          </button>
        </div>
      </header>

      {/* Non-intrusive Action Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#121215] border border-[#27272A] rounded-xl px-4 py-3 shadow-2xl font-mono text-xs flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toastMessage.tone === 'danger'
                ? 'bg-[#EF4444]'
                : toastMessage.tone === 'profit'
                ? 'bg-[#10B981]'
                : 'bg-[#A1A1AA]'
            }`}
          />
          <span className="text-[#F4F4F5]">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Scoped Workspace Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        <ErrorBoundary fallbackTitle="Grok Desk Protection Shield">
          {!state ? (
            <div className="bg-[#121215] border border-[#222228] rounded-2xl p-12 text-center space-y-3 font-mono">
              <RefreshCw className="w-6 h-6 text-[#10B981] animate-spin mx-auto" />
              <div className="text-sm font-semibold text-[#F4F4F5]">
                MORPH / NIGHT SHIFT #2 · Opening scoped workspace...
              </div>
              <div className="text-xs text-[#71717A]">
                BOOT / 5 PACKS: GMGN Skills · Kaiser.Charon · GMGN Trading Bot · gmgnAgent · PumpGrok
              </div>
            </div>
          ) : (
            <>
              {/* Strict Live Wallet Notice Banner when in LIVE ON-CHAIN mode */}
              {state.mode === 'LIVE' && (
                <div className="bg-[#121215] border border-[#EF4444]/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 text-[#F4F4F5] flex-wrap">
                      <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                      <span>
                        <strong>LIVE ON-CHAIN EXECUTION (0% SIMULATION):</strong> Wallet (
                        {state.liveWalletInfo.address || 'Nicht verbunden'}):{' '}
                        <strong className="text-[#10B981]">
                          ${state.liveWalletInfo.usdcBalance.toFixed(4)} USDC
                        </strong>{' '}
                        · Gas: <strong>{state.liveWalletInfo.polGasBalance.toFixed(4)} POL</strong> · Signer:{' '}
                        <strong
                          className={
                            state.liveWalletInfo.hasPrivateKeySigner
                              ? 'text-[#10B981]'
                              : 'text-[#EF4444]'
                          }
                        >
                          {state.liveWalletInfo.hasPrivateKeySigner ? 'AKTIV' : 'FEHLT (READ-ONLY)'}
                        </strong>
                      </span>
                    </div>
                    {state.liveWalletInfo.lastExecutionDiagnostic && (
                      <div className="text-[11px] text-[#A1A1AA] pl-6">
                        Status: {state.liveWalletInfo.lastExecutionDiagnostic}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => switchExecutionMode('PAPER')}
                    className="px-3 py-1.5 rounded-lg bg-[#18181E] hover:bg-[#22222A] border border-[#27272A] text-[#F4F4F5] font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Switch to Paper Mode
                  </button>
                </div>
              )}

              {/* Compact Shift & 5-Packs Status Strip on main Desk */}
              {activeSection !== 'BOOT' && (
                <div className="bg-[#121215] border border-[#222228] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-[#F4F4F5]">{state.bootState.shiftLabel}</span>
                    <span className="text-[#3F3F46]">·</span>
                    <span className="text-[#10B981] font-semibold">
                      {state.bootState.bootHeaderLabel} ({state.bootState.overallProgressPct}%)
                    </span>
                    <span className="text-[#3F3F46] hidden md:inline">·</span>
                    <div className="hidden md:flex items-center gap-2 text-[#A1A1AA]">
                      {state.bootState.packs.map((p, idx) => (
                        <React.Fragment key={p.id}>
                          {idx > 0 && <span className="text-[#3F3F46]">/</span>}
                          <span>
                            {p.name}:{' '}
                            <strong
                              className={
                                p.status === 'READY' ? 'text-[#10B981]' : 'text-[#F59E0B]'
                              }
                            >
                              {p.status}
                            </strong>
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('BOOT')}
                    className="text-[#A1A1AA] hover:text-[#10B981] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Opening scoped workspace →
                  </button>
                </div>
              )}

              {/* View 1: Dedicated Boot- / Workspace-Loader ("Grok desk") */}
              {activeSection === 'BOOT' && (
                <GrokBootLoaderModal
                  bootState={state.bootState}
                  isBusy={isBusy}
                  onReRunBoot={triggerBootSequence}
                  onEnterWorkspace={() => setActiveSection('DESK')}
                />
              )}

              {/* View 2: Full Grok Desk (All Modules Integrated) */}
              {activeSection === 'DESK' && (
                <div className="space-y-5">
                  <PortfolioPerformanceHeader
                    header={state.portfolioHeader}
                    autoPilotEnabled={state.autoPilotEnabled}
                    selectedTickerFilter={selectedTickerFilter}
                    isBusy={isBusy}
                    onSelectTickerFilter={setSelectedTickerFilter}
                    onToggleAutoPilot={toggleAutoPilot}
                    onTriggerTick={triggerManualTick}
                    onSwitchMode={switchExecutionMode}
                    onResetPaper={resetPaperLedger}
                  />

                  <NightShiftFivePacksGrid
                    fivePacks={state.fivePacks}
                    isBusy={isBusy}
                    onQuickBuyCandidate={(ticker) =>
                      executeTradeAction(
                        ticker,
                        'BUY',
                        state.mode === 'PAPER'
                          ? 150
                          : Math.max(0.25, Number((state.portfolioHeader.availableCashUsd * 0.25).toFixed(2)))
                      )
                    }
                  />

                  <LiveDecisionStream
                    mode={state.mode}
                    availableCashUsd={state.portfolioHeader.availableCashUsd}
                    entries={state.decisionStream}
                    openSlugs={state.portfolioHeader.openSlugs}
                    selectedTickerFilter={selectedTickerFilter}
                    isBusy={isBusy}
                    onClearTickerFilter={() => setSelectedTickerFilter(null)}
                    onExecuteTradeAction={executeTradeAction}
                  />
                </div>
              )}

              {/* View 3: Focused Night Shift / Five Packs Control-Grid */}
              {activeSection === 'PACKS' && (
                <div className="space-y-5">
                  <NightShiftFivePacksGrid
                    fivePacks={state.fivePacks}
                    isBusy={isBusy}
                    onQuickBuyCandidate={(ticker) =>
                      executeTradeAction(
                        ticker,
                        'BUY',
                        state.mode === 'PAPER'
                          ? 150
                          : Math.max(0.25, Number((state.portfolioHeader.availableCashUsd * 0.25).toFixed(2)))
                      )
                    }
                  />
                </div>
              )}

              {/* View 4: Focused Live Decision Stream & Active Slugs */}
              {activeSection === 'STREAM' && (
                <div className="space-y-5">
                  <LiveDecisionStream
                    mode={state.mode}
                    availableCashUsd={state.portfolioHeader.availableCashUsd}
                    entries={state.decisionStream}
                    openSlugs={state.portfolioHeader.openSlugs}
                    selectedTickerFilter={selectedTickerFilter}
                    isBusy={isBusy}
                    onClearTickerFilter={() => setSelectedTickerFilter(null)}
                    onExecuteTradeAction={executeTradeAction}
                  />
                </div>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
