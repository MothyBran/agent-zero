import React from 'react';
import { WorkspaceBootState } from '../../types/grokDesk';
import { Terminal, RefreshCw, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface GrokBootLoaderModalProps {
  bootState: WorkspaceBootState;
  isBusy: boolean;
  onReRunBoot: () => void;
  onEnterWorkspace: () => void;
}

export const GrokBootLoaderModal: React.FC<GrokBootLoaderModalProps> = ({
  bootState,
  isBusy,
  onReRunBoot,
  onEnterWorkspace
}) => {
  const readyCount = bootState.packs.filter(p => p.status === 'READY').length;

  return (
    <div className="w-full max-w-xl mx-auto py-6 sm:py-10 px-4">
      <div className="bg-[#121215] border border-[#222228] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Top Bot Identity & Shift Status */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1F1F25] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5] font-display">
                {bootState.deskTitle}
              </h1>
              <p className="text-xs font-mono text-[#A1A1AA] tracking-wider mt-0.5">
                {bootState.shiftLabel}
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-xs text-[#71717A] block">PACKS ONLINE</span>
            <span className="text-sm font-semibold text-[#10B981] tabular-nums">
              {readyCount} / {bootState.packs.length}
            </span>
          </div>
        </div>

        {/* Checklist Header & Overall Progress Bar */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#A1A1AA] font-semibold tracking-wider">
              {bootState.bootHeaderLabel}
            </span>
            <span className="text-[#10B981] font-bold tabular-nums">
              {bootState.overallProgressPct}%
            </span>
          </div>

          <div className="w-full h-2 bg-[#09090B] rounded-full overflow-hidden border border-[#222228]">
            <div
              className="h-full bg-[#10B981] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, bootState.overallProgressPct))}%` }}
            />
          </div>
        </div>

        {/* 5 Packs Checklist Rows */}
        <div className="divide-y divide-[#1C1C22] border border-[#1F1F25] rounded-xl bg-[#09090B] overflow-hidden">
          {bootState.packs.map((pack, index) => {
            const isReady = pack.status === 'READY';
            return (
              <div
                key={pack.id}
                className="p-3.5 sm:px-4 flex items-center justify-between gap-4 hover:bg-[#121215]/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-[#52525B] tabular-nums">
                      0{index + 1}
                    </span>
                    <span className="text-sm font-semibold text-[#F4F4F5] truncate">
                      {pack.name}
                    </span>
                    <span className="text-xs font-mono text-[#71717A] tabular-nums hidden sm:inline">
                      · {pack.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#71717A] truncate mt-0.5 pl-6">
                    {pack.subStatusText}
                  </p>
                </div>

                {/* Progress & Status Indicator */}
                <div className="flex items-center gap-3 shrink-0 font-mono">
                  <div className="w-16 h-1.5 bg-[#18181C] rounded-full overflow-hidden hidden xs:block">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isReady ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                      }`}
                      style={{ width: `${pack.progressPct}%` }}
                    />
                  </div>

                  <span className="text-xs text-[#A1A1AA] w-9 text-right tabular-nums">
                    {pack.progressPct}%
                  </span>

                  <div className="flex items-center gap-1.5 w-16 justify-end">
                    {isReady ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[#F59E0B] animate-spin shrink-0" />
                    )}
                    <span
                      className={`text-xs font-bold tracking-wider ${
                        isReady ? 'text-[#10B981]' : 'text-[#F59E0B]'
                      }`}
                    >
                      {pack.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Status ("Opening scoped workspace") & Controls */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono text-[#A1A1AA]">
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#10B981] shrink-0 ${
                !bootState.isWorkspaceReady || isBusy ? 'animate-spin' : ''
              }`}
            />
            <span>Opening scoped workspace</span>
            <span className="text-[#52525B]">·</span>
            <span className="text-[#71717A] tabular-nums">
              {bootState.overallProgressPct}% synced
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onReRunBoot}
              disabled={isBusy}
              className="px-3.5 py-2 rounded-lg bg-[#09090B] hover:bg-[#18181D] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Re-Boot 5 Packs
            </button>

            <button
              type="button"
              onClick={onEnterWorkspace}
              className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#09090B] font-semibold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <span>Open Live Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
