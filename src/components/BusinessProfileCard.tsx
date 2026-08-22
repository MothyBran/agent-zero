import React, { useState } from 'react';
import { BusinessProfile } from '../types';
import { Building2, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface BusinessProfileCardProps {
  profile: BusinessProfile | null;
  onResetAgent: () => void;
  onClearBlacklist: () => void;
  blacklistedCount: number;
}

export const BusinessProfileCard: React.FC<BusinessProfileCardProps> = ({
  profile,
  onResetAgent,
  onClearBlacklist,
  blacklistedCount
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

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

      {/* Entity Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
            Entity Identity
          </span>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {profile?.entity_name || 'Agent Zero Autonomous Unit'}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Agent Wallet:{' '}
            <span className="text-slate-300">
              {profile?.wallet_address
                ? `${profile.wallet_address.substring(0, 10)}...${profile.wallet_address.substring(
                    profile.wallet_address.length - 8
                  )}`
                : 'Not Set'}
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Creator Wallet (Tribut-Empfänger):{' '}
            <span className="text-purple-300 font-bold">
              {profile?.creator_address
                ? `${profile.creator_address.substring(0, 10)}...${profile.creator_address.substring(
                    profile.creator_address.length - 8
                  )}`
                : 'Default 0x000... (configured via CREATOR_WALLET_ADDRESS)'}
            </span>
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
                <strong>1. No Debt:</strong> No subscriptions or debt. Every expense must be covered by immediate cash.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>2. Kill-Switch:</strong> Instantly cancel and sever any tool or node with non-positive ROI.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>3. Full Transparency:</strong> Every micro-transaction is recorded in the accounting ledger.
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
