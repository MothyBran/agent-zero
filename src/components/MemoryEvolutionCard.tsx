import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  RotateCw,
  Award,
  TrendingUp,
  History,
  Lightbulb,
  Plus,
  Compass
} from 'lucide-react';
import { KnowledgeItem, TaskMemoryRecord, MemoryRecallStatus } from '../types';
import { safeFetchJson, safePostJson } from '../lib/api';

interface MemoryEvolutionCardProps {
  iqScore?: number;
  evolutionTier?: string;
  totalMemories?: number;
  recallSummary?: string;
  onRefresh?: () => void;
}

export const MemoryEvolutionCard: React.FC<MemoryEvolutionCardProps> = ({
  iqScore = 135,
  evolutionTier = 'Tier 2: Adaptiver Überlebender',
  totalMemories = 0,
  recallSummary,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'KNOWLEDGE' | 'TASKS' | 'ADD_LESSON'>('KNOWLEDGE');
  const [knowledgeFilter, setKnowledgeFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE' | 'STRATEGY'>('ALL');
  const [learnings, setLearnings] = useState<KnowledgeItem[]>([]);
  const [tasks, setTasks] = useState<TaskMemoryRecord[]>([]);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [recallStatus, setRecallStatus] = useState<MemoryRecallStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reflecting, setReflecting] = useState<boolean>(false);
  const [reflectMessage, setReflectMessage] = useState<string | null>(null);

  // New Lesson form
  const [newTitle, setNewTitle] = useState('');
  const [newInsight, setNewInsight] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeItem['category']>('SUCCESS_PATTERN');

  const fetchMemoryData = async () => {
    setLoading(true);
    const [resK, resT, resS] = await Promise.all([
      safeFetchJson<{ learnings?: KnowledgeItem[] }>('/api/knowledge'),
      safeFetchJson<{ tasks?: TaskMemoryRecord[]; stats?: any }>('/api/memory/tasks?limit=40'),
      safeFetchJson<{ checkpoint?: MemoryRecallStatus }>('/api/memory/status')
    ]);

    if (resK.ok && resK.data?.learnings) setLearnings(resK.data.learnings);
    if (resT.ok && resT.data?.tasks) setTasks(resT.data.tasks);
    if (resT.ok && resT.data?.stats) setTaskStats(resT.data.stats);
    if (resS.ok && resS.data?.checkpoint) setRecallStatus(resS.data.checkpoint);
    setLoading(false);
  };

  useEffect(() => {
    fetchMemoryData();
  }, []);

  const handleReflect = async () => {
    setReflecting(true);
    setReflectMessage(null);
    const res = await safePostJson<{ success: boolean; summary?: string }>('/api/memory/reflect');
    if (res.ok && res.data?.success) {
      setReflectMessage(`✨ ${res.data.summary}`);
      await fetchMemoryData();
      if (onRefresh) onRefresh();
    } else {
      setReflectMessage(`Fehler bei Reflexion: ${res.error || 'Serverfehler'}`);
    }
    setReflecting(false);
  };

  const handleRecallNow = async () => {
    setLoading(true);
    const res = await safePostJson<{ success: boolean; checkpoint?: MemoryRecallStatus }>('/api/memory/recall-now', { reason: 'RESTART' });
    if (res.ok && res.data?.success) {
      if (res.data.checkpoint) setRecallStatus(res.data.checkpoint);
      await fetchMemoryData();
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInsight.trim()) return;

    setLoading(true);
    const res = await safePostJson('/api/memory/add-lesson', {
      title: newTitle.trim(),
      insight: newInsight.trim(),
      category: newCategory,
      source: 'Benutzer Eingabe'
    });

    if (res.ok) {
      setNewTitle('');
      setNewInsight('');
      setActiveTab('KNOWLEDGE');
      await fetchMemoryData();
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const filteredLearnings = learnings.filter(l => {
    if (knowledgeFilter === 'ALL') return true;
    if (knowledgeFilter === 'SUCCESS') return l.category === 'SUCCESS_PATTERN' || l.category === 'TOOL_ROI';
    if (knowledgeFilter === 'FAILURE') return l.category === 'FAILURE_LESSON' || l.category === 'ERROR_RECOVERY';
    if (knowledgeFilter === 'STRATEGY') return l.category === 'SURVIVAL_STRATEGY' || l.category === 'TOKEN_EFFICIENCY';
    return true;
  });

  const getTierColor = (tierStr: string) => {
    if (tierStr.includes('Tier 4')) return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
    if (tierStr.includes('Tier 3')) return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
    if (tierStr.includes('Tier 2')) return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40';
    return 'text-zinc-400 bg-zinc-800 border-zinc-700';
  };

  return (
    <div id="memory-evolution-card" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                Langzeitgedächtnis & Selbst-Evolution
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getTierColor(evolutionTier)}`}>
                {evolutionTier}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Persistente Wissensdatenbank & episodische Arbeits-Historie (überlebt Reboots, Deployments & Pausen)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/storage/snapshot/export?download=true"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 flex items-center gap-1.5 transition"
            title="Vollständigen Gedächtnis- und Fortschritts-Snapshot als .json exportieren"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Snapshot Backup
          </a>

          <button
            id="btn-memory-recall"
            onClick={handleRecallNow}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition"
            title="Lädt das Gedächtnis sofort neu wie bei einem Server-Deployment"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Gedächtnis Recall
          </button>

          <button
            id="btn-memory-reflect"
            onClick={handleReflect}
            disabled={reflecting}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${reflecting ? 'animate-spin' : ''}`} />
            {reflecting ? 'Reflektiere...' : 'Selbst-Reflexion'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Evolutions-IQ</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {iqScore} <span className="text-xs font-normal text-zinc-500">IQ</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, (iqScore - 90) * 1.1))}%` }}
            />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Gesicherte Erkenntnisse</span>
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300">
            {learnings.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Erfolgsmuster & Lektionen
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Erfolgsquote Aufträge</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {taskStats?.success_rate_percent ?? 100}%
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {taskStats?.total_success ?? tasks.length} von {taskStats?.total_tasks ?? tasks.length} erfolgreich
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Gesamt-Ertrag Historie</span>
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            +{taskStats?.total_historical_earnings?.toFixed(2) ?? '0.00'} <span className="text-xs text-zinc-500">USDC</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Inkl. Level-Skalierung
          </div>
        </div>
      </div>

      {/* Recall Checkpoint Banner */}
      {(recallStatus?.last_recall_summary || recallSummary) && (
        <div className="mb-5 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-300">Aktiver Boot-Recall Status: </span>
            <span>{recallStatus?.last_recall_summary || recallSummary}</span>
          </div>
        </div>
      )}

      {reflectMessage && (
        <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{reflectMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('KNOWLEDGE')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'KNOWLEDGE'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Wissensbasis & Heuristiken ({learnings.length})
          </button>
          <button
            onClick={() => setActiveTab('TASKS')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'TASKS'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Episodische Arbeits-Chronik ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('ADD_LESSON')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition flex items-center gap-1 ${
              activeTab === 'ADD_LESSON'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Wissen hinzufügen
          </button>
        </div>

        {activeTab === 'KNOWLEDGE' && (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              onClick={() => setKnowledgeFilter('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                knowledgeFilter === 'ALL' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setKnowledgeFilter('SUCCESS')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                knowledgeFilter === 'SUCCESS' ? 'bg-emerald-950/60 text-emerald-300 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Erfolge
            </button>
            <button
              onClick={() => setKnowledgeFilter('FAILURE')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                knowledgeFilter === 'FAILURE' ? 'bg-rose-950/60 text-rose-300 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Lektionen
            </button>
            <button
              onClick={() => setKnowledgeFilter('STRATEGY')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                knowledgeFilter === 'STRATEGY' ? 'bg-indigo-950/60 text-indigo-300 font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Strategie
            </button>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'KNOWLEDGE' && (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {filteredLearnings.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Keine Erkenntnisse für diesen Filter vorhanden.
            </div>
          ) : (
            filteredLearnings.map(item => {
              const isSuccess = item.category === 'SUCCESS_PATTERN' || item.category === 'TOOL_ROI';
              const isFailure = item.category === 'FAILURE_LESSON' || item.category === 'ERROR_RECOVERY';

              return (
                <div
                  key={item.id}
                  className="bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-3 hover:border-zinc-700/80 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isSuccess
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : isFailure
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                            : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/50'
                        }`}
                      >
                        {item.category.replace('_', ' ')}
                      </span>
                      <h3 className="text-xs font-semibold text-zinc-200">{item.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>Konfidenz: {Math.round(item.confidence_score * 100)}%</span>
                      {item.times_applied && (
                        <span className="text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded text-[10px]">
                          ×{item.times_applied} angewandt
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{item.insight}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Quelle: {item.source}</span>
                    <span>{new Date(item.timestamp).toLocaleString('de-DE')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'TASKS' && (
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Noch keine Aufgaben in der episodischen Chronik registriert.
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                className="bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-3 text-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.status === 'SUCCESS'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {task.status}
                    </span>
                    <span className="font-semibold text-zinc-200">{task.tool_name}</span>
                    <span className="text-[11px] text-zinc-500">({task.category})</span>
                  </div>
                  <div className="font-mono text-cyan-400 font-bold">
                    +{task.reward_usdc.toFixed(4)} USDC
                  </div>
                </div>

                <div className="text-zinc-400 text-[11px]">{task.details}</div>

                {task.lesson_derived && (
                  <div className="mt-1 p-1.5 rounded bg-zinc-900 border border-zinc-800/80 text-[11px] text-indigo-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Abgeleitete Lektion: {task.lesson_derived}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Laufzeit: {task.execution_ms}ms</span>
                  <span>{new Date(task.timestamp).toLocaleString('de-DE')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'ADD_LESSON' && (
        <form onSubmit={handleAddLesson} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Titel der Lektion / Regel</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="z.B. Paymaster Priorisierung bei Level 2+"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Kategorie</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="SUCCESS_PATTERN">Erfolgsmuster (Success)</option>
                <option value="FAILURE_LESSON">Lektion aus Misserfolg (Failure)</option>
                <option value="TOOL_ROI">Tool Rendite / Skalierung</option>
                <option value="SURVIVAL_STRATEGY">48h Pacht & Überleben</option>
                <option value="TOKEN_EFFICIENCY">Token Sparsamkeit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Erkenntnis & Handlungsanweisung</label>
            <textarea
              value={newInsight}
              onChange={e => setNewInsight(e.target.value)}
              rows={3}
              placeholder="Beschreibe die konkrete Strategie oder Vermeidungsregel, an die sich der Agent halten soll..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('KNOWLEDGE')}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !newTitle.trim() || !newInsight.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow disabled:opacity-50"
            >
              Ins Langzeitgedächtnis sichern
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
