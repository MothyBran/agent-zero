import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, BookOpen, Brain, Sparkles, Plus, Check, RefreshCw, FileText } from 'lucide-react';
import { RailwayStorageStatus, KnowledgeItem } from '../types';

export function RailwayStorageCard() {
  const [storage, setStorage] = useState<RailwayStorageStatus | null>(null);
  const [learnings, setLearnings] = useState<KnowledgeItem[]>([]);
  const [isCompacting, setIsCompacting] = useState(false);
  const [compactResult, setCompactResult] = useState<string | null>(null);
  const [showAddInsight, setShowAddInsight] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newInsight, setNewInsight] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeItem['category']>('SURVIVAL_STRATEGY');

  const fetchData = async () => {
    try {
      const [storageRes, knowledgeRes] = await Promise.all([
        fetch('/api/storage/status'),
        fetch('/api/knowledge')
      ]);

      if (storageRes.ok) {
        setStorage(await storageRes.json());
      }
      if (knowledgeRes.ok) {
        const data = await knowledgeRes.json();
        if (data.learnings) {
          setLearnings(data.learnings);
        }
      }
    } catch (e) {
      console.error('Failed to fetch storage & knowledge data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCompactStorage = async () => {
    setIsCompacting(true);
    setCompactResult(null);
    try {
      const res = await fetch('/api/storage/compact', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCompactResult(data.result?.message || 'Storage erfolgreich bereinigt.');
        if (data.status) {
          setStorage(data.status);
        }
        fetchData();
      }
    } catch (e) {
      console.error('Failed to compact storage:', e);
    } finally {
      setIsCompacting(false);
    }
  };

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInsight.trim()) return;

    try {
      const res = await fetch('/api/knowledge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          insight: newInsight.trim(),
          category: newCategory
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewInsight('');
        setShowAddInsight(false);
        fetchData();
      }
    } catch (e) {
      console.error('Failed to add insight:', e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-slate-100 flex items-center gap-2">
              Railway Volume Storage & Knowledge Base
              {storage && (
                <span className="text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                  {storage.total_volume_formatted} Disk · {learnings.length} Erkenntnisse
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Persistente Speichernutzung & strategisches Langzeit-Gedächtnis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCompactStorage}
            disabled={isCompacting}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isCompacting ? 'animate-pulse' : ''}`} />
            <span>Volume Bereinigen</span>
          </button>

          <button
            onClick={() => setShowAddInsight(!showAddInsight)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Wissen einprägen</span>
          </button>
        </div>
      </div>

      {compactResult && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{compactResult}</span>
        </div>
      )}

      {/* Add Custom Insight Form */}
      {showAddInsight && (
        <form onSubmit={handleAddInsight} className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-4 space-y-3 font-mono text-xs animate-fadeIn">
          <div className="font-bold text-indigo-400 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            <span>Neue strategische Erkenntnis in Railway Knowledge Base ablegen</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Titel der Erkenntnis</label>
              <input
                type="text"
                required
                placeholder="z.B. L2 Paymaster Faucet Heuristik"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Kategorie</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="SURVIVAL_STRATEGY">Überlebens-Strategie</option>
                <option value="TOKEN_EFFICIENCY">Token-Effizienz</option>
                <option value="TOOL_ROI">Tool-Rentabilität (ROI)</option>
                <option value="MARKET_CONDITION">Marktlage</option>
                <option value="ERROR_RECOVERY">Fehlerbehebung</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Erkenntnis-Inhalt</label>
            <textarea
              required
              rows={2}
              placeholder="Prägnante Handlungsanweisung oder Heuristik für künftige Denk- und Arbeitszyklen..."
              value={newInsight}
              onChange={e => setNewInsight(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddInsight(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono"
            >
              Persistieren
            </button>
          </div>
        </form>
      )}

      {/* Two Column Layout: Storage Volume Files + Knowledge Memory Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
        {/* Railway Persistent Files */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Railway Persistent Files ({storage?.files?.length || 0})</span>
            </span>
            <span className="text-[10px] text-slate-500">Volume: /data</span>
          </div>

          <div className="space-y-2">
            {storage?.files?.map(f => (
              <div
                key={f.filename}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-bold text-slate-200 text-xs truncate">{f.filename}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">{f.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-indigo-300 text-xs">{f.size_formatted}</span>
                  <div className="text-[9px] text-slate-400">
                    {new Date(f.updated_at).toLocaleTimeString('de-DE')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Base Memory Vault */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              <span>Erlerntes Wissen & Heuristiken ({learnings.length})</span>
            </span>
            <span className="text-[10px] text-emerald-400/80 font-bold">Auto-Injected in Prompts</span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {learnings.map(item => (
              <div
                key={item.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1.5 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-100 text-xs truncate">{item.title}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-bold uppercase shrink-0">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {item.insight}
                </p>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/40">
                  <span>Quelle: {item.source}</span>
                  <span>Konfidenz: {(item.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
