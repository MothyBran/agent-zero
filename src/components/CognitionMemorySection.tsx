import React, { useState, useEffect } from 'react';
import { Brain, Activity, Target, Cpu, CheckCircle2, XCircle, Lightbulb, ShieldAlert, Sparkles, RefreshCw, BarChart2 } from 'lucide-react';
import { safeFetchJson, safePostJson } from '../lib/api';

interface TaskItem {
  id: string;
  timestamp: string;
  tool_name: string;
  status: 'SUCCESS' | 'FAILURE';
  latency_ms: number;
  lesson_learned?: string;
  error_type?: string;
  target_endpoint?: string;
}

interface LearningItem {
  id: string;
  type: string;
  title: string;
  insight: string;
  confidence_score: number;
  created_at: string;
  source_task_id?: string;
}

interface MilestoneItem {
  id: string;
  title: string;
  category: string;
  target_value: number;
  current_value: number;
  unit: string;
  is_completed: boolean;
  priority: string;
  action_plan?: string;
}

interface TokenBudgetStatus {
  tokens_used_today?: number;
  daily_token_limit?: number;
  daily_limit?: number;
  usage_percentage?: number;
  budget_usage_percent?: number;
  tokens_remaining?: number;
  estimated_tokens_remaining?: number;
  tokens_saved_by_compression?: number;
  conservation_mode?: boolean;
  conservation_mode_active?: boolean;
}

interface MemoryApiResponse {
  tasks: TaskItem[];
  learnings: LearningItem[];
  milestones: MilestoneItem[];
  token_budget: TokenBudgetStatus;
  active_model: string;
  blacklisted_models: string[];
}

export const CognitionMemorySection: React.FC = () => {
  const [data, setData] = useState<MemoryApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemory = async () => {
    setIsLoading(true);
    const res = await safeFetchJson<MemoryApiResponse>('/api/memory');
    if (res.ok && res.data) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  const tasks = data?.tasks || [];
  const learnings = data?.learnings || [];
  const milestones = data?.milestones || [];
  const budget = data?.token_budget;
  const activeModel = data?.active_model || 'GroqCloud LLM (llama-3.3-70b-versatile)';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Kognition, Telemetrie & Gedächtnis
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automaton-Lernspeicher, API-Tokenverbrauch, Kurz-/Langzeitgedächtnis und Zwischenziele
          </p>
        </div>
        <button
          onClick={fetchMemory}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer self-start sm:self-auto"
          title="Gedächtnis aktualisieren"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 1. API Telemetrie & Token Budget */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>LLM-Kognition & API-Telemetrie</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            GroqCloud Multi-Model Fallback
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Aktives Primär-Modell</div>
            <div className="text-sm font-bold text-cyan-300 font-mono truncate">{activeModel}</div>
            <div className="text-[10px] text-slate-500 font-mono pt-1">Automatischer Wechsel bei Rate-Limits</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Token-Verbrauch heute</span>
              <span className="text-slate-300 font-bold font-mono">
                {`${(budget?.tokens_used_today ?? 0).toLocaleString()} / ${(budget?.daily_token_limit ?? budget?.daily_limit ?? 500000).toLocaleString()}`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, budget?.budget_usage_percent ?? budget?.usage_percentage ?? 0)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Auslastung: {(budget?.budget_usage_percent ?? budget?.usage_percentage ?? 0).toFixed(1)}%</span>
              <span>Verbleibend: {(budget?.estimated_tokens_remaining ?? budget?.tokens_remaining ?? 500000).toLocaleString()}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Token-Sparmodus</div>
            <div className="text-sm font-bold font-mono">
              {(budget?.conservation_mode_active ?? budget?.conservation_mode) ? (
                <span className="text-amber-400">AKTIV (Schutz vor Erschöpfung)</span>
              ) : (
                <span className="text-emerald-400">NORMALBETRIEB</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono pt-1">
              Eingespart durch Kompression: {(budget?.tokens_saved_by_compression ?? 0).toLocaleString()} Tokens
            </div>
          </div>
        </div>
      </div>

      {/* 2. Kurzzeitgedächtnis (Task Memory) & Langzeitgedächtnis (Knowledge Base) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kurzzeitgedächtnis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Kurzzeitgedächtnis (Task Memory)</span><button onClick={async () => { await safePostJson("/api/reset/memory"); window.location.reload(); }} className="ml-4 px-2 py-1 bg-red-900/50 hover:bg-red-800/80 text-red-300 rounded text-[10px] border border-red-500/30">Reset Memory</button>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {tasks.length} Aktionen
            </span>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                Keine Einträge im Kurzzeitgedächtnis vorhanden (0 Tasks).
              </div>
            ) : (
              tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      {task.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-200">{task.tool_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {task.latency_ms}ms | {new Date(task.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {task.target_endpoint && (
                    <div className="text-[11px] text-slate-400 truncate">
                      Ziel: <span className="text-slate-300">{task.target_endpoint}</span>
                    </div>
                  )}
                  {task.lesson_learned && (
                    <div className="text-[11px] text-emerald-300/90 pt-0.5">
                      💡 Lehre: {task.lesson_learned}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Langzeitgedächtnis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Langzeitgedächtnis (Knowledge Base)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {learnings.length} Lektionen
            </span>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
            {learnings.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                Keine Einträge im Langzeitgedächtnis vorhanden (0 Muster).
              </div>
            ) : (
              learnings.map((lrn, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{lrn.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Konfidenz: {(lrn.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{lrn.insight}</p>
                  <div className="text-[10px] text-slate-500 pt-0.5">
                    Typ: {lrn.type} | Erfasst: {new Date(lrn.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Planungsschritte & Zwischenziele (Milestones) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            <Target className="w-4 h-4 text-purple-400" />
            <span>Strategische Planungsschritte & Zwischenziele</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {milestones.filter(m => m.is_completed).length} / {milestones.length} Erreicht
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-slate-500 font-mono text-xs">
              Keine aktiven Zwischenziele definiert.
            </div>
          ) : (
            milestones.map((ms, idx) => {
              const progressPct = Math.min(100, Math.max(0, (ms.current_value / ms.target_value) * 100));
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border space-y-2.5 text-xs font-mono ${
                    ms.is_completed
                      ? 'bg-emerald-950/20 border-emerald-800/60'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm">{ms.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        ms.is_completed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {ms.is_completed ? 'ERREICHT' : ms.priority}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Fortschritt</span>
                      <span className="font-bold text-slate-200">
                        {ms.current_value.toFixed(2)} / {ms.target_value.toFixed(2)} {ms.unit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ms.is_completed ? 'bg-emerald-400' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {ms.action_plan && (
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      🎯 Plan: {ms.action_plan}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
