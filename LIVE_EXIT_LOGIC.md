# LIVE Exit-Logik – in updateStrictLiveOnChainTick einfügen

## Problem
`updateStrictLiveOnChainTick` in `src/server/grokDeskEngine.ts` macht nur BUYs.
Es gibt **keine** on-chain SELLs bei Stop-Loss oder Take-Profit.
→ 4 offene Positionen, 0 geschlossen, Kapital gebunden.

## Fix: Nach dem PnL-Update-Loop (nach dem for-loop über openSlugs)
und **vor** dem BUY-Block diesen Exit-Block einfügen:

```ts
    // ── LIVE EXITS: Hard -6% Stop + Take-Profit ──────────────────────────
    const nowMsExit = Date.now();
    for (let i = this.liveHeader.openSlugs.length - 1; i >= 0; i--) {
      const slug = this.liveHeader.openSlugs[i];
      const shouldStop = slug.unrealizedPnlPct <= -6.0;
      // Scalp TP: +3.5% is realistic for BTC/ETH on small size
      const shouldTakeProfit = slug.unrealizedPnlPct >= 3.5;

      if (!shouldStop && !shouldTakeProfit) continue;
      if (!this.executeOnChainSwap) continue;
      if (!wallet.connected || wallet.polGasBalance < 0.15) continue;

      if (nowMsExit - this.lastLiveSwapAttemptMs < 15000) continue;
      this.lastLiveSwapAttemptMs = nowMsExit;

      try {
        const swapRes = await this.executeOnChainSwap({
          direction: 'SELL_TOKEN',
          symbol: slug.ticker.replace(/^\$/, ''),
          amountUsdc: Math.max(0.10, slug.sizeUsd),
          expectedPriceUsd: slug.currentPriceUsd
        });

        if (swapRes.success && swapRes.txHash) {
          const pnlUsd = Number(slug.unrealizedPnlUsd.toFixed(4));
          this.liveHeader.openSlugs.splice(i, 1);
          this.liveHeader.closedCount = (this.liveHeader.closedCount || 0) + 1;
          this.liveHeader.slugCount = this.liveHeader.openSlugs.length;

          this.recordDecision({
            action: shouldStop ? 'STOP' : 'SELL',
            ticker: slug.ticker,
            statusIndicator: shouldStop ? 'RED' : 'GREEN',
            amountUsd: pnlUsd,
            executionPriceUsd: slug.currentPriceUsd,
            multiplierText: shouldStop ? '-6.0%' : `+${slug.unrealizedPnlPct.toFixed(1)}%`,
            packOrigin: 'gmgn_trading_bot',
            rationaleShort: shouldStop
              ? `-6% hard stop on-chain | TX ${swapRes.txHash.slice(0, 12)}...`
              : `Take-profit +${slug.unrealizedPnlPct.toFixed(1)}% | TX ${swapRes.txHash.slice(0, 12)}...`,
            mode: 'LIVE',
            txHash: swapRes.txHash
          });
        } else {
          this.lastLiveExecutionDiagnostic = swapRes.message || 'SELL rejected by RPC';
        }
      } catch (err: any) {
        this.lastLiveExecutionDiagnostic = err?.message || 'SELL RPC error';
      }
    }
    // ── END LIVE EXITS ───────────────────────────────────────────────────
```

## Optional: Position-Size leicht anheben
Im BUY-Block steht aktuell max $0.25. Besser:
```ts
const tradeAmountUsdc = Number(Math.max(0.25, Math.min(1.50, (realUsdc - 0.10) * 0.40)).toFixed(2));
```

## Datei
`src/server/grokDeskEngine.ts` → Methode `updateStrictLiveOnChainTick`
