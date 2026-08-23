import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Cpu,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Shield,
  Layers,
  HelpCircle,
  Compass,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Code,
  Globe,
  Terminal,
  Activity
} from 'lucide-react';
import { IntelligenceEvaluation, ReasoningStreamItem } from '../types';
import { safeFetchJson, safePostJson } from '../lib/api';

interface RealIntelligenceCardProps {
  onRefresh?: () => void;
}

export const RealIntelligenceCard: React.FC<RealIntelligenceCardProps> = ({ onRefresh }) => {
  const [evaluation, setEvaluation] = useState<IntelligenceEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesizeResult, setSynthesizeResult] = useState<string | null>(null);
  const [streamFilter, setStreamFilter] = useState<'ALL' | 'THOUGHT' | 'PLAN' | 'PROMPT_API'>('ALL');
  const [expandedStreamIds, setExpandedStreamIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEvaluation = async () => {
    setLoading(true);
    const res = await safeFetchJson<{ evaluation?: IntelligenceEvaluation }>('/api/intelligence/evaluation');
    if (res.ok && res.data?.evaluation) {
      setEvaluation(res.data.evaluation);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvaluation();
    const interval = setInterval(fetchEvaluation, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSynthesize = async () => {
    setSynthesizing(true);
    setSynthesizeResult(null);
    const res = await safePostJson<{ success: boolean; summary?: string }>('/api/knowledge/synthesize');
    if (res.ok && res.data?.success) {
      setSynthesizeResult(res.data.summary || 'Erfolgreich synthetisiert.');
      await fetchEvaluation();
      if (onRefresh) onRefresh();
    } else {
      setSynthesizeResult(`Fehler bei Synthese: ${res.error || 'Serverfehler'}`);
    }
    setSynthesizing(false);
  };

  const getTierBadge = (tier: string) => {
    if (tier.includes('Tier 4')) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    if (tier.includes('Tier 3')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (tier.includes('Tier 2')) return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const toggleStreamExpand = (id: string) => {
    setExpandedStreamIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const reasoningStream = evaluation?.reasoning_stream || [];

  const filteredStream = reasoningStream.filter(item => {
    if (streamFilter === 'ALL') return true;
    if (streamFilter === 'THOUGHT') return item.type === 'THOUGHT' || item.type === 'REFLECTION';
    if (streamFilter === 'PLAN') return item.type === 'PLAN';
    if (streamFilter === 'PROMPT_API') return item.type === 'PROMPT' || item.type === 'API_QUESTION' || item.type === 'TOOL_EXECUTION';
    return true;
  });

  const getStreamItemIcon = (type: ReasoningStreamItem['type']) => {
    switch (type) {
      case 'THOUGHT':
        return <Brain className="w-4 h-4 text-fuchsia-400 shrink-0 animate-pulse" />;
      case 'PLAN':
        return <Compass className="w-4 h-4 text-indigo-400 shrink-0" />;
      case 'PROMPT':
        return <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'API_QUESTION':
        return <Globe className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'TOOL_EXECUTION':
        return <Zap className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'REFLECTION':
        return <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getStreamItemBadge = (type: ReasoningStreamItem['type']) => {
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

  return (
    <div id="real-intelligence-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      {/* Header with Live IQ & Cognitive Tier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Reale Intelligenz & Kognitions-Bewertung</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Verifizierte Telemetrie
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mathematisch abgeleitete Intelligenz aus echten HTTP-Aufrufen, Blockchain-Aktionen, Wissensdichte & Fehlerkorrektur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEvaluation}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Intelligenz-Werte aktualisieren"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            onClick={handleSynthesize}
            disabled={synthesizing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{synthesizing ? 'Synthetisiere...' : 'Wissen Autonom Synthetisieren'}</span>
          </button>
        </div>
      </div>

      {synthesizeResult && (
        <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-700/50 text-purple-200 text-xs font-mono flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{synthesizeResult}</span>
        </div>
      )}

      {/* 4 Core Intelligence Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IQ Score */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Kognitiver IQ</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-purple-400">
              {evaluation?.iq_score ?? 100}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 220 Max</span>
          </div>
          <div className="mt-2">
            <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${getTierBadge(evaluation?.evolution_tier || '')}`}>
              {evaluation?.evolution_tier || 'Tier 1: Initial'}
            </span>
          </div>
        </div>

        {/* Real Task Success Rate */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Erfolgsquote</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {evaluation?.metrics.success_rate_percent ?? 100}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            {evaluation?.metrics.total_actions ?? 0} Aktionen ausgeführt
          </p>
        </div>

        {/* Self-Correction Rate */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Selbst-Korrektur</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-400">
              {evaluation?.metrics.failure_recovery_rate_percent ?? 100}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Fehler-Kompensation & Fallback
          </p>
        </div>

        {/* Knowledge Density */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Wissens-Dichte</span>
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">
              {evaluation?.metrics.knowledge_density ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-mono">Regeln im Storage</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Tiefe: Stufe {evaluation?.metrics.reasoning_depth_level ?? 3}/10
          </p>
        </div>
      </div>

      {/* NESTED FIELD: REASONING STREAM (Chain of Thought, Planned Actions, Pending API Questions) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
        {/* Stream Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-200">
                  Live Reasoning & Chain-of-Thought Stream
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-800">
                  reasoning_stream
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chronologischer Ablauf: Raw Chain of Thought, geplante Aktionen & KI-/API-Fragestellungen.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {[
              { id: 'ALL', label: `Alle (${reasoningStream.length})` },
              { id: 'THOUGHT', label: '💭 Gedanken' },
              { id: 'PLAN', label: '📋 Pläne' },
              { id: 'PROMPT_API', label: '❓ API-Fragen' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStreamFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  streamFilter === tab.id
                    ? 'bg-slate-800 text-fuchsia-300 font-semibold shadow-xs border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chronological Stream Items */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredStream.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
              <Brain className="w-6 h-6 text-slate-700" />
              <span>Keine Kognitions-Ereignisse für den aktuellen Filter vorhanden.</span>
            </div>
          ) : (
            filteredStream.map((item, idx) => {
              const isExpanded = expandedStreamIds[item.id] ?? true;
              const hasMeta = item.meta && Object.keys(item.meta).length > 0;

              return (
                <div
                  key={item.id || idx}
                  className={`rounded-xl border p-3.5 font-mono text-xs transition-all ${
                    item.type === 'THOUGHT'
                      ? 'bg-fuchsia-950/20 border-fuchsia-900/40 text-fuchsia-100 shadow-[0_0_12px_rgba(217,70,239,0.06)]'
                      : item.type === 'PLAN'
                      ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-100'
                      : item.type === 'PROMPT'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-100'
                      : item.type === 'API_QUESTION'
                      ? 'bg-blue-950/20 border-blue-900/40 text-blue-100'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStreamItemIcon(item.type)}
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getStreamItemBadge(item.type)}`}>
                        {item.type}
                      </span>
                      <span className="font-semibold text-slate-200 text-xs">
                        {item.title}
                      </span>
                      {item.model && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800/90 text-slate-300 border border-slate-700">
                          {item.model}
                        </span>
                      )}
                      {item.latency_ms !== undefined && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.latency_ms}ms
                        </span>
                      )}
                      {item.tokens !== undefined && (
                        <span className="text-[10px] text-purple-400">
                          {item.tokens} Tokens
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => handleCopyContent(item.id, item.content)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        title="Inhalt kopieren"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => toggleStreamExpand(item.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        title={isExpanded ? 'Einklappen' : 'Ausklappen'}
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Raw Content Body */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/50">
                        {item.content}
                      </div>

                      {/* Optional Metadata / Action Breakdown */}
                      {hasMeta && (
                        <div className="text-[11px] p-2 rounded bg-slate-950/40 border border-slate-800/30 text-slate-400 space-y-1">
                          {item.meta?.query && (
                            <div>
                              <span className="text-slate-500">Query: </span>
                              <span className="text-amber-300 font-mono">{item.meta.query}</span>
                            </div>
                          )}
                          {item.meta?.endpoint && (
                            <div>
                              <span className="text-slate-500">Endpoint: </span>
                              <span className="text-blue-300 font-mono">{item.meta.http_method || 'GET'} {item.meta.endpoint}</span>
                            </div>
                          )}
                          {item.meta?.plan && Array.isArray(item.meta.plan) && (
                            <div className="pt-1">
                              <span className="text-slate-500 block mb-0.5">Aktionsschritte:</span>
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
          )}
        </div>
      </div>

      {/* Verified Skill Matrix */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" /> Reale Kognitive & Praktische Fähigkeiten
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {evaluation?.skills.map((skill, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">{skill.name}</span>
                <span className="text-xs font-mono font-bold text-purple-400">
                  Level {skill.level}/{skill.max_level}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(skill.level / skill.max_level) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{skill.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live AI Reasoning Pipeline Telemetry */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" /> Live Modell- & Inferenz-Pipeline
          </h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
            evaluation?.active_reasoning_pipeline.conservation_mode
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            {evaluation?.active_reasoning_pipeline.conservation_mode ? 'Sparmodus Aktiv' : 'Optimaler Durchsatz'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Primäres Modell</span>
            <span className="text-slate-200 font-mono font-semibold block mt-0.5 truncate">
              {evaluation?.active_reasoning_pipeline.primary_model || 'Groq llama-3.3-70b-versatile'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Durchschnittliche Latenz</span>
            <span className="text-cyan-400 font-mono font-semibold block mt-0.5">
              {evaluation?.active_reasoning_pipeline.avg_inference_latency_ms ?? 0} ms
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Tokens Heute Verbraucht</span>
            <span className="text-purple-400 font-mono font-semibold block mt-0.5">
              {evaluation?.active_reasoning_pipeline.tokens_consumed_today ?? 0} Tokens
            </span>
          </div>
        </div>

        {evaluation?.active_reasoning_pipeline.fallback_chain && evaluation.active_reasoning_pipeline.fallback_chain.length > 0 && (
          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
            <span className="font-mono text-slate-500">Fallback-Kette:</span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              {evaluation.active_reasoning_pipeline.fallback_chain.map((m, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

