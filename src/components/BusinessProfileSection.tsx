import React, { useState, useEffect } from 'react';
import { Building2, Wallet, Server, Wrench, ExternalLink, Copy, Check, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { safeFetchJson, safePostJson } from '../lib/api';

interface BusinessProfileData {
  entity_name: string;
  wallet_address: string;
  creator_address: string;
  registered_nodes: string[];
  active_tools: string[];
  discovered_tools: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    status: string;
  }>;
}

export const BusinessProfileSection: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newWalletInput, setNewWalletInput] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    const res = await safeFetchJson<BusinessProfileData>('/api/business-profile');
    if (res.ok && res.data) {
      setProfile(res.data);
      if (!newWalletInput) {
        setNewWalletInput(res.data.wallet_address || '');
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletInput.trim()) return;
    setIsUpdatingAddress(true);
    const res = await safePostJson<{ success: boolean }>('/api/wallet/address', { address: newWalletInput.trim() });
    setIsUpdatingAddress(false);
    if (res.ok) {
      setStatusMessage('Wallet-Adresse erfolgreich aktualisiert.');
      fetchProfile();
    } else {
      setStatusMessage('Fehler: ' + (res.error || 'Ungültige EVM Adresse.'));
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const agentWallet = profile?.wallet_address || '';
  const creatorWallet = profile?.creator_address || '';
  const nodes = profile?.registered_nodes || [];
  const activeTools = profile?.active_tools || [];
  const discoveredTools = profile?.discovered_tools || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Entitäts-Profil (business_profile.json)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Identität, Polygon-Wallets, RPC-Knoten und verifizierte Ausführungswerkzeuge
          </p>
        </div>
        <button
          onClick={fetchProfile}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer self-start sm:self-auto"
          title="Profil neu laden"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/40 text-purple-300 text-xs font-mono">
          ℹ️ {statusMessage}
        </div>
      )}

      {/* Grid: Wallets & Entity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Entitäts-Identität & Wallets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Polygon Blockchain Wallets</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Chain ID: 137 (Polygon)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Entitäts-Bezeichnung</div>
              <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                {profile?.entity_name || 'Agent Zero (Autonome Einheit)'}
              </div>
            </div>

            {/* Agent Wallet */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Agent Zero Wallet (USDC & Gas)</span>
                {agentWallet && (
                  <button
                    onClick={() => handleCopy(agentWallet, 'agent')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {copiedField === 'agent' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'agent' ? 'Kopiert' : 'Kopieren'}</span>
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-emerald-400 break-all">
                {agentWallet ? agentWallet : 'Keine Wallet-Adresse hinterlegt (AGENT_PRIVATE_KEY oder AGENT_WALLET_ADDRESS setzen)'}
              </div>
              {agentWallet && (
                <div className="pt-1">
                  <a
                    href={`https://polygonscan.com/address/${agentWallet}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300"
                  >
                    <span>Auf Polygonscan einsehen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Creator Wallet */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Creator Wallet (Tribut-Empfänger)</span>
                {creatorWallet && (
                  <button
                    onClick={() => handleCopy(creatorWallet, 'creator')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {copiedField === 'creator' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'creator' ? 'Kopiert' : 'Kopieren'}</span>
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-purple-300 break-all">
                {creatorWallet ? creatorWallet : 'Konfiguriert via CREATOR_WALLET_ADDRESS in Umgebungsvariablen'}
              </div>
              {creatorWallet && (
                <div className="pt-1">
                  <a
                    href={`https://polygonscan.com/address/${creatorWallet}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300"
                  >
                    <span>Auf Polygonscan einsehen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Quick Wallet Address Update Form */}
            <form onSubmit={handleUpdateAddress} className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[11px] text-slate-400 font-mono block">
                Agent-Adresse manuell verknüpfen:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWalletInput}
                  onChange={(e) => setNewWalletInput(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all cursor-pointer"
                >
                  {isUpdatingAddress ? 'Speichere...' : 'Setzen'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Card 2: Nodes & Tool Registry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          {/* Section A: Registered Blockchain Nodes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Registrierte Blockchain-Nodes</span>
            </div>
            <div className="space-y-2">
              {nodes.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono">Keine Nodes registriert.</div>
              ) : (
                nodes.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-slate-200 font-semibold">{node}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      ONLINE
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section B: Active & Discovered Tools */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Aktive & Erforschte Werkzeuge</span>
            </div>

            <div className="space-y-2">
              {activeTools.length === 0 && discoveredTools.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono">Keine Werkzeuge registriert.</div>
              ) : (
                <>
                  {activeTools.map((tool, idx) => (
                    <div
                      key={`act_${idx}`}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-200">{tool}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AKTIV
                      </span>
                    </div>
                  ))}
                  {discoveredTools.map((tool, idx) => (
                    <div
                      key={`disc_${idx}`}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <span className="text-slate-200 font-semibold">{tool.name}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{tool.description}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {tool.status}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
