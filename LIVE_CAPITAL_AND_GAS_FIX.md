# LIVE Capital + Gas Fix (sofort anwenden)

## Problem aus dem Screenshot
- Wallet zeigt nur **$0.5940 USDC** → Bot hat nur dieses Cash
- **Gas-Schutzsperre > 250 Gwei** blockiert alle Swaps
- Agenten zielen noch auf Demo-Ticker (`$ZORA`)

## 1. Gas-Limit in `executePolygonDexSwap` anheben

**Suche:**
```ts
const maxGasAllowed = ethers.parseUnits('250', 'gwei');
if (feeData.gasPrice && feeData.gasPrice > maxGasAllowed) {
  return { success: false, txHash: '', message: 'Gas-Schutzsperre: Polygon Netzwerk-Gas aktuell über 250 Gwei.' };
}
```

**Ersetze durch:**
```ts
// Configurable via env, default 900 Gwei (Polygon can spike)
const MAX_GWEI = Number(process.env.POLYGON_MAX_GWEI || 900);
const maxGasAllowed = ethers.parseUnits(String(MAX_GWEI), 'gwei');
if (feeData.gasPrice && feeData.gasPrice > maxGasAllowed) {
  return { 
    success: false, 
    txHash: '', 
    message: `Gas-Schutzsperre: Polygon Gas ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei > Limit ${MAX_GWEI} Gwei. Setze POLYGON_MAX_GWEI höher oder warte.` 
  };
}
```

## 2. Vollständiges Kapital (USDC native + USDC.e)

In `getUsdcBalance()` und der Stelle, die `onChainUsdcBalance` setzt, **beide** USDC-Varianten addieren (das macht der Code teilweise schon). Stelle sicher:

```ts
const [balN, balB] = await Promise.all([
  cNative.balanceOf(this.address),
  cBridged.balanceOf(this.address)
]);
const totalUsdc = Number(ethers.formatUnits(balN, 6)) + Number(ethers.formatUnits(balB, 6));
this.onChainUsdcBalance = totalUsdc;
```

Wenn du **zusätzliches Kapital in WETH / WBTC / LINK** hast, muss dieses erst in USDC geswappt oder als „available collateral“ bewertet werden. Der Bot behandelt aktuell nur USDC als handelbares Cash.

## 3. Agenten-Universe auf echte Tokens umstellen

In `src/server/grokDeskEngine.ts` die alte `NIGHT_SHIFT_TOKEN_UNIVERSE` ersetzen durch:

```ts
import { NIGHT_SHIFT_LIVE_UNIVERSE } from './nightShiftUniverse.js';

// innerhalb der Klasse / wo das Array definiert ist:
private readonly tokenUniverse = NIGHT_SHIFT_LIVE_UNIVERSE;
```

Und alle Stellen, die `$ZORA`, `$MABEL`, `$PIXEL` etc. hartcodiert haben, auf die neue Liste umbiegen.

## 4. Railway Environment Variables (sofort setzen)

```
POLYGON_MAX_GWEI=900
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/DEIN_KEY   # oder Helius / QuickNode
```

Danach **Redeploy** auf Railway.

## Wichtiger Hinweis zum Guthaben

Die Anzeige **$0.5940 USDC** ist mit sehr hoher Wahrscheinlichkeit der **echte** On-Chain-Stand der Adresse `0x8B89…0e1E` auf Polygon.
- Wenn du mehr Kapital hast, liegt es entweder in anderen Tokens (WETH, WBTC…) oder auf einer anderen Chain.
- Der Bot kann nur mit dem USDC handeln, das wirklich auf dieser Adresse liegt (native + bridged).

Sobald mehr USDC auf der Adresse ist und das Gas-Limit angehoben wurde, beginnen die Agenten mit echten Swaps der unterstützten Tokens (BTC, ETH, POL, LINK, AAVE, UNI, AVAX).
