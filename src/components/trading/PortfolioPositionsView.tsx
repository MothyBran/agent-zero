import React, { useState } from 'react';
import { ModePortfolioState, TradingMode, TradingSystemState } from '../../types/trading';
import { RotateCcw, ShieldCheck, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioPositionsViewProps {
  portfolio: ModePortfolioState;
  activeMode: TradingMode;
  liveConnectors: TradingSystemState['liveConnectors'];
  onClosePosition: (positionId: string) => Promise<void>;
  onResetDemo: (capitalUsd: number) => Promise<void>;
  onSwitchTabToScanner: () => void;
}

function EquityCurveChart({ points, initialCapital }: { points: { timestamp: string; equity: number }[]; initialCapital: number }) {
  const data = points.length >= 2 ? points : [
    { timestamp: new Date(Date.now() - 60000).toISOString(), equity: initialCapital },
    { timestamp: new Date().toISOString(), equity: points[0]?.equity ?? initialCapital }
  ];

  const values = data.map(d => d.equity);
  const minVal = Math.min(...values, initialCapital) * 0.998;
  const maxVal = Math.max(...values, initialCapital) * 1.002;
  const range = maxVal - minVal || 1;

  const width = 680;
  const height = 180;

  const coords = data.map((d, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((d.equity - minVal) / range) * (height - 28) - 14;
    return { x, y };
  });

  const linePoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const latestEquity = values[values.length - 1] ?? initialCapital;
  const isUp = latestEquity >= initialCapital;
  const stroke = isUp ? '#0284c7' : '#e11d48';

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id="pearlEquityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#pearlEquityFill)" />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
      </svg>
    </div>
  );
}

export const PortfolioPositionsView: React.FC<PortfolioPositionsViewProps> = ({
  portfolio,
  activeMode,
  liveConnectors,
  onClosePosition,
  onResetDemo,
  onSwitchTabToScanner
}) => {
  const [closingId, setClosingId] = useState<string | null>(null);
  const [customDemoCapital, setCustomDemoCapital] = useState<string>('10000');

  const handleCloseClick = async (id: string) => {
    setClosingId(id);
    await onClosePosition(id);
    setClosingId(null);
  };

  const netReturnPct = portfolio.initialCapitalUsd > 0
    ? ((portfolio.equityUsd - portfolio.initialCapitalUsd) / portfolio.initialCapitalUsd) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Mode Context & Equity Curve Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Cols: Equity Curve & Portfolio Summary */}
        <div className="lg:col-span-8 waterdrop-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-200/70 pb-4">
            <div>
              <div className="text-xs text-[#496a91]">
                {activeMode === 'DEMO'
                  ? 'Paper-Trading Portfolio (Spielgeld mit 100% echten Börsenkursen)'
                  : 'Verifiziertes Echt-Betrieb Portfolio (Strikte On-Chain & Broker Echtgeld-Daten)'}
              </div>
              <div className="mt-1 flex items-baseline gap-3 font-mono tabular-nums">
                <h2 className="text-3xl font-bold text-[#0b213a]">
                  ${portfolio.equityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </h2>
                <span className={`text-sm font-bold ${netReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {netReturnPct >= 0 ? '+' : ''}{netReturnPct.toFixed(2)}% Gesamt-Rendite
                </span>
              </div>
            </div>

            {activeMode === 'DEMO' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="100"
                  step="1000"
                  value={customDemoCapital}
                  onChange={e => setCustomDemoCapital(e.target.value)}
                  className="pearl-surface w-28 px-3 py-1.5 rounded-xl font-mono tabular-nums text-xs font-bold text-[#0b213a]"
                  aria-label="Startkapital Spielgeld in USD"
                />
                <button
                  type="button"
                  onClick={() => onResetDemo(Number(customDemoCapital) || 10000)}
                  className="waterdrop-btn-pearl px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Spielgeld Reset</span>
                </button>
              </div>
            )}
          </div>

          <div className="my-4">
            <EquityCurveChart points={portfolio.equityCurve} initialCapital={portfolio.initialCapitalUsd} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-sky-200/70 font-mono tabular-nums">
            <div>
              <span className="text-xs font-sans text-[#496a91]">Freies Cash-Guthaben</span>
              <div className="text-base font-bold text-[#0b213a]">
                ${portfolio.cashBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
            </div>
            <div>
              <span className="text-xs font-sans text-[#496a91]">Unrealisierter PnL</span>
              <div className={`text-base font-bold ${portfolio.totalUnrealizedPnlUsd >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {portfolio.totalUnrealizedPnlUsd >= 0 ? '+' : ''}${portfolio.totalUnrealizedPnlUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-xs font-sans text-[#496a91]">Realisierter PnL</span>
              <div className={`text-base font-bold ${portfolio.totalRealizedPnlUsd >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {portfolio.totalRealizedPnlUsd >= 0 ? '+' : ''}${portfolio.totalRealizedPnlUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-xs font-sans text-[#496a91]">Win-Rate / Profit-Faktor</span>
              <div className="text-base font-bold text-[#0b213a]">
                {portfolio.winRatePct.toFixed(1)}% · {portfolio.profitFactor.toFixed(2)}x
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Mode Integrity & Connector Status */}
        <div className="lg:col-span-4 waterdrop-card p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#0b213a]">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
              <h3 className="text-base font-bold">
                {activeMode === 'LIVE' ? 'Echt-Betrieb Integritäts-Garantie' : 'Demo-Modus Simulations-Status'}
              </h3>
            </div>
            <p className="text-xs text-[#395b82] leading-relaxed">
              {activeMode === 'LIVE'
                ? 'Im Echt-Betrieb sind sämtliche fiktiven Salden und Simulations-Orders vollständig gesperrt. Es werden ausschließlich verifizierte On-Chain Polygon Transaktionen und angebundene Live-Broker-Konten ausgeführt.'
                : 'Im Demo-Modus handelt Agent Zero autonom mit risikofreiem Spielgeld auf Basis der identischen, unverfälschten Echtzeit-Marktdaten und Gebührenstrukturen.'}
            </p>
          </div>

          <div className="pearl-surface rounded-2xl p-4 space-y-3 text-xs">
            <div>
              <div className="font-bold text-[#0b213a]">1. Polygon PoS DEX On-Chain</div>
              <div className="text-[#395b82] font-mono tabular-nums mt-0.5">
                USDC: {liveConnectors.polygonDexOnChain.usdcBalance.toFixed(4)} · Gas: {liveConnectors.polygonDexOnChain.polGasBalance.toFixed(2)} POL
              </div>
              <div className="text-[11px] text-[#527399] font-mono truncate mt-0.5">
                Wallet: {liveConnectors.polygonDexOnChain.walletAddress || 'Nicht konfiguriert'}
              </div>
            </div>

            <div className="pt-2 border-t border-sky-200/60">
              <div className="font-bold text-[#0b213a]">2. Aktien Routing (Alpaca IEX)</div>
              <div className="text-[#395b82] mt-0.5">{liveConnectors.alpacaEquities.statusText}</div>
            </div>

            <div className="pt-2 border-t border-sky-200/60">
              <div className="font-bold text-[#0b213a]">3. Forex Währungspaare (ECN / On-Chain)</div>
              <div className="text-[#395b82] mt-0.5">{liveConnectors.forexEcnBridge.statusText}</div>
            </div>
          </div>

          <div className="text-xs text-[#496a91] font-mono tabular-nums flex justify-between pt-2 border-t border-sky-200/70">
            <span>Kumulierte Gebühren:</span>
            <span className="font-bold text-[#0b213a]">${portfolio.totalFeesPaidUsd.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="waterdrop-card p-6">
        <div className="flex items-center justify-between pb-4 border-b border-sky-200/70">
          <div>
            <h3 className="text-base font-bold text-[#0b213a]">
              Aktive Positionen ({portfolio.openPositions.length})
            </h3>
            <p className="text-xs text-[#496a91]">
              Automatische Überwachung auf Stop-Loss, Take-Profit und Confluence-Trendumkehr bei jedem Markt-Scan
            </p>
          </div>
        </div>

        {portfolio.openPositions.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-[#395b82]">
              Aktuell sind keine Positionen im {activeMode === 'DEMO' ? 'Demo-Portfolio' : 'Echt-Betrieb'} geöffnet.
            </p>
            <button
              type="button"
              onClick={onSwitchTabToScanner}
              className="waterdrop-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Markt-Scanner öffnen & Trade ausführen
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-sky-200/80 text-[11px] font-semibold text-[#496a91]">
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3">Richtung</th>
                  <th className="py-3 px-3 text-right">Einstieg</th>
                  <th className="py-3 px-3 text-right">Aktuell</th>
                  <th className="py-3 px-3 text-right">Volumen (USD)</th>
                  <th className="py-3 px-3 text-right">Stop-Loss / Take-Profit</th>
                  <th className="py-3 px-3 text-right">Unrealisierter PnL</th>
                  <th className="py-3 px-3">Einstiegs-Signal</th>
                  <th className="py-3 px-3 text-right">Glattstellen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200/50 text-xs">
                {portfolio.openPositions.map(pos => {
                  const isProfit = pos.unrealizedPnlUsd >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-sky-100/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#0b213a]">{pos.displaySymbol}</div>
                        <div className="text-[11px] text-[#496a91]">{pos.category} · {pos.executionVenue}</div>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <span className={`inline-flex items-center gap-1 ${pos.side === 'LONG' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {pos.side === 'LONG' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#1e3a5f]">
                        {pos.entryPrice}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#0b213a]">
                        {pos.currentPrice}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#0b213a]">
                        ${pos.notionalUsd.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[11px]">
                        <span className="text-rose-700">SL: {pos.stopLoss}</span>
                        <span className="mx-1 text-[#496a91]">/</span>
                        <span className="text-emerald-700">TP: {pos.takeProfit}</span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isProfit ? '+' : ''}${pos.unrealizedPnlUsd.toFixed(2)} ({isProfit ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%)
                      </td>
                      <td className="py-3 px-3 max-w-[220px] text-[11px] text-[#395b82] truncate">
                        {pos.entryReason}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={closingId === pos.id}
                          onClick={() => handleCloseClick(pos.id)}
                          className="waterdrop-btn-pearl px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{closingId === pos.id ? 'Schließe...' : 'Schließen'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Trades History */}
      <div className="waterdrop-card p-6">
        <div className="pb-4 border-b border-sky-200/70">
          <h3 className="text-base font-bold text-[#0b213a]">
            Abgeschlossene Trades & Gewinn/Verlust-Historie ({portfolio.closedTrades.length})
          </h3>
          <p className="text-xs text-[#496a91]">
            Jeder abgeschlossene Trade fließt automatisch in die KI-Selbstoptimierung der Strategieparameter ein
          </p>
        </div>

        {portfolio.closedTrades.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#496a91]">
            Noch keine abgeschlossenen Trades in diesem Modus vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-sky-200/80 text-[11px] font-semibold text-[#496a91]">
                  <th className="py-2.5 px-3">Zeitpunkt</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Seite</th>
                  <th className="py-2.5 px-3 text-right">Einstieg → Ausstieg</th>
                  <th className="py-2.5 px-3 text-right">Volumen</th>
                  <th className="py-2.5 px-3">Ausstiegsgrund</th>
                  <th className="py-2.5 px-3 text-right">Gebühr</th>
                  <th className="py-2.5 px-3 text-right">Netto-PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200/50 text-xs">
                {portfolio.closedTrades.slice(0, 25).map(trd => {
                  const win = trd.realizedPnlUsd >= 0;
                  return (
                    <tr key={trd.id} className="hover:bg-sky-100/40">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-[11px] text-[#496a91]">
                        {new Date(trd.closedAt).toLocaleTimeString('de-DE')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#0b213a]">
                        {trd.displaySymbol} <span className="font-normal text-[#496a91]">· {trd.category}</span>
                      </td>
                      <td className={`py-2.5 px-3 font-bold ${trd.side === 'LONG' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {trd.side}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1e3a5f]">
                        {trd.entryPrice} → {trd.exitPrice}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#0b213a]">
                        ${trd.notionalUsd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-[#395b82] font-medium">
                        {trd.exitReason}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#496a91]">
                        ${trd.feePaidUsd.toFixed(4)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${win ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {win ? '+' : ''}${trd.realizedPnlUsd.toFixed(2)} ({win ? '+' : ''}{trd.realizedPnlPct.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
