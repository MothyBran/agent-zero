import React, { useState } from 'react';
import { BusinessProfile, AgentState } from '../types';
import { Building2, ShieldCheck, RefreshCw, AlertTriangle, ExternalLink, KeyRound, Wallet } from 'lucide-react';

interface BusinessProfileCardProps {
  profile: BusinessProfile | null;
  state?: AgentState | null;
  onResetAgent: () => void;
  onClearBlacklist: () => void;
  blacklistedCount: number;
}

export const BusinessProfileCard: React.FC<BusinessProfileCardProps> = ({
  profile,
  state,
  onResetAgent,
  onClearBlacklist,
  blacklistedCount
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const creatorAddress = state?.creator_wallet_address || profile?.creator_address || '';
  const agentAddress = state?.wallet_address || profile?.wallet_address || '';
  const hasKeyWarning = state?.creator_key_warning;

  return (
    <div id="business-profile-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Autonomous Business Entity & Governance
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
          business_profile.json
        </span>
      </div>

      {/* Warning banner if Private Key was mistakenly provided for Creator */}
      {hasKeyWarning && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2.5 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-amber-200">
              Sicherheitshinweis zu CREATOR_WALLET_ADDRESS:
            </strong>
            <p className="text-slate-300">
              In deinen Umgebungsvariablen (Secrets) wurde ein <strong>Private Key</strong> hinterlegt.
              Das System hat daraus automatisch deine <strong>öffentliche 0x-Empfängeradresse</strong> abgeleitet.
              Aus Sicherheitsgründen solltest du in den Secrets ausschließlich deine öffentliche 0x-Empfängeradresse eintragen!
            </p>
          </div>
        </div>
      )}

      {/* Entity Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400 flex items-center justify-between">
            <span>Entity Identity & Wallets</span>
            <span className="text-[10px] text-slate-500">Ethereum Mainnet</span>
          </span>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {profile?.entity_name || 'Agent Zero Autonomous Unit'}
          </div>

          <div className="text-xs text-slate-400 font-mono space-y-1">
            <div className="flex items-center justify-between">
              <span>Agent Wallet:</span>
              {agentAddress ? (
                <a
                  href={`https://etherscan.io/address/${agentAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-mono inline-flex items-center gap-1"
                >
                  {agentAddress.substring(0, 8)}...{agentAddress.substring(agentAddress.length - 6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-500">Nicht gesetzt</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>Gas (ETH):</span>
              <span className="text-slate-300 font-mono">
                {state?.agent_eth_balance !== undefined ? `${state.agent_eth_balance.toFixed(4)} ETH` : '0.0000 ETH'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Creator Wallet (Tribut):</span>
              {creatorAddress ? (
                <a
                  href={`https://etherscan.io/address/${creatorAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:text-purple-200 font-bold font-mono inline-flex items-center gap-1"
                >
                  {creatorAddress.substring(0, 8)}...{creatorAddress.substring(creatorAddress.length - 6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-500">Konfiguriert via CREATOR_WALLET_ADDRESS</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
              Registered Accounts & Nodes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.registered_accounts || ['Ethereum Mainnet', 'Etherscan', 'DuckDuckGo API']).map(
                (acc, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {acc}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Core Directives / Iron Rules */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
            Eiserne Geschäfts- & Überlebens-Regeln
          </span>
          <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>1. No Debt:</strong> Keine Kredite oder Schulden. Jeder Aufwand muss durch unmittelbare Liquidität gedeckt sein.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>2. Kill-Switch:</strong> Unrentable Werkzeuge oder Modelle werden sofort deaktiviert.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>3. Dual Settlement:</strong> Protokoll-Ledger Buchung bei 0 Gas, Live On-Chain Transfer bei vorhandenem ETH-Gas.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Model Blacklist & State Reset Actions */}
      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">
            Model Blacklist: <strong className="text-slate-200">{blacklistedCount} models</strong>
          </span>
          {blacklistedCount > 0 && (
            <button
              onClick={onClearBlacklist}
              className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline"
            >
              Clear Blacklist
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset State & Memory</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-300 font-mono">Reset to Level 0?</span>
              <button
                onClick={() => {
                  onResetAgent();
                  setShowConfirmReset(false);
                }}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 font-mono"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
