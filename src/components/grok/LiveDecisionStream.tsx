import React, { useState } from 'react';
import { DecisionStreamEntry, DecisionAction, ActiveSlugPosition } from '../../types/grokDesk';
import { Terminal, ArrowUpRight, ArrowDownRight, ShieldAlert, PlusCircle } from 'lucide-react';

interface LiveDecisionStreamProps {
  entries: DecisionStreamEntry[];
  openSlugs: ActiveSlugPosition[];
  selectedTickerFilter: string | null;
  isBusy: boolean;
  onClearTickerFilter: () => void;
  onExecuteTradeAction: (ticker: string, action: 'BUY' | 'SELL' | 'STOP', amountUsd?: number) => void;
}

export const LiveDecisionStream: React.FC<LiveDecisionStreamProps> = ({
  entries,
  openSlugs,
  selectedTickerFilter,
  isBusy,
  onClearTickerFilter,
  onExecuteTradeAction
}) => {
  const [actionFilter, setActionFilter] = useState<'ALL' | DecisionAction>('ALL');
  const [quickTicker, setQuickTicker] = useState<string>('$MABEL');
  const [quickAmount, setQuickAmount] = useState<string>('180');

  const filteredEntries = entries.filter(item => {
    if (actionFilter !== 'ALL' && item.action !== actionFilter) return false;
    if (selectedTickerFilter && item.ticker !== selectedTickerFilter) return false;
    return true;
  });

  const handleQuickBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(10, Number(quickAmount) || 150);
    onExecuteTradeAction(quickTicker, 'BUY', amt);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left 5 Columns on Desktop: Active Open Slugs & Manual Execution Control */}
      <div className="lg:col-span-5 bg-[#121215] border border-[#222228] rounded-2xl p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E1E24] pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-bold text-[#F4F4F5] font-display">
                Active Slugs & -6% Stop Guard
              </h3>
            </div>
            <span className="text-xs font-mono text-[#A1A1AA] tabular-nums">
              {openSlugs.length} OPEN
            </span>
          </div>

          {openSlugs.length === 0 ? (
            <div className="bg-[#09090B] border border-[#1C1C22] rounded-xl p-6 text-center space-y-2 font-mono">
              <p className="text-xs text-[#A1A1AA]">
                Keine offenen Positionen im aktuellen Modus.
              </p>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onExecuteTradeAction('$MABEL', 'BUY', 180)}
                className="px-3.5 py-2 rounded-lg bg-[#10B981] text-[#09090B] text-xs font-bold cursor-pointer"
              >
                Open First Position ($MABEL $180)
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#18181F] bg-[#09090B] border border-[#1C1C22] rounded-xl overflow-hidden font-mono">
              {openSlugs.map((slug) => {
                const isProfit = slug.unrealizedPnlUsd >= 0;
                return (
                  <div
                    key={slug.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#141418] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F4F4F5]">
                          {slug.ticker}
                        </span>
                        <span className="text-[11px] text-[#71717A] tabular-nums">
                          ${slug.sizeUsd.toFixed(0)} · Score {slug.walletScore}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#71717A] tabular-nums mt-0.5">
                        Entry ${slug.entryPriceUsd} → Now ${slug.currentPriceUsd} (Stop -6%)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <div className="text-right mr-1">
                        <span
                          className={`text-xs font-bold block ${
                            isProfit ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isProfit ? '+' : ''}${slug.unrealizedPnlUsd.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] block ${
                            isProfit ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isProfit ? '+' : ''}{slug.unrealizedPnlPct.toFixed(2)}%
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onExecuteTradeAction(slug.ticker, 'SELL')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#10B981]/15 hover:bg-[#10B981]/30 border border-[#10B981]/40 text-[#10B981] text-[11px] font-bold cursor-pointer whitespace-nowrap min-h-[34px]"
                      >
                        SELL
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onExecuteTradeAction(slug.ticker, 'STOP')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-[#EF4444] text-[11px] font-bold cursor-pointer whitespace-nowrap min-h-[34px]"
                      >
                        STOP
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Manual Direct Route Execution Bar */}
        <form onSubmit={handleQuickBuy} className="pt-3 border-t border-[#1E1E24] space-y-2.5">
          <div className="text-xs font-mono text-[#71717A] flex items-center justify-between">
            <span>DIRECT DEX ROUTE EXECUTION</span>
            <span className="text-[#10B981]">SLIPPAGE ≤ 0.45%</span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <select
              value={quickTicker}
              onChange={(e) => setQuickTicker(e.target.value)}
              aria-label="Token Ticker wählen"
              className="bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-[#F4F4F5] font-bold focus:outline-none focus:border-[#10B981] min-h-[40px]"
            >
              <option value="$MABEL">$MABEL</option>
              <option value="$PIXEL">$PIXEL</option>
              <option value="$BONGO">$BONGO</option>
              <option value="$SOL">$SOL</option>
              <option value="$PEPE">$PEPE</option>
              <option value="$KROK">$KROK</option>
            </select>

            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A]">
                $
              </span>
              <input
                type="number"
                min="10"
                max="2000"
                step="10"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                aria-label="Orderbetrag in USD"
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl pl-6 pr-3 py-2 text-xs text-[#F4F4F5] tabular-nums focus:outline-none focus:border-[#10B981] min-h-[40px]"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#09090B] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>BUY</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right 7 Columns on Desktop: Chronological Live Decision Stream (Execution Log) */}
      <div className="lg:col-span-7 bg-[#121215] border border-[#222228] rounded-2xl p-5 flex flex-col justify-between space-y-4">
        {/* Stream Header & Interactive Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E24] pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-[#10B981] shrink-0" />
            <h3 className="text-sm font-bold text-[#F4F4F5] font-display">
              Live Decision Stream
            </h3>
            <span className="text-xs font-mono text-[#71717A] tabular-nums">
              · {filteredEntries.length} EVENTS
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#09090B] p-1 rounded-xl border border-[#222228] font-mono text-xs">
            {(['ALL', 'BUY', 'SELL', 'STOP'] as const).map((tab) => {
              const active = actionFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActionFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? tab === 'STOP'
                        ? 'bg-[#EF4444] text-[#F4F4F5]'
                        : 'bg-[#10B981] text-[#09090B]'
                      : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {selectedTickerFilter && (
          <div className="flex items-center justify-between bg-[#09090B] border border-[#10B981]/30 rounded-xl px-3.5 py-2 text-xs font-mono">
            <span className="text-[#A1A1AA]">
              Gefiltert nach Token: <strong className="text-[#10B981]">{selectedTickerFilter}</strong>
            </span>
            <button
              type="button"
              onClick={onClearTickerFilter}
              className="text-[#10B981] hover:underline cursor-pointer"
            >
              Alle anzeigen
            </button>
          </div>
        )}

        {/* Chronological Execution Feed Rows */}
        <div className="divide-y divide-[#18181F] bg-[#09090B] border border-[#1C1C22] rounded-xl overflow-hidden font-mono max-h-[340px] overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71717A]">
              Keine Entscheidungen für den gewählten Filter vorhanden.
            </div>
          ) : (
            filteredEntries.map((item) => {
              const isGreen = item.statusIndicator === 'GREEN';
              return (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#141418] transition-colors"
                >
                  {/* Left: Timestamp, Status Indicator Dot, Action (BUY/STOP/SELL), Token Ticker */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-[#71717A] tabular-nums shrink-0">
                      {item.timeFormatted}
                    </span>

                    {/* Real-time Execution Status Dot (Green/Red) paired with explicit Action Label */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isGreen ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                      }`}
                      aria-hidden="true"
                    />

                    <span
                      className={`text-xs font-bold w-11 shrink-0 ${
                        item.action === 'STOP'
                          ? 'text-[#EF4444]'
                          : item.action === 'SELL'
                          ? 'text-[#10B981]'
                          : 'text-[#34D399]'
                      }`}
                    >
                      {item.action}
                    </span>

                    <span className="text-xs font-bold text-[#F4F4F5] shrink-0">
                      {item.ticker}
                    </span>

                    <span className="text-xs text-[#71717A] truncate hidden sm:inline">
                      · {item.rationaleShort}
                    </span>
                  </div>

                  {/* Right: Multiplier & Exact Dollar Amount (+$180.00 / -$7.90) */}
                  <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                    {item.multiplierText && (
                      <span
                        className={`text-[11px] hidden xs:inline ${
                          isGreen ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {item.multiplierText}
                      </span>
                    )}

                    <div
                      className={`flex items-center gap-1 text-xs sm:text-sm font-bold ${
                        isGreen ? 'text-[#10B981]' : 'text-[#EF4444]'
                      }`}
                    >
                      {isGreen ? (
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{item.amountFormatted}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
