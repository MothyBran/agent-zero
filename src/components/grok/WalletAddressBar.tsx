import React, { useState } from 'react';
import { Copy, Check, Wallet, ShieldAlert, ExternalLink } from 'lucide-react';

interface WalletAddressBarProps {
  address: string;
  usdcBalance: number;
  polGasBalance: number;
  hasPrivateKeySigner: boolean;
  networkLabel: string;
  mode: 'PAPER' | 'LIVE';
  lastDiagnostic?: string;
}

export const WalletAddressBar: React.FC<WalletAddressBarProps> = ({
  address,
  usdcBalance,
  polGasBalance,
  hasPrivateKeySigner,
  networkLabel,
  mode,
  lastDiagnostic
}) => {
  const [copied, setCopied] = useState(false);

  const truncated = address && address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address || '—';

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback silently
    }
  };

  const explorerUrl = address
    ? `https://polygonscan.com/address/${address}`
    : '#';

  return (
    <div className="bg-[#121215] border border-[#222228] rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-[#10B981]" />
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-[#71717A] tracking-wider uppercase">
              Connected Wallet
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                mode === 'LIVE'
                  ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                  : 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
              }`}
            >
              {mode === 'LIVE' ? 'LIVE ON-CHAIN' : 'PAPER'}
            </span>
            <span className="text-[10px] font-mono text-[#52525B]">{networkLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <code className="text-sm font-mono font-semibold text-[#F4F4F5] tracking-tight">
              {truncated}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              title="Adresse kopieren"
              className="p-1 rounded-md hover:bg-[#1A1A20] text-[#71717A] hover:text-[#10B981] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {address && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-md hover:bg-[#1A1A20] text-[#71717A] hover:text-[#10B981] transition-colors"
                title="Im Explorer öffnen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-5 text-xs font-mono tabular-nums shrink-0">
        <div className="text-right">
          <div className="text-[#71717A] text-[10px] uppercase tracking-wider">USDC</div>
          <div className="text-[#F4F4F5] font-bold">${usdcBalance.toFixed(4)}</div>
        </div>
        <div className="text-right">
          <div className="text-[#71717A] text-[10px] uppercase tracking-wider">Gas (POL)</div>
          <div className="text-[#F4F4F5] font-bold">{polGasBalance.toFixed(4)}</div>
        </div>
        <div className="text-right">
          <div className="text-[#71717A] text-[10px] uppercase tracking-wider">Signer</div>
          <div className={`font-bold flex items-center gap-1 ${hasPrivateKeySigner ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {!hasPrivateKeySigner && <ShieldAlert className="w-3 h-3" />}
            {hasPrivateKeySigner ? 'AKTIV' : 'FEHLT'}
          </div>
        </div>
      </div>

      {lastDiagnostic && mode === 'LIVE' && (
        <div className="w-full sm:w-auto text-[11px] text-[#A1A1AA] font-mono border-t sm:border-t-0 border-[#1E1E24] pt-2 sm:pt-0">
          {lastDiagnostic}
        </div>
      )}
    </div>
  );
};
