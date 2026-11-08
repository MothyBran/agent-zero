/**
 * FIXED executePolygonDexSwap helpers – drop-in
 * Changes: Gas 900 Gwei (env), getPolygonToken(), no fake tickers
 */

import { ethers } from 'ethers';
import { getPolygonToken, POLYGON_USDC, POLYGON_UNISWAP_V3_ROUTER } from './polygonTokenMap.js';
import { LIVE_CONFIG } from './liveConfig.js';

export function buildFixedSwapLogic() {
  return {
    getMaxGasAllowed(): bigint {
      return ethers.parseUnits(String(LIVE_CONFIG.maxGwei), 'gwei');
    },
    resolveToken(symbol: string) {
      const clean = symbol.replace(/^\$/, '').toUpperCase();
      const token = getPolygonToken(clean);
      if (!token) {
        return {
          ok: false as const,
          message: `LIVE rejected: "${symbol}" has no verified Polygon contract. Supported: BTC ETH POL LINK AAVE UNI AVAX USDC USDT DAI`,
        };
      }
      return { ok: true as const, token };
    },
    routerAddress: POLYGON_UNISWAP_V3_ROUTER,
    usdc: POLYGON_USDC,
    minTradeUsdc: LIVE_CONFIG.minTradeUsdc,
    usdcReserve: LIVE_CONFIG.usdcReserve,
    minPolGas: LIVE_CONFIG.minPolGas,
  };
}
