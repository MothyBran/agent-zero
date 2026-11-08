# LIVE-Modus – 3 Copy-Paste-Blöcke für server.ts

Die Datei ist zu groß für automatisches Full-Overwrite. Diese 3 Blöcke reichen, um den Live-Modus freizuschalten.

## Railway Variables (zuerst setzen + Redeploy)

```
POLYGON_MAX_GWEI=900
LIVE_MIN_TRADE_USDC=0.25
LIVE_USDC_RESERVE=0.05
LIVE_MIN_POL=0.15
```

## Block 1 – Imports (ganz oben in server.ts)

```ts
import { getPolygonToken, POLYGON_UNISWAP_V3_ROUTER } from './src/server/polygonTokenMap.js';
import { LIVE_CONFIG } from './src/server/liveConfig.js';
```

## Block 2 – Gas-Limit (suche `250` / `maxGasAllowed`)

**Ersetze:**
```ts
const maxGasAllowed = ethers.parseUnits('250', 'gwei');
if (feeData.gasPrice && feeData.gasPrice > maxGasAllowed) {
  return { success: false, txHash: '', message: 'Gas-Schutzsperre: Polygon Netzwerk-Gas aktuell über 250 Gwei.' };
}
```

**Durch:**
```ts
const maxGasAllowed = ethers.parseUnits(String(LIVE_CONFIG.maxGwei), 'gwei');
if (feeData.gasPrice && feeData.gasPrice > maxGasAllowed) {
  return {
    success: false,
    txHash: '',
    message: `Gas-Schutzsperre: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei > ${LIVE_CONFIG.maxGwei} Gwei`
  };
}
```

## Block 3 – Token-Map (suche `TOKEN_MAP` und `MABEL`)

**Ersetze den gesamten TOKEN_MAP-Block + die Zeile mit `|| TOKEN_MAP.POL` durch:**

```ts
const cleanSym = params.symbol.replace(/^\$/, '').toUpperCase();
const targetToken = getPolygonToken(cleanSym);
if (!targetToken) {
  return {
    success: false,
    txHash: '',
    message: `Unsupported live token: ${params.symbol}. Supported: BTC, ETH, POL, LINK, AAVE, UNI, AVAX`
  };
}
// Danach weiter mit targetToken.address, targetToken.decimals, targetToken.fee
// und POLYGON_UNISWAP_V3_ROUTER statt der lokalen Konstante
```

## GrokDeskEngine Universe (optional aber empfohlen)

```ts
import { NIGHT_SHIFT_LIVE_UNIVERSE } from './nightShiftUniverse.js';
// alte NIGHT_SHIFT_TOKEN_UNIVERSE-Definition löschen
const NIGHT_SHIFT_TOKEN_UNIVERSE = NIGHT_SHIFT_LIVE_UNIVERSE;
```

## Nach dem Paste + Redeploy

- Gas-Sperre greift erst ab 900 Gwei
- Nur echte Tokens werden geswappt
- Min-Trade $0.25 → dein $0.59 Wallet kann handeln
- $ZORA / $MABEL werden abgelehnt

Die $0.59 USDC sind der reale Stand. Mehr Kapital = mehr USDC auf die Adresse senden.
