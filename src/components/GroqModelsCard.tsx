import React, { useState, useEffect } from 'react';
import { GroqModelsResponse, GroqModelInfo } from '../types';
import { Cpu, Zap, Play, CheckCircle2, AlertCircle, RefreshCw, ShieldAlert, Sparkles, Terminal } from 'lucide-react';

interface GroqModelsCardProps {
  onModelTested?: (model: string) => void;
}

export const GroqModelsCard: React.FC<GroqModelsCardProps> = ({ onModelTested }) => {
  const [groqData, setGroqData] = useState<GroqModelsResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('groq/compound');
  const [testPrompt, setTestPrompt] = useState<string>('Analysiere das Überlebens- und Einnahmenpotenzial für Agent Zero auf Ethereum.');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency_ms: number;
    response?: string;
    error?: string;
    model: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroqModels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/groq/models');
      if (res.ok) {
        const data: GroqModelsResponse = await res.json();
        setGroqData(data);
        if (data.official_models?.length > 0 && !selectedModel) {
          setSelectedModel(data.official_models[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Groq models:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroqModels();
  }, []);

  const handleTestInference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/groq/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt: testPrompt
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          latency_ms: data.latency_ms,
          response: data.response,
          model: selectedModel
        });
        if (onModelTested) onModelTested(selectedModel);
      } else {
        setTestResult({
          success: false,
          latency_ms: data.latency_ms || 0,
          error: data.error || 'Inferenz-Fehler bei Groq',
          model: selectedModel
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        latency_ms: 0,
        error: err.message,
        model: selectedModel
      });
    } finally {
      setIsTesting(false);
    }
  };

  const officialModels = groqData?.official_models || [
    { id: 'groq/compound', name: 'Groq Compound (Agentic Tools)', speed: '~450 tps', category: 'Production System', context: '131k' },
    { id: 'groq/compound-mini', name: 'Groq Compound Mini', speed: '~450 tps', category: 'Production System', context: '131k' },
    { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B (Reasoning)', speed: '~500 tps', category: 'Production Model', context: '131k' },
    { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT-OSS 20B (Ultra-Fast)', speed: '~1000 tps', category: 'Production Model', context: '131k' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B', speed: '~500 tps', category: 'Preview Model', context: '131k' },
    { id: 'openai/gpt-oss-safeguard-20b', name: 'Safety GPT OSS 20B', speed: '~1000 tps', category: 'Preview Model', context: '131k' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', speed: '~300 tps', category: 'Production Model', context: '128k' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', speed: '~800 tps', category: 'Production Model', context: '128k' }
  ];

  return (
    <div id="groq-models-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            GroqCloud Multi-Model Intelligence & High-Speed LLMs
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
              groqData?.is_key_configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Zap className="w-3 h-3" />
            {groqData?.is_key_configured ? 'GROQ_API_KEY Ready' : 'GROQ Key Optional (Fallback Mode)'}
          </span>
          <button
            onClick={fetchGroqModels}
            disabled={isLoading}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Groq Models Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Agent Zero nutzt die ultraschnelle Inferenz von GroqCloud (bis zu 1000 Tokens/Sekunde). Bei API-Ausfällen oder Ratenbegrenzungen kaskadiert der Agent automatisch durch den Modell-Katalog.
      </p>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {officialModels.map((model) => {
          const isSelected = selectedModel === model.id;
          const isBlacklisted = groqData?.blacklisted?.includes(model.id);

          return (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                    {model.category}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {model.speed}
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-slate-100 truncate mt-1">
                  {model.name}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {model.id}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">Ctx: {model.context}</span>
                {isBlacklisted ? (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" /> Blacklisted
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Available
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Groq Testbench */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Groq Inferenz-Testbench</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Ausgewählt: <strong className="text-amber-300">{selectedModel}</strong>
          </span>
        </div>

        <form onSubmit={handleTestInference} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Prompt für Groq-Modell eingeben..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="submit"
              disabled={isTesting}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Inferenz...' : 'Inferenz Testen'}</span>
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`mt-2 p-3 rounded-lg border text-xs font-mono whitespace-pre-wrap ${
              testResult.success
                ? 'bg-slate-900 border-amber-500/30 text-slate-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold pb-1.5 mb-1.5 border-b border-slate-800">
              <span className={testResult.success ? 'text-amber-400' : 'text-rose-400'}>
                {testResult.success ? `✓ Inferenz erfolgreich via ${testResult.model}` : '✕ Inferenz-Fehler'}
              </span>
              <span className="text-slate-400">{testResult.latency_ms} ms</span>
            </div>
            {testResult.success ? (
              <div className="text-slate-200 leading-relaxed max-h-48 overflow-y-auto">
                {testResult.response}
              </div>
            ) : (
              <div className="text-rose-300">
                {testResult.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
