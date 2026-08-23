import React, { useState, useEffect } from 'react';
import {
  Brain,
  Lightbulb,
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Database,
  Tag,
  Sliders,
  FileText
} from 'lucide-react';
import { KnowledgeItem } from '../types';
import { safeFetchJson, safePostJson } from '../lib/api';

interface KnowledgeStorageManagerProps {
  onRefresh?: () => void;
}

export const KnowledgeStorageManager: React.FC<KnowledgeStorageManagerProps> = ({ onRefresh }) => {
  const [learnings, setLearnings] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // New entry modal / form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInsight, setNewInsight] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeItem['category']>('SURVIVAL_STRATEGY');
  const [newConfidence, setNewConfidence] = useState('0.95');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editInsight, setEditInsight] = useState('');
  const [editConfidence, setEditConfidence] = useState('0.95');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchKnowledge = async () => {
    setLoading(true);
    const res = await safeFetchJson<{ learnings?: KnowledgeItem[] }>('/api/knowledge');
    if (res.ok && res.data?.learnings) {
      setLearnings(res.data.learnings);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInsight.trim()) return;

    setIsSubmitting(true);
    const res = await safePostJson<{ success: boolean; learnings?: KnowledgeItem[] }>('/api/knowledge/add', {
      title: newTitle.trim(),
      insight: newInsight.trim(),
      category: newCategory,
      confidence_score: parseFloat(newConfidence) || 0.95,
      source: 'Autonomer Benutzer-Eintrag'
    });

    if (res.ok && res.data?.learnings) {
      setLearnings(res.data.learnings);
      setNewTitle('');
      setNewInsight('');
      setShowAddForm(false);
      if (onRefresh) onRefresh();
    }
    setIsSubmitting(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/knowledge/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          insight: editInsight.trim(),
          confidence_score: parseFloat(editConfidence) || 0.95
        })
      });
      const data = await res.json();
      if (data.success && data.learnings) {
        setLearnings(data.learnings);
        setEditingItem(null);
        if (onRefresh) onRefresh();
      }
    } catch {}
    setIsSavingEdit(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && data.learnings) {
        setLearnings(data.learnings);
        if (onRefresh) onRefresh();
      }
    } catch {}
  };

  const filteredLearnings = learnings.filter(item => {
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.insight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'SUCCESS_PATTERN':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'FAILURE_LESSON':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'SURVIVAL_STRATEGY':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'TOKEN_EFFICIENCY':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'TOOL_ROI':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div id="knowledge-storage-manager" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Autonomer Wissens- & Storage-Manager</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {learnings.length} Einträge persistent
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Agent Zero verwaltet sein Langzeitgedächtnis eigenständig auf dem Dateisystem und nutzt es in jedem Denkzyklus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchKnowledge}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Wissen neu laden"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neues Wissen einpflegen</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold font-mono text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-indigo-400" /> Neue Erkenntnis in Wissens-Speicher ablegen
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Abbrechen
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Titel der Erkenntnis</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="z.B. Polygon Gas-Preise bei Stau"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Kategorie</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="SURVIVAL_STRATEGY">SURVIVAL_STRATEGY (Überlebensplan & Pacht)</option>
                <option value="SUCCESS_PATTERN">SUCCESS_PATTERN (Erfolgsmuster bei Tasks)</option>
                <option value="FAILURE_LESSON">FAILURE_LESSON (Fehler-Vermeidungsregel)</option>
                <option value="TOKEN_EFFICIENCY">TOKEN_EFFICIENCY (Prompt & Rate-Limit)</option>
                <option value="TOOL_ROI">TOOL_ROI (Rendite von Werkzeugen)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Erkenntnis (Detail / Regel für den Agenten)</label>
            <textarea
              value={newInsight}
              onChange={e => setNewInsight(e.target.value)}
              rows={2}
              placeholder="Konkrete Regel oder Handlungsempfehlung, die Agent Zero bei künftigen Aufgaben beachtet..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">Konfidenz:</span>
              <select
                value={newConfidence}
                onChange={e => setNewConfidence(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              >
                <option value="0.99">99% (Felsenfest)</option>
                <option value="0.95">95% (Sehr Hoch)</option>
                <option value="0.85">85% (Hoch)</option>
                <option value="0.70">70% (Experimentell)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium font-mono shadow transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Speichere...' : 'In Storage sichern'}
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Wissenseinträge durchsuchen..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'SURVIVAL_STRATEGY', 'SUCCESS_PATTERN', 'FAILURE_LESSON', 'TOKEN_EFFICIENCY', 'TOOL_ROI'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'Alle (' + learnings.length + ')' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge List */}
      <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
        {filteredLearnings.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-mono">
            Keine Einträge für die aktuellen Filterkriterien gefunden.
          </div>
        ) : (
          filteredLearnings.map(item => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  <h4 className="text-xs font-semibold text-slate-100">{item.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Konfidenz: {Math.round(item.confidence_score * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.insight}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-1">
                  <span>Quelle: {item.source}</span>
                  {item.times_applied !== undefined && <span>Angewandt: {item.times_applied}x</span>}
                  {item.success_reinforcements !== undefined && (
                    <span className="text-emerald-500">Erfolge: {item.success_reinforcements}x</span>
                  )}
                  <span>Stand: {new Date(item.timestamp).toLocaleString('de-DE')}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setEditTitle(item.title);
                    setEditInsight(item.insight);
                    setEditConfidence(String(item.confidence_score));
                  }}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                  title="Erkenntnis bearbeiten"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-colors"
                  title="Erkenntnis löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleEditSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" /> Erkenntnis bearbeiten
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Titel</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Erkenntnis (Regel)</label>
              <textarea
                value={editInsight}
                onChange={e => setEditInsight(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Konfidenz-Score (0.1 - 1.0)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="1.0"
                value={editConfidence}
                onChange={e => setEditConfidence(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium font-mono shadow transition-all disabled:opacity-50"
              >
                {isSavingEdit ? 'Speichere...' : 'Änderungen übernehmen'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
