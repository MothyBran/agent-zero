import React, { useState, useMemo } from 'react';
import { AssetCategory, MarketAssetQuote, TradingMode, StrategyParameters } from '../../types/trading';
import { ArrowUpRight, ArrowDownRight, Search, SlidersHorizontal, TrendingUp, TrendingDown } from 'lucide-react';

interface MarketScannerViewProps {
  quotes: MarketAssetQuote[];
  activeMode: TradingMode;
  availableCashUsd: number;
  strategy: StrategyParameters;
  isScanning: boolean;
  onExecuteOrder: (symbol: string, side: 'LONG' | 'SHORT', amountUsd: number) => Promise<{ success: boolean; message: string }>;
  onTriggerScan: () => Promise<void>;
}

function formatAssetPrice(price: number, category: AssetCategory, symbol: string): string {
  if (category === 'FOREX') {
    return symbol.includes('JPY') ? price.toFixed(3) : price.toFixed(4);
  }
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function SparklineSvg({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) {
    return <div className="h-9 w-24 bg-sky-100/50 rounded" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 108;
  const height = 34;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = positive ? '#059669' : '#e11d48';
  return (
    <svg width={width} height={height} className="overflow-visible shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export const MarketScannerView: React.FC<MarketScannerViewProps> = ({
  quotes,
  activeMode,
  availableCashUsd,
  strategy,
  isScanning,
  onExecuteOrder,
  onTriggerScan
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MarketAssetQuote | null>(null);
  const [orderSide, setOrderSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [orderAmountUsd, setOrderAmountUsd] = useState<string>(activeMode === 'LIVE' ? '0.25' : '500');
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredQuotes = useMemo(() => {
    return quotes
      .filter(q => selectedCategory === 'ALL' || q.category === selectedCategory)
      .filter(q => {
        if (!searchQuery.trim()) return true;
        const s = searchQuery.toLowerCase();
        return (
          q.displaySymbol.toLowerCase().includes(s) ||
          q.name.toLowerCase().includes(s) ||
          q.category.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => Math.abs(b.confluenceScore) - Math.abs(a.confluenceScore));
  }, [quotes, selectedCategory, searchQuery]);

  const topOpportunities = useMemo(() => {
    return filteredQuotes.slice(0, 3);
  }, [filteredQuotes]);

  const activeOrderAsset = selectedAsset || topOpportunities[0] || null;

  const handleOpenQuickOrder = (quote: MarketAssetQuote, defaultSide?: 'LONG' | 'SHORT') => {
    setSelectedAsset(quote);
    setOrderSide(defaultSide || (quote.confluenceScore >= 0 ? 'LONG' : 'SHORT'));
    const freeAboveReserve = Math.max(0, availableCashUsd - 0.50);
    const suggestedUsd = activeMode === 'DEMO'
      ? Math.max(100, Math.min(2000, Math.round(availableCashUsd * (strategy.maxPositionSizePct / 100))))
      : Math.max(0.10, Number((freeAboveReserve * 0.35).toFixed(2)));
    setOrderAmountUsd(String(suggestedUsd));
    setOrderStatus(null);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderAsset) return;
    const amt = parseFloat(orderAmountUsd);
    if (isNaN(amt) || amt <= 0) {
      setOrderStatus({ type: 'error', text: 'Bitte einen gültigen Orderbetrag in USD eingeben.' });
      return;
    }
    setIsSubmitting(true);
    setOrderStatus(null);
    const res = await onExecuteOrder(activeOrderAsset.symbol, orderSide, amt);
    setIsSubmitting(false);
    setOrderStatus({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  const signalLabel = (signal: MarketAssetQuote['signal']) => {
    switch (signal) {
      case 'STRONG_BUY': return { text: 'Starkes Kaufsignal', color: 'text-emerald-700' };
      case 'BUY': return { text: 'Kaufsignal', color: 'text-emerald-600' };
      case 'STRONG_SELL': return { text: 'Starkes Verkaufssignal', color: 'text-rose-700' };
      case 'SELL': return { text: 'Verkaufssignal', color: 'text-rose-600' };
      default: return { text: 'Neutral / Abwarten', color: 'text-slate-600' };
    }
  };

  const categoryLabel = (cat: AssetCategory) => {
    if (cat === 'STOCKS') return 'Aktien & ETFs';
    if (cat === 'CRYPTO') return 'Krypto Spot/DEX';
    return 'Forex Währungspaar';
  };

  return (
    <div className="space-y-8">
      {/* Top Filter & Search Bar */}
      <div className="waterdrop-card p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#0b213a] tracking-tight">
            Echtzeit Multi-Asset Marktüberwachung
          </h2>
          <p className="text-sm text-[#395b82]">
            Kostenlose 24/7 Live-Feeds (Yahoo Finance v8 · Binance Spot REST · EZB FX) · Quantitative Confluence-Schwelle: ±{strategy.minConfluenceScore} Punkte
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Category Filter Buttons */}
          <div className="pearl-surface p-1 rounded-2xl flex items-center gap-1">
            {(['ALL', 'STOCKS', 'CRYPTO', 'FOREX'] as const).map(cat => {
              const active = selectedCategory === cat;
              const label =
                cat === 'ALL' ? `Alle (${quotes.length})` :
                cat === 'STOCKS' ? 'Aktien' :
                cat === 'CRYPTO' ? 'Krypto' : 'Forex';
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'waterdrop-btn-primary shadow-sm'
                      : 'text-[#2c4c70] hover:text-[#0b213a]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#527399] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Symbol oder Markt suchen..."
              className="pearl-surface pl-9 pr-4 py-2 rounded-xl text-xs text-[#0b213a] placeholder-[#6889ad] focus:outline-none focus:ring-2 focus:ring-sky-400/60 w-52"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Confluence Opportunities + Direct Order Execution Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Cols: Top 3 Quantitative Setups */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {topOpportunities.map(item => {
            const isPositive = item.change24hPct >= 0;
            const sig = signalLabel(item.signal);
            const isSelected = activeOrderAsset?.symbol === item.symbol;

            return (
              <div
                key={item.symbol}
                onClick={() => handleOpenQuickOrder(item)}
                className={`waterdrop-card waterdrop-card-interactive p-5 flex flex-col justify-between cursor-pointer ${
                  isSelected ? 'ring-2 ring-sky-500/70' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#496a91]">
                    <span>{categoryLabel(item.category)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Score {item.confluenceScore > 0 ? `+${item.confluenceScore}` : item.confluenceScore}</span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-[#0b213a] tracking-tight">{item.displaySymbol}</h3>
                      <p className="text-xs text-[#4d6e94] truncate max-w-[150px]">{item.name}</p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-lg font-bold text-[#0b213a]">
                        {item.category === 'FOREX' ? '' : '$'}{formatAssetPrice(item.price, item.category, item.symbol)}
                      </div>
                      <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{item.change24hPct.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="my-4 flex items-center justify-between border-y border-sky-200/60 py-3">
                    <SparklineSvg data={item.sparkline} positive={isPositive} />
                    <div className="text-right font-mono tabular-nums text-xs space-y-0.5">
                      <div className="text-[#395b82]">RSI(14): <strong className="text-[#0b213a]">{item.indicators.rsi14.toFixed(1)}</strong></div>
                      <div className="text-[#395b82]">Boll %B: <strong className="text-[#0b213a]">{(item.indicators.bollingerPctB * 100).toFixed(0)}%</strong></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={`text-xs font-bold ${sig.color}`}>
                      {sig.text}
                    </div>
                    <p className="text-xs text-[#395b82] line-clamp-2">
                      {item.signalReasons.join(' · ') || 'Trend- und Volatilitätsanalyse stabil'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-sky-200/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpenQuickOrder(item, 'LONG'); }}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold waterdrop-btn-primary cursor-pointer whitespace-nowrap"
                  >
                    Long kaufen
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpenQuickOrder(item, 'SHORT'); }}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold waterdrop-btn-pearl cursor-pointer whitespace-nowrap"
                  >
                    Short
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 4 Cols: Sculptural Waterdrop Order Execution Ticket */}
        <div className="lg:col-span-4 waterdrop-card p-6 flex flex-col justify-between">
          {activeOrderAsset ? (
            <form onSubmit={handleConfirmOrder} className="space-y-4">
              <div className="flex items-center justify-between border-b border-sky-200/70 pb-3">
                <div>
                  <span className="text-xs text-[#496a91]">Direktes Order-Ticket ({activeMode === 'DEMO' ? 'Demo-Spielgeld' : 'Echt-Betrieb'})</span>
                  <h3 className="text-lg font-bold text-[#0b213a]">
                    {activeOrderAsset.displaySymbol} · {activeOrderAsset.name}
                  </h3>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-xs text-[#496a91]">Live-Kurs</span>
                  <div className="text-base font-bold text-[#0b213a]">
                    {activeOrderAsset.category === 'FOREX' ? '' : '$'}{formatAssetPrice(activeOrderAsset.price, activeOrderAsset.category, activeOrderAsset.symbol)}
                  </div>
                </div>
              </div>

              {/* Direction Switch */}
              <div className="pearl-surface p-1 rounded-2xl grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderSide('LONG')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    orderSide === 'LONG'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#2c4c70] hover:text-[#0b213a]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>LONG (Kaufen)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide('SHORT')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    orderSide === 'SHORT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-[#2c4c70] hover:text-[#0b213a]'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>SHORT (Verkaufen)</span>
                </button>
              </div>

              {/* Order Size Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#395b82]">
                  <label htmlFor="order-amount-input" className="font-semibold">Positionsgröße (USD)</label>
                  <span className="font-mono tabular-nums">
                    {activeMode === 'LIVE'
                      ? `Handelbar: $${Math.max(0, availableCashUsd - 0.50).toFixed(4)} (Sperre: $0.50)`
                      : `Frei: $${availableCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="order-amount-input"
                    type="number"
                    step="any"
                    min="0.10"
                    value={orderAmountUsd}
                    onChange={e => setOrderAmountUsd(e.target.value)}
                    className="pearl-surface w-full px-3.5 py-2 rounded-xl font-mono tabular-nums text-sm font-bold text-[#0b213a] focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  {[10, 25, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const base = activeMode === 'LIVE' ? Math.max(0, availableCashUsd - 0.50) : availableCashUsd;
                        const minVal = activeMode === 'LIVE' ? 0.10 : 1;
                        setOrderAmountUsd(String(Math.max(minVal, Number((base * (pct / 100)).toFixed(2)))));
                      }}
                      className="waterdrop-btn-pearl px-2.5 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer shrink-0"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatic ATR Stop-Loss & Take-Profit Preview */}
              {(() => {
                const atr = activeOrderAsset.indicators.atr14 || activeOrderAsset.price * 0.015;
                const sl = orderSide === 'LONG'
                  ? activeOrderAsset.price - atr * strategy.atrStopLossMultiplier
                  : activeOrderAsset.price + atr * strategy.atrStopLossMultiplier;
                const tp = orderSide === 'LONG'
                  ? activeOrderAsset.price + atr * strategy.atrTakeProfitMultiplier
                  : activeOrderAsset.price - atr * strategy.atrTakeProfitMultiplier;
                const amt = parseFloat(orderAmountUsd) || 0;
                const estFee = amt * (activeOrderAsset.estimatedFeePct / 100);

                return (
                  <div className="pearl-surface rounded-2xl p-3.5 space-y-1.5 text-xs font-mono tabular-nums">
                    <div className="flex justify-between text-[#395b82]">
                      <span>Auto Stop-Loss ({strategy.atrStopLossMultiplier}x ATR):</span>
                      <span className="font-semibold text-rose-700">{formatAssetPrice(sl, activeOrderAsset.category, activeOrderAsset.symbol)}</span>
                    </div>
                    <div className="flex justify-between text-[#395b82]">
                      <span>Auto Take-Profit ({strategy.atrTakeProfitMultiplier}x ATR):</span>
                      <span className="font-semibold text-emerald-700">{formatAssetPrice(tp, activeOrderAsset.category, activeOrderAsset.symbol)}</span>
                    </div>
                    <div className="flex justify-between text-[#395b82]">
                      <span>Günstigste Route:</span>
                      <span className="text-[#0b213a] font-sans font-medium truncate max-w-[175px]">{activeOrderAsset.executionVenue}</span>
                    </div>
                    <div className="flex justify-between text-[#395b82]">
                      <span>Geschätzte Gebühr ({activeOrderAsset.estimatedFeePct}%):</span>
                      <span className="text-[#0b213a]">${estFee.toFixed(4)}</span>
                    </div>
                  </div>
                );
              })()}

              {orderStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  orderStatus.type === 'success'
                    ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100/90 text-rose-900 border border-rose-300'
                }`}>
                  {orderStatus.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold waterdrop-btn-primary cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Order wird geroutet...'
                  : `${orderSide} Order für ${activeOrderAsset.displaySymbol} jetzt ausführen`}
              </button>
            </form>
          ) : (
            <div className="text-center py-8 text-sm text-[#496a91]">
              Wähle ein Asset aus der Tabelle für direktes Order-Routing.
            </div>
          )}
        </div>
      </div>

      {/* Full Quantitative Market Surveillance Table */}
      <div className="waterdrop-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-200/70">
          <div>
            <h3 className="text-base font-bold text-[#0b213a]">
              Komplette Multi-Asset Watchlist & Indikator-Matrix
            </h3>
            <p className="text-xs text-[#496a91]">
              Alle Kurse und Indikatoren werden live ohne API-Gebühren berechnet · Klicke auf eine Zeile, um das Order-Ticket zu laden
            </p>
          </div>
          <button
            type="button"
            onClick={onTriggerScan}
            disabled={isScanning}
            className="waterdrop-btn-pearl px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 self-start sm:self-auto whitespace-nowrap"
          >
            {isScanning ? 'Scanne Live-Märkte...' : 'Live-Kurse jetzt aktualisieren'}
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-sky-200/80 text-[11px] font-semibold text-[#496a91]">
                <th className="py-3 px-3">Asset / Markt</th>
                <th className="py-3 px-3 text-right">Live-Kurs</th>
                <th className="py-3 px-3 text-right">24h Trend</th>
                <th className="py-3 px-3 text-right">RSI (14)</th>
                <th className="py-3 px-3 text-right">EMA 9 / 21</th>
                <th className="py-3 px-3 text-right">Boll %B</th>
                <th className="py-3 px-3 text-right">Confluence</th>
                <th className="py-3 px-3">KI-Signal & Begründung</th>
                <th className="py-3 px-3">Günstigste Route (Fee)</th>
                <th className="py-3 px-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-200/50 text-xs">
              {filteredQuotes.map(quote => {
                const pos = quote.change24hPct >= 0;
                const sig = signalLabel(quote.signal);
                const emaBullish = quote.indicators.ema9 >= quote.indicators.ema21;

                return (
                  <tr
                    key={quote.symbol}
                    onClick={() => handleOpenQuickOrder(quote)}
                    className="hover:bg-sky-100/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0b213a]">{quote.displaySymbol}</div>
                      <div className="text-[11px] text-[#496a91]">
                        {quote.name} · {quote.category}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#0b213a]">
                      {quote.category === 'FOREX' ? '' : '$'}{formatAssetPrice(quote.price, quote.category, quote.symbol)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${pos ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {pos ? '+' : ''}{quote.change24hPct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#1e3a5f]">
                      {quote.indicators.rsi14.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span className={emaBullish ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {emaBullish ? 'Bullish' : 'Bearish'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#1e3a5f]">
                      {(quote.indicators.bollingerPctB * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                      <span className={quote.confluenceScore >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {quote.confluenceScore > 0 ? `+${quote.confluenceScore}` : quote.confluenceScore}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[230px]">
                      <div className={`font-bold ${sig.color}`}>{sig.text}</div>
                      <div className="text-[11px] text-[#496a91] truncate">
                        {quote.signalReasons.join(' · ') || quote.dataSource}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-[#0b213a] font-medium">{quote.executionVenue}</div>
                      <div className="text-[11px] text-[#496a91] font-mono tabular-nums">
                        Fee: {quote.estimatedFeePct}% · Spread: {quote.spreadBps} bps
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickOrder(quote, 'LONG')}
                          className="waterdrop-btn-primary px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                        >
                          Long
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickOrder(quote, 'SHORT')}
                          className="waterdrop-btn-pearl px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                        >
                          Short
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
