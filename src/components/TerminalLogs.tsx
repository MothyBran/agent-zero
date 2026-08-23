import React, { useState, useRef, useEffect } from 'react';
import { LogEntry, ReasoningStreamItem } from '../types';
import {
  Terminal,
  Copy,
  Check,
  Filter,
  Brain,
  HelpCircle,
  Compass,
  Zap,
  Globe,
  ChevronDown,
  ChevronRight,
  Code,
  Layers,
  Clock,
  Sparkles,
  ArrowDownUp,
  Activity
} from 'lucide-react';

interface TerminalLogsProps {
  logs: LogEntry[];
  reasoningStream?: ReasoningStreamItem[];
  onClear?: () => void;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs, reasoningStream, onClear }) => {
  const [viewMode, setViewMode] = useState<'LOGS' | 'REASONING_STREAM'>('LOGS');
  const [filter, setFilter] = useState<'ALL' | 'PROMPTS_THOUGHTS' | 'AGENT' | 'FINANCE' | 'TOOL' | 'SYSTEM'>('ALL');
  const [reasoningFilter, setReasoningFilter] = useState<'ALL' | 'THOUGHT' | 'PLAN' | 'PROMPT_API'>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST_FIRST' | 'CHRONOLOGICAL'>('NEWEST_FIRST');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const logContainerRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Convert logs to reasoning items if reasoningStream is not explicitly passed
  const derivedReasoningStream: ReasoningStreamItem[] = reasoningStream && reasoningStream.length > 0
    ? reasoningStream
    : logs.filter(l => ['PROMPT', 'THOUGHT', 'PLAN', 'AGENT', 'TOOL'].includes(l.level)).map(l => ({
        id: `stream_${l.id}`,
        timestamp: l.timestamp,
        type: l.level === 'PROMPT' ? 'PROMPT' : l.level === 'THOUGHT' ? 'THOUGHT' : l.level === 'PLAN' ? 'PLAN' : l.level === 'AGENT' ? 'REFLECTION' : 'API_QUESTION',
        title: l.level === 'PROMPT' ? 'KI-Fragestellung & Directive' : l.level === 'THOUGHT' ? `Chain of Thought [${l.metadata?.model || 'KI'}]` : l.level === 'PLAN' ? 'Strategischer Aktionsplan' : `Tool / API: ${l.metadata?.tool || 'System'}`,
        content: l.message,
        model: l.metadata?.model,
        tokens: l.metadata?.tokens_used,
        latency_ms: l.metadata?.latency_ms,
        status: 'COMPLETED',
        meta: l.metadata
      }));

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    if (filter === 'PROMPTS_THOUGHTS') {
      return log.level === 'PROMPT' || log.level === 'THOUGHT' || log.level === 'PLAN' || log.level === 'AGENT';
    }
    return log.level === filter;
  });

  const orderedLogs = sortOrder === 'CHRONOLOGICAL' ? [...filteredLogs].reverse() : filteredLogs;

  const filteredReasoningStream = derivedReasoningStream.filter(item => {
    if (reasoningFilter === 'ALL') return true;
    if (reasoningFilter === 'THOUGHT') return item.type === 'THOUGHT' || item.type === 'REFLECTION';
    if (reasoningFilter === 'PLAN') return item.type === 'PLAN';
    if (reasoningFilter === 'PROMPT_API') return item.type === 'PROMPT' || item.type === 'API_QUESTION' || item.type === 'TOOL_EXECUTION';
    return true;
  });

  const orderedReasoningStream = sortOrder === 'CHRONOLOGICAL' 
    ? [...filteredReasoningStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [...filteredReasoningStream].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = sortOrder === 'CHRONOLOGICAL' ? logContainerRef.current.scrollHeight : 0;
    }
  }, [logs, reasoningStream, autoScroll, sortOrder, viewMode]);

  const copyAllContent = () => {
    if (viewMode === 'LOGS') {
      const text = orderedLogs
        .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] ${l.message}`)
        .join('\n');
      navigator.clipboard.writeText(text);
    } else {
      const text = orderedReasoningStream
        .map((r) => `[${new Date(r.timestamp).toLocaleTimeString()}] [${r.type}] ${r.title}\n${r.content}`)
        .join('\n---\n');
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'PROMPT':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'THOUGHT':
        return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30 shadow-[0_0_8px_rgba(217,70,239,0.15)]';
      case 'PLAN':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'AGENT':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'FINANCE':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'TOOL':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'ERROR':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'SUCCESS':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getReasoningBadge = (type: ReasoningStreamItem['type']) => {
    switch (type) {
      case 'THOUGHT':
        return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30';
      case 'PLAN':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'PROMPT':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'API_QUESTION':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'TOOL_EXECUTION':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'REFLECTION':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getReasoningIcon = (type: ReasoningStreamItem['type']) => {
    switch (type) {
      case 'THOUGHT':
        return <Brain className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 animate-pulse" />;
      case 'PLAN':
        return <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'PROMPT':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'API_QUESTION':
        return <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'TOOL_EXECUTION':
        return <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'REFLECTION':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'PROMPT':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'THOUGHT':
        return <Brain className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 animate-pulse" />;
      case 'PLAN':
        return <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'AGENT':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'TOOL':
        return <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div id="terminal-logs-card" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-lg">
      {/* Terminal Header */}
      <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                Agent Live Telemetry & Reasoning Stream
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {viewMode === 'LOGS' ? `${orderedLogs.length} events` : `${orderedReasoningStream.length} reasoning steps`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Volle Transparenz: KI-Fragen, Prompts, Gedankengänge (Chain of Thought), Pläne und API-Aufrufe live
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setViewMode('LOGS')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'LOGS'
                  ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terminal Logs
            </button>
            <button
              onClick={() => setViewMode('REASONING_STREAM')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'REASONING_STREAM'
                  ? 'bg-slate-800 text-fuchsia-300 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3 h-3 text-fuchsia-400" />
              <span>reasoning_stream</span>
            </button>
          </div>

          {/* Chronological Sort Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'NEWEST_FIRST' ? 'CHRONOLOGICAL' : 'NEWEST_FIRST')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
              sortOrder === 'CHRONOLOGICAL'
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={sortOrder === 'CHRONOLOGICAL' ? 'Sortierung: Chronologisch (Älteste zuerst)' : 'Sortierung: Neueste zuerst'}
          >
            <ArrowDownUp className="w-3 h-3" />
            <span>{sortOrder === 'CHRONOLOGICAL' ? 'Chronologisch ↑' : 'Neueste ↓'}</span>
          </button>

          <button
            onClick={copyAllContent}
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
            title="Gefilterten Stream kopieren"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
        {viewMode === 'LOGS' ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 uppercase mr-1">Filter:</span>
            {[
              { id: 'ALL', label: 'Alle' },
              { id: 'PROMPTS_THOUGHTS', label: '🧠 Fragen & Gedanken' },
              { id: 'AGENT', label: 'Agent' },
              { id: 'FINANCE', label: 'Finanzen' },
              { id: 'TOOL', label: 'Tools / APIs' },
              { id: 'SYSTEM', label: 'System' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  filter === f.id
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 uppercase mr-1">Reasoning Filter:</span>
            {[
              { id: 'ALL', label: `Alle (${derivedReasoningStream.length})` },
              { id: 'THOUGHT', label: '💭 Chain of Thought' },
              { id: 'PLAN', label: '📋 Geplante Aktionen' },
              { id: 'PROMPT_API', label: '❓ Prompts & API-Fragen' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setReasoningFilter(f.id as any)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  reasoningFilter === f.id
                    ? 'bg-slate-800 text-fuchsia-300 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Terminal Body */}
      <div
        ref={logContainerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3 bg-slate-950/70"
      >
        {viewMode === 'LOGS' ? (
          orderedLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
              <Brain className="w-8 h-8 text-slate-700 animate-pulse" />
              <span>Keine Telemetrie-Ereignisse für diesen Filter vorhanden.</span>
              <span className="text-[11px] text-slate-600">Starte den Zyklus oder aktiviere den autonomen Loop.</span>
            </div>
          ) : (
            orderedLogs.map((log) => {
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
              const isExpanded = expandedIds[log.id] ?? (log.level === 'THOUGHT' || log.level === 'PLAN' || log.level === 'PROMPT');

              return (
                <div
                  key={log.id}
                  className={`rounded-lg p-2.5 border transition-all ${
                    log.level === 'THOUGHT'
                      ? 'bg-fuchsia-950/20 border-fuchsia-900/40 text-fuchsia-200'
                      : log.level === 'PROMPT'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                      : log.level === 'PLAN'
                      ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-200'
                      : log.level === 'ERROR'
                      ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  {/* Entry Header */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${getLevelBadge(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>
                      {log.metadata?.model && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                          {log.metadata.model}
                        </span>
                      )}
                      {log.metadata?.tool && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-950/60 text-blue-300 border border-blue-800">
                          {log.metadata.tool}
                        </span>
                      )}
                      {log.metadata?.latency_ms !== undefined && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {log.metadata.latency_ms}ms
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {hasMetadata && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title={isExpanded ? "Details einklappen" : "Details ausklappen"}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Entry Content */}
                  <div className="whitespace-pre-wrap break-words leading-relaxed pl-1">
                    {log.message}
                  </div>

                  {/* Metadata / Details Panel (when present and expanded) */}
                  {hasMetadata && isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1.5 bg-slate-950/60 p-2.5 rounded border border-slate-800/50">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Code className="w-3 h-3 text-emerald-400" />
                        Strukturierte Telemetrie & API-Details
                      </div>

                      {log.metadata?.endpoint && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Endpoint:</span>
                          <span className="text-blue-400">{log.metadata.http_method || 'GET'} {log.metadata.endpoint}</span>
                        </div>
                      )}

                      {log.metadata?.query && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500 shrink-0">Query / Input:</span>
                          <span className="text-amber-300 break-all">{log.metadata.query}</span>
                        </div>
                      )}

                      {log.metadata?.tokens_used !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Tokens verbraucht:</span>
                          <span className="text-emerald-400">{log.metadata.tokens_used}</span>
                        </div>
                      )}

                      {log.metadata?.plan && Array.isArray(log.metadata.plan) && (
                        <div className="mt-1">
                          <div className="text-slate-500 mb-1">Aktionsschritte:</div>
                          <ul className="list-disc list-inside space-y-0.5 text-indigo-300">
                            {log.metadata.plan.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          orderedReasoningStream.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
              <Brain className="w-8 h-8 text-fuchsia-400 animate-pulse" />
              <span>Keine Einträge im reasoning_stream vorhanden.</span>
            </div>
          ) : (
            orderedReasoningStream.map((item, idx) => {
              const isExpanded = expandedIds[item.id] ?? true;
              const hasMeta = item.meta && Object.keys(item.meta).length > 0;

              return (
                <div
                  key={item.id || idx}
                  className={`rounded-xl border p-3 font-mono text-xs transition-all ${
                    item.type === 'THOUGHT'
                      ? 'bg-fuchsia-950/20 border-fuchsia-900/40 text-fuchsia-100 shadow-[0_0_10px_rgba(217,70,239,0.08)]'
                      : item.type === 'PLAN'
                      ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-100'
                      : item.type === 'PROMPT'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-100'
                      : item.type === 'API_QUESTION'
                      ? 'bg-blue-950/20 border-blue-900/40 text-blue-100'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getReasoningIcon(item.type)}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${getReasoningBadge(item.type)}`}>
                        {item.type}
                      </span>
                      <span className="font-semibold text-slate-200 text-xs">
                        {item.title}
                      </span>
                      {item.model && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                          {item.model}
                        </span>
                      )}
                      {item.latency_ms !== undefined && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {item.latency_ms}ms
                        </span>
                      )}
                      {item.tokens !== undefined && (
                        <span className="text-[10px] text-purple-400">
                          {item.tokens} Tokens
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title={isExpanded ? "Einklappen" : "Ausklappen"}
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                        {item.content}
                      </div>

                      {hasMeta && (
                        <div className="text-[11px] p-2 rounded bg-slate-950/40 border border-slate-800/30 text-slate-400 space-y-1">
                          {item.meta?.endpoint && (
                            <div>
                              <span className="text-slate-500">Endpoint: </span>
                              <span className="text-blue-300 font-mono">{item.meta.http_method || 'GET'} {item.meta.endpoint}</span>
                            </div>
                          )}
                          {item.meta?.query && (
                            <div>
                              <span className="text-slate-500">Query: </span>
                              <span className="text-amber-300 font-mono">{item.meta.query}</span>
                            </div>
                          )}
                          {item.meta?.plan && Array.isArray(item.meta.plan) && (
                            <div className="pt-1">
                              <span className="text-slate-500 block mb-0.5">Geplante Schritte:</span>
                              <ul className="list-disc list-inside space-y-0.5 text-indigo-300">
                                {item.meta.plan.map((st: string, sIdx: number) => (
                                  <li key={sIdx}>{st}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      {/* Terminal Footer Info */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>
            {viewMode === 'REASONING_STREAM' 
              ? 'reasoning_stream aktiv: Chronologische Anzeige von Chain of Thought, Aktionsplänen & API-Fragen' 
              : 'Transparenz-Modus: Live Streaming aller Prompts, Modelle & Gedankengänge'}
          </span>
        </div>
        <span>{sortOrder === 'CHRONOLOGICAL' ? 'Reihenfolge: Chronologisch (Alt → Neu)' : 'Reihenfolge: Neueste zuerst'}</span>
      </div>
    </div>
  );
};


