import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LogEntry, ReasoningStreamItem } from '../types';
import {
  Terminal,
  Brain,
  Compass,
  Send,
  CornerDownRight,
  Coins,
  AlertTriangle,
  Activity,
  Copy,
  Check,
  Search,
  ArrowDown,
  Pause,
  Play,
  Trash2,
  Maximize2,
  Minimize2,
  Code,
  Layers,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Download
} from 'lucide-react';

interface LiveTerminalProps {
  logs: LogEntry[];
  reasoningStream?: ReasoningStreamItem[];
  walletAddress?: string;
  onClear?: () => void;
}

type StreamCategory = 'ALL' | 'THOUGHT' | 'PLAN' | 'REQUEST' | 'RESPONSE' | 'TX' | 'ERROR' | 'SYSTEM';

interface UnifiedStreamEvent {
  id: string;
  timestamp: string;
  category: 'THOUGHT' | 'PLAN' | 'REQUEST' | 'RESPONSE' | 'TX' | 'ERROR' | 'SYSTEM';
  badgeLabel: string;
  title?: string;
  message: string;
  rawPayload?: any;
  metadata?: any;
  latencyMs?: number;
  tokens?: number;
  txHash?: string;
  explorerUrl?: string;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({
  logs,
  reasoningStream = [],
  walletAddress,
  onClear
}) => {
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [selectedRawModal, setSelectedRawModal] = useState<UnifiedStreamEvent | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalScrollContainerRef = useRef<HTMLDivElement>(null);

  // Normalize logs and reasoning stream into a single chronological stream
  const unifiedStream = useMemo<UnifiedStreamEvent[]>(() => {
    const list: UnifiedStreamEvent[] = [];

    // 1. Ingest Standard Logs
    logs.forEach(log => {
      let category: UnifiedStreamEvent['category'] = 'SYSTEM';
      let badgeLabel = 'SYS';

      const level = log.level.toUpperCase();
      const msg = log.message || '';

      if (level === 'THOUGHT' || msg.includes('[GEDANKENGANG') || msg.includes('[THOUGHT')) {
        category = 'THOUGHT';
        badgeLabel = 'THOUGHT';
      } else if (level === 'PLAN' || msg.includes('[STRATEGISCHER AKTIONSPLAN') || msg.includes('[PLAN')) {
        category = 'PLAN';
        badgeLabel = 'PLAN';
      } else if (level === 'PROMPT' || msg.includes('[KI-ANFRAGE') || msg.includes('[PROMPT') || msg.includes('[API-ANFRAGE')) {
        category = 'REQUEST';
        badgeLabel = 'REQUEST';
      } else if (level === 'TOOL' || msg.includes('[WORK EXECUTION') || msg.includes('[SANDBOX') || msg.includes('[HTTP')) {
        category = 'REQUEST';
        badgeLabel = 'REQUEST';
      } else if (level === 'SUCCESS' || msg.includes('[API-ANTWORT') || msg.includes('[RESPONSE') || msg.includes('[ON-CHAIN INFLOW')) {
        category = 'RESPONSE';
        badgeLabel = 'RESPONSE';
      } else if (level === 'FINANCE' || msg.includes('[TX') || msg.includes('TRIBUT') || msg.includes('USDC') || log.metadata?.tx_hash) {
        category = 'TX';
        badgeLabel = 'TX_LEDGER';
      } else if (level === 'ERROR' || msg.includes('[ERROR') || msg.includes('Fehler') || msg.includes('FAILED')) {
        category = 'ERROR';
        badgeLabel = 'ERROR';
      } else {
        category = 'SYSTEM';
        badgeLabel = 'SYSTEM';
      }

      list.push({
        id: log.id || `log_${Math.random()}`,
        timestamp: log.timestamp,
        category,
        badgeLabel,
        message: log.message,
        metadata: log.metadata,
        rawPayload: log.metadata?.output || log.metadata?.thought || log.metadata?.prompt || log.metadata,
        latencyMs: log.metadata?.latency_ms,
        tokens: log.metadata?.tokens_used,
        txHash: log.metadata?.tx_hash,
        explorerUrl: log.metadata?.explorer_url
      });
    });

    // 2. Ingest Rich Reasoning Items (if distinct)
    reasoningStream.forEach(r => {
      const alreadyExists = list.some(item => item.id === r.id || item.message.includes(r.content?.slice(0, 40) || '___'));
      if (!alreadyExists && r.content) {
        let cat: UnifiedStreamEvent['category'] = 'THOUGHT';
        let badge = 'THOUGHT';
        if (r.type === 'PLAN') {
          cat = 'PLAN';
          badge = 'PLAN';
        } else if (r.type === 'PROMPT' || r.type === 'API_QUESTION' || r.type === 'TOOL_EXECUTION') {
          cat = 'REQUEST';
          badge = 'REQUEST';
        } else if (r.type === 'REFLECTION') {
          cat = 'THOUGHT';
          badge = 'REFLECTION';
        }

        list.push({
          id: r.id,
          timestamp: r.timestamp,
          category: cat,
          badgeLabel: badge,
          title: r.title,
          message: r.content,
          metadata: r.meta,
          rawPayload: r.meta,
          latencyMs: r.latency_ms,
          tokens: r.tokens
        });
      }
    });

    // Sort chronologically (oldest -> newest for a continuous top-to-bottom stream)
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [logs, reasoningStream]);

  // Filter & Search
  const filteredEvents = useMemo(() => {
    return unifiedStream.filter(event => {
      if (selectedCategory !== 'ALL' && event.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inMsg = event.message.toLowerCase().includes(q);
        const inCat = event.category.toLowerCase().includes(q);
        const inBadge = event.badgeLabel.toLowerCase().includes(q);
        const inTitle = (event.title || '').toLowerCase().includes(q);
        return inMsg || inCat || inBadge || inTitle;
      }
      return true;
    });
  }, [unifiedStream, selectedCategory, searchQuery]);

  // Handle auto-scroll down on new logs
  useEffect(() => {
    if (autoScroll && terminalScrollContainerRef.current) {
      terminalScrollContainerRef.current.scrollTop = terminalScrollContainerRef.current.scrollHeight;
    }
  }, [filteredEvents, autoScroll]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyTerminalOutput = () => {
    const text = filteredEvents
      .map(e => `[${new Date(e.timestamp).toISOString()}] [${e.badgeLabel}] ${e.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadLogsAsJson = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_zero_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryStyles = (category: UnifiedStreamEvent['category']) => {
    switch (category) {
      case 'THOUGHT':
        return {
          badge: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_8px_rgba(217,70,239,0.2)]',
          border: 'border-fuchsia-900/40 bg-fuchsia-950/10 hover:bg-fuchsia-950/20',
          text: 'text-fuchsia-200',
          icon: <Brain className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
        };
      case 'PLAN':
        return {
          badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.2)]',
          border: 'border-indigo-900/40 bg-indigo-950/10 hover:bg-indigo-950/20',
          text: 'text-indigo-200',
          icon: <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        };
      case 'REQUEST':
        return {
          badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.2)]',
          border: 'border-cyan-900/40 bg-cyan-950/10 hover:bg-cyan-950/20',
          text: 'text-cyan-200',
          icon: <Send className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        };
      case 'RESPONSE':
        return {
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
          border: 'border-emerald-900/40 bg-emerald-950/10 hover:bg-emerald-950/20',
          text: 'text-emerald-200',
          icon: <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        };
      case 'TX':
        return {
          badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
          border: 'border-amber-900/40 bg-amber-950/10 hover:bg-amber-950/20',
          text: 'text-amber-200',
          icon: <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        };
      case 'ERROR':
        return {
          badge: 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
          border: 'border-rose-900/50 bg-rose-950/15 hover:bg-rose-950/25',
          text: 'text-rose-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        };
      case 'SYSTEM':
      default:
        return {
          badge: 'bg-slate-900 text-slate-300 border-slate-700',
          border: 'border-slate-800/60 bg-slate-950/30 hover:bg-slate-900/40',
          text: 'text-slate-300',
          icon: <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        };
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<StreamCategory, number> = {
      ALL: unifiedStream.length,
      THOUGHT: 0,
      PLAN: 0,
      REQUEST: 0,
      RESPONSE: 0,
      TX: 0,
      ERROR: 0,
      SYSTEM: 0
    };
    unifiedStream.forEach(e => {
      if (counts[e.category] !== undefined) {
        counts[e.category]++;
      }
    });
    return counts;
  }, [unifiedStream]);

  return (
    <div className="flex-1 flex flex-col bg-[#05070e] text-slate-200 font-mono overflow-hidden relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* TERMINAL SUB-HEADER / TELEMETRY CONTROL BAR */}
      <div className="border-b border-slate-800/80 bg-[#070a14] px-4 py-2 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs shrink-0 select-none">
        {/* Left: Terminal Identity & Status */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider text-slate-100 uppercase">
              LIVE_AUTOMATON_STREAM
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              // TELEMETRIE & RAW LOGS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/70 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE_FEED
            </span>
            <span className="text-[11px] text-slate-400">
              {filteredEvents.length} <span className="text-slate-600">/ {unifiedStream.length}</span>
            </span>
          </div>
        </div>

        {/* Center: Stream Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-none">
          {(['ALL', 'THOUGHT', 'PLAN', 'REQUEST', 'RESPONSE', 'TX', 'ERROR'] as StreamCategory[]).map(cat => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;

            let colorClasses = 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900';
            if (isSelected) {
              if (cat === 'ALL') colorClasses = 'bg-slate-800 text-slate-100 border-slate-600 font-bold';
              else if (cat === 'THOUGHT') colorClasses = 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500 font-bold';
              else if (cat === 'PLAN') colorClasses = 'bg-indigo-950 text-indigo-300 border-indigo-500 font-bold';
              else if (cat === 'REQUEST') colorClasses = 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold';
              else if (cat === 'RESPONSE') colorClasses = 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold';
              else if (cat === 'TX') colorClasses = 'bg-amber-950 text-amber-300 border-amber-500 font-bold';
              else if (cat === 'ERROR') colorClasses = 'bg-rose-950 text-rose-300 border-rose-500 font-bold';
            }

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded text-[11px] border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${colorClasses}`}
              >
                <span>{cat}</span>
                <span className={`text-[9px] px-1 rounded-full ${isSelected ? 'bg-black/40' : 'bg-slate-900 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Action Toolbar */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {/* Live search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search logs / regex..."
              className="w-full bg-[#04060c] border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll aktiv' : 'Auto-scroll pausiert'}
            className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-cyan-950/70 border-cyan-800 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {autoScroll ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Copy all */}
          <button
            onClick={copyTerminalOutput}
            title="Kopiere gesamten Output"
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download JSON */}
          <button
            onClick={downloadLogsAsJson}
            title="Download Logs as JSON"
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear in-memory display */}
          {onClear && (
            <button
              onClick={onClear}
              title="Terminal-Ansicht leeren"
              className="p-1.5 rounded-md bg-slate-900 hover:bg-rose-950/40 hover:border-rose-800 border border-slate-800 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* CONTINUOUS LIVE LOG BUFFER */}
      <div
        ref={terminalScrollContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 font-mono text-xs sm:text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600 space-y-3">
            <Terminal className="w-10 h-10 text-slate-700 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-slate-400">WARTE AUF TELEMETRIE-STREAM...</p>
              <p className="text-xs text-slate-600 mt-1">
                Der Agent operiert autonom im Hintergrund. Echte Gedanken, Pläne & RPC-Aufrufe erscheinen hier in Echtzeit.
              </p>
            </div>
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const styles = getCategoryStyles(event.category);
            const isExpanded = !!expandedItems[event.id];
            const hasRawData = event.rawPayload || event.metadata;
            const timeFormatted = new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={event.id || index}
                className={`group border rounded-lg p-2.5 transition-all ${styles.border}`}
              >
                {/* Event Header Line */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Timestamp */}
                    <span className="text-[11px] text-slate-500 font-mono select-none">
                      [{timeFormatted}]
                    </span>

                    {/* Category Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 select-none ${styles.badge}`}>
                      {styles.icon}
                      <span>{event.badgeLabel}</span>
                    </span>

                    {/* Telemetry Metrics Pill */}
                    {event.latencyMs && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {event.latencyMs}ms
                      </span>
                    )}
                    {event.tokens && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {event.tokens}tok
                      </span>
                    )}

                    {/* Optional Title */}
                    {event.title && (
                      <span className="text-xs font-semibold text-slate-200">
                        {event.title}
                      </span>
                    )}
                  </div>

                  {/* Right: Quick actions for log line */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {hasRawData && (
                      <button
                        onClick={() => setSelectedRawModal(event)}
                        title="View Raw JSON payload"
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1"
                      >
                        <Code className="w-3 h-3" />
                        <span>RAW</span>
                      </button>
                    )}

                    {event.explorerUrl && (
                      <a
                        href={event.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                        title="View On-Chain Transaction"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Event Message Body */}
                <div className={`mt-1.5 whitespace-pre-wrap break-words leading-relaxed ${styles.text}`}>
                  {event.message}
                </div>

                {/* Inline Collapsible JSON preview if available */}
                {hasRawData && isExpanded && (
                  <div className="mt-2.5 p-2 rounded bg-black/70 border border-slate-800 text-[11px] text-emerald-400 overflow-x-auto max-h-60">
                    <pre>{JSON.stringify(event.rawPayload || event.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div ref={terminalEndRef} className="h-4" />
      </div>

      {/* FLOATING "SCROLL TO BOTTOM" PILL (if user scrolled up and auto-scroll is disabled) */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (terminalScrollContainerRef.current) {
              terminalScrollContainerRef.current.scrollTop = terminalScrollContainerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-6 px-3 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-1.5 cursor-pointer z-20"
        >
          <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          <span>Stream pausiert · Nach unten springen</span>
        </button>
      )}

      {/* RAW JSON INSPECTOR MODAL */}
      {selectedRawModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#080c18] border border-slate-700 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl font-mono text-xs">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-100">
                  RAW TELEMETRY INSPECTOR: [{selectedRawModal.badgeLabel}]
                </span>
                <span className="text-slate-500">
                  {new Date(selectedRawModal.timestamp).toISOString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedRawModal(null)}
                className="text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-black/50 text-emerald-300">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(selectedRawModal.rawPayload || selectedRawModal.metadata || selectedRawModal, null, 2)}
              </pre>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/70">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedRawModal.rawPayload || selectedRawModal.metadata || selectedRawModal, null, 2));
                  alert('JSON kopiert!');
                }}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>JSON kopieren</span>
              </button>
              <button
                onClick={() => setSelectedRawModal(null)}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
