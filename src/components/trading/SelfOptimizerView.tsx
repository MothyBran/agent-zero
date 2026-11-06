import React, { useState } from 'react';
import { OptimizationLog, StrategyParameters, TradingSystemState } from '../../types/trading';
import { Cpu, Sliders, RefreshCw, Activity } from 'lucide-react';

interface SelfOptimizerViewProps {
  strategy: StrategyParameters;
  optimizationHistory: OptimizationLog[];
  activityLogs: TradingSystemState['recentActivityLogs'];
  onRunOptimize: () => Promise<void>;
}

export const SelfOptimizerView: React.FC<SelfOptimizerViewProps> = ({
  strategy,
  optimizationHistory,
  activityLogs,
  onRunOptimize
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      await onRunOptimize();
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Strategy Parameter Matrix */}
      <div className="waterdrop-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-200/70 pb-4">
          <div className="space-y-1">
            <div className="text-xs text-[#496a91]">
              Autonome Quantitative Strategie-Engine · Version v{strategy.version} · Zuletzt kalibriert: {new Date(strategy.lastOptimizedAt).toLocaleTimeString('de-DE')}
            </div>
            <h2 className="text-xl font-bold text-[#0b213a]">
              Selbstlernende Parameter-Kalibrierung & Risiko-Steuerung
            </h2>
          </div>

          <button
            type="button"
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="waterdrop-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'KI analysiert Performance...' : 'Strategie jetzt mit KI optimieren'}</span>
          </button>
        </div>

        {/* Active AI Strategy Synthesis */}
        <div className="pearl-surface rounded-2xl p-4 space-y-1.5">
          <div className="text-xs font-bold text-[#0b213a] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-sky-600" />
            <span>Aktuelle KI-Strategie-Synthese</span>
          </div>
          <p className="text-sm text-[#1e3a5f] leading-relaxed">
            {strategy.optimizationSummary}
          </p>
        </div>

        {/* 6 Quantitative Parameter Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2 font-mono tabular-nums">
          <div className="pearl-surface rounded-2xl p-4">
            <span className="text-[11px] font-sans text-[#496a91]">Min. Confluence Score</span>
            <div className="text-xl font-bold text-[#0b213a] mt-1">±{strategy.minConfluenceScore}</div>
            <span className="text-[11px] font-sans text-[#527399]">Einstiegs-Filter</span>
          </div>

          <div className="pearl-surface rounded-2xl p-4">
            <span className="text-[11px] font-sans text-[#496a91]">RSI Kaufschwelle</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">≤ {strategy.rsiOversold}</div>
            <span className="text-[11px] font-sans text-[#527399]">Mean-Reversion Long</span>
          </div>

          <div className="pearl-surface rounded-2xl p-4">
            <span className="text-[11px] font-sans text-[#496a91]">RSI Verkaufsschwelle</span>
            <div className="text-xl font-bold text-rose-700 mt-1">≥ {strategy.rsiOverbought}</div>
            <span className="text-[11px] font-sans text-[#527399]">Mean-Reversion Short</span>
          </div>

          <div className="pearl-surface rounded-2xl p-4">
            <span className="text-[11px] font-sans text-[#496a91]">Stop-Loss Distanz</span>
            <div className="text-xl font-bold text-[#0b213a] mt-1">{strategy.atrStopLossMultiplier}x ATR</div>
            <span className="text-[11px] font-sans text-[#527399]">Volatilitäts-Schutz</span>
          </div>

          <div className="pearl-surface rounded-2xl p-4">
            <span className="text-[11px] font-sans text-[#496a91]">Take-Profit Ziel</span>
            <div className="text-xl font-bold text-[#0b213a] mt-1">{strategy.atrTakeProfitMultiplier}x ATR</div>
            <span className="text-[11px] font-sans text-[#527399]">Chance/Risiko {(strategy.atrTakeProfitMultiplier / strategy.atrStopLossMultiplier).toFixed(2)}:1</span>
          </div>

          <div className="pearl-surface rounded-2xl p-4">
            <span className="text-[11px] font-sans text-[#496a91]">Max. Positionsgröße</span>
            <div className="text-xl font-bold text-[#0b213a] mt-1">{strategy.maxPositionSizePct}%</div>
            <span className="text-[11px] font-sans text-[#527399]">Max. {strategy.maxConcurrentPositions} Positionen</span>
          </div>
        </div>
      </div>

      {/* Bottom Split: Optimization History & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Optimization Evolution Timeline */}
        <div className="lg:col-span-7 waterdrop-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-200/70">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              <h3 className="text-base font-bold text-[#0b213a]">
                Evolutions-Protokoll der Selbstoptimierung ({optimizationHistory.length})
              </h3>
            </div>
          </div>

          {optimizationHistory.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-[#395b82]">
                Noch kein Optimierungszyklus protokolliert. Nach jeweils 4 abgeschlossenen Trades oder per Klick auf „Strategie jetzt mit KI optimieren“ passt Agent Zero seine Parameter autonom an.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {optimizationHistory.map(opt => (
                <div key={opt.id} className="pearl-surface rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#496a91] font-mono tabular-nums">
                    <span>Version v{opt.previousVersion} → v{opt.newVersion} · {opt.mode}</span>
                    <span>{new Date(opt.timestamp).toLocaleTimeString('de-DE')}</span>
                  </div>
                  <div className="text-xs font-bold text-[#0b213a]">
                    {opt.changes.join(' · ')}
                  </div>
                  <p className="text-xs text-[#2c4c70] leading-relaxed">
                    {opt.aiReasoning}
                  </p>
                  <div className="text-[11px] text-[#527399] font-mono tabular-nums pt-1 border-t border-sky-200/60">
                    Win-Rate bei Kalibrierung: {opt.winRateAtOptimization.toFixed(1)}% · Kumulierter PnL: ${opt.netPnlAtOptimization.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Real-Time Engine Activity Stream */}
        <div className="lg:col-span-5 waterdrop-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-200/70">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <h3 className="text-base font-bold text-[#0b213a]">
                Echtzeit-Entscheidungsprotokoll
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {activityLogs.map(log => (
              <div key={log.id} className="pearl-surface rounded-xl p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#496a91] font-mono tabular-nums">
                  <span>{log.type} · {log.mode}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString('de-DE')}</span>
                </div>
                <div className="text-[#0b213a] font-medium leading-snug">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
