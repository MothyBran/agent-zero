import React, { useState } from 'react';
import {
  Globe,
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Terminal,
  Database,
  Code,
  Shield,
  Zap,
  ExternalLink,
  Layers
} from 'lucide-react';
import { HttpRequestResult } from '../types';
import { safePostJson } from '../lib/api';

interface LiveAutomatonWorkbenchProps {
  onRefresh?: () => void;
  walletAddress?: string;
  creatorAddress?: string;
  tributesPaid?: number;
}

export const LiveAutomatonWorkbench: React.FC<LiveAutomatonWorkbenchProps> = ({
  onRefresh,
  walletAddress,
  creatorAddress,
  tributesPaid = 0
}) => {
  const [activeTab, setActiveTab] = useState<'http' | 'search' | 'blockchain'>('http');

  // HTTP Request State
  const [httpUrl, setHttpUrl] = useState('https://api.polygonscan.com/api?module=proxy&action=eth_blockNumber');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT'>('GET');
  const [httpHeaders, setHttpHeaders] = useState('');
  const [httpBody, setHttpBody] = useState('');
  const [autoSaveKnowledge, setAutoSaveKnowledge] = useState(true);
  const [isExecutingHttp, setIsExecutingHttp] = useState(false);
  const [httpResult, setHttpResult] = useState<HttpRequestResult | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);

  // Web Search State
  const [searchQuery, setSearchQuery] = useState('Polygon PoS USDC smart contract live events bounties');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);

  // Tribute & Work State
  const [isPayingTribute, setIsPayingTribute] = useState(false);
  const [tributeTxResult, setTributeTxResult] = useState<{ success: boolean; message: string; txHash?: string; explorerUrl?: string } | null>(null);

  const handleExecuteHttp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!httpUrl.trim()) return;

    setIsExecutingHttp(true);
    setHttpError(null);
    setHttpResult(null);

    let parsedHeaders: Record<string, string> = {};
    if (httpHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(httpHeaders);
      } catch {
        setHttpError('Ungültiges JSON-Format im Headers-Feld.');
        setIsExecutingHttp(false);
        return;
      }
    }

    try {
      const res = await safePostJson<{ result?: HttpRequestResult; success?: boolean; error?: string }>('/api/tools/http-request', {
        url: httpUrl.trim(),
        method: httpMethod,
        headers: parsedHeaders,
        body: httpBody.trim() || undefined,
        auto_save_knowledge: autoSaveKnowledge
      });

      if (res.ok && res.data?.result) {
        setHttpResult(res.data.result);
        if (onRefresh) onRefresh();
      } else {
        setHttpError(res.error || res.data?.error || 'HTTP-Anfrage fehlgeschlagen.');
      }
    } catch (err: any) {
      setHttpError(err.message);
    } finally {
      setIsExecutingHttp(false);
    }
  };

  const handleExecuteSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await safePostJson<{ result?: string; success?: boolean; error?: string }>('/api/tools/search', {
        query: searchQuery.trim()
      });
      if (res.ok && res.data?.result) {
        setSearchResult(res.data.result);
        if (onRefresh) onRefresh();
      } else {
        setSearchResult(`Fehler: ${res.error || res.data?.error || 'Suche fehlgeschlagen.'}`);
      }
    } catch (err: any) {
      setSearchResult(`Fehler: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualTribute = async () => {
    setIsPayingTribute(true);
    setTributeTxResult(null);
    try {
      const res = await safePostJson<{ success: boolean; message: string; txHash?: string; explorerUrl?: string }>('/api/tools/pay-tribute');
      if (res.ok && res.data) {
        setTributeTxResult(res.data);
        if (onRefresh) onRefresh();
      } else {
        setTributeTxResult({ success: false, message: res.error || 'Tribut-Zahlung fehlgeschlagen.' });
      }
    } catch (err: any) {
      setTributeTxResult({ success: false, message: err.message });
    } finally {
      setIsPayingTribute(false);
    }
  };

  return (
    <div id="live-automaton-workbench" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Live Automaton & API Workbench</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Real HTTP & On-Chain
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reale Werkzeuge: Führe echte API-Anfragen, Web-Recherchen und On-Chain Polygon-Zahlungen aus.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('http')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
              activeTab === 'http'
                ? 'bg-slate-800 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HTTP Request Tool
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-slate-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DuckDuckGo Search
          </button>
          <button
            onClick={() => setActiveTab('blockchain')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
              activeTab === 'blockchain'
                ? 'bg-slate-800 text-purple-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            On-Chain Pacht & RPC
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE HTTP REQUEST TOOL */}
      {activeTab === 'http' && (
        <div className="space-y-4">
          <form onSubmit={handleExecuteHttp} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={httpMethod}
                onChange={e => setHttpMethod(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>

              <input
                type="url"
                value={httpUrl}
                onChange={e => setHttpUrl(e.target.value)}
                placeholder="https://api.polygonscan.com/api..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />

              <button
                type="submit"
                disabled={isExecutingHttp}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isExecutingHttp ? 'Sende...' : 'Ausführen'}</span>
              </button>
            </div>

            {/* Optional Header & Body Inputs */}
            {httpMethod !== 'GET' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Headers (JSON)</label>
                  <textarea
                    value={httpHeaders}
                    onChange={e => setHttpHeaders(e.target.value)}
                    placeholder='{"Content-Type": "application/json"}'
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Request Body (JSON/Text)</label>
                  <textarea
                    value={httpBody}
                    onChange={e => setHttpBody(e.target.value)}
                    placeholder='{"query": "data"}'
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoSaveCheckbox"
                checked={autoSaveKnowledge}
                onChange={e => setAutoSaveKnowledge(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="autoSaveCheckbox" className="text-xs text-slate-400 cursor-pointer select-none">
                Ergebnis & Latenz automatisch als Erkenntnis im Langzeit-Speicher sichern
              </label>
            </div>
          </form>

          {/* Quick preset endpoints */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
            <span className="font-mono text-slate-500">Schnellauswahl:</span>
            {[
              { name: 'Polygon Block', url: 'https://api.polygonscan.com/api?module=proxy&action=eth_blockNumber' },
              { name: 'USDC Contract Info', url: 'https://api.polygonscan.com/api?module=contract&action=getabi&address=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
              { name: 'Polygon Gas Oracle', url: 'https://gasstation.polygon.technology/v2' }
            ].map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setHttpUrl(p.url);
                  setHttpMethod('GET');
                }}
                className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-[10px]"
              >
                {p.name}
              </button>
            ))}
          </div>

          {httpError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{httpError}</span>
            </div>
          )}

          {/* HTTP Result Display */}
          {httpResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    httpResult.is_success
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {httpResult.status_code} {httpResult.status_text}
                  </span>
                  <span className="text-xs text-slate-400 font-medium truncate max-w-sm">
                    {httpResult.method} {httpResult.url}
                  </span>
                </div>
                <span className="text-xs text-cyan-400 font-semibold">{httpResult.latency_ms} ms</span>
              </div>

              {httpResult.extracted_knowledge && (
                <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{httpResult.extracted_knowledge}</span>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Response Body:</span>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-200 overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {httpResult.body_snippet}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE DUCKDUCKGO SEARCH */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleExecuteSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Reale Web-Suche via DuckDuckGo..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold shadow transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Suche...' : 'Suchen'}</span>
            </button>
          </form>

          {searchResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 font-mono">
              <span className="text-[10px] text-slate-500 uppercase block">Ergebnisse aus dem Web:</span>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {searchResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ON-CHAIN PACHT & RPC */}
      {activeTab === 'blockchain' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Real Contract & Wallet Specs */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs font-mono">
              <h4 className="text-slate-200 font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" /> Polygon PoS On-Chain Konfiguration
              </h4>
              <div className="space-y-1 text-slate-400 pt-1">
                <div className="flex justify-between">
                  <span>Chain:</span>
                  <span className="text-slate-200">Polygon Mainnet (ID: 137)</span>
                </div>
                <div className="flex justify-between">
                  <span>USDC Token:</span>
                  <span className="text-emerald-400 truncate max-w-[200px]" title="0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359">
                    0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Agent Wallet:</span>
                  <span className="text-slate-200 truncate max-w-[200px]" title={walletAddress}>
                    {walletAddress || '0x...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Creator Empfänger:</span>
                  <span className="text-purple-300 truncate max-w-[200px]" title={creatorAddress}>
                    {creatorAddress || '0x...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual On-Chain Tribute Execution */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <h4 className="text-slate-200 font-bold font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Manuelle 48h Pacht-Zahlung
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Überträgt die fällige Pacht direkt on-chain an die Creator-Adresse. Jede erfolgreiche Transaktion setzt die 48h Überlebens-Frist ab sofort neu zurück.
              </p>
              <button
                onClick={handleManualTribute}
                disabled={isPayingTribute}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono text-xs font-bold shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{isPayingTribute ? 'Übertrage On-Chain...' : 'Server-Pacht jetzt on-chain zahlen'}</span>
              </button>
            </div>
          </div>

          {tributeTxResult && (
            <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
              tributeTxResult.success
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {tributeTxResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>{tributeTxResult.message}</span>
              </div>
              {tributeTxResult.explorerUrl && (
                <a
                  href={tributeTxResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline pt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Auf Polygonscan verifizieren</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
