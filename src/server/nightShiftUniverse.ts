/**
 * Night Shift #2 – Live-capable Token Universe
 * --------------------------------------------
 * Only tokens that have verified Polygon contracts in polygonTokenMap.ts.
 * Demo tickers (MABEL, BONGO, PIXEL, KROK …) are removed from the LIVE path.
 */

export interface TokenCandidateSpec {
  ticker: string;
  name: string;
  chain: 'POLYGON';
  basePriceUsd: number;
  binancePair: string;
  liquidityUsd: number;
  routeVenue: string;
  colorHex: string;
  /** Must match a key in POLYGON_TOKEN_MAP */
  liveSymbol: string;
}

/**
 * Live-safe universe used by PumpGrok / GMGN Skills / gmgnAgent when mode === 'LIVE'.
 * All entries resolve to real Uniswap V3 pools on Polygon.
 */
export const NIGHT_SHIFT_LIVE_UNIVERSE: TokenCandidateSpec[] = [
  {
    ticker: '$BTC',
    name: 'Wrapped Bitcoin',
    chain: 'POLYGON',
    basePriceUsd: 95000,
    binancePair: 'BTCUSDT',
    liquidityUsd: 45_000_000,
    routeVenue: 'Uniswap V3 Polygon 0.05%',
    colorHex: '#F7931A',
    liveSymbol: 'BTC',
  },
  {
    ticker: '$ETH',
    name: 'Wrapped Ether',
    chain: 'POLYGON',
    basePriceUsd: 3400,
    binancePair: 'ETHUSDT',
    liquidityUsd: 80_000_000,
    routeVenue: 'Uniswap V3 Polygon 0.05%',
    colorHex: '#627EEA',
    liveSymbol: 'ETH',
  },
  {
    ticker: '$POL',
    name: 'Polygon Ecosystem Token',
    chain: 'POLYGON',
    basePriceUsd: 0.42,
    binancePair: 'POLUSDT',
    liquidityUsd: 12_000_000,
    routeVenue: 'Uniswap V3 / QuickSwap',
    colorHex: '#8247E5',
    liveSymbol: 'POL',
  },
  {
    ticker: '$LINK',
    name: 'Chainlink',
    chain: 'POLYGON',
    basePriceUsd: 14.5,
    binancePair: 'LINKUSDT',
    liquidityUsd: 4_500_000,
    routeVenue: 'Uniswap V3 Polygon 0.3%',
    colorHex: '#2A5ADA',
    liveSymbol: 'LINK',
  },
  {
    ticker: '$AAVE',
    name: 'Aave',
    chain: 'POLYGON',
    basePriceUsd: 180,
    binancePair: 'AAVEUSDT',
    liquidityUsd: 2_800_000,
    routeVenue: 'Uniswap V3 Polygon 0.3%',
    colorHex: '#B6509E',
    liveSymbol: 'AAVE',
  },
  {
    ticker: '$UNI',
    name: 'Uniswap',
    chain: 'POLYGON',
    basePriceUsd: 9.2,
    binancePair: 'UNIUSDT',
    liquidityUsd: 3_200_000,
    routeVenue: 'Uniswap V3 Polygon 0.3%',
    colorHex: '#FF007A',
    liveSymbol: 'UNI',
  },
  {
    ticker: '$AVAX',
    name: 'Avalanche',
    chain: 'POLYGON',
    basePriceUsd: 28,
    binancePair: 'AVAXUSDT',
    liquidityUsd: 1_900_000,
    routeVenue: 'Uniswap V3 Polygon 0.3%',
    colorHex: '#E84142',
    liveSymbol: 'AVAX',
  },
];

/** Quick lookup by ticker or liveSymbol */
export function findLiveCandidate(symbol: string): TokenCandidateSpec | undefined {
  const clean = symbol.replace(/^\$/, '').toUpperCase();
  return NIGHT_SHIFT_LIVE_UNIVERSE.find(
    (t) => t.liveSymbol === clean || t.ticker.replace(/^\$/, '') === clean
  );
}
