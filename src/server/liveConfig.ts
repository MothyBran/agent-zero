/**
 * Live runtime configuration
 */
export const LIVE_CONFIG = {
  /** Max Polygon gas price in Gwei before trades are blocked */
  maxGwei: Number(process.env.POLYGON_MAX_GWEI || 900),

  /** Minimum USDC per trade (lowered so $0.59 wallets can still fire) */
  minTradeUsdc: Number(process.env.LIVE_MIN_TRADE_USDC || 0.25),

  /** Hard cap per single trade */
  maxTradeUsdc: Number(process.env.LIVE_MAX_TRADE_USDC || 250),

  /** Keep at least this much USDC as reserve */
  usdcReserve: Number(process.env.LIVE_USDC_RESERVE || 0.05),

  /** Minimum POL for gas */
  minPolGas: Number(process.env.LIVE_MIN_POL || 0.15),
};
