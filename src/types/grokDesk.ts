export type ExecutionMode = 'PAPER' | 'LIVE';
export type PackId = 'gmgn_skills' | 'kaiser_charon' | 'gmgn_trading_bot' | 'gmgn_agent' | 'pump_grok';
export type PackBootStatus = 'READY' | 'WAIT' | 'ERROR';
export type DecisionAction = 'BUY' | 'SELL' | 'STOP';

export interface BotPackBootItem {
  id: PackId;
  name: string;
  status: PackBootStatus;
  progressPct: number;
  latencyMs: number;
  subStatusText: string;
}

export interface WorkspaceBootState {
  deskTitle: string;
  shiftLabel: string;
  bootHeaderLabel: string;
  overallProgressPct: number;
  isWorkspaceReady: boolean;
  footerStatusText: string;
  lastBootedAt: string;
  packs: BotPackBootItem[];
}

export interface TokenAttributionBarItem {
  symbol: string;
  name: string;
  multiplier: number;
  realizedPlusUnrealizedUsd: number;
  shareOfProfitPct: number;
  colorHex: string;
  tradesCount: number;
  winRatePct: number;
}

export interface EquityCurvePoint {
  timestamp: string;
  timeLabel: string;
  equityUsd: number;
  pnlUsd: number;
  pnlPct: number;
  triggerTicker?: string;
}

export interface ActiveSlugPosition {
  id: string;
  ticker: string;
  name: string;
  chain: 'SOLANA' | 'POLYGON' | 'BASE';
  entryPriceUsd: number;
  currentPriceUsd: number;
  peakPriceUsd: number;
  sizeUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  multiplier: number;
  stopLossPct: number;
  stopLossPriceUsd: number;
  walletScore: number;
  routeVenue: string;
  openedAt: string;
  txHash?: string;
}

export interface PortfolioPerformanceHeaderState {
  mode: ExecutionMode;
  totalEquityUsd: number;
  availableCashUsd: number;
  initialCapitalUsd: number;
  absoluteGainUsd: number;
  portfolioMultiplier: number;
  hardStopLossLimitPct: number;
  maxSlippageBps: number;
  slugCount: number;
  entriesCount: number;
  closedCount: number;
  winRatePct: number;
  equityCurve: EquityCurvePoint[];
  tokenAttributionBars: TokenAttributionBarItem[];
  openSlugs: ActiveSlugPosition[];
}

export interface PipelineStepMetric {
  stepKey: 'token.read' | 'wallet.score' | 'route.fill';
  status: 'IDLE' | 'ACTIVE' | 'DONE' | 'REJECTED';
  activeTicker: string;
  valueLabel: string;
  detailText: string;
  latencyMs: number;
  updatedAtMs: number;
}

export interface CharonRejectedItem {
  id: string;
  ticker: string;
  reason: string;
  liquidityUsd: number;
  honeypotRiskPct: number;
  timestamp: string;
  timeFormatted: string;
}

export interface FivePacksControlState {
  carouselEngines: {
    gmgnTradingBot: {
      name: 'GMGN Trading Bot';
      latencyMs: number;
      successRatePct: number;
      txCount: number;
      status: 'ONLINE' | 'STANDBY';
      activeVenue: string;
    };
    gmgnAgent: {
      name: 'gmgnAgent';
      actionsCount: number;
      activeModel: string;
      confidenceAvg: number;
      lastSentimentVerdict: string;
    };
    pumpGrok: {
      name: 'PumpGrok';
      entryCount: number;
      miniSparkline: number[];
      momentumDeltaPct: number;
      hotTicker: string;
    };
  };
  moduleA_gmgnSkills: {
    title: 'GMGN Skills';
    subtitle: 'fomo adapter';
    activeSymbol: string;
    cycleCount: number;
    steps: [PipelineStepMetric, PipelineStepMetric, PipelineStepMetric];
  };
  moduleB_kaiserCharon: {
    title: 'Kaiser.Charon';
    subtitle: 'gatekeeper';
    launchesScanned: number;
    launchesRejected: number;
    rejectionRatePct: number;
    currentSkipTicker: string;
    currentSkipReason: string;
    recentRejects: CharonRejectedItem[];
  };
}

export interface DecisionStreamEntry {
  id: string;
  timestamp: string;
  timeFormatted: string;
  action: DecisionAction;
  ticker: string;
  statusIndicator: 'GREEN' | 'RED';
  amountUsd: number;
  amountFormatted: string;
  executionPriceUsd: number;
  multiplierText?: string;
  packOrigin: PackId;
  rationaleShort: string;
  mode: ExecutionMode;
  txHash?: string;
}

export interface GrokDeskSystemState {
  mode: ExecutionMode;
  autoPilotEnabled: boolean;
  uptimeSeconds: number;
  lastTickAt: string;
  bootState: WorkspaceBootState;
  portfolioHeader: PortfolioPerformanceHeaderState;
  fivePacks: FivePacksControlState;
  decisionStream: DecisionStreamEntry[];
  liveWalletInfo: {
    connected: boolean;
    address: string;
    usdcBalance: number;
    polGasBalance: number;
    networkLabel: string;
  };
}
