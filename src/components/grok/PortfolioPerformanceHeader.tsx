import React, { useState, useMemo } from 'react';
import { PortfolioPerformanceHeaderState, ExecutionMode } from '../../types/grokDesk';
import { ShieldAlert, TrendingUp, Play, Pause, RotateCcw, Zap } from 'lucide-react';

interface PortfolioPerformanceHeaderProps {
  header: PortfolioPerformanceHeaderState;
  autoPilotEnabled: boolean;
  selectedTickerFilter: string | null;
  isBusy: boolean;
  onSelectTickerFilter: (ticker: string | null) => void;
  onToggleAutoPilot: () => void;
  onTriggerTick: () => void;
  onSwitchMode: (mode: ExecutionMode) => void;
  onResetPaper: () => void;
}

export const PortfolioPerformanceHeader: React.FC<PortfolioPerformanceHeaderProps> = ({
  header,
  autoPilotEnabled,
  selectedTickerFilter,
  isBusy,
  onSelectTickerFilter,
  onToggleAutoPilot,
  onTriggerTick,
  onSwitchMode,
  onResetPaper
}) => {
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  const curve = header.equityCurve.length > 1
    ? header.equityCurve
    : [
        { timestamp: new Date().toISOString(), timeLabel: '00:00', equityUsd: header.initialCapitalUsd, pnlUsd: 0, pnlPct: 0 },
        { timestamp: new Date().toISOString(), timeLabel: 'NOW', equityUsd: header.totalEquityUsd, pnlUsd: header.absoluteGainUsd, pnlPct: 100 }
      ];

  const chartGeometry = useMemo(() => {
    const width = 760;
    const height = 210;
    const padLeft = 12;
    const padRight = 12;
    const padTop = 18;
    const padBottom = 24;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const values = curve.map(c => c.equityUsd);
    const minVal = Math.min(...values) * 0.92;
    const maxVal = Math.max(...values, minVal + 10) * 1.04;
    const range = Math.max(1, maxVal - minVal);

    const coords = curve.map((pt, idx) => {
      const x = padLeft + (idx / Math.max(1, curve.length - 1)) * innerW;
      const y = padTop + innerH - ((pt.equityUsd - minVal) / range) * innerH;
      return { x, y, pt };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const firstX = coords[0]?.x ?? padLeft;
    const lastX = coords[coords.length - 1]?.x ?? width - padRight;
    const baselineY = padTop + innerH;
    const areaPath = `${linePath} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`;

    return { width, height, baselineY, coords, linePath, areaPath };
  }, [curve]);

  const activePoint = hoveredPointIdx !== null && chartGeometry.coords[hoveredPointIdx]
    ? chartGeometry.coords[hoveredPointIdx].pt
    : curve[curve.length - 1];

  const formattedEquity = header.totalEquityUsd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formattedGain = Math.abs(header.absoluteGainUsd).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const gainPositive = header.absoluteGainUsd >= 0;

  return (
    <section className="bg-[#121215] border border-[#222228] rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Row 1: Portfolio Value, Multiplier, -6% LIMIT Risk-Badge & Mode/Engine Controls */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono text-[#71717A] tracking-wider">
              TOTAL PORTFOLIO ({header.mode})
            </span>
            <span className="text-[#3F3F46]">·</span>
            <span className="text-xs font-mono text-[#EF4444] font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              {header.hardStopLossLimitPct}% LIMIT
            </span>
            <span className="text-[#3F3F46]">·</span>
            <span className="text-xs font-mono text-[#A1A1AA] tabular-nums">
              CASH ${header.availableCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Big Portfolio Headline */}
          <div className="flex items-baseline gap-3.5 flex-wrap font-mono tabular-nums">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F4F5]">
              ${formattedEquity}
            </h2>

            <div className="flex items-baseline gap-2">
              <span
                className={`text-sm sm:text-base font-bold ${
                  gainPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}
              >
                {gainPositive ? `+$${formattedGain}` : `-$${formattedGain}`}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#10B981]">
                / {header.portfolioMultiplier.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Compact Trade Statistics Line ("16 SLUG • 60 ENTRIES • 44 CLOSED") */}
          <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA] tracking-wide tabular-nums pt-0.5">
            <span className="text-[#F4F4F5] font-semibold">{header.slugCount} SLUG</span>
            <span className="text-[#52525B]">•</span>
            <span className="text-[#F4F4F5] font-semibold">{header.entriesCount} ENTRIES</span>
            <span className="text-[#52525B]">•</span>
            <span className="text-[#F4F4F5] font-semibold">{header.closedCount} CLOSED</span>
            <span className="text-[#52525B]">•</span>
            <span className="text-[#10B981]">{header.winRatePct.toFixed(1)}% WIN</span>
          </div>
        </div>

        {/* Right Workspace Controls (Paper/Live Segmented Switch + AutoPilot + Manual Scan Tick) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Segmented Mode Control */}
          <div className="flex items-center bg-[#09090B] p-1 rounded-xl border border-[#222228] font-mono text-xs">
            <button
              type="button"
              onClick={() => onSwitchMode('PAPER')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                header.mode === 'PAPER'
                  ? 'bg-[#10B981] text-[#09090B]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              PAPER
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode('LIVE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                header.mode === 'LIVE'
                  ? 'bg-[#EF4444] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              LIVE ON-CHAIN
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleAutoPilot}
            className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px] ${
              autoPilotEnabled
                ? 'bg-[#09090B] border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/10'
                : 'bg-[#09090B] border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10'
            }`}
          >
            {autoPilotEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoPilotEnabled ? 'AUTO: ON' : 'AUTO: PAUSED'}</span>
          </button>

          <button
            type="button"
            onClick={onTriggerTick}
            disabled={isBusy}
            className="px-3.5 py-2 rounded-xl bg-[#09090B] hover:bg-[#1A1A20] border border-[#27272A] text-[#F4F4F5] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Step Scan</span>
          </button>

          {header.mode === 'PAPER' && (
            <button
              type="button"
              onClick={onResetPaper}
              title="Paper-Ledger auf Night Shift #2 Baseline zurücksetzen"
              className="px-2.5 py-2 rounded-xl bg-[#09090B] hover:bg-[#1A1A20] border border-[#27272A] text-[#71717A] hover:text-[#F4F4F5] text-xs font-mono flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[40px] min-w-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Interactive Neon-Green (#10B981) Area-Chart */}
      <div className="bg-[#09090B] border border-[#1E1E24] rounded-xl p-3.5 sm:p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[#A1A1AA]">
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            <span>PERFORMANCE CURVE (NIGHT SHIFT #2)</span>
          </div>
          {activePoint && (
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-[#71717A]">{activePoint.timeLabel}</span>
              <span className="text-[#F4F4F5] font-bold">
                ${activePoint.equityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[#10B981]">
                ({activePoint.pnlUsd >= 0 ? '+' : ''}${activePoint.pnlUsd.toFixed(2)})
              </span>
            </div>
          )}
        </div>

        <div className="relative w-full h-[175px] sm:h-[200px] select-none">
          <svg
            viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredPointIdx(null)}
          >
            <defs>
              <linearGradient id="grokNeonGreenArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.42" />
                <stop offset="65%" stopColor="#10B981" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal reference lines */}
            {[0.25, 0.5, 0.75].map((ratio, idx) => (
              <line
                key={idx}
                x1={12}
                x2={chartGeometry.width - 12}
                y1={chartGeometry.height * ratio}
                y2={chartGeometry.height * ratio}
                stroke="#18181E"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* Glowing Neon-Green Area Fill */}
            <path d={chartGeometry.areaPath} fill="url(#grokNeonGreenArea)" />

            {/* Neon-Green Performance Curve Line */}
            <path
              d={chartGeometry.linePath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Hover Vertical Crosshair & Data Nodes */}
            {chartGeometry.coords.map((coord, idx) => {
              const isHovered = hoveredPointIdx === idx;
              const isLast = idx === chartGeometry.coords.length - 1;
              return (
                <g key={idx}>
                  {(isHovered || (hoveredPointIdx === null && isLast)) && (
                    <>
                      <line
                        x1={coord.x}
                        x2={coord.x}
                        y1={16}
                        y2={chartGeometry.baselineY}
                        stroke="#10B981"
                        strokeOpacity="0.4"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={5}
                        fill="#10B981"
                        stroke="#09090B"
                        strokeWidth="2"
                      />
                    </>
                  )}
                  <rect
                    x={coord.x - chartGeometry.width / (chartGeometry.coords.length * 2)}
                    y={0}
                    width={chartGeometry.width / chartGeometry.coords.length}
                    height={chartGeometry.height}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Row 3: Horizontal Profit-Distribution Bar by Token ($PIXEL +4.1x, $BONGO +3.2x, $MABEL +2.5x) */}
      {header.tokenAttributionBars.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#71717A]">
              PROFIT ATTRIBUTION BY TOKEN {selectedTickerFilter ? `(FILTER: ${selectedTickerFilter})` : '(CLICK TO FILTER)'}
            </span>
            {selectedTickerFilter && (
              <button
                type="button"
                onClick={() => onSelectTickerFilter(null)}
                className="text-[#10B981] hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Segmented Horizontal Proportional Bar */}
          <div className="w-full h-3.5 bg-[#09090B] rounded-lg overflow-hidden flex border border-[#222228] p-0.5 gap-1">
            {header.tokenAttributionBars.map((bar) => {
              const isSelected = selectedTickerFilter === bar.symbol;
              return (
                <button
                  key={bar.symbol}
                  type="button"
                  onClick={() => onSelectTickerFilter(isSelected ? null : bar.symbol)}
                  style={{
                    width: `${bar.shareOfProfitPct}%`,
                    backgroundColor: bar.colorHex
                  }}
                  title={`${bar.symbol}: +${bar.multiplier}x ($${bar.realizedPlusUnrealizedUsd.toFixed(2)})`}
                  className={`h-full first:rounded-l-md last:rounded-r-md transition-opacity cursor-pointer ${
                    selectedTickerFilter && !isSelected ? 'opacity-35' : 'opacity-100'
                  }`}
                />
              );
            })}
          </div>

          {/* Token Legend & Multiplier Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
            {header.tokenAttributionBars.map((bar) => {
              const isSelected = selectedTickerFilter === bar.symbol;
              return (
                <button
                  key={bar.symbol}
                  type="button"
                  onClick={() => onSelectTickerFilter(isSelected ? null : bar.symbol)}
                  className={`px-3 py-2 rounded-xl border text-left font-mono transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#18181E] border-[#10B981] text-[#F4F4F5]'
                      : 'bg-[#09090B] border-[#1E1E24] hover:border-[#2E2E38] text-[#A1A1AA]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-xs shrink-0"
                      style={{ backgroundColor: bar.colorHex }}
                    />
                    <span className="text-xs font-bold text-[#F4F4F5] truncate">
                      {bar.symbol}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#10B981] tabular-nums shrink-0">
                    +{bar.multiplier.toFixed(1)}x
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
