/**
 * Live Execution Guard & Adapter
 * -----------------------------
 * Hard-wires the 6 Night-Shift agents → real on-chain swap.
 * Only tokens present in polygonTokenMap.ts are allowed in LIVE mode.
 */

import {
  getPolygonToken,
  isSupportedLiveToken,
  listSupportedLiveSymbols,
  POLYGON_USDC,
  POLYGON_UNISWAP_V3_ROUTER,
  type PolygonTokenInfo,
} from './polygonTokenMap.js';

export { getPolygonToken, isSupportedLiveToken, listSupportedLiveSymbols, POLYGON_USDC, POLYGON_UNISWAP_V3_ROUTER };
export type { PolygonTokenInfo };

export type LiveSwapDirection = 'BUY_TOKEN' | 'SELL_TOKEN';

export interface LiveSwapRequest {
  direction: LiveSwapDirection;
  symbol: string;           // e.g. "BTC", "$ETH", "LINK"
  amountUsdc: number;
  expectedPriceUsd?: number;
}

export interface LiveSwapResult {
  success: boolean;
  txHash: string;
  message: string;
  token?: PolygonTokenInfo;
}

/**
 * Pre-flight check used by every agent before calling the real executor.
 * Returns a clear rejection reason instead of letting a wrong address go on-chain.
 */
export function guardLiveSwap(req: LiveSwapRequest): { ok: true; token: PolygonTokenInfo } | { ok: false; reason: string } {
  if (!req.symbol || typeof req.symbol !== 'string') {
    return { ok: false, reason: 'Missing symbol' };
  }

  const token = getPolygonToken(req.symbol);
  if (!token) {
    return {
      ok: false,
      reason: `LIVE rejected: "${req.symbol}" has no verified Polygon contract. Supported: ${listSupportedLiveSymbols().join(', ')}`,
    };
  }

  if (!Number.isFinite(req.amountUsdc) || req.amountUsdc < 0.5) {
    return { ok: false, reason: `LIVE rejected: amountUsdc must be ≥ 0.50 (got ${req.amountUsdc})` };
  }

  if (req.amountUsdc > 250) {
    return { ok: false, reason: `LIVE rejected: single trade size capped at $250 USDC for safety (got ${req.amountUsdc})` };
  }

  return { ok: true, token };
}

/**
 * Creates a safe wrapper around the low-level wallet.executePolygonDexSwap.
 * All 6 agents should call this instead of the raw method.
 */
export function createLiveSwapExecutor(
  rawExecute: (params: {
    direction: LiveSwapDirection;
    symbol: string;
    amountUsdc: number;
    expectedPriceUsd?: number;
  }) => Promise<{ success: boolean; txHash: string; message: string }>
) {
  return async function safeLiveSwap(req: LiveSwapRequest): Promise<LiveSwapResult> {
    const guard = guardLiveSwap(req);
    if (!guard.ok) {
      return { success: false, txHash: '', message: guard.reason };
    }

    try {
      const result = await rawExecute({
        direction: req.direction,
        symbol: guard.token.symbol, // canonical symbol (WBTC, WETH, …)
        amountUsdc: req.amountUsdc,
        expectedPriceUsd: req.expectedPriceUsd,
      });

      return {
        ...result,
        token: guard.token,
      };
    } catch (err: any) {
      return {
        success: false,
        txHash: '',
        message: `LIVE swap exception: ${err?.message || String(err)}`,
        token: guard.token,
      };
    }
  };
}
