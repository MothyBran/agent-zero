import React, { useState, useEffect } from 'react';
import { GroqModelsResponse, GroqModelInfo, GroqIntelligenceKnowledgeResponse, GroqKnowledgeItem } from '../types';
import { 
  Cpu, 
  Zap, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Activity, 
  Sliders, 
  HelpCircle,
  ExternalLink,
  Flame,
  Clock,
  Coins
} from 'lucide-react';
import { safeFetchJson, safePostJson } from '../lib/api';

interface GroqModelsCardProps {
  onModelTested?: (model: string) => void;
}

export const GroqModelsCard: React.FC<GroqModelsCardProps> = ({ onModelTested }) => {
  const [groqData, setGroqData] = useState<GroqModelsResponse | null>(null);
  const [knowledgeData, setKnowledgeData] = useState<GroqIntelligenceKnowledgeResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [testPrompt, setTestPrompt] = useState<string>('Analysiere die Gas-Effizienz von Polygon PoS und erstelle eine kurze DeFi Arbitrage Strategie für USDC/POL.');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'MODELS' | 'KNOWLEDGE' | 'BENCHMARK'>('MODELS');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency_ms: number;
    reply?: string;
    error?: string;
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroqData = async () => {
    setIsLoading(true);
    const [modelsRes, knowRes] = await Promise.all([
      safeFetchJson<GroqModelsResponse>('/api/groq/models'),
      safeFetchJson<GroqIntelligenceKnowledgeResponse>('/api/groq/knowledge')
    ]);

    if (modelsRes.ok && modelsRes.data) {
      setGroqData(modelsRes.data);
      if (modelsRes.data.official_models?.length > 0 && !selectedModel) {
        setSelectedModel(modelsRes.data.official_models[0].id);
      }
    }
    if (knowRes.ok && knowRes.data) {
      setKnowledgeData(knowRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGroqData();
  }, []);

  const handleTestInference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    const res = await safePostJson<{
      success: boolean;
      latency_ms: number;
      reply?: string;
      error?: string;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }>('/api/groq/test', {
      model: selectedModel,
      prompt: testPrompt,
      temperature,
      max_tokens: 512
    });

    if (res.ok && res.data?.success) {
      setTestResult({
        success: true,
        latency_ms: res.data.latency_ms,
        reply: res.data.reply,
        usage: res.data.usage,
        model: selectedModel
      });
      if (onModelTested) onModelTested(selectedModel);
    } else {
      setTestResult({
        success: false,
        latency_ms: res.data?.latency_ms || 0,
        error: res.data?.error || res.error || 'Inferenz-Fehler bei Groq',
        model: selectedModel
      });
    }
    setIsTesting(false);
  };

  const officialModels: GroqModelInfo[] = groqData?.official_models || knowledgeData?.models || [];
  
  const filteredModels = officialModels.filter((m) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'PRODUCTION') return m.category === 'Production Model';
    if (selectedCategory === 'SYSTEMS') return m.category === 'Production System';
    if (selectedCategory === 'PREVIEW') return m.category === 'Preview Model';
    if (selectedCategory === 'AUDIO') return m.category === 'Audio / Speech';
    return true;
  });

  const activeModelDetails = officialModels.find((m) => m.id === selectedModel);
  const rateLimitHeaders = groqData?.rate_limit_headers || knowledgeData?.rate_limit_headers;

  return (
    <div id="groq-models-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                GroqCloud™ LPU Multi-Model Intelligence
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1000 tps Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministische KI-Inferenz & Kognitionsarchitektur für autonome Krypto-Routinen
            </p>
          </div>
        </div>

        {/* Status Badges & Refresh */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
              groqData?.is_key_configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {groqData?.is_key_configured ? 'Groq LPU Live' : 'Fallback Engine Ready'}
          </span>
          <button
            onClick={fetchGroqData}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            title="Katalog aktualisieren"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rate Limits & Header Metrics */}
      {rateLimitHeaders && (rateLimitHeaders.remaining_tokens !== undefined || rateLimitHeaders.limit_tokens !== undefined) && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Groq Rate-Limit Governance:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            {rateLimitHeaders.remaining_tokens !== undefined && (
              <div>
                <span className="text-slate-500">TPM verbleibend: </span>
                <span className="text-emerald-400 font-bold">
                  {rateLimitHeaders.remaining_tokens.toLocaleString()}
                  {rateLimitHeaders.limit_tokens ? ` / ${rateLimitHeaders.limit_tokens.toLocaleString()}` : ''}
                </span>
              </div>
            )}
            {rateLimitHeaders.remaining_requests !== undefined && (
              <div>
                <span className="text-slate-500">RPM verbleibend: </span>
                <span className="text-amber-400 font-bold">{rateLimitHeaders.remaining_requests}</span>
              </div>
            )}
            {rateLimitHeaders.reset_tokens && (
              <div className="text-slate-400">
                <span className="text-slate-500">Reset: </span>
                <span>{rateLimitHeaders.reset_tokens}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('MODELS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'MODELS'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Modell-Katalog ({officialModels.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('BENCHMARK')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'BENCHMARK'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Inferenz-Testbench</span>
        </button>
        <button
          onClick={() => setActiveTab('KNOWLEDGE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'KNOWLEDGE'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Architektur & Heuristik-Wissen</span>
        </button>
      </div>

      {/* TAB 1: MODEL CATALOG */}
      {activeTab === 'MODELS' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Alle Modelle' },
              { id: 'PRODUCTION', label: 'Production Models' },
              { id: 'SYSTEMS', label: 'Agentic Systems' },
              { id: 'PREVIEW', label: 'Preview & Security' },
              { id: 'AUDIO', label: 'Audio / Whisper' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredModels.map((model) => {
              const isSelected = selectedModel === model.id;
              const isBlacklisted = groqData?.blacklisted?.includes(model.id);
              const isActive = model.is_active || groqData?.active_model?.includes(model.id);

              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3.5 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Row: Category & Speed */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                        {model.category}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        {model.speed}
                      </span>
                    </div>

                    {/* Model Name & ID */}
                    <div className="text-xs font-bold font-mono text-slate-100 mt-1">
                      {model.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate mb-2">
                      {model.id}
                    </div>

                    {/* Best For Tag */}
                    {model.best_for && (
                      <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800/80 mb-2 leading-relaxed">
                        <strong className="text-amber-400">Einsatz: </strong> {model.best_for}
                      </div>
                    )}

                    {/* Strengths Badges */}
                    {model.strengths && model.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {model.strengths.slice(0, 3).map((st, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/50"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Stats */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Kontext: {model.context}</span>
                    {isActive ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Aktiv
                      </span>
                    ) : isBlacklisted ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Blacklist
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Bereit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: INFERENCE BENCHMARK */}
      {activeTab === 'BENCHMARK' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                Interaktiver Groq Modell-Benchmark
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Zielmodell: <strong className="text-amber-300 font-bold">{selectedModel}</strong>
            </div>
          </div>

          {/* Model Selector & Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Modell wählen</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                {officialModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.speed})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                Temperature ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {activeModelDetails && (
              <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px]">
                <div className="text-amber-400 font-bold mb-0.5">Empfohlene Rolle:</div>
                <div className="text-slate-300 truncate">{activeModelDetails.best_for}</div>
              </div>
            )}
          </div>

          <form onSubmit={handleTestInference} className="space-y-2">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-mono">Prompt</label>
              <textarea
                rows={2}
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Prompt eingeben..."
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-md text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Inferenz läuft...' : 'LPU Inferenz Testen'}</span>
              </button>
            </div>
          </form>

          {/* Test Result Output */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono ${
                testResult.success
                  ? 'bg-slate-900 border-amber-500/40 text-slate-200'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between text-[11px] font-bold pb-2 mb-2 border-b border-slate-800 gap-2">
                <span className={testResult.success ? 'text-emerald-400 flex items-center gap-1.5' : 'text-rose-400'}>
                  {testResult.success ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Inferenz erfolgreich via {testResult.model}
                    </>
                  ) : (
                    '✕ Inferenz-Fehler'
                  )}
                </span>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {testResult.latency_ms} ms
                  </span>
                  {testResult.usage && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Coins className="w-3 h-3 text-amber-400" />
                      {testResult.usage.completion_tokens} Tokens
                    </span>
                  )}
                </div>
              </div>

              {testResult.success ? (
                <div className="text-slate-200 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-1">
                  {testResult.reply}
                </div>
              ) : (
                <div className="text-rose-300 leading-relaxed">
                  {testResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GROQ ARCHITECTURE & KNOWLEDGE */}
      {activeTab === 'KNOWLEDGE' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(knowledgeData?.knowledge_base || [
              {
                category: 'API_ARCHITECTURE',
                title: 'Groq Cloud LPU Inference Engine',
                summary: 'Hardwarebeschleunigte Inferenz auf maßgeschneiderten LPUs mit bis zu 1000 tps.',
                details: 'Groq LPUs nutzen SRAM mit massiver Speicherbandbreite, wodurch Memory-Bottlenecks eliminiert und deterministische Reaktionszeiten erreicht werden.'
              },
              {
                category: 'MODEL_HEURISTICS',
                title: 'Deterministische Modell-Heuristik für Agent Zero',
                summary: 'Code & Strategie -> Llama 3.3 70B; Reflexe -> Llama 3.1 8B; Deep Logic -> GPT-OSS 120B.',
                details: 'Für Python-Generierung verwendet der Agent Llama 3.3 70B bei niedriger Temperatur (0.1-0.2). Bei Fehlern greift die Self-Healing Kaskade.'
              },
              {
                category: 'RATE_LIMIT_GOVERNANCE',
                title: 'Rate-Limit Überwachung & Token Guard',
                summary: 'Aktive Überwachung von x-ratelimit-remaining-tokens.',
                details: 'Vor jedem Aufruf prüft der TokenBudgetManager das TPM/RPM-Budget und schaltet bei Bedarf automatisch in den Kompressions- und Fallback-Modus.'
              },
              {
                category: 'AGENTIC_INTEGRATIONS',
                title: 'Framework- & Tool-Integrationen',
                summary: 'Vercel AI SDK, LangGraph, CrewAI, AutoGen, BrowserBase, Firecrawl & MCP.',
                details: 'Agent Zero kann Werkzeuge über das Model Context Protocol (MCP) ansteuern und JSON-Ausgaben strikt validieren.'
              }
            ]).map((kb: GroqKnowledgeItem, idx: number) => (
              <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    {kb.category}
                  </span>
                </div>
                <h3 className="text-xs font-bold font-mono text-slate-100">{kb.title}</h3>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{kb.summary}</p>
                <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  {kb.details}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
            <span>Dokumentation & Spezifikationen:</span>
            <div className="flex items-center gap-3 text-amber-400">
              <a
                href="https://console.groq.com/docs/overview"
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                Groq Docs <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://console.groq.com/docs/api-reference#chat"
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                Chat API <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
