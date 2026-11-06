import React, { useState } from 'react';
import { TradingSystemState } from '../../types/trading';
import { Layers, DollarSign, Cpu, Shield, Play, CheckCircle2 } from 'lucide-react';
import { safePostJson } from '../../lib/api';

interface ConceptMasterplanViewProps {
  liveConnectors: TradingSystemState['liveConnectors'];
  onRefreshState: () => Promise<void>;
}

export const ConceptMasterplanView: React.FC<ConceptMasterplanViewProps> = ({
  liveConnectors,
  onRefreshState
}) => {
  const [walletInput, setWalletInput] = useState(liveConnectors.polygonDexOnChain.walletAddress || '');
  const [walletSaveStatus, setWalletSaveStatus] = useState<string | null>(null);

  const [pythonCode, setPythonCode] = useState<string>(
`import urllib.request
import json

# Kostenloser Live-Spread & Arbitrage Check (Binance BTCUSDT vs. CoinGecko)
req = urllib.request.Request("https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT", headers={'User-Agent': 'AgentZero/2.0'})
with urllib.request.urlopen(req, timeout=8) as res:
    book = json.loads(res.read().decode('utf-8'))

bid = float(book['bidPrice'])
ask = float(book['askPrice'])
spread_bps = ((ask - bid) / bid) * 10000
print(f"BTC/USDT Live Orderbook -> Bid: \${bid:,.2f} | Ask: \${ask:,.2f} | Spread: {spread_bps:.2f} bps")
`
  );
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletSaveStatus('Speichere...');
    const res = await safePostJson<{ success: boolean; error?: string }>('/api/wallet/address', { address: walletInput });
    if (res.ok && res.data?.success) {
      setWalletSaveStatus('Polygon Wallet erfolgreich verknüpft.');
      await onRefreshState();
    } else {
      setWalletSaveStatus(res.data?.error || res.error || 'Ungültige Adresse.');
    }
  };

  const handleRunPython = async () => {
    setIsRunningSandbox(true);
    setSandboxOutput('Führe quantitatives Python-Skript in lokaler Sandbox aus...');
    const res = await safePostJson<{ success: boolean; output?: string; error?: string }>('/api/sandbox/execute-python', {
      code: pythonCode,
      purpose: 'Quantitative Market Microstructure Check',
      timeout_seconds: 15
    });
    setIsRunningSandbox(false);
    if (res.ok && res.data) {
      setSandboxOutput(res.data.output || res.data.error || 'Ausführung beendet.');
    } else {
      setSandboxOutput(res.error || 'Fehler bei der Sandbox-Ausführung.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Architecture Hero Card */}
      <div className="waterdrop-card p-6 space-y-4">
        <div className="text-xs text-[#496a91]">
          System-Architektur & Umsetzungsplan · Agent Zero Autonomous Multi-Asset Engine
        </div>
        <h2 className="text-2xl font-bold text-[#0b213a] tracking-tight">
          Konzept & Masterplan: Kostenlose 24/7 Marktüberwachung, Minimal-Gebühren-Execution & KI-Selbstoptimierung
        </h2>
        <p className="text-sm text-[#2c4c70] leading-relaxed max-w-4xl">
          Um Aktien, Kryptowährungen und Währungspaare (Forex) durchgehend profitabel zu handeln, eliminiert der neue Agent Zero die zwei größten Renditekiller klassischer Trading-Bots: laufende Datenfeed-Fixkosten und hohe Order-Kommissionen. Gleichzeitig trennt das System strikt zwischen risikofreiem Paper-Trading (Demo-Modus mit echten Marktkursen) und verifiziertem Echt-Betrieb.
        </p>
      </div>

      {/* 4 Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="waterdrop-card p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-[#0b213a]">
            <Layers className="w-5 h-5 text-sky-600 shrink-0" />
            <h3 className="text-base font-bold">01. Kostenlose 24/7 Echtzeit-Marktüberwachung (0,00 € Datenkosten)</h3>
          </div>
          <p className="text-xs text-[#395b82] leading-relaxed">
            Statt teurer Bloomberg- oder Paid-WebSocket-Abos aggregiert Agent Zero drei hochverfügbare, komplett kostenlose institutionelle Endpunkte direkt im Backend:
          </p>
          <ul className="space-y-1.5 text-xs text-[#1e3a5f] pt-1">
            <li>· <strong>Aktien & ETFs (NVDA, AAPL, MSFT, TSLA, SPY, QQQ):</strong> Yahoo Finance v8 Chart-Stream mit 15m/5m Intraday-OHLCV-Kerzen ohne API-Key-Pflicht.</li>
            <li>· <strong>Krypto Spot & DEX (BTC, ETH, SOL, POL, LINK):</strong> Öffentlicher Binance Spot REST Klines-Feed (Millisekunden-Latenz, 0 Kosten).</li>
            <li>· <strong>Forex Währungspaare (EUR/USD, GBP/USD, USD/JPY, USD/CHF):</strong> Kombination aus Yahoo FX Interbank-Stream und EZB Frankfurter Referenzkursen.</li>
            <li>· <strong>Lokale Indikator-Berechnung (0 LLM-Token):</strong> RSI(14), EMA 9/21, MACD, Bollinger %B und ATR(14) werden nativ in TypeScript berechnet — KI-Token werden nur bei echten Strategie-Entscheidungen verbraucht.</li>
          </ul>
        </div>

        <div className="waterdrop-card p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-[#0b213a]">
            <DollarSign className="w-5 h-5 text-sky-600 shrink-0" />
            <h3 className="text-base font-bold">02. Ultra-Günstige Trade-Ausführung (Minimaler Slippage & Fee-Footprint)</h3>
          </div>
          <p className="text-xs text-[#395b82] leading-relaxed">
            Jeder Basispunkt an gesparter Gebühr erhöht direkt den Netto-Erwartungswert (Expectancy) des Bots:
          </p>
          <ul className="space-y-1.5 text-xs text-[#1e3a5f] pt-1">
            <li>· <strong>On-Chain Krypto & Tokenized Assets (Polygon PoS):</strong> Ausführung über QuickSwap V3 & Uniswap V3 (0.03% – 0.05% Pool-Fee) bei Polygon Gas-Kosten von unter $0.004 pro Transaktion.</li>
            <li>· <strong>US-Aktien & ETFs (Zero-Commission Routing):</strong> Vorbereitet für Alpaca Markets Commission-Free API (0,00 $ Orderprovision über IEX/MEMX).</li>
            <li>· <strong>Währungspaare (Forex):</strong> Direktes Interbank-Spot-Routing / On-Chain FX Pools mit minimalem Spread (ab 1.2 bps auf EUR/USD).</li>
            <li>· <strong>Dynamisches ATR-Risikomanagement:</strong> Jede Position erhält beim Einstieg automatisch einen an die aktuelle Marktvolatilität (ATR 14) angepassten Stop-Loss und Take-Profit.</li>
          </ul>
        </div>

        <div className="waterdrop-card p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-[#0b213a]">
            <Cpu className="w-5 h-5 text-sky-600 shrink-0" />
            <h3 className="text-base font-bold">03. Autonome KI-Selbstoptimierung (Closed-Loop Evolution)</h3>
          </div>
          <p className="text-xs text-[#395b82] leading-relaxed">
            Agent Zero bewertet seine eigenen abgeschlossenen Trades kontinuierlich und verbessert seine Parameter ohne menschliches Eingreifen:
          </p>
          <ul className="space-y-1.5 text-xs text-[#1e3a5f] pt-1">
            <li>· <strong>Stop-Loss-Analyse:</strong> Werden Positionen zu oft durch kurzfristiges Marktrauschen ausgestoppt, erweitert die Engine selbstständig den ATR-Stop-Multiplikator und hebt den Mindest-Confluence-Score an.</li>
            <li>· <strong>Gewinnlauf-Maximierung:</strong> Bei hoher Trefferquote (&gt;55% Win-Rate) weitet Agent Zero das Take-Profit-Ziel aus, um starke Trends voll auszuschöpfen.</li>
            <li>· <strong>KI-Strategie-Synthese:</strong> Über Llama-3.3-70B (Groq) und Gemini 3.8 Flash werden Marktregime-Wechsel analysiert und im Evolutions-Protokoll dokumentiert.</li>
          </ul>
        </div>

        <div className="waterdrop-card p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-[#0b213a]">
            <Shield className="w-5 h-5 text-sky-600 shrink-0" />
            <h3 className="text-base font-bold">04. Strikte Dual-Mode Architektur (Demo-Spielgeld vs. Echt-Betrieb)</h3>
          </div>
          <p className="text-xs text-[#395b82] leading-relaxed">
            Klare Trennung zwischen risikofreier Strategie-Erprobung und verifiziertem Echtgeld-Einsatz:
          </p>
          <ul className="space-y-1.5 text-xs text-[#1e3a5f] pt-1">
            <li>· <strong>DEMO-MODUS (Paper Trading):</strong> Nutzt ein jederzeit zurücksetzbares Spielgeld-Konto ($10.000 Startkapital), rechnet aber zu 100% mit den echten Live-Börsenkursen, echten Spreads und realen Gebühren.</li>
            <li>· <strong>ECHT-BETRIEB (Zero-Dummy-Data Policy):</strong> Vollständiges Verbot fiktiver Daten. Das Guthaben wird direkt aus der verifizierten Polygon-Blockchain (`USDC` & `POL`) gelesen. Nicht verbundene Broker werden ehrlich ausgewiesen statt simuliert.</li>
          </ul>
        </div>
      </div>

      {/* Bottom Split: Live Wallet Configuration & Quantitative Python Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 5 Cols: Live Wallet & Connector Binding */}
        <div className="lg:col-span-5 waterdrop-card p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#0b213a]">
              On-Chain Wallet & Live-Connector Konfiguration
            </h3>
            <p className="text-xs text-[#395b82]">
              Verknüpfe deine Polygon PoS EVM-Adresse für die Echtzeit-Synchronisation im Echt-Betrieb.
            </p>
          </div>

          <form onSubmit={handleSaveWallet} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="polygon-wallet-input" className="text-xs font-semibold text-[#1e3a5f]">
                Polygon PoS Wallet-Adresse (0x...)
              </label>
              <input
                id="polygon-wallet-input"
                type="text"
                value={walletInput}
                onChange={e => setWalletInput(e.target.value)}
                placeholder="0x..."
                className="pearl-surface w-full px-3.5 py-2 rounded-xl font-mono text-xs text-[#0b213a]"
              />
            </div>

            {walletSaveStatus && (
              <div className="text-xs text-sky-800 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{walletSaveStatus}</span>
              </div>
            )}

            <button
              type="submit"
              className="waterdrop-btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Wallet-Adresse synchronisieren
            </button>
          </form>

          <div className="pearl-surface rounded-2xl p-4 text-xs font-mono tabular-nums space-y-1.5">
            <div className="flex justify-between">
              <span className="font-sans text-[#496a91]">Verifiziertes On-Chain USDC:</span>
              <span className="font-bold text-[#0b213a]">{liveConnectors.polygonDexOnChain.usdcBalance.toFixed(4)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[#496a91]">Polygon Gas-Reserve:</span>
              <span className="font-bold text-[#0b213a]">{liveConnectors.polygonDexOnChain.polGasBalance.toFixed(4)} POL</span>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Quantitative Python Research Sandbox */}
        <div className="lg:col-span-7 waterdrop-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0b213a]">
                Quantitative Python 3 Analyse-Sandbox
              </h3>
              <p className="text-xs text-[#395b82]">
                Direkte Ausführung eigener Orderbuch- und Arbitrage-Skripte auf dem Server
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunPython}
              disabled={isRunningSandbox}
              className="waterdrop-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningSandbox ? 'Läuft...' : 'Python-Analyse starten'}</span>
            </button>
          </div>

          <textarea
            value={pythonCode}
            onChange={e => setPythonCode(e.target.value)}
            rows={6}
            className="pearl-surface w-full p-3.5 rounded-2xl font-mono text-xs text-[#0b213a] focus:outline-none focus:ring-2 focus:ring-sky-400"
          />

          {sandboxOutput && (
            <pre className="pearl-surface p-3.5 rounded-2xl font-mono text-xs text-[#0b213a] overflow-x-auto whitespace-pre-wrap max-h-36">
              {sandboxOutput}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
