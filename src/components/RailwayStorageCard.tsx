import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Trash2,
  Brain,
  Plus,
  Check,
  Download,
  Upload,
  RefreshCw,
  FileText,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { RailwayStorageStatus, KnowledgeItem } from '../types';

export function RailwayStorageCard() {
  const [storage, setStorage] = useState<RailwayStorageStatus | null>(null);
  const [learnings, setLearnings] = useState<KnowledgeItem[]>([]);
  const [isCompacting, setIsCompacting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [compactResult, setCompactResult] = useState<string | null>(null);
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [showVolumeGuide, setShowVolumeGuide] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportSnapshot = () => {
    window.location.href = '/api/storage/snapshot/export?download=true';
  };

  const handleQuickRestore = async () => {
    setIsRestoring(true);
    setCompactResult(null);
    try {
      const res = await fetch('/api/storage/snapshot/quick-restore', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompactResult(`🎉 ${data.message || 'Snapshot erfolgreich wiederhergestellt!'}`);
        fetchData();
      } else {
        setCompactResult(`❌ Wiederherstellung fehlgeschlagen: ${data.error || data.message}`);
      }
    } catch (e: any) {
      setCompactResult(`❌ Fehler: ${e.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleImportSubmit = async (jsonContent: string) => {
    setIsRestoring(true);
    setImportFeedback(null);
    try {
      const parsed = JSON.parse(jsonContent);
      const res = await fetch('/api/storage/snapshot/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: parsed, source: 'Benutzer Upload' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompactResult(`🎉 ${data.message}`);
        setShowImportModal(false);
        setImportJsonText('');
        fetchData();
      } else {
        setImportFeedback(`❌ Fehler: ${data.message || 'Ungültiger Snapshot'}`);
      }
    } catch (e: any) {
      setImportFeedback(`❌ JSON-Parse-Fehler: ${e.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleImportSubmit(content);
      }
    };
    reader.readAsText(file);
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

  const isPersistent = storage?.is_persistent_volume;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-slate-100 flex items-center gap-2 flex-wrap">
              Railway Volume Storage & Gedächtnis-Sicherung
              {isPersistent ? (
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Persistentes Volume Aktiv ({storage?.persistent_source || '/data'})
                </span>
              ) : (
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Ephemerer Speicher (Volume empfohlen)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Persistente Speichernutzung ({storage?.total_volume_formatted || '0 B'}), Backups & strategisches Langzeit-Gedächtnis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportSnapshot}
            title="Kompletten Gedächtnis- und Fortschritts-Snapshot als .json Datei herunterladen"
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Snapshot Export (.json)</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            title="Snapshot aus Datei oder JSON wiederherstellen"
            className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Snapshot Import</span>
          </button>

          <button
            onClick={handleCompactStorage}
            disabled={isCompacting}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isCompacting ? 'animate-pulse' : ''}`} />
            <span>Bereinigen</span>
          </button>

          <button
            onClick={() => setShowVolumeGuide(!showVolumeGuide)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-mono transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Railway Volume Hilfe</span>
          </button>
        </div>
      </div>

      {/* Ephemeral Warning & Auto-Restore Banner */}
      {!isPersistent && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 text-xs font-mono text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Achtung: Railway läuft noch ohne gemountetes Persistent Volume (/data).</span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Bei einem Re-Deploy werden lokale Dateien im Container zurückgesetzt. Nutze den <strong>Snapshot Export</strong> oder binde in Railway ein <strong>Volume unter /data</strong> ein!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {storage?.last_snapshot_time && (
              <button
                onClick={handleQuickRestore}
                disabled={isRestoring}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>Auto-Restore Letzter Stand</span>
              </button>
            )}
            <button
              onClick={() => setShowVolumeGuide(true)}
              className="underline text-amber-300 hover:text-white text-xs cursor-pointer"
            >
              Anleitung anzeigen
            </button>
          </div>
        </div>
      )}

      {/* Railway Volume Step-by-Step Guide */}
      {showVolumeGuide && (
        <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-3 font-mono text-xs text-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" />
              So behält Agent Zero seinen Fortschritt & Gedächtnis auf Railway für immer:
            </span>
            <button
              onClick={() => setShowVolumeGuide(false)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              Schließen
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-1.5">
              <div className="font-bold text-indigo-400">Option 1: Railway Persistent Volume (Empfohlen)</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Öffne dein Railway Dashboard & klicke auf den Service.</li>
                <li>Gehe auf den Tab <strong>"Volumes"</strong> (oder drücke <kbd className="bg-slate-800 px-1 rounded">cmd/ctrl + K</kbd> und tippe <em>Volume</em>).</li>
                <li>Klicke auf <strong>"Add Volume"</strong>.</li>
                <li>Setze den <strong>Mount Path</strong> auf: <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded font-bold">/data</code></li>
                <li>Fertig! Ab jetzt überleben alle Level, Tribute, Wissenseinträge und Kassenbuch-Transaktionen jeden Deploy.</li>
              </ol>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-1.5">
              <div className="font-bold text-indigo-400">Option 2: 1-Click Snapshot Backup & Restore</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>Vor größeren Updates auf <strong>"Snapshot Export (.json)"</strong> klicken.</li>
                <li>Nach dem Deploy auf <strong>"Snapshot Import"</strong> klicken und die Datei hochladen.</li>
                <li>Der Agent stellt sofort seinen Tribute-Zähler, alle gelernten Tools, Kassenbucheinträge und sein Gedächtnis wieder her.</li>
                <li>Zusätzlich speichert der Browser automatisch Sicherungskopien im LocalStorage!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {compactResult && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{compactResult}</span>
        </div>
      )}

      {/* Snapshot Import Modal */}
      {showImportModal && (
        <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-4 space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              Agent Zero Gedächtnis & Fortschritts-Snapshot einspielen
            </span>
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportFeedback(null);
              }}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              Abbrechen
            </button>
          </div>

          <p className="text-slate-300 text-[11px]">
            Wähle eine exportierte <code>agent_zero_snapshot_lvl*.json</code> Datei aus oder füge den JSON-Code direkt ein:
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>JSON-Datei auswählen...</span>
            </button>
            <span className="text-slate-500 text-[11px]">oder JSON unten einfügen:</span>
          </div>

          <textarea
            rows={4}
            placeholder='{"version": "1.0", "state": { "tributes_paid": 3, "jobs_completed": 15 }, ...}'
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
          />

          {importFeedback && (
            <div className="text-amber-400 text-xs font-mono">{importFeedback}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!importJsonText.trim() || isRestoring}
              onClick={() => handleImportSubmit(importJsonText)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Snapshot jetzt einspielen</span>
            </button>
          </div>
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
            <span className="text-[10px] text-slate-500">Mount: {storage?.data_directory || '/data'}</span>
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
            <button
              onClick={() => setShowAddInsight(!showAddInsight)}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Wissen hinzufügen</span>
            </button>
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
