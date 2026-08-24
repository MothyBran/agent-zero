import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Clock, Plus, ArrowRight, ShieldAlert, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { Milestone } from '../types';
import { safeFetchJson, safePostJson } from '../lib/api';

export function MilestonesCard() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Milestone['category']>('LIQUIDITY');
  const [newTarget, setNewTarget] = useState('5.0');
  const [newUnit, setNewUnit] = useState('USDC');
  const [newPriority, setNewPriority] = useState<Milestone['priority']>('HIGH');
  const [newPlan, setNewPlan] = useState('');

  const fetchMilestones = async () => {
    const res = await safeFetchJson<{ milestones?: Milestone[] }>('/api/milestones');
    if (res.ok && res.data?.milestones) {
      setMilestones(res.data.milestones);
    }
  };

  useEffect(() => {
    fetchMilestones();
    const interval = setInterval(fetchMilestones, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    const res = await safePostJson<{ milestones?: Milestone[] }>('/api/milestones/evaluate');
    if (res.ok && res.data?.milestones) {
      setMilestones(res.data.milestones);
    }
    setIsEvaluating(false);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = await safePostJson('/api/milestones/create', {
      title: newTitle.trim(),
      category: newCategory,
      target_value: parseFloat(newTarget) || 1,
      unit: newUnit.trim() || 'Einheit',
      priority: newPriority,
      action_plan: newPlan.trim() || 'Zielstrebige Ausführung im Autonomen Zyklus'
    });

    if (res.ok) {
      setNewTitle('');
      setNewPlan('');
      setShowAddForm(false);
      fetchMilestones();
    }
  };

  const activeMilestones = milestones.filter(m => !m.is_completed);
  const completedMilestones = milestones.filter(m => m.is_completed);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-slate-100 flex items-center gap-2">
              Strategische Roadmap & Zwischenziele
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                {activeMilestones.length} Aktiv · {completedMilestones.length} Erreicht
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Planung & schrittweise Überlebenssicherung des Agenten
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>Prüfen</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ziel anlegen</span>
          </button>
        </div>
      </div>

      {/* Add Custom Milestone Form */}
      {showAddForm && (
        <form onSubmit={handleCreateMilestone} className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 space-y-3 font-mono text-xs animate-fadeIn">
          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Neues Zwischenziel für Agent Zero definieren</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Titel des Zwischenziels</label>
              <input
                type="text"
                required
                placeholder="z.B. 10.00 USDC Puffer für Lvl 3 Pacht aufbauen"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Kategorie</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="LIQUIDITY">Liquidität</option>
                  <option value="TOOL_DISCOVERY">Tool Freischaltung</option>
                  <option value="RUN_RATE">Stundensatz</option>
                  <option value="WORK_EXECUTION">Arbeitsaufträge</option>
                  <option value="STORAGE_OPTIMIZATION">Storage</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Priorität</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="CRITICAL">Kritisch</option>
                  <option value="HIGH">Hoch</option>
                  <option value="MEDIUM">Mittel</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Ziel-Schwellenwert</label>
              <input
                type="number"
                step="0.01"
                required
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Einheit</label>
              <input
                type="text"
                placeholder="USDC, Level, Jobs, USDC/h"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Aktions-Strategie</label>
              <input
                type="text"
                placeholder="Konkrete Arbeitsanweisung..."
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono"
            >
              Speichern & Aktivieren
            </button>
          </div>
        </form>
      )}

      {/* Active Milestones Grid */}
      <div className="space-y-3 font-mono text-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Laufende Zwischenziele ({activeMilestones.length})</span>
          <span className="text-[10px] text-slate-400">Automatische Fortschritts-Erfassung</span>
        </div>

        {activeMilestones.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-6 text-center text-slate-500 font-mono text-xs">
            Keine aktiven Zwischenziele definiert. Agent Zero setzt Meilensteine bei autonomen Planungszyklen oder über &quot;+ Neues Zwischenziel&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeMilestones.map(m => {
              const pct = Math.min(100, Math.max(0, Math.round((m.current_value / m.target_value) * 100)));
              const isNear = pct >= 75;

              return (
                <div
                  key={m.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-100 text-xs leading-snug">
                        {m.title}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                          m.priority === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : m.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {m.priority}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {m.action_plan}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        Fortschritt: <strong className="text-slate-200">{m.current_value.toFixed(2)} / {m.target_value} {m.unit}</strong>
                      </span>
                      <span className={`font-bold ${isNear ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          pct >= 100 ? 'bg-emerald-500' : isNear ? 'bg-emerald-400' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Milestones Accordion/List */}
      {completedMilestones.length > 0 && (
        <div className="border-t border-slate-800/80 pt-3 space-y-2 font-mono text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Erfolgreich gemeisterte Zwischenziele ({completedMilestones.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {completedMilestones.map(m => (
              <div
                key={m.id}
                className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 text-[11px] truncate font-medium">{m.title}</span>
                </div>
                <span className="text-[10px] text-emerald-400/90 font-bold shrink-0">
                  {m.target_value} {m.unit} ✅
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
