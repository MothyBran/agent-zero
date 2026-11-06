import React, { useState } from 'react';
import {
  TradingSystemState,
  PipelineStage,
  TradingPosition,
  OrderTarget
} from '../../types/trading';
import { MarketSentimentWidget } from './MarketSentimentWidget';
import {
  Search,
  Filter,
  BarChart3,
  Zap,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Target
} from 'lucide-react';

interface SixAgentTerminalViewProps {
  state: TradingSystemState;
  onToggleAutoPilot: () => Promise<void>;
  onTriggerScan: () => Promise<void>;
  onRunOptimize: () => Promise<void>;
  onClosePosition: (positionId: string) => Promise<void>;
  onExecuteOrder: (symbol: string, side: 'LONG' | 'SHORT', amountUsd: number) => Promise<{ success: boolean; message: string }>;
}

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
}

function formatCompactUsd(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}k`;
  return `$${val.toFixed(2)}`;
}

function HeaderEquitySparkline({ points, initial }: { points: { equity: number }[]; initial: number }) {
  const vals = points.length >= 2 ? points.map(p => p.equity) : [initial, initial * 1.001];
  const min = Math.min(...vals, initial) * 0.999;
  const max = Math.max(...vals, initial) * 1.001;
  const range = max - min || 1;
  const w = 180;
  const h = 24;
  const poly = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="hdrSparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="url(#hdrSparkGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={poly}
      />
    </svg>
  );
}

function AnalystCircularGauge({ score, threshold }: { score: number; threshold: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (pct / 100) * circumference;
  const passed = score >= threshold;

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 108 108">
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="rgba(148, 197, 248, 0.35)"
            strokeWidth="8"
          />
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke={passed ? '#059669' : '#0284c7'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono tabular-nums">
          <span className={`text-3xl font-bold ${passed ? 'text-emerald-700' : 'text-[#0b213a]'}`}>
            {score}
          </span>
          <span className="text-[10px] font-sans text-[#496a91]">final score</span>
        </div>
      </div>
      <div className="text-[11px] text-[#395b82] text-center mt-1 leading-tight">
        <div>{threshold}+ moves on</div>
        <div>below {threshold} is dropped</div>
      </div>
    </div>
  );
}

function PositionTrailingChart({
  position,
  fallbackTarget
}: {
  position: TradingPosition | null;
  fallbackTarget: OrderTarget | null;
}) {
  const width = 440;
  const height = 165;

  if (position) {
    const prices = position.priceHistory && position.priceHistory.length >= 2
      ? position.priceHistory
      : [position.entryPrice, position.currentPrice];
    const stops = position.stopHistory && position.stopHistory.length >= 2
      ? position.stopHistory
      : [position.stopLoss, position.stopLoss];

    const allVals = [...prices, ...stops, position.entryPrice, position.takeProfit];
    const min = Math.min(...allVals) * 0.9985;
    const max = Math.max(...allVals) * 1.0015;
    const range = max - min || 1;

    const toY = (val: number) => height - ((val - min) / range) * (height - 32) - 16;

    const pricePts = prices.map((v, i) => {
      const x = (i / (prices.length - 1)) * (width - 30) + 10;
      return `${x.toFixed(1)},${toY(v).toFixed(1)}`;
    }).join(' ');

    const stopPts = stops.map((v, i) => {
      const x = (i / (stops.length - 1)) * (width - 30) + 10;
      return `${x.toFixed(1)},${toY(v).toFixed(1)}`;
    }).join(' ');

    const lastX = width - 20;
    const lastY = toY(prices[prices.length - 1]);
    const entryY = toY(position.entryPrice);
    const trailActivateY = toY(
      position.side === 'LONG'
        ? position.entryPrice * (1 + position.trailActivationPct / 100)
        : position.entryPrice * (1 - position.trailActivationPct / 100)
    );

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id="posPriceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Trail Activation Line */}
        <line
          x1="10"
          y1={trailActivateY}
          x2={width - 10}
          y2={trailActivateY}
          stroke="#64748b"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />
        <text x={width - 95} y={trailActivateY - 5} className="text-[9px] fill-[#496a91] font-mono">
          +{position.trailActivationPct}% trail
        </text>

        {/* Entry Baseline */}
        <line
          x1="10"
          y1={entryY}
          x2={width - 10}
          y2={entryY}
          stroke="#475569"
          strokeWidth="1"
          opacity="0.45"
        />
        <text x={width - 55} y={entryY - 4} className="text-[9px] fill-[#395b82] font-mono">
          entry
        </text>

        {/* Trailing Stop Line */}
        <polyline
          fill="none"
          stroke="#64748b"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={stopPts}
        />

        {/* Price Curve */}
        <polyline
          fill="none"
          stroke="#0284c7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pricePts}
        />

        {/* Peak / Current Glowing Dot */}
        <circle cx={lastX} cy={lastY} r="5" fill="#0ea5e9" />
        <circle cx={lastX} cy={lastY} r="9" fill="#0ea5e9" fillOpacity="0.25" />

        <text x={Math.max(20, lastX - 95)} y={Math.max(18, lastY - 8)} className="text-[10px] fill-[#0b213a] font-mono font-semibold">
          trailing stop
        </text>
      </svg>
    );
  }

  // When no open position is selected, visualize the closest armed Order Target curve
  const tgt = fallbackTarget;
  const base = tgt ? tgt.currentPrice : 100;
  const entry = tgt ? tgt.targetEntryPrice : 99.5;
  const tp = tgt ? tgt.plannedTakeProfit : 102;
  const sl = tgt ? tgt.plannedStopLoss : 98.5;

  const simCurve = [
    base * 0.996,
    base * 0.998,
    entry,
    entry + (tp - entry) * 0.35,
    entry + (tp - entry) * 0.65,
    entry + (tp - entry) * 0.92,
    tp
  ];
  const simStops = [
    sl,
    sl,
    sl,
    entry,
    entry + (tp - entry) * 0.3,
    entry + (tp - entry) * 0.6,
    entry + (tp - entry) * 0.78
  ];

  const all = [...simCurve, ...simStops];
  const min = Math.min(...all) * 0.999;
  const max = Math.max(...all) * 1.001;
  const rng = max - min || 1;
  const toY = (v: number) => height - ((v - min) / rng) * (height - 32) - 16;

  const pPts = simCurve.map((v, i) => `${((i / (simCurve.length - 1)) * (width - 30) + 10).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const sPts = simStops.map((v, i) => `${((i / (simStops.length - 1)) * (width - 30) + 10).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
      <line x1="10" y1={toY(entry)} x2={width - 10} y2={toY(entry)} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <text x={width - 75} y={toY(entry) - 4} className="text-[9px] fill-[#395b82] font-mono">
        target entry
      </text>
      <polyline fill="none" stroke="#64748b" strokeWidth="1.8" points={sPts} />
      <polyline fill="none" stroke="#0284c7" strokeWidth="3" points={pPts} />
      <circle cx={width - 20} cy={toY(tp)} r="5" fill="#0ea5e9" />
      <text x={width - 125} y={toY(tp) + 14} className="text-[10px] fill-[#0b213a] font-mono font-semibold">
        trailing stop path
      </text>
    </svg>
  );
}

export const SixAgentTerminalView: React.FC<SixAgentTerminalViewProps> = ({
  state,
  onToggleAutoPilot,
  onTriggerScan,
  onRunOptimize,
  onClosePosition,
  onExecuteOrder
}) => {
  const [selectedPosIndex, setSelectedPosIndex] = useState(0);
  const [isExecutingQuick, setIsExecutingQuick] = useState(false);

  const activeMode = state.activeMode;
  const portfolio = activeMode === 'DEMO' ? state.demoPortfolio : state.livePortfolio;
  const pipe = state.pipeline;
  const breakdown = pipe.currentAnalystBreakdown;

  const activePosition: TradingPosition | null =
    portfolio.openPositions[selectedPosIndex] || portfolio.openPositions[0] || null;
  const closestTarget: OrderTarget | null = state.orderTargets[0] || null;

  const handleQuickExecuteCandidate = async (symbol: string) => {
    setIsExecutingQuick(true);
    try {
      const allocUsd = Math.max(25, Number(((portfolio.equityUsd * (state.strategy.maxAllocationPerTradePct / 100))).toFixed(2)));
      await onExecuteOrder(symbol, 'LONG', allocUsd);
    } finally {
      setIsExecutingQuick(false);
    }
  };

  const stages: {
    id: PipelineStage;
    label: string;
    metric: string;
    icon: React.ReactNode;
    ringColor: string;
  }[] = [
    {
      id: 'SCOUT',
      label: 'SCOUT',
      metric: `${pipe.scoutSeenCount} seen`,
      icon: <Search className="w-4 h-4 text-sky-700" />,
      ringColor: 'border-sky-500 bg-sky-100/80'
    },
    {
      id: 'FILTER',
      label: 'FILTER',
      metric: `${pipe.filterKilledCount} killed`,
      icon: <Filter className="w-4 h-4 text-rose-700" />,
      ringColor: 'border-rose-500 bg-rose-100/80'
    },
    {
      id: 'ANALYST',
      label: 'ANALYST',
      metric: `${pipe.analystScoredCount} scored`,
      icon: <BarChart3 className="w-4 h-4 text-indigo-700" />,
      ringColor: 'border-indigo-500 bg-indigo-100/80'
    },
    {
      id: 'EXECUTOR',
      label: 'EXECUTOR',
      metric: `${pipe.executorTradesCount} trades`,
      icon: <Zap className="w-4 h-4 text-emerald-700" />,
      ringColor: 'border-emerald-500 bg-emerald-100/80'
    },
    {
      id: 'RISK',
      label: 'RISK',
      metric: `${pipe.riskStopsCount} stops`,
      icon: <Shield className="w-4 h-4 text-amber-700" />,
      ringColor: 'border-amber-500 bg-amber-100/80'
    },
    {
      id: 'LOGGER',
      label: 'LOGGER',
      metric: `#${pipe.loggerLinesCount}`,
      icon: <FileText className="w-4 h-4 text-sky-800" />,
      ringColor: 'border-sky-600 bg-sky-100/80'
    }
  ];

  const logTagColor = (tag: string) => {
    switch (tag) {
      case 'WIN': return 'text-emerald-700 font-bold';
      case 'ENTER': return 'text-sky-700 font-bold';
      case 'SCORE': return 'text-indigo-700 font-bold';
      case 'TRAIL': return 'text-amber-700 font-bold';
      case 'KILL':
      case 'LOSS': return 'text-rose-700 font-bold';
      default: return 'text-[#395b82] font-bold';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Terminal Header Card (Matches Grok Bot Terminal Header in Pearl-Blue Waterdrop Style) */}
      <div className="waterdrop-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Sculptural Waterdrop Orb + Agent Zero Terminal Title & Uptime */}
        <div className="flex items-center gap-5">
          {/* 3D Sculptural Pearl-Blue Waterdrop Orb */}
          <div
            onClick={onToggleAutoPilot}
            title="Klicken um Auto-Pilot umzuschalten"
            className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #bae6fd 35%, #38bdf8 72%, #0284c7 100%)',
              boxShadow: '0 14px 28px -6px rgba(2, 132, 199, 0.38), inset 0 4px 8px rgba(255, 255, 255, 0.95), inset 0 -6px 12px rgba(3, 105, 161, 0.35)'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-6 rounded-full bg-[#08203e]" />
              <div className="w-2.5 h-6 rounded-full bg-[#08203e]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#08203e] font-display">
                <span className="text-sky-600">Agent Zero</span> Terminal
              </h1>
              <span className="pearl-surface px-3 py-1 rounded-xl text-xs font-mono font-bold text-sky-800">
                multi-asset v{state.strategy.version}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-[#2c4c70]">
              <span className="font-bold text-emerald-700">
                {state.autoPilotEnabled ? 'running' : 'paused'} · {formatUptime(pipe.uptimeSeconds)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg font-bold text-[#0b213a]">
                {pipe.activeStage} · {pipe.activeSymbol}
              </span>
            </div>

            <p className="text-xs text-[#496a91]">
              continuous stream · six agents · hard handoffs · no asset picked by hand
            </p>
          </div>
        </div>

        {/* Right: Big Balance Readout, Win/Loss Counter & Sparkline */}
        <div className="flex flex-col lg:items-end justify-between font-mono tabular-nums space-y-1">
          <div className="text-3xl sm:text-4xl font-bold text-[#08203e] tracking-tight">
            ${portfolio.equityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#496a91] font-sans">
            balance · started at ${portfolio.initialCapitalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {activeMode === 'DEMO' ? 'paper mode' : 'verified on-chain'}
          </div>
          <div className="text-xs font-bold text-[#0b213a] pt-0.5">
            {portfolio.winCount + portfolio.lossCount} trades · <span className="text-emerald-700">{portfolio.winCount} W</span> · <span className="text-rose-700">{portfolio.lossCount} L</span>
          </div>
          <div className="pt-1">
            <HeaderEquitySparkline points={portfolio.equityCurve} initial={portfolio.initialCapitalUsd} />
          </div>
        </div>
      </div>

      {/* Dedicated Real-Time Market Sentiment & Orderbook Imbalance Widget */}
      {state.marketSentiment && (
        <MarketSentimentWidget
          sentiment={state.marketSentiment}
          autoPilotEnabled={state.autoPilotEnabled}
          analystThreshold={state.strategy.analystPassThreshold}
        />
      )}

      {/* Main 12-Column Six-Agent Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (4 Cols): The 7 Stacked Sub-Agent Cards */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* 1. SCOUT */}
          <div className={`waterdrop-card p-4 space-y-2 ${pipe.activeStage === 'SCOUT' ? 'ring-2 ring-sky-500/80' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-sky-700">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-sky-700">SCOUT</div>
                  <div className="text-[11px] text-[#496a91]">finds fresh multi-asset setups</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-sky-800">
                SCAN
              </span>
            </div>
            <div className="text-xs font-semibold text-[#0b213a]">
              Crypto · Stocks · Forex · 0€ Live-Stream
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              seen {pipe.scoutSeenCount.toLocaleString('en-US')} · new {pipe.lastScoutSymbol}
            </div>
          </div>

          {/* 2. FILTER */}
          <div className={`waterdrop-card p-4 space-y-2 ${pipe.activeStage === 'FILTER' ? 'ring-2 ring-rose-500/70' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-rose-700">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-700">FILTER</div>
                  <div className="text-[11px] text-[#496a91]">kills what fails the rules</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-rose-800">
                CHECK
              </span>
            </div>
            <div className="text-xs font-semibold text-rose-800">
              8 hard rules · one fail = killed
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              killed {pipe.filterKilledCount.toLocaleString('en-US')} · said no to ~{pipe.filterKillRatePct}%
            </div>
          </div>

          {/* 3. ANALYST */}
          <div className={`waterdrop-card p-4 space-y-2 ${pipe.activeStage === 'ANALYST' ? 'ring-2 ring-indigo-500/70' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-indigo-700">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-indigo-700">ANALYST</div>
                  <div className="text-[11px] text-[#496a91]">scores what's left, 0–100</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-indigo-800">
                SCORE
              </span>
            </div>
            <div className="text-xs font-semibold text-indigo-900">
              only {state.strategy.analystPassThreshold}+ gets through
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              last {breakdown.displaySymbol} {breakdown.finalScore} → {breakdown.passedToExecutor ? 'executor' : 'dropped'}
            </div>
          </div>

          {/* 4. EXECUTOR */}
          <div className={`waterdrop-card p-4 space-y-2 ${pipe.activeStage === 'EXECUTOR' ? 'ring-2 ring-emerald-500/70' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-emerald-700">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-700">EXECUTOR</div>
                  <div className="text-[11px] text-[#496a91]">places the trades</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-emerald-800">
                LIVE
              </span>
            </div>
            <div className="text-xs font-semibold text-emerald-800">
              max {state.strategy.maxAllocationPerTradePct}% of balance per trade
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              {pipe.lastExecutorSymbol} · ${pipe.lastExecutorSizeUsd.toFixed(2)} ({state.strategy.maxAllocationPerTradePct}%)
            </div>
          </div>

          {/* 5. RISK */}
          <div className={`waterdrop-card p-4 space-y-2 ${pipe.activeStage === 'RISK' ? 'ring-2 ring-amber-500/70' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-amber-700">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-700">RISK</div>
                  <div className="text-[11px] text-[#496a91]">guards every entry</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-amber-800">
                TRAIL
              </span>
            </div>
            <div className="text-xs font-semibold text-amber-900">
              stop set before entry · trails after +{state.strategy.trailActivationGainPct}%
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              trailing {pipe.riskTrailingSymbol} · {state.strategy.trailDistanceUnderPeakPct}% under peak
            </div>
          </div>

          {/* 6. LOGGER */}
          <div className="waterdrop-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-sky-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-sky-700">LOGGER</div>
                  <div className="text-[11px] text-[#496a91]">writes everything down</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-sky-800">
                WRITE
              </span>
            </div>
            <div className="text-xs font-semibold text-[#0b213a]">
              every kill and every trade · self-optimizing
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              line #{pipe.loggerLinesCount} · trail {pipe.riskTrailingSymbol}
            </div>
          </div>

          {/* 7. YOU (AUTONOMOUS OPERATOR STATUS) */}
          <div className="waterdrop-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl pearl-surface flex items-center justify-center text-[#0b213a] font-bold text-xs">
                  ||
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0b213a]">YOU</div>
                  <div className="text-[11px] text-[#496a91]">hands-off operator</div>
                </div>
              </div>
              <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold text-[#395b82]">
                {state.autoPilotEnabled ? 'ASLEEP' : 'MANUAL'}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#0b213a]">
              vollautomatisiert · handelt nur wenn es sich lohnt
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#496a91] pt-1 border-t border-sky-200/60">
              {state.orderTargets.length} Order-Ziele aktiv überwacht
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (8 Cols): 4-Row Pipeline & Inspection Workbench */}
        <div className="lg:col-span-8 space-y-5">
          {/* ROW 1: LIVE FLOW · HARD HANDOFFS · ONE JOB EACH */}
          <div className="waterdrop-card p-5 space-y-5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#496a91]">
              <span className="font-bold tracking-wide text-[#0b213a]">
                LIVE FLOW · HARD HANDOFFS · ONE JOB EACH
              </span>
              <span>
                {pipe.pairsPerMin} checks/min · {new Date().toTimeString().slice(0, 5)}
              </span>
            </div>

            {/* 5 Top Stream Ticker Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {state.marketQuotes.slice(0, 5).map(q => (
                <div
                  key={q.symbol}
                  onClick={() => handleQuickExecuteCandidate(q.symbol)}
                  title="Klicken für direkten Executor-Trade"
                  className="pearl-surface rounded-2xl p-3 cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#0b213a]">{q.displaySymbol}</span>
                    <span className={`text-[10px] font-mono font-bold ${q.change24hPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {q.change24hPct >= 0 ? '+' : ''}{q.change24hPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] font-mono tabular-nums text-[#496a91] mt-1">
                    {q.ageLabel} · {formatCompactUsd(q.marketCapOrLiquidityUsd)}
                  </div>
                </div>
              ))}
            </div>

            {/* 6-Node Hard Handoff Diagram */}
            <div className="pt-4 pb-1 overflow-x-auto">
              <div className="min-w-[540px] flex items-center justify-between relative px-4">
                {/* Connecting horizontal line behind nodes */}
                <div className="absolute left-12 right-12 top-7 h-0.5 bg-sky-300/70 -z-0" />

                {stages.map(st => {
                  const isActive = pipe.activeStage === st.id;
                  return (
                    <div key={st.id} className="relative z-10 flex flex-col items-center text-center">
                      {/* Floating Ticker Tag above active stage */}
                      <div className="h-5 mb-1 flex items-center justify-center">
                        {isActive && (
                          <span className="pearl-surface px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-[#0b213a] shadow-xs">
                            {pipe.activeSymbol}
                          </span>
                        )}
                      </div>

                      <div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${st.ringColor} ${
                          isActive ? 'scale-110 shadow-md ring-4 ring-sky-400/30' : 'opacity-85'
                        }`}
                      >
                        {st.icon}
                      </div>

                      <div className="mt-2 text-[11px] font-mono font-bold text-[#0b213a]">
                        {st.label}
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-[#496a91]">
                        {st.metric}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ROW 2: FILTER (8 HARD RULES) + ANALYST (SCORE 0-100) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Left Card: FILTER · 8 HARD RULES */}
            <div className="waterdrop-card p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0b213a]">
                  FILTER · 8 HARD RULES
                </span>
                <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-rose-800">
                  {pipe.currentFilterSymbol}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono tabular-nums">
                {pipe.filterRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {rule.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span className="text-[#0b213a] font-sans text-xs truncate">
                        {rule.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={rule.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {rule.valueText}
                      </span>
                      <span className="text-[#527399] text-[11px] w-9 text-right">
                        ×{rule.killCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pearl-surface rounded-xl py-2 px-3 text-center text-xs font-mono text-[#0b213a]">
                checking {pipe.currentFilterSymbol} · rule {pipe.currentFilterRuleIndex}/8
              </div>
            </div>

            {/* Right Card: ANALYST · SCORE 0-100 */}
            <div className="waterdrop-card p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0b213a]">
                  ANALYST · SCORE 0–100
                </span>
                <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-indigo-900">
                  {breakdown.displaySymbol}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                {/* 6 Factor Bars */}
                <div className="flex-1 space-y-2.5 text-xs">
                  {[
                    { label: 'momentum', val: breakdown.momentum },
                    { label: 'volume / buyers', val: breakdown.uniqueBuyersOrVolume },
                    { label: 'buy / sell ratio', val: breakdown.buySellRatio },
                    { label: 'trend growth', val: breakdown.trendGrowth },
                    { label: 'liquidity / spread', val: breakdown.liquidityEfficiency },
                    { label: 'smart flow', val: breakdown.smartFlowConfluence }
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-[#2c4c70]">{item.label}</span>
                        <span className="font-bold text-[#0b213a]">{item.val}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-sky-200/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Circular Score Gauge */}
                <AnalystCircularGauge
                  score={breakdown.finalScore}
                  threshold={breakdown.threshold}
                />
              </div>

              <div className={`pearl-surface rounded-xl py-2 px-3 text-center text-xs font-mono font-bold ${
                breakdown.passedToExecutor ? 'text-emerald-800' : 'text-[#395b82]'
              }`}>
                {breakdown.passedToExecutor
                  ? `${breakdown.finalScore} ≥ ${breakdown.threshold} → handoff to EXECUTOR`
                  : `${breakdown.finalScore} < ${breakdown.threshold} → dropped`}
              </div>
            </div>
          </div>

          {/* ROW 3: EXECUTOR + RISK · POSITION & ORDER TARGETS */}
          <div className="waterdrop-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#0b213a]">
                  EXECUTOR + RISK · POSITION & ORDER-ZIELE
                </span>
                {portfolio.openPositions.length > 1 && (
                  <div className="flex items-center gap-1">
                    {portfolio.openPositions.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPosIndex(idx)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                          idx === selectedPosIndex
                            ? 'waterdrop-btn-primary'
                            : 'pearl-surface text-[#2c4c70]'
                        }`}
                      >
                        {p.displaySymbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[11px] font-mono text-[#496a91]">
                {activePosition ? 'live position trailing guard' : 'sniper order target preview'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8">
                <PositionTrailingChart
                  position={activePosition}
                  fallbackTarget={closestTarget}
                />
              </div>

              <div className="md:col-span-4 space-y-3 font-mono tabular-nums">
                {activePosition ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-[#08203e]">
                        {activePosition.displaySymbol}
                      </div>
                      <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-emerald-800">
                        {activePosition.trailingActive ? 'TRAILING' : activePosition.side}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs border-y border-sky-200/70 py-2.5">
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">size</span>
                        <span className="font-bold text-[#0b213a]">
                          {activePosition.allocationPct}% · ${activePosition.notionalUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">entry → current</span>
                        <span className="font-bold text-[#0b213a]">
                          {activePosition.entryPrice} → {activePosition.currentPrice}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">stop</span>
                        <span className="font-bold text-rose-700">
                          {activePosition.trailingActive ? 'trailing' : 'guarded'} · {activePosition.stopLoss}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">target TP</span>
                        <span className="font-bold text-emerald-700">
                          {activePosition.takeProfit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className={`text-3xl font-bold ${activePosition.unrealizedPnlPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {activePosition.unrealizedPnlPct >= 0 ? '+' : ''}{activePosition.unrealizedPnlPct.toFixed(2)}%
                      </div>
                      <button
                        type="button"
                        onClick={() => onClosePosition(activePosition.id)}
                        className="waterdrop-btn-pearl px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 cursor-pointer"
                      >
                        Exit Trade
                      </button>
                    </div>
                  </>
                ) : closestTarget ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-[#08203e]">
                        {closestTarget.displaySymbol}
                      </div>
                      <span className="pearl-surface px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-sky-800">
                        ZIEL GESETZT
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs border-y border-sky-200/70 py-2.5">
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">zielkurs ({closestTarget.side})</span>
                        <span className="font-bold text-[#0b213a]">{closestTarget.targetEntryPrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">aktueller kurs</span>
                        <span className="font-bold text-[#0b213a]">{closestTarget.currentPrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">abstand zum trigger</span>
                        <span className="font-bold text-sky-700">{closestTarget.distancePct.toFixed(3)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#496a91]">geplanter SL / TP</span>
                        <span className="font-bold text-[#0b213a]">{closestTarget.plannedStopLoss} / {closestTarget.plannedTakeProfit}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xl font-bold text-emerald-700">
                        +{closestTarget.expectedNetProfitPct}% Edge
                      </div>
                      <button
                        type="button"
                        disabled={isExecutingQuick}
                        onClick={() => handleQuickExecuteCandidate(closestTarget.symbol)}
                        className="waterdrop-btn-primary px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Sofort-Trigger
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Active Order Targets Strip (Shows Agent Zero's autonomous price targets) */}
            {state.orderTargets.length > 0 && (
              <div className="pt-3 border-t border-sky-200/70">
                <div className="text-[11px] font-mono font-bold text-[#496a91] mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-sky-600" />
                  <span>GESETZTE AUTONOME ORDER-ZIELE (HANDELT SOFORT BEI ZIELKURS-ERREICHUNG):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {state.orderTargets.slice(0, 3).map(tgt => (
                    <div key={tgt.id} className="pearl-surface rounded-xl p-2.5 text-xs font-mono tabular-nums flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#0b213a]">
                          {tgt.displaySymbol} <span className={tgt.side === 'LONG' ? 'text-emerald-700' : 'text-rose-700'}>{tgt.side}</span> @ {tgt.targetEntryPrice}
                        </div>
                        <div className="text-[10px] text-[#496a91]">
                          TP: {tgt.plannedTakeProfit} · R:R {tgt.expectedRewardRiskRatio}:1
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-sky-800">
                          {tgt.distancePct.toFixed(2)}%
                        </span>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          +{tgt.expectedNetProfitPct}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ROW 4: STATS FROM THE SESSION + $ tail -f agent_zero.log */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Left Card: STATS FROM THE SESSION */}
            <div className="waterdrop-card p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#0b213a]">STATS & SELF-OPTIMIZATION</span>
                <span className="text-[#496a91]">{activeMode === 'DEMO' ? 'paper run ✓' : 'live run ✓'}</span>
              </div>

              <div className="space-y-2.5 text-xs font-mono tabular-nums">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#395b82]">assets scanned</span>
                  <div className="flex-1 max-w-[120px] h-2 rounded-full bg-sky-200/60 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }} />
                  </div>
                  <span className="font-bold text-[#0b213a] w-14 text-right">{pipe.scoutSeenCount}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#395b82]">killed · {pipe.filterKillRatePct}%</span>
                  <div className="flex-1 max-w-[120px] h-2 rounded-full bg-sky-200/60 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pipe.filterKillRatePct}%` }} />
                  </div>
                  <span className="font-bold text-[#0b213a] w-14 text-right">{pipe.filterKilledCount}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#395b82]">scored by analyst</span>
                  <div className="flex-1 max-w-[120px] h-2 rounded-full bg-sky-200/60 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '35%' }} />
                  </div>
                  <span className="font-bold text-[#0b213a] w-14 text-right">{pipe.analystScoredCount}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#395b82]">trades taken</span>
                  <div className="flex-1 max-w-[120px] h-2 rounded-full bg-sky-200/60 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '24%' }} />
                  </div>
                  <span className="font-bold text-[#0b213a] w-14 text-right">{pipe.executorTradesCount}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-sky-200/60">
                  <span className="text-[#395b82]">wins / losses</span>
                  <span className="font-bold text-[#0b213a]">
                    {portfolio.winCount} W / {portfolio.lossCount} L
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#395b82]">worst loss</span>
                  <span className="font-bold text-rose-700">
                    {portfolio.worstLossUsd < 0 ? `-$${Math.abs(portfolio.worstLossUsd).toFixed(2)}` : '$0.00'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#395b82]">best trade</span>
                  <span className="font-bold text-emerald-700">
                    +${portfolio.bestTradeUsd.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-sky-200/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onTriggerScan}
                  className="waterdrop-btn-pearl px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Pipeline-Zyklus pushen</span>
                </button>
                <button
                  type="button"
                  onClick={onRunOptimize}
                  className="waterdrop-btn-primary px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer"
                >
                  KI-Selbstoptimierung (v{state.strategy.version})
                </button>
              </div>
            </div>

            {/* Right Card: $ tail -f agent_zero.log */}
            <div className="waterdrop-card p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#0b213a]">$ tail -f agent_zero.log</span>
                <span className="text-[#496a91]">line #{pipe.loggerLinesCount}</span>
              </div>

              <div className="pearl-surface rounded-2xl p-3.5 font-mono text-[11px] space-y-1.5 max-h-[250px] overflow-y-auto">
                {state.terminalLogLines.slice(0, 14).map(line => (
                  <div key={line.id} className="flex items-baseline gap-2 leading-snug">
                    <span className="text-[#527399] shrink-0">{line.timeStr}</span>
                    <span className={`w-11 shrink-0 ${logTagColor(line.tag)}`}>{line.tag}</span>
                    <span className="font-bold text-[#0b213a] shrink-0">{line.symbol}</span>
                    <span className="text-[#2c4c70] truncate">{line.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
