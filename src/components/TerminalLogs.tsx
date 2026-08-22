import React, { useState, useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import { Terminal, Copy, Check, Filter, Trash2, ArrowDown } from 'lucide-react';

interface TerminalLogsProps {
  logs: LogEntry[];
  onClear?: () => void;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs, onClear }) => {
  const [filter, setFilter] = useState<'ALL' | 'AGENT' | 'FINANCE' | 'TOOL' | 'SYSTEM'>('ALL');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.level === filter;
  });

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const copyAllLogs = () => {
    const text = filteredLogs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'AGENT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'FINANCE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'TOOL':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'SUCCESS':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div id="terminal-logs-card" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
      {/* Terminal Header */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Agent Live Telemetry & Reasoning Stream
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {filteredLogs.length} events
          </span>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['ALL', 'AGENT', 'FINANCE', 'TOOL', 'SYSTEM'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  filter === f
                    ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={copyAllLogs}
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="Copy Filtered Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={logContainerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2.5 bg-slate-950/60"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-mono text-xs">
            No telemetry events recorded yet. Run a cycle or start the autonomous loop.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed group">
              <span className="text-[10px] text-slate-500 select-none pt-0.5 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] border font-bold shrink-0 ${getLevelBadge(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <div className="flex-1 text-slate-300 whitespace-pre-wrap break-words">
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer Info */}
      <div className="bg-slate-950/90 px-4 py-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Protocol Loop: 60s Cycle · Auto Tribute Enforcement Active</span>
        </div>
        <span>Buffer: 500 max records</span>
      </div>
    </div>
  );
};
