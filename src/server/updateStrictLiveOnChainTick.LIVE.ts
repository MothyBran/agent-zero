private async updateStrictLiveOnChainTick(candidate: TokenCandidateSpec, walletScore: number): Promise<void> {
    const wallet = this.getLiveWalletInfo();
    const realUsdc = Number((wallet.usdcBalance || 0).toFixed(4));

    // Purge any position that does not have a real on-chain transaction hash
    this.liveHeader.openSlugs = this.liveHeader.openSlugs.filter(
      s => Boolean(s.txHash && s.txHash.startsWith('0x'))
    );

    // Update any real on-chain positions strictly via real Binance Spot price feed
    for (let i = this.liveHeader.openSlugs.length - 1; i >= 0; i--) {
      const slug = this.liveHeader.openSlugs[i];
      const liveSpot = this.livePrices.get(slug.ticker);
      if (liveSpot && liveSpot > 0) {
        slug.currentPriceUsd = liveSpot;
        if (liveSpot > slug.peakPriceUsd) slug.peakPriceUsd = liveSpot;
        const rawPnlPct = ((slug.currentPriceUsd - slug.entryPriceUsd) / slug.entryPriceUsd) * 100;
        slug.unrealizedPnlPct = Number(rawPnlPct.toFixed(2));
        slug.unrealizedPnlUsd = Number(((slug.sizeUsd * rawPnlPct) / 100).toFixed(4));
        slug.multiplier = Number((1 + rawPnlPct / 100).toFixed(2));
      }
    }

    // ── LIVE EXITS: Hard -6% Stop + Take-Profit (+3.5%) ─────────────────
    const nowMsExit = Date.now();
    for (let i = this.liveHeader.openSlugs.length - 1; i >= 0; i--) {
      const slug = this.liveHeader.openSlugs[i];
      const shouldStop = slug.unrealizedPnlPct <= -6.0;
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

    // Attempt real on-chain execution if Auto-Pilot is on and pipeline is at route.fill
    const nowMs = Date.now();
    if (this.autoPilotEnabled && this.pipelinePhase === 2 && walletScore >= 85) {
      if (!wallet.connected) {
        this.lastLiveExecutionDiagnostic =
          'Warte auf AGENT_PRIVATE_KEY (Kein Signer für echte On-Chain-Transaktionen verbunden).';
      } else if (wallet.polGasBalance < 0.25) {
        this.lastLiveExecutionDiagnostic =
          `Gas-Schutzsperre: ${wallet.polGasBalance.toFixed(4)} POL verfügbar (Mindestens 0.25 POL für Polygon-Swaps erforderlich).`;
      } else if (realUsdc < 0.15) {
        this.lastLiveExecutionDiagnostic =
          `Zu wenig freies USDC (${realUsdc.toFixed(4)} USDC) oberhalb der 0.05 USDC Mindestreserve.`;
      } else if (this.executeOnChainSwap && nowMs - this.lastLiveSwapAttemptMs > 25000 && this.liveHeader.openSlugs.length < 3) {
        this.lastLiveSwapAttemptMs = nowMs;
        const tradeAmountUsdc = Number(Math.max(0.25, Math.min(1.50, (realUsdc - 0.10) * 0.40)).toFixed(2));
        const livePrice = this.livePrices.get(candidate.ticker) || candidate.basePriceUsd;

        try {
          const swapRes = await this.executeOnChainSwap({
            direction: 'BUY_TOKEN',
            symbol: candidate.ticker.replace(/^\$/, ''),
            amountUsdc: tradeAmountUsdc,
            expectedPriceUsd: livePrice
          });

          if (swapRes.success && swapRes.txHash) {
            this.lastLiveExecutionDiagnostic = `On-Chain Swap bestätigt: TX ${swapRes.txHash.slice(0, 12)}...`;
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
              rationaleShort: `Polygon TX ${swapRes.txHash.slice(0, 12)}...`,
              mode: 'LIVE',
              txHash: swapRes.txHash
            });
          } else {
            this.lastLiveExecutionDiagnostic = swapRes.message || 'On-Chain Swap vom RPC abgelehnt.';
          }
        } catch (err: any) {
          this.lastLiveExecutionDiagnostic = err?.message || 'On-Chain RPC Fehler.';
        }
      }
    }

    // Recompute strict Live Header totals strictly from real on-chain USDC + verified txHash positions
    const refreshedWallet = this.getLiveWalletInfo();
    const currentRealUsdc = Number((refreshedWallet.usdcBalance || 0).toFixed(4));
    const openSlugsValue = this.liveHeader.openSlugs.reduce(
      (sum, s) => sum + s.sizeUsd + s.unrealizedPnlUsd,
      0
    );

    this.liveHeader.availableCashUsd = currentRealUsdc;
    this.liveHeader.totalEquityUsd = Number((currentRealUsdc + openSlugsValue).toFixed(4));
    if (this.liveHeader.initialCapitalUsd <= 0 && currentRealUsdc > 0) {
      this.liveHeader.initialCapitalUsd = currentRealUsdc;
    }
    const baseCap = this.liveHeader.initialCapitalUsd > 0 ? this.liveHeader.initialCapitalUsd : currentRealUsdc;
    this.liveHeader.absoluteGainUsd = Number((this.liveHeader.totalEquityUsd - baseCap).toFixed(4));
    this.liveHeader.portfolioMultiplier =
      baseCap > 0 ? Number((this.liveHeader.totalEquityUsd / baseCap).toFixed(2)) : 1.0;
    this.liveHeader.slugCount = this.liveHeader.openSlugs.length;

    const lastPt = this.liveHeader.equityCurve[this.liveHeader.equityCurve.length - 1];
    if (!lastPt || Math.abs(lastPt.equityUsd - this.liveHeader.totalEquityUsd) >= 0.001) {
      this.liveHeader.equityCurve = [
        ...this.liveHeader.equityCurve.slice(-29),
        {
          timestamp: new Date().toISOString(),
          timeLabel: formatShortTime(),
          equityUsd: this.liveHeader.totalEquityUsd,
          pnlUsd: this.liveHeader.absoluteGainUsd,
          pnlPct: baseCap > 0 ? Number(((this.liveHeader.absoluteGainUsd / baseCap) * 100).toFixed(2)) : 0,
          triggerTicker: 'ON_CHAIN_RPC'
        }
      ];
    }
  }
