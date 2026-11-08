# Live Server Patch – executePolygonDexSwap

Die Datei `server.ts` ist >130 kB. Deshalb hier der **exakte Search-Replace**, den du (oder ich im nächsten Schritt) anwenden musst.

## 1. Import ganz oben in server.ts ergänzen

```ts
import { getPolygonToken, POLYGON_USDC, POLYGON_UNISWAP_V3_ROUTER } from './src/server/polygonTokenMap.js';
import { createLiveSwapExecutor } from './src/server/liveExecutionGuard.js';
import { NIGHT_SHIFT_LIVE_UNIVERSE } from './src/server/nightShiftUniverse.js';
```

## 2. Alte TOKEN_MAP in executePolygonDexSwap ersetzen

**Suche diesen Block:**

```ts
const POLYGON_UNISWAP_V3_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
const TOKEN_MAP: Record<string, { address: string; decimals: number; fee: number }> = {
  BTC:    { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8,  fee: 500 },
  // … inkl. MABEL, PIXEL, BONGO etc.
};

const cleanSym = params.symbol.replace(/^\$/, '').toUpperCase();
const targetToken = TOKEN_MAP[cleanSym] || TOKEN_MAP.POL;
```

**Ersetze durch:**

```ts
const cleanSym = params.symbol.replace(/^\$/, '').toUpperCase();
const targetToken = getPolygonToken(cleanSym);

if (!targetToken) {
  return {
    success: false,
    txHash: '',
    message: `LIVE rejected: "${params.symbol}" has no verified Polygon contract. Supported: BTC, ETH, POL, LINK, AAVE, UNI, AVAX, USDC, USDT, DAI`,
  };
}

// Danach weiter mit:
// targetToken.address
// targetToken.decimals
// targetToken.fee
// POLYGON_UNISWAP_V3_ROUTER (aus dem Import)
```

## 3. GrokDeskEngine Instantiierung (wo executeOnChainSwap übergeben wird)

```ts
const safeLiveSwap = createLiveSwapExecutor(
  (p) => agentWallet.executePolygonDexSwap(p)
);

const grokDesk = new GrokDeskEngine(
  () => ({
    connected: !!agentWallet.address,
    address: agentWallet.address,
    usdcBalance: agentWallet.onChainUsdcBalance,
    polGasBalance: agentWallet.onChainPolBalance,
  }),
  safeLiveSwap
);
```

## 4. In GrokDeskEngine die alte NIGHT_SHIFT_TOKEN_UNIVERSE ersetzen

```ts
import { NIGHT_SHIFT_LIVE_UNIVERSE } from './nightShiftUniverse.js';

// statt der alten Array-Definition mit $MABEL / $PIXEL etc.
const NIGHT_SHIFT_TOKEN_UNIVERSE = NIGHT_SHIFT_LIVE_UNIVERSE;
```

Danach starten die 6 Agenten nur noch mit Tokens, die wirklich on-chain geswappt werden können.
