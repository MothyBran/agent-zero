export type AssetCategory = 'STOCKS' | 'CRYPTO' | 'FOREX' | 'DEX_RUNNER';
export type TradingMode = 'DEMO' | 'LIVE';
export type SignalAction = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
export type PipelineStage = 'SCOUT' | 'FILTER' | 'ANALYST' | 'EXECUTOR' | 'RISK' | 'LOGGER';

export interface FilterRuleItem {
  id: number;
  label: string;
  passed: boolean | null; // true = passed, false = killed, null = pending
  valueText: string;
  killCount: number;
}

export interface AnalystScoreBreakdown {
  symbol: string;
  displaySymbol: string;
  category: AssetCategory;
  momentum: number; // 0-100
  uniqueBuyersOrVolume: number; // 0-100
  buySellRatio: number; // 0-100
  trendGrowth: number; // 0-100
  liquidityEfficiency: number; // 0-100
  smartFlowConfluence: number; // 0-100
  finalScore: number; // 0-100
  threshold: number; // default 70
  passedToExecutor: boolean;
}

export interface PipelineTelemetry {
  activeStage: PipelineStage;
  activeSymbol: string;
  uptimeSeconds: number;
  pairsPerMin: number;
  scoutSeenCount: number;
  lastScoutSymbol: string;
  filterKilledCount: number;
  filterKillRatePct: number;
  currentFilterSymbol: string;
  currentFilterRuleIndex: number;
  filterRules: FilterRuleItem[];
  analystScoredCount: number;
  currentAnalystBreakdown: AnalystScoreBreakdown;
  executorTradesCount: number;
  lastExecutorSymbol: string;
  lastExecutorSizeUsd: number;
  riskStopsCount: number;
  riskTrailingSymbol: string;
  loggerLinesCount: number;
}

export interface OrderTarget {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  category: AssetCategory;
  side: 'LONG' | 'SHORT';
  targetType: 'LIMIT_SUPPORT' | 'BREAKOUT_MOMENTUM' | 'REVERSAL_RESISTANCE';
  targetEntryPrice: number;
  currentPrice: number;
  distancePct: number;
  plannedStopLoss: number;
  plannedTakeProfit: number;
  expectedRewardRiskRatio: number;
  expectedNetProfitPct: number;
  allocatedUsd: number;
  rationale: string;
  status: 'WATCHING' | 'IMMINENT' | 'TRIGGERED';
  createdAt: string;
  updatedAt: string;
}

export interface MarketAssetQuote {
  symbol: string;
  displaySymbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCapOrLiquidityUsd: number;
  ageLabel: string;
  spreadBps: number;
  executionVenue: string;
  estimatedFeePct: number;
  sparkline: number[];
  indicators: {
    rsi14: number;
    ema9: number;
    ema21: number;
    macdHistogram: number;
    bollingerPctB: number;
    bollingerLower: number;
    bollingerUpper: number;
    atr14: number;
    volatilityPct: number;
  };
  analystScore: number;
  passedHardRules: boolean;
  failedRuleName?: string;
  signal: SignalAction;
  confluenceScore: number;
  expectedNetEdgePct: number;
  isWorthTradingNow: boolean;
  signalReasons: string[];
  lastUpdated: string;
  dataSource: string;
}

export interface TradingPosition {
  id: string;
  mode: TradingMode;
  symbol: string;
  displaySymbol: string;
  name: string;
  category: AssetCategory;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  peakPrice: number;
  quantity: number;
  notionalUsd: number;
  allocationPct: number;
  stopLoss: number;
  takeProfit: number;
  trailingActive: boolean;
  trailingStopPrice: number;
  trailActivationPct: number;
  trailUnderPeakPct: number;
  priceHistory: number[];
  stopHistory: number[];
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  openedAt: string;
  executionVenue: string;
  entryReason: string;
  txHash?: string;
}

export interface ClosedTrade {
  id: string;
  mode: TradingMode;
  symbol: string;
  displaySymbol: string;
  category: AssetCategory;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  notionalUsd: number;
  realizedPnlUsd: number;
  realizedPnlPct: number;
  feePaidUsd: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_PROFIT_LOCK' | 'SIGNAL_REVERSAL' | 'MANUAL_CLOSE' | 'AI_REBALANCE';
  openedAt: string;
  closedAt: string;
  entryConfluenceScore: number;
  txHash?: string;
}

export interface StrategyParameters {
  version: number;
  analystPassThreshold: number; // default 70 (0-100)
  maxAllocationPerTradePct: number; // default 8%
  initialStopLossPct: number; // default 2.5% (or ATR scaled)
  trailActivationGainPct: number; // default 1.2% (or +12% on high-vol DEX)
  trailDistanceUnderPeakPct: number; // default 0.6%
  minConfluenceScore: number;
  minRewardRiskRatio: number;
  minNetEdgePct: number;
  rsiOversold: number;
  rsiOverbought: number;
  atrStopLossMultiplier: number;
  atrTakeProfitMultiplier: number;
  maxPositionSizePct: number;
  maxConcurrentPositions: number;
  preferredCategories: AssetCategory[];
  lastOptimizedAt: string;
  optimizationSummary: string;
}

export interface OptimizationLog {
  id: string;
  timestamp: string;
  mode: TradingMode;
  trigger: string;
  previousVersion: number;
  newVersion: number;
  changes: string[];
  aiReasoning: string;
  winRateAtOptimization: number;
  netPnlAtOptimization: number;
}

export interface ModePortfolioState {
  mode: TradingMode;
  initialCapitalUsd: number;
  cashBalanceUsd: number;
  equityUsd: number;
  totalRealizedPnlUsd: number;
  totalUnrealizedPnlUsd: number;
  totalFeesPaidUsd: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  profitFactor: number;
  worstLossUsd: number;
  bestTradeUsd: number;
  sharpeEstimate: number;
  maxDrawdownPct: number;
  openPositions: TradingPosition[];
  closedTrades: ClosedTrade[];
  equityCurve: { timestamp: string; equity: number }[];
}

export interface TerminalLogLine {
  id: string;
  lineNumber: number;
  timeStr: string;
  timestamp: string;
  mode: TradingMode;
  tag: 'SCOUT' | 'KILL' | 'SCORE' | 'ENTER' | 'STOP' | 'TRAIL' | 'WIN' | 'LOSS' | 'EXIT' | 'OPT';
  symbol: string;
  detail: string;
}

export interface OrderbookDepthSnapshot {
  symbol: string;
  displaySymbol: string;
  bidVolumeUsd: number;
  askVolumeUsd: number;
  bidRatioPct: number; // 0-100 (% of total top-20 book volume on bid side)
  imbalancePct: number; // -100 to +100 ((Bid - Ask) / (Bid + Ask) * 100)
  bestBid: number;
  bestAsk: number;
  spreadBps: number;
  pressureLabel: 'STRONG_BUY_WALL' | 'BUY_PRESSURE' | 'BALANCED' | 'SELL_PRESSURE' | 'STRONG_SELL_WALL';
}

export interface MarketSentimentTelemetry {
  updatedAt: string;
  // 1. Crypto Fear & Greed Index (Alternative.me live feed)
  fearAndGreedIndex: number; // 0-100
  fearAndGreedPrevious: number; // yesterday 0-100
  fearAndGreedDelta: number;
  fearAndGreedLabel: string; // e.g., "Fear", "Greed", "Extreme Greed"
  fearAndGreedSource: string;
  // 2. Real-time L2 Orderbook Imbalance (Binance Spot L2 Depth)
  aggregateBidRatioPct: number; // 0-100
  aggregateImbalancePct: number; // -100 to +100
  totalAnalyzedBookUsd: number;
  orderbookSnapshots: OrderbookDepthSnapshot[];
  // 3. Multi-Asset Market Breadth & Volatility Regime
  advancingCount: number;
  decliningCount: number;
  breadthBullishPct: number; // 0-100
  avgRsi14: number;
  avgVolatilityPct: number;
  // 4. Unified Trade Favorability Verdict (Visual Timing Signal, while execution remains 100% automated)
  tradeFavorabilityScore: number; // 0-100
  timingStatus: 'OPTIMAL_LONG' | 'OPTIMAL_SHORT' | 'FAVORABLE_SELECTIVE' | 'CAUTIOUS_DEFENSIVE';
  timingHeadline: string;
  timingExplanation: string;
  autoExecutionImpact: string;
}

export interface TradingSystemState {
  activeMode: TradingMode;
  autoPilotEnabled: boolean;
  continuousStreamActive: boolean;
  streamTicksProcessed: number;
  lastTickAt: string;
  isScanning: boolean;
  pipeline: PipelineTelemetry;
  marketSentiment: MarketSentimentTelemetry;
  marketQuotes: MarketAssetQuote[];
  orderTargets: OrderTarget[];
  strategy: StrategyParameters;
  optimizationHistory: OptimizationLog[];
  demoPortfolio: ModePortfolioState;
  livePortfolio: ModePortfolioState;
  liveConnectors: {
    polygonDexOnChain: { connected: boolean; walletAddress: string; usdcBalance: number; polGasBalance: number; venue: string };
    alpacaEquities: { connected: boolean; venue: string; statusText: string };
    forexEcnBridge: { connected: boolean; venue: string; statusText: string };
  };
  terminalLogLines: TerminalLogLine[];
  recentActivityLogs: { id: string; timestamp: string; mode: TradingMode; type: 'TARGET_SET' | 'TARGET_HIT' | 'TRADE_OPEN' | 'TRADE_CLOSE' | 'OPTIMIZE' | 'ALERT'; message: string }[];
}

