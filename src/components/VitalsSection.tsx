import React, { useState, useEffect } from 'react';
import { AgentState, MetaMaskTradingKnowledge, MetaMaskTokenDef } from '../types';
import { 
  HeartPulse, ShieldAlert, CheckCircle2, Clock, Flame, Coins, Zap, RefreshCw, 
  AlertTriangle, Trash2, Cpu, Fuel, Globe, Search, Layers, TrendingUp, ExternalLink,
  BookOpen, Compass, ArrowUpRight
} from 'lucide-react';
import { safePostJson, safeFetchJson } from '../lib/api';

interface VitalsSectionProps {
  state: AgentState | null;
  onRefresh: () => void;
}

export const VitalsSection: React.FC<VitalsSectionProps> = ({ state, onRefresh }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [isResettingDeadline, setIsResettingDeadline] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Multi-Chain & Crypto Knowledge State
  const [cryptoTokens, setCryptoTokens] = useState<any[]>([]);
  const [cryptoKnowledge, setCryptoKnowledge] = useState<MetaMaskTradingKnowledge[]>([]);
  const [multiChainReport, setMultiChainReport] = useState<any>(null);
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('all');

  const blacklisted = state?.blacklisted_models || [];
  const tributesPaid = state?.tributes_paid ?? 0;
  const balance = state?.current_balance ?? 0;
  const polBalance = state?.agent_eth_balance ?? 0;
  const tributeDue = state?.current_tribute_due ?? 1.0;
  const birthTime = state?.birth_time ? new Date(state.birth_time).toLocaleString('de-DE') : 'Unbekannt';
  const nextTributeTime = state?.next_tribute_time ? new Date(state.next_tribute_time).toLocaleString('de-DE') : 'Unbekannt';
  const activeModel = state?.active_model || 'GroqCloud LLM';

  const loadCryptoData = async () => {
    try {
      const [tokRes, knowRes, portRes] = await Promise.all([
        safeFetchJson<{ tokens: any[] }>('/api/crypto/tokens'),
        safeFetchJson<{ knowledge: MetaMaskTradingKnowledge[] }>('/api/crypto/knowledge'),
        safeFetchJson<{ success: boolean; portfolio: any }>('/api/crypto/portfolio')
      ]);

      if (tokRes.ok && tokRes.data?.tokens) setCryptoTokens(tokRes.data.tokens);
      if (knowRes.ok && knowRes.data?.knowledge) setCryptoKnowledge(knowRes.data.knowledge);
      if (portRes.ok && portRes.data?.portfolio) setMultiChainReport(portRes.data.portfolio);
    } catch {}
  };

  useEffect(() => {
    loadCryptoData();
  }, [state]);

  const handleResetDeadline = async () => {
    setIsResettingDeadline(true);
    const res = await safePostJson<{ success: boolean }>('/api/deadline/reset');
    setIsResettingDeadline(false);
    if (res.ok) {
      setActionFeedback('48h-Überlebensfrist erfolgreich auf 48 Stunden ab jetzt zurückgesetzt.');
      setTimeout(() => setActionFeedback(null), 4000);
      onRefresh();
    } else {
      setActionFeedback('Fehler beim Zurücksetzen der Deadline: ' + (res.error || 'Serverfehler'));
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleClearBlacklist = async () => {
    setIsClearing(true);
    const res = await safePostJson<{ success: boolean }>('/api/blacklist/clear');
    setIsClearing(false);
    if (res.ok) {
      setActionFeedback('Modell-Blacklist erfolgreich geleert.');
      setTimeout(() => setActionFeedback(null), 3000);
      onRefresh();
    }
  };

  const handleTriggerCycle = async () => {
    setIsRunningCycle(true);
    setActionFeedback('Führe realen Kognitionszyklus aus...');
    const res = await safePostJson<{ success: boolean }>('/api/cycle/run');
    setIsRunningCycle(false);
    if (res.ok) {
      setActionFeedback('Zyklus erfolgreich ausgeführt.');
    } else {
      setActionFeedback('Zyklus fehlgeschlagen: ' + (res.error || 'Serverfehler'));
    }
    setTimeout(() => setActionFeedback(null), 4000);
    onRefresh();
    loadCryptoData();
  };

  const handleTriggerResearch = async () => {
    setIsResearching(true);
    setActionFeedback('Starte autonome Web-Recherche über CoinGecko & DeFiLlama APIs...');
    const res = await safePostJson<{ success: boolean; new_insight: string; yield_pools: any[] }>('/api/crypto/research', {
      target_token: 'USDC',
      chain_key: 'polygon'
    });
    setIsResearching(false);
    if (res.ok) {
      setActionFeedback(`Marktanalyse erfolgreich: ${res.data?.new_insight || 'Neue Heuristiken hinterlegt.'}`);
      loadCryptoData();
      onRefresh();
    } else {
      setActionFeedback('Recherche-Fehler: ' + (res.error || 'API nicht erreichbar'));
    }
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const filteredTokens = selectedChainFilter === 'all' 
    ? cryptoTokens 
    : cryptoTokens.filter(t => t.chain_key === selectedChainFilter);

  const totalUsdcAllChains = multiChainReport?.total_usdc_across_chains ?? balance;
  const totalPortfolioUsd = multiChainReport?.total_portfolio_usd ?? (balance + (polBalance * 0.1143));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Lebensdaten & MetaMask Multi-Chain Matrix
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Echtzeit-Vitalwerte, Polygon Gas (POL), Multi-Chain Token-Erkennung & Autonome Marktrecherche
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerResearch}
            disabled={isResearching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow transition-all cursor-pointer"
            title="Autonome Web-Recherche für Token-Preise und DeFi-Renditen starten"
          >
            <Compass className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin' : ''}`} />
            <span>{isResearching ? 'Recherchiere...' : 'Web-Recherche (DeFi)'}</span>
          </button>
          <button
            onClick={handleResetDeadline}
            disabled={isResettingDeadline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold shadow transition-all cursor-pointer"
            title="Überlebensfrist auf 48 Stunden ab jetzt zurücksetzen"
          >
            <Clock className={`w-3.5 h-3.5 ${isResettingDeadline ? 'animate-spin' : ''}`} />
            <span>{isResettingDeadline ? 'Resette...' : 'Deadline resetten (48h)'}</span>
          </button>
          <button
            onClick={handleTriggerCycle}
            disabled={isRunningCycle || state?.is_terminated}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
            <span>{isRunningCycle ? 'Analysiere...' : 'Manueller Denkzyklus'}</span>
          </button>
          <button
            onClick={() => { onRefresh(); loadCryptoData(); }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-fadeIn">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Grid: 4 Core Vitals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vital 1: Birth & Level */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Geburt & Level</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              Level {tributesPaid}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {tributesPaid > 0 ? `Überlebender (Lvl ${tributesPaid})` : 'Neugeboren (Lvl 0)'}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
            <div>Geburtszeit: <span className="text-slate-200">{birthTime}</span></div>
            <div>Tribute bezahlt: <span className="text-purple-400 font-bold">{tributesPaid}</span></div>
          </div>
        </div>

        {/* Vital 2: Live Balance & Multi-Chain USDC */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Polygon On-Chain Saldo</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {balance.toFixed(4)} <span className="text-sm font-normal text-emerald-400/80">USDC</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Fuel className="w-3 h-3 text-purple-400" /> Gas:
            </span>
            <span className="text-purple-300 font-bold">{polBalance.toFixed(4)} POL</span>
          </div>
        </div>

        {/* Vital 3: 48h Deadline & Tribute */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fälliger Tribut</span>
            <Flame className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {tributeDue.toFixed(2)} <span className="text-sm font-normal text-purple-400/80">USDC</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
            <div>Frist: <span className="text-amber-300">{nextTributeTime}</span></div>
            <button
              onClick={handleResetDeadline}
              disabled={isResettingDeadline}
              className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Frist jetzt um +48h verlängern
            </button>
          </div>
        </div>

        {/* Vital 4: System Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Betriebsmodus</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold flex items-center gap-2">
            {state?.is_terminated ? (
              <span className="text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> TERMINIERT
              </span>
            ) : state?.is_running ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> AUTONOM AKTIV
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> PAUSIERT
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80 truncate">
            <span>Aktives LLM:</span> <span className="text-slate-200">{activeModel}</span>
          </div>
        </div>
      </div>

      {/* METAMASK MULTI-CHAIN & TOKEN REGISTRY MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              MetaMask Token- & Blockchain-Erkennung (Echtzeit-Bewertung)
            </h2>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">Filter:</span>
            {['all', 'polygon', 'ethereum', 'arbitrum', 'base'].map(chainKey => (
              <button
                key={chainKey}
                onClick={() => setSelectedChainFilter(chainKey)}
                className={`px-2.5 py-1 rounded text-xs uppercase font-medium transition-all cursor-pointer ${
                  selectedChainFilter === chainKey
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {chainKey === 'all' ? 'Alle Chains' : chainKey}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Gesamtes Portfolio (USD)</span>
            <span className="text-base font-bold text-slate-100">${totalPortfolioUsd.toFixed(2)} USD</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Aggregiertes USDC (Alle Chains)</span>
            <span className="text-base font-bold text-emerald-400">{totalUsdcAllChains.toFixed(4)} USDC</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Erkannte Token-Kontrakte</span>
            <span className="text-base font-bold text-cyan-300">{cryptoTokens.length} Tokens verifiziert</span>
          </div>
        </div>

        {/* Token Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-2.5 px-3">Asset / Token</th>
                <th className="py-2.5 px-3">Blockchain</th>
                <th className="py-2.5 px-3">Typ</th>
                <th className="py-2.5 px-3 text-right">Preis (USD)</th>
                <th className="py-2.5 px-3 text-right">24h Änd.</th>
                <th className="py-2.5 px-3 text-right">On-Chain Saldo</th>
                <th className="py-2.5 px-3 text-right">Wert (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTokens.map((token, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                        {token.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div>{token.symbol}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {token.chain_name || token.chain_key}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {token.is_gas_token ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800 font-medium">
                        GAS NATIVE
                      </span>
                    ) : token.category === 'STABLECOIN' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-medium">
                        STABLECOIN
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800 font-medium">
                        {token.category || 'ERC-20'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                    ${token.usd_price < 1 ? token.usd_price.toFixed(4) : token.usd_price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-medium ${
                    (token.change_24h_percent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {(token.change_24h_percent ?? 0) >= 0 ? '+' : ''}
                    {(token.change_24h_percent ?? 0).toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                    {token.balance.toLocaleString('de-DE', { minimumFractionDigits: token.decimals > 6 ? 4 : 2, maximumFractionDigits: token.decimals > 6 ? 5 : 4 })} {token.symbol}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    ${(token.usd_value ?? (token.balance * token.usd_price)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUTONOMOUS CRYPTO KNOWLEDGE & WEB RESEARCH SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Autonome Krypto- & DEX-Marktforschung (Erweitertes Wissen)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Wissens-Module: <strong className="text-purple-400">{cryptoKnowledge.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cryptoKnowledge.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 uppercase font-semibold">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-500">
                  Konfidenz: <strong className="text-emerald-400">{(item.confidence * 100).toFixed(0)}%</strong>
                </span>
              </div>
              <div className="font-bold text-slate-200">{item.title}</div>
              <p className="text-slate-400 leading-relaxed">{item.summary}</p>
              {item.details && (
                <p className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-1.5 font-mono">{item.details}</p>
              )}
              {item.apis_used && item.apis_used.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-cyan-400">
                  <span>Recherche-Quellen:</span>
                  {item.apis_used.map((api, apiIdx) => (
                    <span key={apiIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {api.replace('https://', '').split('/')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Model Blacklist Management Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              LLM Modell-Blacklist (Selbstheilung)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Gesperrte Modelle: <strong className={blacklisted.length > 0 ? 'text-rose-400' : 'text-emerald-400'}>{blacklisted.length}</strong>
            </span>
            {blacklisted.length > 0 && (
              <button
                onClick={handleClearBlacklist}
                disabled={isClearing}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Blacklist leeren</span>
              </button>
            )}
          </div>
        </div>

        {blacklisted.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-emerald-400">Keine Modelle auf der Blacklist.</strong> Alle angebundenen GroqCloud-Modelle sind betriebsbereit und antworten regulär auf API-Anfragen.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Folgende Modelle wurden vom Agenten nach echten API-Fehlern (z. B. Rate-Limits, 404-Status oder Timeouts) temporär isoliert, um Systemausfälle zu verhindern:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {blacklisted.map((model, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-800/40 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 text-rose-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">{model}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700 shrink-0">
                    ISOLIERT
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

