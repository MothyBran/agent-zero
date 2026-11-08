/**
 * Live Execution Guard & Adapter
 * Hard-wires the 6 Night-Shift agents → real on-chain swap.
 */

import {
  getPolygonToken,
  isSupportedLiveToken,
  listSupportedLiveSymbols,
  POLYGON_USDC,
  POLYGON_UNISWAP_V3_ROUTER,
  type PolygonTokenInfo,
} from './polygonTokenMap.js';
import { LIVE_CONFIG } from './liveConfig.js';

export { getPolygonToken, isSupportedLiveToken, listSupportedLiveSymbols, POLYGON_USDC, POLYGON_UNISWAP_V3_ROUTER, LIVE_CONFIG };
export type { PolygonTokenInfo };

export type LiveSwapDirection = 'BUY_TOKEN' | 'SELL_TOKEN';

export interface LiveSwapRequest {
  direction: LiveSwapDirection;
  symbol: string;
  amountUsdc: number;
  expectedPriceUsd?: number;
}

export interface LiveSwapResult {
  success: boolean;
  txHash: string;
  message: string;
  token?: PolygonTokenInfo;
}

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

  if (!Number.isFinite(req.amountUsdc) || req.amountUsdc < LIVE_CONFIG.minTradeUsdc) {
    return { ok: false, reason: `LIVE rejected: amountUsdc must be ≥ ${LIVE_CONFIG.minTradeUsdc} (got ${req.amountUsdc})` };
  }

  if (req.amountUsdc > LIVE_CONFIG.maxTradeUsdc) {
    return { ok: false, reason: `LIVE rejected: single trade size capped at $${LIVE_CONFIG.maxTradeUsdc} USDC (got ${req.amountUsdc})` };
  }

  return { ok: true, token };
}

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
        symbol: guard.token.symbol,
        amountUsdc: req.amountUsdc,
        expectedPriceUsd: req.expectedPriceUsd,
      });
      return { ...result, token: guard.token };
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
