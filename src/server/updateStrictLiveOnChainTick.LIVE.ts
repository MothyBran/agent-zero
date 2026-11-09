private async updateStrictLiveOnChainTick(candidate: TokenCandidateSpec, walletScore: number): Promise<void> {
    const wallet = this.getLiveWalletInfo();
    const realUsdc = Number((wallet.usdcBalance || 0).toFixed(4));
    const nowMs = Date.now();

    // Only keep positions with real on-chain txHash
    this.liveHeader.openSlugs = this.liveHeader.openSlugs.filter(
      s => Boolean(s.txHash && s.txHash.startsWith('0x'))
    );

    // ── Mark-to-market via live Binance prices ───────────────────────────
    for (let i = this.liveHeader.openSlugs.length - 1; i >= 0; i--) {
      const slug = this.liveHeader.openSlugs[i];
      const liveSpot = this.livePrices.get(slug.ticker);
      if (liveSpot && liveSpot > 0) {
        slug.currentPriceUsd = liveSpot;
        if (liveSpot > (slug.peakPriceUsd || slug.entryPriceUsd)) {
          slug.peakPriceUsd = liveSpot;
        }
        const rawPnlPct = ((slug.currentPriceUsd - slug.entryPriceUsd) / slug.entryPriceUsd) * 100;
        slug.unrealizedPnlPct = Number(rawPnlPct.toFixed(2));
        slug.unrealizedPnlUsd = Number(((slug.sizeUsd * rawPnlPct) / 100).toFixed(4));
        slug.multiplier = Number((1 + rawPnlPct / 100).toFixed(2));
      }
    }

    // ── FLEXIBLE EXITS (no fixed profit ceiling) ─────────────────────────
    //  1. Hard stop:     unrealized ≤ -6%
    //  2. Trailing stop: once peak gain ≥ +1.0%, exit if drawdown from peak ≥ 0.9%
    //  3. Quick lock:    unrealized ≥ +1.2% and held ≥ 8 minutes
    //  4. Stale exit:    held ≥ 45 minutes and unrealized ≥ +0.4%
    for (let i = this.liveHeader.openSlugs.length - 1; i >= 0; i--) {
      const slug = this.liveHeader.openSlugs[i];
      const heldMs = nowMs - new Date(slug.openedAt).getTime();
      const heldMin = heldMs / 60000;
      const peakPct = ((slug.peakPriceUsd - slug.entryPriceUsd) / slug.entryPriceUsd) * 100;
      const drawdownFromPeak = peakPct - slug.unrealizedPnlPct;

      const hardStop = slug.unrealizedPnlPct <= -6.0;
      const trailingStop = peakPct >= 1.0 && drawdownFromPeak >= 0.9;
      const quickLock = slug.unrealizedPnlPct >= 1.2 && heldMin >= 8;
      const staleProfit = heldMin >= 45 && slug.unrealizedPnlPct >= 0.4;

      if (!hardStop && !trailingStop && !quickLock && !staleProfit) continue;
      if (!this.executeOnChainSwap || !wallet.connected || wallet.polGasBalance < 0.15) continue;
      if (nowMs - this.lastLiveSwapAttemptMs < 12000) continue;
      this.lastLiveSwapAttemptMs = nowMs;

      const reason = hardStop
        ? 'HARD_STOP_-6%'
        : trailingStop
          ? `TRAIL_PEAK_${peakPct.toFixed(1)}%`
          : quickLock
            ? 'QUICK_LOCK_+1.2%'
            : 'STALE_PROFIT_45m';

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
            action: hardStop ? 'STOP' : 'SELL',
            ticker: slug.ticker,
            statusIndicator: pnlUsd >= 0 ? 'GREEN' : 'RED',
            amountUsd: pnlUsd,
            executionPriceUsd: slug.currentPriceUsd,
            multiplierText: `${slug.unrealizedPnlPct >= 0 ? '+' : ''}${slug.unrealizedPnlPct.toFixed(1)}%`,
            packOrigin: 'gmgn_trading_bot',
            rationaleShort: `${reason} | TX ${swapRes.txHash.slice(0, 12)}...`,
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

    // ── SCALED BUYS (size grows with free capital) ───────────────────────
    if (
      this.autoPilotEnabled &&
      this.pipelinePhase === 2 &&
      walletScore >= 85 &&
      wallet.connected &&
      wallet.polGasBalance >= 0.15 &&
      realUsdc >= 0.40 &&
      this.executeOnChainSwap &&
      nowMs - this.lastLiveSwapAttemptMs > 20000 &&
      this.liveHeader.openSlugs.length < 4
    ) {
      this.lastLiveSwapAttemptMs = nowMs;

      const free = Math.max(0, realUsdc - 0.15);
      const tradeAmountUsdc = Number(
        Math.max(0.30, Math.min(8.0, free * 0.40)).toFixed(2)
      );

      if (tradeAmountUsdc < 0.30) {
        this.lastLiveExecutionDiagnostic = `Cash too low for scaled entry (${realUsdc.toFixed(2)} USDC)`;
      } else {
        const livePrice = this.livePrices.get(candidate.ticker) || candidate.basePriceUsd;
        const alreadyOpen = this.liveHeader.openSlugs.some(
          s => s.ticker === candidate.ticker
        );

        if (!alreadyOpen) {
          try {
            const swapRes = await this.executeOnChainSwap({
              direction: 'BUY_TOKEN',
              symbol: candidate.ticker.replace(/^\$/, ''),
              amountUsdc: tradeAmountUsdc,
              expectedPriceUsd: livePrice
            });

            if (swapRes.success && swapRes.txHash) {
              this.lastLiveExecutionDiagnostic = `BUY ${candidate.ticker} $${tradeAmountUsdc} | TX ${swapRes.txHash.slice(0, 12)}...`;
              const newSlug: ActiveSlugPosition = {
                id: `slug_live_${Date.now()}`,
                ticker: candidate.ticker,
                name: candidate.name,
                chain: candidate.chain,
                entryPriceUsd: livePrice,
                currentPriceUsd: livePrice,
                peakPriceUsd: livePrice,
                sizeUsd: tradeAmountUsdc,
                unrealizedPnlUsd: 0,
                unrealizedPnlPct: 0,
                multiplier: 1.0,
                stopLossPct: -6.0,
                stopLossPriceUsd: Number((livePrice * 0.94).toPrecision(6)),
                walletScore,
                routeVenue: candidate.routeVenue,
                openedAt: new Date().toISOString(),
                txHash: swapRes.txHash
              };
              this.liveHeader.openSlugs.unshift(newSlug);
              this.liveHeader.entriesCount += 1;
              this.liveHeader.slugCount = this.liveHeader.openSlugs.length;

              this.recordDecision({
                action: 'BUY',
                ticker: candidate.ticker,
                statusIndicator: 'GREEN',
                amountUsd: tradeAmountUsdc,
                executionPriceUsd: livePrice,
                multiplierText: 'ON-CHAIN',
                packOrigin: 'gmgn_trading_bot',
                rationaleShort: `size $${tradeAmountUsdc} (${((tradeAmountUsdc / realUsdc) * 100).toFixed(0)}% cash) | TX ${swapRes.txHash.slice(0, 12)}...`,
                mode: 'LIVE',
                txHash: swapRes.txHash
              });
            } else {
              this.lastLiveExecutionDiagnostic = swapRes.message || 'BUY rejected by RPC';
            }
          } catch (err: any) {
            this.lastLiveExecutionDiagnostic = err?.message || 'BUY RPC error';
          }
        }
      }
    }

    // ── Recompute equity from real USDC + open positions ────────────────
    const refreshed = this.getLiveWalletInfo();
    const currentUsdc = Number((refreshed.usdcBalance || 0).toFixed(4));
    const openVal = this.liveHeader.openSlugs.reduce(
      (sum, s) => sum + s.sizeUsd + s.unrealizedPnlUsd,
      0
    );
    this.liveHeader.availableCashUsd = currentUsdc;
    this.liveHeader.totalEquityUsd = Number((currentUsdc + openVal).toFixed(4));
    if (this.liveHeader.initialCapitalUsd <= 0 && currentUsdc > 0) {
      this.liveHeader.initialCapitalUsd = currentUsdc;
    }
    const baseCap =
      this.liveHeader.initialCapitalUsd > 0
        ? this.liveHeader.initialCapitalUsd
        : currentUsdc;
    this.liveHeader.absoluteGainUsd = Number(
      (this.liveHeader.totalEquityUsd - baseCap).toFixed(4)
    );
    this.liveHeader.portfolioMultiplier =
      baseCap > 0
        ? Number((this.liveHeader.totalEquityUsd / baseCap).toFixed(2))
        : 1.0;
    this.liveHeader.slugCount = this.liveHeader.openSlugs.length;

    const lastPt =
      this.liveHeader.equityCurve[this.liveHeader.equityCurve.length - 1];
    if (
      !lastPt ||
      Math.abs(lastPt.equityUsd - this.liveHeader.totalEquityUsd) >= 0.001
    ) {
      this.liveHeader.equityCurve = [
        ...this.liveHeader.equityCurve.slice(-29),
        {
          timestamp: new Date().toISOString(),
          timeLabel: formatShortTime(),
          equityUsd: this.liveHeader.totalEquityUsd,
          pnlUsd: this.liveHeader.absoluteGainUsd,
          pnlPct:
            baseCap > 0
              ? Number(
                  ((this.liveHeader.absoluteGainUsd / baseCap) * 100).toFixed(2)
                )
              : 0,
          triggerTicker: 'ON_CHAIN_RPC'
        }
      ];
    }
  }
