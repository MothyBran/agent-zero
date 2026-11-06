import React from 'react';
import { MarketSentimentTelemetry } from '../../types/trading';
import { Activity, ArrowUpRight, ArrowDownRight, CheckCircle2, Gauge, Layers, ShieldCheck, Zap } from 'lucide-react';

interface MarketSentimentWidgetProps {
  sentiment: MarketSentimentTelemetry;
  autoPilotEnabled: boolean;
  analystThreshold: number;
}

function formatUsdCompact(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}k`;
  return `$${val.toFixed(0)}`;
}

function FavorabilityArcGauge({
  score,
  status
}: {
  score: number;
  status: MarketSentimentTelemetry['timingStatus'];
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 50;
  const circumference = Math.PI * radius; // Semi-circle arc length
  const dashOffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    status === 'OPTIMAL_LONG'
      ? '#059669'
      : status === 'OPTIMAL_SHORT'
      ? '#e11d48'
      : status === 'FAVORABLE_SELECTIVE'
      ? '#0284c7'
      : '#d97706';

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div className="relative w-36 h-22 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 124 68" className="w-36 h-22 overflow-visible">
          <defs>
            <linearGradient id="sentimentArcBg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(186, 230, 253, 0.55)" />
              <stop offset="100%" stopColor="rgba(125, 211, 252, 0.45)" />
            </linearGradient>
          </defs>
          {/* Background Semi-Circle */}
          <path
            d="M 12 60 A 50 50 0 0 1 112 60"
            fill="none"
            stroke="url(#sentimentArcBg)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Foreground Value Arc */}
          <path
            d="M 12 60 A 50 50 0 0 1 112 60"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute bottom-0.5 flex flex-col items-center justify-center font-mono tabular-nums">
          <span className="text-2xl font-bold text-[#08203e] leading-none">{clamped}</span>
          <span className="text-[10px] font-sans font-semibold text-[#496a91] mt-0.5">
            Timing-Index
          </span>
        </div>
      </div>
    </div>
  );
}

export const MarketSentimentWidget: React.FC<MarketSentimentWidgetProps> = ({
  sentiment,
  autoPilotEnabled,
  analystThreshold
}) => {
  const fg = sentiment.fearAndGreedIndex;
  const fgDelta = sentiment.fearAndGreedDelta;
  const bidPct = sentiment.aggregateBidRatioPct;
  const askPct = Number((100 - bidPct).toFixed(1));
  const imbalance = sentiment.aggregateImbalancePct;

  const statusMeta = (() => {
    switch (sentiment.timingStatus) {
      case 'OPTIMAL_LONG':
        return {
          badgeText: 'SEHR GÜNSTIG (LONG-BIAS)',
          badgeClass: 'bg-emerald-600 text-white shadow-xs',
          accentText: 'text-emerald-700'
        };
      case 'OPTIMAL_SHORT':
        return {
          badgeText: 'AKTIV (SHORT / REVERSAL)',
          badgeClass: 'bg-rose-600 text-white shadow-xs',
          accentText: 'text-rose-700'
        };
      case 'CAUTIOUS_DEFENSIVE':
        return {
          badgeText: 'DEFENSIV / SEITWÄRTS-FILTER',
          badgeClass: 'bg-amber-600 text-white shadow-xs',
          accentText: 'text-amber-700'
        };
      default:
        return {
          badgeText: 'SELEKTIV GÜNSTIG (SCORE ≥ ' + analystThreshold + ')',
          badgeClass: 'waterdrop-btn-primary text-white shadow-xs',
          accentText: 'text-sky-700'
        };
    }
  })();

  const fearGreedColor = (val: number) => {
    if (val <= 25) return 'text-rose-700';
    if (val <= 44) return 'text-amber-700';
    if (val >= 75) return 'text-emerald-800';
    if (val >= 56) return 'text-emerald-700';
    return 'text-sky-800';
  };

  const fearGreedGermanLabel = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('extreme fear')) return 'Extreme Angst (Antizyklische Chance)';
    if (l.includes('fear')) return 'Angst / Vorsicht';
    if (l.includes('extreme greed')) return 'Extreme Gier (Ausbruchs- & Rücksetzer-Zone)';
    if (l.includes('greed')) return 'Gier / Bullisches Momentum';
    if (l.includes('neutral')) return 'Neutral / Ausgeglichen';
    return label;
  };

  return (
    <section
      aria-label="Echtzeit Markt-Stimmungs- & Orderbuch-Widget"
      className="waterdrop-card p-5 sm:p-6 space-y-5"
    >
      {/* Top Row: Widget Title, Timing Verdict Badge & 100% Automated Execution Guarantee */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sky-200/70 pb-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl pearl-surface flex items-center justify-center text-sky-700 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-[#08203e] tracking-tight font-display">
                Echtzeit Markt-Stimmung & Orderbook-Imbalance
              </h2>
              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold ${statusMeta.badgeClass}`}>
                {statusMeta.badgeText}
              </span>
            </div>
            <p className="text-xs text-[#395b82] mt-0.5">
              Live-Konfluenz aus Crypto Fear &amp; Greed Index, Binance L2-Orderbuch-Tiefe (Top-20 Bids/Asks) &amp; Multi-Asset Marktbreite
            </p>
          </div>
        </div>

        {/* Autonomous Execution Assurance Indicator */}
        <div className="pearl-surface px-3.5 py-2 rounded-2xl flex items-center gap-2.5 text-xs shrink-0">
          {autoPilotEnabled ? (
            <Zap className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <div className="leading-tight">
            <div className="font-bold text-[#08203e] flex items-center gap-1.5">
              <span>{autoPilotEnabled ? 'Vollautomatische Trade-Ausführung AKTIV' : 'Auto-Pilot pausiert'}</span>
              <span className="font-mono text-[11px] text-emerald-700">
                ({autoPilotEnabled ? '6-Agenten Auto-Handoff' : 'Manuell'})
              </span>
            </div>
            <div className="text-[11px] text-[#496a91]">
              Widget dient der Echtzeit-Visualisierung · EXECUTOR handelt selbstständig bei Score ≥ {analystThreshold}
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Pillar Grid: 1) Trade-Timing Verdict · 2) Fear & Greed Barometer · 3) Live L2 Orderbook Depth Imbalance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Pillar 1 (4 Cols): Trade-Zeitpunkt Bewertung & Speedometer */}
        <div className="lg:col-span-4 pearl-surface rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-[#496a91]">
            <span className="font-bold uppercase tracking-wider text-[#2c4c70]">1. Trade-Zeitpunkt Urteil</span>
            <span className="font-mono tabular-nums">Score {sentiment.tradeFavorabilityScore}/100</span>
          </div>

          <div className="flex items-center gap-4 py-1">
            <FavorabilityArcGauge
              score={sentiment.tradeFavorabilityScore}
              status={sentiment.timingStatus}
            />
            <div className="space-y-1 flex-1 min-w-0">
              <div className={`text-xs sm:text-sm font-bold leading-snug ${statusMeta.accentText}`}>
                {sentiment.timingHeadline}
              </div>
              <p className="text-[11px] text-[#395b82] leading-relaxed">
                {sentiment.timingExplanation}
              </p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-sky-200/60 flex items-center justify-between gap-2 text-[11px] text-[#2c4c70]">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{sentiment.autoExecutionImpact}</span>
            </span>
          </div>
        </div>

        {/* Pillar 2 (4 Cols): Crypto Fear & Greed Index + Multi-Asset Marktbreite */}
        <div className="lg:col-span-4 pearl-surface rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2c4c70]">
              2. Fear &amp; Greed &amp; Marktbreite
            </span>
            <span className="font-mono text-[11px] text-[#496a91] truncate max-w-[165px]">
              {sentiment.fearAndGreedSource}
            </span>
          </div>

          {/* Fear & Greed Readout + Bar */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className={`text-sm font-bold ${fearGreedColor(fg)}`}>
                  {fearGreedGermanLabel(sentiment.fearAndGreedLabel)}
                </div>
                <div className="text-[11px] text-[#496a91]">
                  Gestern: {sentiment.fearAndGreedPrevious}/100
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <span className="text-2xl font-bold text-[#08203e]">{fg}</span>
                <span className="text-xs text-[#496a91]">/100</span>
                <div
                  className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${
                    fgDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {fgDelta >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>
                    {fgDelta >= 0 ? `+${fgDelta}` : fgDelta} (24h)
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-Zone Spectrum Bar */}
            <div className="space-y-1">
              <div
                className="relative h-2.5 w-full rounded-full overflow-visible"
                style={{
                  background:
                    'linear-gradient(90deg, #e11d48 0%, #f59e0b 32%, #0284c7 50%, #10b981 76%, #059669 100%)'
                }}
              >
                <div
                  className="absolute -top-1 w-4 h-4 rounded-full bg-white border-2 border-[#08203e] shadow-md -translate-x-1/2 transition-all duration-500"
                  style={{ left: `${Math.max(4, Math.min(96, fg))}%` }}
                  title={`Fear & Greed: ${fg}/100`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#496a91]">
                <span>0 Extreme Angst</span>
                <span>50 Neutral</span>
                <span>100 Extreme Gier</span>
              </div>
            </div>
          </div>

          {/* Multi-Asset Breadth & RSI Footer */}
          <div className="pt-2.5 border-t border-sky-200/60 grid grid-cols-3 gap-2 text-center font-mono tabular-nums text-xs">
            <div>
              <div className="text-[10px] font-sans text-[#496a91]">Marktbreite</div>
              <div className="font-bold text-[#08203e]">
                <span className="text-emerald-700">{sentiment.advancingCount}↑</span>
                {' / '}
                <span className="text-rose-700">{sentiment.decliningCount}↓</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-sans text-[#496a91]">Ø RSI(14)</div>
              <div className="font-bold text-[#08203e]">{sentiment.avgRsi14.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[10px] font-sans text-[#496a91]">Ø Volatilität</div>
              <div className="font-bold text-[#08203e]">{sentiment.avgVolatilityPct.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* Pillar 3 (4 Cols): Real-time L2 Orderbook Imbalance (Binance Top-20 Depth) */}
        <div className="lg:col-span-4 pearl-surface rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2c4c70] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-700" />
              <span>3. L2 Orderbook-Imbalance</span>
            </span>
            <span className="font-mono tabular-nums text-[11px] text-[#496a91]">
              Tiefe: {formatUsdCompact(sentiment.totalAnalyzedBookUsd)}
            </span>
          </div>

          {/* Aggregate Bid vs Ask Pressure Tug-of-War Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="font-bold text-emerald-700">
                Bids (Käufer): {bidPct.toFixed(1)}%
              </span>
              <span
                className={`font-bold ${
                  imbalance > 3
                    ? 'text-emerald-700'
                    : imbalance < -3
                    ? 'text-rose-700'
                    : 'text-[#2c4c70]'
                }`}
              >
                {imbalance >= 0 ? `+${imbalance.toFixed(1)}%` : `${imbalance.toFixed(1)}%`} Net
              </span>
              <span className="font-bold text-rose-700">
                Asks (Verk.): {askPct.toFixed(1)}%
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-rose-500/85 overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${Math.max(8, Math.min(92, bidPct))}%` }}
              />
            </div>
          </div>

          {/* Per-Asset L2 Orderbook Breakdown ($BTC, $ETH, $SOL, $POL) */}
          <div className="space-y-1.5 pt-1 border-t border-sky-200/60">
            {sentiment.orderbookSnapshots.length === 0 ? (
              <div className="text-xs text-[#496a91] py-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 animate-pulse text-sky-600" />
                <span>Lade L2 Orderbuch-Tiefe von Binance Spot...</span>
              </div>
            ) : (
              sentiment.orderbookSnapshots.map(book => {
                const isBull = book.imbalancePct >= 0;
                return (
                  <div
                    key={book.symbol}
                    className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                  >
                    <span className="font-bold text-[#08203e] w-12 shrink-0">
                      {book.displaySymbol}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-rose-300/80 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-600"
                        style={{ width: `${Math.max(5, Math.min(95, book.bidRatioPct))}%` }}
                      />
                    </div>
                    <span className="text-[#496a91] w-24 text-right shrink-0">
                      {formatUsdCompact(book.bidVolumeUsd)} / {formatUsdCompact(book.askVolumeUsd)}
                    </span>
                    <span
                      className={`font-bold w-14 text-right shrink-0 ${
                        isBull ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {book.imbalancePct >= 0 ? `+${book.imbalancePct}%` : `${book.imbalancePct}%`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
