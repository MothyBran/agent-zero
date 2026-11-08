import React, { useState } from 'react';
import { FivePacksControlState } from '../../types/grokDesk';
import { Cpu, ShieldX, Activity, Zap, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';

interface NightShiftFivePacksGridProps {
  fivePacks: FivePacksControlState;
  isBusy: boolean;
  onQuickBuyCandidate: (ticker: string) => void;
}

export const NightShiftFivePacksGrid: React.FC<NightShiftFivePacksGridProps> = ({
  fivePacks,
  isBusy,
  onQuickBuyCandidate
}) => {
  const [showRejectHistory, setShowRejectHistory] = useState<boolean>(false);

  const { gmgnTradingBot, gmgnAgent, pumpGrok } = fivePacks.carouselEngines;
  const { moduleA_gmgnSkills, moduleB_kaiserCharon } = fivePacks;

  // Compute SVG path for PumpGrok mini-sparkline
  const sparkPoints = pumpGrok.miniSparkline.length > 1 ? pumpGrok.miniSparkline : [25, 35, 30, 45, 55, 65];
  const sparkMin = Math.min(...sparkPoints);
  const sparkMax = Math.max(...sparkPoints, sparkMin + 5);
  const sparkW = 112;
  const sparkH = 30;
  const sparkPath = sparkPoints
    .map((val, idx) => {
      const x = (idx / Math.max(1, sparkPoints.length - 1)) * sparkW;
      const y = sparkH - ((val - sparkMin) / (sparkMax - sparkMin)) * (sparkH - 6) - 3;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <section className="space-y-4">
      {/* Part 1: Horizontal Statistics Carousel for Active Trading Engines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 overflow-x-auto">
        {/* Card 1: GMGN Trading Bot (Latency in ms) */}
        <div className="bg-[#121215] border border-[#222228] rounded-2xl p-4 flex flex-col justify-between gap-3 min-w-[240px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[#A1A1AA] font-semibold">
              {gmgnTradingBot.name}
            </span>
            <span className="text-xs font-mono text-[#10B981] font-bold">
              {gmgnTradingBot.status}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-[#F4F4F5]">
                {gmgnTradingBot.latencyMs}ms
              </span>
              <span className="text-xs text-[#71717A] block mt-0.5">
                EXECUTION LATENCY
              </span>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-[#10B981] block">
                {gmgnTradingBot.txCount} TXs
              </span>
              <span className="text-xs text-[#71717A]">
                {gmgnTradingBot.successRatePct}% fill
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: gmgnAgent (Actions Count & AI Confluence) */}
        <div className="bg-[#121215] border border-[#222228] rounded-2xl p-4 flex flex-col justify-between gap-3 min-w-[240px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[#A1A1AA] font-semibold">
              {gmgnAgent.name}
            </span>
            <span className="text-xs font-mono text-[#71717A] truncate">
              {gmgnAgent.activeModel}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-[#F4F4F5]">
                {gmgnAgent.actionsCount.toLocaleString('en-US')}
              </span>
              <span className="text-xs text-[#71717A] block mt-0.5">
                AGENT ACTIONS
              </span>
            </div>

            <div className="text-right max-w-[145px]">
              <span className="text-sm font-bold text-[#10B981] block">
                {gmgnAgent.confidenceAvg}% CONF
              </span>
              <span className="text-xs text-[#71717A] truncate block" title={gmgnAgent.lastSentimentVerdict}>
                {gmgnAgent.lastSentimentVerdict}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: PumpGrok (Entry-Count & Mini-Sparkline) */}
        <div className="bg-[#121215] border border-[#222228] rounded-2xl p-4 flex flex-col justify-between gap-3 min-w-[240px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-[#A1A1AA] font-semibold">
              {pumpGrok.name}
            </span>
            <span className="text-xs font-mono text-[#10B981] tabular-nums">
              HOT {pumpGrok.hotTicker}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-[#F4F4F5]">
                {pumpGrok.entryCount}
              </span>
              <span className="text-xs text-[#71717A] block mt-0.5">
                ENTRIES TRIGGERED
              </span>
            </div>

            {/* Live SVG Mini-Sparkline */}
            <div className="flex flex-col items-end">
              <svg width={sparkW} height={sparkH} className="overflow-visible">
                <path
                  d={sparkPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px] text-[#10B981] mt-0.5">
                +{pumpGrok.momentumDeltaPct.toFixed(1)}% vel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: 2-Column Detail Grid for Active Agent Processes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Module A: GMGN Skills / fomo adapter (token.read, wallet.score, route.fill) */}
        <div className="bg-[#121215] border border-[#222228] rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#1E1E24] pb-3.5">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#F4F4F5] font-display">
                  {moduleA_gmgnSkills.title}{' '}
                  <span className="text-xs font-mono font-normal text-[#71717A]">
                    / {moduleA_gmgnSkills.subtitle}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-[#71717A]">TARGET</span>
              <span className="text-xs font-bold text-[#10B981]">
                {moduleA_gmgnSkills.activeSymbol}
              </span>
            </div>
          </div>

          {/* 3 Pipeline Steps: token.read -> wallet.score -> route.fill */}
          <div className="space-y-2.5 flex-1">
            {moduleA_gmgnSkills.steps.map((step, index) => {
              const isActive = step.status === 'ACTIVE';
              const isDone = step.status === 'DONE';
              return (
                <div
                  key={step.stepKey}
                  className={`p-3 rounded-xl border font-mono transition-colors ${
                    isActive
                      ? 'bg-[#09090B] border-[#10B981] shadow-xs'
                      : 'bg-[#09090B]/70 border-[#1C1C22]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#52525B] tabular-nums">
                        0{index + 1}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isActive
                            ? 'text-[#10B981]'
                            : isDone
                            ? 'text-[#F4F4F5]'
                            : 'text-[#71717A]'
                        }`}
                      >
                        {step.stepKey}
                      </span>
                      <span className="text-xs text-[#71717A]">
                        · {step.activeTicker}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 tabular-nums">
                      <span
                        className={`text-xs font-semibold ${
                          isActive || isDone ? 'text-[#10B981]' : 'text-[#71717A]'
                        }`}
                      >
                        {step.valueLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1 pl-6 text-[11px] text-[#71717A]">
                    <span className="truncate">{step.detailText}</span>
                    <span className="tabular-nums shrink-0">{step.latencyMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer to Snipe Current Pipeline Candidate */}
          <div className="pt-2 border-t border-[#1E1E24] flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-[#71717A] tabular-nums">
              CYCLE #{moduleA_gmgnSkills.cycleCount} · READY FOR FILL
            </span>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onQuickBuyCandidate(moduleA_gmgnSkills.activeSymbol)}
              className="px-3.5 py-1.5 rounded-lg bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-[#10B981] text-xs font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px]"
            >
              <span>Snipe {moduleA_gmgnSkills.activeSymbol} ($150)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module B: Kaiser.Charon (Token-Scanner & Filter-Engine) */}
        <div className="bg-[#121215] border border-[#222228] rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#1E1E24] pb-3.5">
            <div className="flex items-center gap-2.5">
              <ShieldX className="w-4 h-4 text-[#EF4444] shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#F4F4F5] font-display">
                  {moduleB_kaiserCharon.title}{' '}
                  <span className="text-xs font-mono font-normal text-[#71717A]">
                    / {moduleB_kaiserCharon.subtitle}
                  </span>
                </h3>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-[#EF4444] tabular-nums">
              {moduleB_kaiserCharon.rejectionRatePct.toFixed(1)}% REJECTED
            </span>
          </div>

          {/* Core Headline Metric: "1,880 launches / 1,838 rejected" */}
          <div className="bg-[#09090B] border border-[#1E1E24] rounded-xl p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap font-mono tabular-nums">
              <div className="text-lg sm:text-xl font-bold text-[#F4F4F5]">
                <span>{moduleB_kaiserCharon.launchesScanned.toLocaleString('en-US')} launches</span>
                <span className="text-[#52525B] mx-2">/</span>
                <span className="text-[#EF4444]">
                  {moduleB_kaiserCharon.launchesRejected.toLocaleString('en-US')} rejected
                </span>
              </div>
            </div>

            {/* Visual Reject Ratio Bar */}
            <div className="w-full h-2 bg-[#18181E] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#EF4444]"
                style={{ width: `${Math.min(99, moduleB_kaiserCharon.rejectionRatePct)}%` }}
              />
              <div className="h-full bg-[#10B981] flex-1" />
            </div>

            {/* Live Skip-Ticker */}
            <div className="pt-1 flex items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#EF4444] font-bold shrink-0">
                  SKIP {moduleB_kaiserCharon.currentSkipTicker}
                </span>
                <span className="text-[#52525B]">·</span>
                <span className="text-[#A1A1AA] truncate">
                  {moduleB_kaiserCharon.currentSkipReason}
                </span>
              </div>
              <Activity className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
            </div>
          </div>

          {/* Recent Rejected Launches List */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#71717A]">
              <span>RECENT SCAM / LOW-LP KILLS</span>
              <button
                type="button"
                onClick={() => setShowRejectHistory(!showRejectHistory)}
                className="text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center gap-1 cursor-pointer"
              >
                <span>{showRejectHistory ? 'Compact' : 'Show All'}</span>
                {showRejectHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="divide-y divide-[#18181F] bg-[#09090B] border border-[#1C1C22] rounded-xl overflow-hidden font-mono text-xs">
              {moduleB_kaiserCharon.recentRejects
                .slice(0, showRejectHistory ? 6 : 3)
                .map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#EF4444] font-bold shrink-0">
                        {item.ticker}
                      </span>
                      <span className="text-[#71717A] truncate">
                        {item.reason}
                      </span>
                    </div>
                    <span className="text-[#52525B] tabular-nums shrink-0">
                      {item.timeFormatted}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
