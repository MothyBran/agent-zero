/**
 * Verified Polygon Mainnet Token Map for Live DEX Execution
 * ---------------------------------------------------------
 * Only tokens with real, audited liquidity on Uniswap V3 / QuickSwap.
 * Unknown / demo tickers (MABEL, BONGO, PIXEL …) return null → swap is rejected.
 * Never fall back to WPOL or WETH for unknown symbols.
 */

export interface PolygonTokenInfo {
  address: string;
  decimals: number;
  /** Uniswap V3 fee tier (500 = 0.05 %, 3000 = 0.3 %) */
  fee: number;
  symbol: string;
  name: string;
  coingeckoId?: string;
}

/** Canonical USDC addresses on Polygon */
export const POLYGON_USDC = {
  native: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',  // Circle native USDC
  bridged: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC.e (bridged)
  decimals: 6,
} as const;

/** Uniswap V3 SwapRouter02 (exactInputSingle) on Polygon */
export const POLYGON_UNISWAP_V3_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

/**
 * Verified high-liquidity tokens.
 * Addresses cross-checked against Polygonscan, Aave address-book and Uniswap docs (2025/2026).
 */
export const POLYGON_TOKEN_MAP: Record<string, PolygonTokenInfo> = {
  // ─── Core Bluechips ──────────────────────────────────────────
  BTC: {
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC (PoS)
    decimals: 8,
    fee: 500,
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    coingeckoId: 'wrapped-bitcoin',
  },
  WBTC: {
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    decimals: 8,
    fee: 500,
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    coingeckoId: 'wrapped-bitcoin',
  },
  ETH: {
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH (PoS)
    decimals: 18,
    fee: 500,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    coingeckoId: 'weth',
  },
  WETH: {
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    decimals: 18,
    fee: 500,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    coingeckoId: 'weth',
  },
  POL: {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WPOL / WMATIC
    decimals: 18,
    fee: 500,
    symbol: 'WPOL',
    name: 'Wrapped POL',
    coingeckoId: 'polygon-ecosystem-token',
  },
  WPOL: {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    decimals: 18,
    fee: 500,
    symbol: 'WPOL',
    name: 'Wrapped POL',
    coingeckoId: 'polygon-ecosystem-token',
  },
  MATIC: {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    decimals: 18,
    fee: 500,
    symbol: 'WPOL',
    name: 'Wrapped POL',
    coingeckoId: 'polygon-ecosystem-token',
  },

  // ─── DeFi Bluechips ──────────────────────────────────────────
  LINK: {
    address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
    decimals: 18,
    fee: 3000,
    symbol: 'LINK',
    name: 'Chainlink',
    coingeckoId: 'chainlink',
  },
  AAVE: {
    address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    decimals: 18,
    fee: 3000,
    symbol: 'AAVE',
    name: 'Aave',
    coingeckoId: 'aave',
  },
  UNI: {
    address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', // Uniswap (PoS)
    decimals: 18,
    fee: 3000,
    symbol: 'UNI',
    name: 'Uniswap',
    coingeckoId: 'uniswap',
  },

  // ─── Stablecoins ─────────────────────────────────────────────
  USDC: {
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    fee: 500,
    symbol: 'USDC',
    name: 'USD Coin (Native)',
    coingeckoId: 'usd-coin',
  },
  'USDC.E': {
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
    fee: 500,
    symbol: 'USDC.e',
    name: 'USD Coin (Bridged)',
    coingeckoId: 'usd-coin',
  },
  USDT: {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    fee: 500,
    symbol: 'USDT',
    name: 'Tether USD (PoS)',
    coingeckoId: 'tether',
  },
  DAI: {
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    decimals: 18,
    fee: 500,
    symbol: 'DAI',
    name: 'Dai Stablecoin (PoS)',
    coingeckoId: 'dai',
  },

  // ─── High-Beta / Momentum ────────────────────────────────────
  AVAX: {
    address: '0x2C89bbc92BD86F8075d1DEcc58C7F4E0107f286b',
    decimals: 18,
    fee: 3000,
    symbol: 'AVAX',
    name: 'Avalanche',
    coingeckoId: 'avalanche-2',
  },
};

/**
 * Lookup helper. Returns null for unknown / paper-only tickers.
 * Call this before any live swap – never invent an address.
 */
export function getPolygonToken(symbol: string): PolygonTokenInfo | null {
  const clean = symbol.replace(/^\$/, '').toUpperCase().trim();
  return POLYGON_TOKEN_MAP[clean] ?? null;
}

/**
 * True only when a verified live address exists.
 */
export function isSupportedLiveToken(symbol: string): boolean {
  return getPolygonToken(symbol) !== null;
}

/**
 * List of all symbols that are safe for live execution.
 */
export function listSupportedLiveSymbols(): string[] {
  return Object.keys(POLYGON_TOKEN_MAP);
}
