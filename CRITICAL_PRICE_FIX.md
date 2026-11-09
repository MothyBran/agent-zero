# CRITICAL: Warum CLOSED bei 0 blieb

## Bug
In `refreshLiveBinancePrices()` stand:

```ts
this.livePrices.set(spec.ticker, spec.basePriceUsd); // IMMER statisch!
```

Statt dem echten Binance-Preis. Dadurch war `unrealizedPnlPct` immer ≈ 0%.
Trailing/Stop/TP konnten nie greifen → **CLOSED blieb 0**.

## Fix (in refreshLiveBinancePrices)

**Ersetze den gesamten for-loop über NIGHT_SHIFT_TOKEN_UNIVERSE durch:**

```ts
      // CRITICAL FIX: real Binance spot prices only
      for (const spec of NIGHT_SHIFT_TOKEN_UNIVERSE) {
        const exact = binanceMap.get(spec.binancePair);
        if (exact && exact > 0) {
          this.livePrices.set(spec.ticker, exact);
        }
      }
```

## Plus
Methode `updateStrictLiveOnChainTick` aus `src/server/updateStrictLiveOnChainTick.LIVE.ts` übernehmen
(flexible Exits + Force-Rotate nach 90 Min).
