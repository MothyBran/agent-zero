# LIVE-Modus aktivieren – Checkliste

## 1. Railway Environment Variables (MUSS)

```
POLYGON_MAX_GWEI=900
LIVE_MIN_TRADE_USDC=0.25
LIVE_USDC_RESERVE=0.05
LIVE_MIN_POL=0.15
POLYGON_RPC_URL=<dein privater RPC – Alchemy / Helius / QuickNode>
```

Danach **Redeploy**.

## 2. server.ts – Gas-Limit (kritisch)

In `executePolygonDexSwap` diesen Block ersetzen:

```ts
// ALT (blockiert dich gerade):
const maxGasAllowed = ethers.parseUnits('250', 'gwei');

// NEU:
const MAX_GWEI = Number(process.env.POLYGON_MAX_GWEI || 900);
const maxGasAllowed = ethers.parseUnits(String(MAX_GWEI), 'gwei');
if (feeData.gasPrice && feeData.gasPrice > maxGasAllowed) {
  return {
    success: false,
    txHash: '',
    message: `Gas-Schutzsperre: ${ethers.formatUnits(feeData.gasPrice,'gwei')} Gwei > ${MAX_GWEI} Gwei`
  };
}
```

## 3. server.ts – Token-Map (kritisch)

```ts
import { getPolygonToken } from './src/server/polygonTokenMap.js';

// statt der alten TOKEN_MAP + Fallback auf POL:
const cleanSym = params.symbol.replace(/^\$/, '').toUpperCase();
const targetToken = getPolygonToken(cleanSym);
if (!targetToken) {
  return { success: false, txHash: '', message: `Unsupported live token: ${params.symbol}` };
}
// danach targetToken.address / .decimals / .fee verwenden
```

## 4. GrokDeskEngine – Universe

```ts
import { NIGHT_SHIFT_LIVE_UNIVERSE } from './nightShiftUniverse.js';

// Alte NIGHT_SHIFT_TOKEN_UNIVERSE-Definition löschen und ersetzen durch:
const NIGHT_SHIFT_TOKEN_UNIVERSE = NIGHT_SHIFT_LIVE_UNIVERSE;
```

## 5. Instantiierung mit Guard

```ts
import { createLiveSwapExecutor } from './src/server/liveExecutionGuard.js';

const safeLiveSwap = createLiveSwapExecutor(p => agentWallet.executePolygonDexSwap(p));
const grokDesk = new GrokDeskEngine(getLiveWalletInfo, safeLiveSwap);
```

## 6. Kapital-Realität

Die Anzeige **$0.59 USDC** ist der echte Stand der verbundenen Adresse.
Wenn du mehr handeln willst → sende zusätzliches USDC (native oder USDC.e) auf `0x8B89…0e1E`.

Mit den Änderungen oben und einem Redeploy kann der Bot bei Gas < 900 Gwei und ≥ $0.25 USDC echte Swaps der Tokens BTC / ETH / POL / LINK / AAVE / UNI / AVAX ausführen.
