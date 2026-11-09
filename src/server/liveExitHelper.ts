/**
 * Live position exit helper – call from updateStrictLiveOnChainTick
 */
export async function runLiveExits(ctx: {
  openSlugs: any[];
  executeOnChainSwap?: (p: any) => Promise<{ success: boolean; txHash: string; message: string }>;
  wallet: { connected: boolean; polGasBalance: number };
  lastLiveSwapAttemptMs: number;
  setLastLiveSwapAttemptMs: (ms: number) => void;
  recordDecision: (d: any) => void;
  liveHeader: any;
}): Promise<string | null> {
  const nowMs = Date.now();
  let diagnostic: string | null = null;

  for (let i = ctx.openSlugs.length - 1; i >= 0; i--) {
    const slug = ctx.openSlugs[i];
    const shouldStop = slug.unrealizedPnlPct <= -6.0;
    const shouldTakeProfit = slug.unrealizedPnlPct >= 3.5;
    if (!shouldStop && !shouldTakeProfit) continue;
    if (!ctx.executeOnChainSwap) continue;
    if (!ctx.wallet.connected || ctx.wallet.polGasBalance < 0.15) continue;
    if (nowMs - ctx.lastLiveSwapAttemptMs < 15000) continue;
    ctx.setLastLiveSwapAttemptMs(nowMs);

    try {
      const swapRes = await ctx.executeOnChainSwap({
        direction: 'SELL_TOKEN',
        symbol: String(slug.ticker || '').replace(/^\$/g, ''),
        amountUsdc: Math.max(0.10, slug.sizeUsd || 0.25),
        expectedPriceUsd: slug.currentPriceUsd
      });

      if (swapRes.success && swapRes.txHash) {
        const pnlUsd = Number((slug.unrealizedPnlUsd || 0).toFixed(4));
        ctx.openSlugs.splice(i, 1);
        ctx.liveHeader.closedCount = (ctx.liveHeader.closedCount || 0) + 1;
        ctx.liveHeader.slugCount = ctx.openSlugs.length;

        ctx.recordDecision({
          action: shouldStop ? 'STOP' : 'SELL',
          ticker: slug.ticker,
          statusIndicator: shouldStop ? 'RED' : 'GREEN',
          amountUsd: pnlUsd,
          executionPriceUsd: slug.currentPriceUsd,
          multiplierText: shouldStop ? '-6.0%' : `+${Number(slug.unrealizedPnlPct || 0).toFixed(1)}%`,
          packOrigin: 'gmgn_trading_bot',
          rationaleShort: shouldStop
            ? `-6% hard stop on-chain | TX ${swapRes.txHash.slice(0, 12)}...`
            : `Take-profit +${Number(slug.unrealizedPnlPct || 0).toFixed(1)}% | TX ${swapRes.txHash.slice(0, 12)}...`,
          mode: 'LIVE',
          txHash: swapRes.txHash
        });
      } else {
        diagnostic = swapRes.message || 'SELL rejected by RPC';
      }
    } catch (err: any) {
      diagnostic = err?.message || 'SELL RPC error';
    }
  }
  return diagnostic;
}
