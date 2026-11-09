# LIVE Engine Cleanup + Flexible Exits

## Sofort einbauen
Ersetze in `src/server/grokDeskEngine.ts` die Methode `updateStrictLiveOnChainTick`
komplett durch den Inhalt von `src/server/updateStrictLiveOnChainTick.LIVE.ts`.

## Neue Exit-Regeln (kein fixes Gewinnziel)
1. **Hard Stop** −6%
2. **Trailing Stop** – ab +1.0% Peak: Exit wenn Kurs 0.9% vom Peak zurückfällt
3. **Quick Lock** – ab +1.2% und ≥ 8 Minuten halten
4. **Stale Profit** – nach 45 Min bei ≥ +0.4% mitnehmen

→ Der Bot ist nicht auf +3.5% begrenzt. Er nimmt Gewinne flexibel mit.

## Positionsgröße skaliert mit Kapital
```
tradeSize = max(0.30, min(8.0, (USDC - 0.15) * 0.40))
```
Bei $10 Cash → ~$4 Trade. Bei $50 → ~$8 Trade.

## Aufräumen (Altlasten)
- Demo-Ticker ($MABEL, $PIXEL, $ZORA, $KROK) → nur noch NIGHT_SHIFT_LIVE_UNIVERSE
- Feste $0.25 Trade-Size → skaliert
- Starres +3.5% TP → Trailing + flexible Locks
- Paper-Mode-Fake-Kurve bleibt nur für PAPER (LIVE nutzt echte RPC-Daten)

Optional:
- `createInitialFivePacksState` Default-Ticker von $MABEL auf $BTC
- SCAM_LAUNCH_SAMPLES ist nur UI-Theater für Kaiser.Charon
