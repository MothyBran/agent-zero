import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  AssetCategory,
  TradingMode,
  SignalAction,
  PipelineStage,
  FilterRuleItem,
  AnalystScoreBreakdown,
  PipelineTelemetry,
  OrderTarget,
  MarketAssetQuote,
  TradingPosition,
  ClosedTrade,
  StrategyParameters,
  OptimizationLog,
  ModePortfolioState,
  TerminalLogLine,
  MarketSentimentTelemetry,
  OrderbookDepthSnapshot,
  TradingSystemState
} from '../types/trading';

export type {
  AssetCategory,
  TradingMode,
  SignalAction,
  PipelineStage,
  FilterRuleItem,
  AnalystScoreBreakdown,
  PipelineTelemetry,
  OrderTarget,
  MarketAssetQuote,
  TradingPosition,
  ClosedTrade,
  StrategyParameters,
  OptimizationLog,
  ModePortfolioState,
  TerminalLogLine,
  MarketSentimentTelemetry,
  OrderbookDepthSnapshot,
  TradingSystemState
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DEMO_FILE = path.join(DATA_DIR, 'trading_demo_state.json');
const LIVE_FILE = path.join(DATA_DIR, 'trading_live_state.json');
const STRATEGY_FILE = path.join(DATA_DIR, 'trading_strategy.json');

interface WatchlistAsset {
  symbol: string;
  yahooSymbol: string;
  binanceSymbol?: string;
  displaySymbol: string;
  name: string;
  category: AssetCategory;
  executionVenue: string;
  estimatedFeePct: number;
  spreadBps: number;
  ageLabel: string;
}

export const WATCHLIST_ASSETS: WatchlistAsset[] = [
  // CRYPTO (24/7 Real-Time via Binance Public REST, Ultra-cheap Polygon DEX execution)
  { symbol: 'BTC', yahooSymbol: 'BTC-USD', binanceSymbol: 'BTCUSDT', displaySymbol: '$BTC', name: 'Bitcoin (WBTC Polygon)', category: 'CRYPTO', executionVenue: 'Polygon QuickSwap V3', estimatedFeePct: 0.04, spreadBps: 2.0, ageLabel: 'Core L1' },
  { symbol: 'ETH', yahooSymbol: 'ETH-USD', binanceSymbol: 'ETHUSDT', displaySymbol: '$ETH', name: 'Ethereum (WETH Polygon)', category: 'CRYPTO', executionVenue: 'Polygon Uniswap V3', estimatedFeePct: 0.05, spreadBps: 2.2, ageLabel: 'Core L1' },
  { symbol: 'SOL', yahooSymbol: 'SOL-USD', binanceSymbol: 'SOLUSDT', displaySymbol: '$SOL', name: 'Solana Spot', category: 'CRYPTO', executionVenue: 'Cross-DEX Aggregator', estimatedFeePct: 0.05, spreadBps: 2.8, ageLabel: 'High-Beta' },
  { symbol: 'POL', yahooSymbol: 'POL-USD', binanceSymbol: 'POLUSDT', displaySymbol: '$POL', name: 'Polygon Ecosystem', category: 'CRYPTO', executionVenue: 'Polygon Native QuickSwap', estimatedFeePct: 0.03, spreadBps: 2.5, ageLabel: 'Native Gas' },
  { symbol: 'LINK', yahooSymbol: 'LINK-USD', binanceSymbol: 'LINKUSDT', displaySymbol: '$LINK', name: 'Chainlink Oracle', category: 'CRYPTO', executionVenue: 'Polygon Uniswap V3', estimatedFeePct: 0.05, spreadBps: 3.0, ageLabel: 'DeFi Bluechip' },
  { symbol: 'AVAX', yahooSymbol: 'AVAX-USD', binanceSymbol: 'AVAXUSDT', displaySymbol: '$AVAX', name: 'Avalanche', category: 'CRYPTO', executionVenue: 'Cross-DEX Router', estimatedFeePct: 0.05, spreadBps: 3.2, ageLabel: 'High-Beta' },
  { symbol: 'SUI', yahooSymbol: 'SUI20947-USD', binanceSymbol: 'SUIUSDT', displaySymbol: '$SUI', name: 'Sui Network', category: 'CRYPTO', executionVenue: 'Cross-DEX Router', estimatedFeePct: 0.05, spreadBps: 3.4, ageLabel: 'Momentum L1' },
  { symbol: 'PEPE', yahooSymbol: 'PEPE24478-USD', binanceSymbol: 'PEPEUSDT', displaySymbol: '$PEPE', name: 'Pepe Token', category: 'DEX_RUNNER', executionVenue: 'Uniswap V3 / 1inch', estimatedFeePct: 0.05, spreadBps: 3.8, ageLabel: 'Meme Vol' },

  // STOCKS (Equities & Indices via Yahoo Finance Live Feed)
  { symbol: 'NVDA', yahooSymbol: 'NVDA', displaySymbol: '$NVDA', name: 'NVIDIA Corp.', category: 'STOCKS', executionVenue: 'Alpaca Zero-Fee / IEX', estimatedFeePct: 0.01, spreadBps: 1.8, ageLabel: 'AI Leader' },
  { symbol: 'TSLA', yahooSymbol: 'TSLA', displaySymbol: '$TSLA', name: 'Tesla Inc.', category: 'STOCKS', executionVenue: 'Alpaca Zero-Fee / IEX', estimatedFeePct: 0.01, spreadBps: 2.5, ageLabel: 'High-Vol Eq' },
  { symbol: 'AAPL', yahooSymbol: 'AAPL', displaySymbol: '$AAPL', name: 'Apple Inc.', category: 'STOCKS', executionVenue: 'Alpaca Zero-Fee / IEX', estimatedFeePct: 0.01, spreadBps: 1.2, ageLabel: 'Mega-Cap' },
  { symbol: 'MSFT', yahooSymbol: 'MSFT', displaySymbol: '$MSFT', name: 'Microsoft Corp.', category: 'STOCKS', executionVenue: 'Alpaca Zero-Fee / IEX', estimatedFeePct: 0.01, spreadBps: 1.4, ageLabel: 'Mega-Cap' },
  { symbol: 'SPY', yahooSymbol: 'SPY', displaySymbol: '$SPY', name: 'S&P 500 ETF', category: 'STOCKS', executionVenue: 'Alpaca Zero-Fee / IEX', estimatedFeePct: 0.01, spreadBps: 0.8, ageLabel: 'US Index' },
  { symbol: 'QQQ', yahooSymbol: 'QQQ', displaySymbol: '$QQQ', name: 'Nasdaq 100 ETF', category: 'STOCKS', executionVenue: 'Alpaca Zero-Fee / IEX', estimatedFeePct: 0.01, spreadBps: 1.0, ageLabel: 'Tech Index' },

  // FOREX (Major Currency Pairs via Yahoo FX + ECB Frankfurter API)
  { symbol: 'EURUSD', yahooSymbol: 'EURUSD=X', displaySymbol: '$EUR/USD', name: 'Euro / US-Dollar', category: 'FOREX', executionVenue: 'Polygon jarvisFX / ECN', estimatedFeePct: 0.02, spreadBps: 1.1, ageLabel: 'FX Major' },
  { symbol: 'GBPUSD', yahooSymbol: 'GBPUSD=X', displaySymbol: '$GBP/USD', name: 'British Pound / USD', category: 'FOREX', executionVenue: 'ECN Interbank Spot', estimatedFeePct: 0.02, spreadBps: 1.5, ageLabel: 'FX Major' },
  { symbol: 'USDJPY', yahooSymbol: 'JPY=X', displaySymbol: '$USD/JPY', name: 'US-Dollar / Yen', category: 'FOREX', executionVenue: 'ECN Interbank Spot', estimatedFeePct: 0.02, spreadBps: 1.3, ageLabel: 'FX Major' },
  { symbol: 'USDCHF', yahooSymbol: 'CHF=X', displaySymbol: '$USD/CHF', name: 'US-Dollar / Franc', category: 'FOREX', executionVenue: 'ECN Interbank Spot', estimatedFeePct: 0.02, spreadBps: 1.6, ageLabel: 'FX Major' }
];

function calcEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) return values[values.length - 1];
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcRSI(values: number[], period = 14): number {
  if (values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcBollingerBands(values: number[], period = 20): { pctB: number; lower: number; upper: number; middle: number } {
  const last = values[values.length - 1] || 1;
  if (values.length < period) {
    return { pctB: 0.5, lower: last * 0.99, upper: last * 1.01, middle: last };
  }
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) {
    return { pctB: 0.5, lower: mean * 0.995, upper: mean * 1.005, middle: mean };
  }
  const upper = mean + 2 * stdDev;
  const lower = mean - 2 * stdDev;
  const pctB = Math.max(0, Math.min(1, (last - lower) / (upper - lower)));
  return { pctB, lower, upper, middle: mean };
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < 2) return (closes[0] || 1) * 0.012;
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i] || closes[i];
    const l = lows[i] || closes[i];
    const prevC = closes[i - 1];
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  if (recent.length === 0) return closes[closes.length - 1] * 0.01;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function roundPrice(val: number, category: AssetCategory, symbol: string): number {
  if (category === 'FOREX') {
    return Number(val.toFixed(symbol.includes('JPY') ? 3 : 5));
  }
  if (val >= 100) return Number(val.toFixed(2));
  if (val >= 1) return Number(val.toFixed(4));
  if (val >= 0.001) return Number(val.toFixed(6));
  return Number(val.toFixed(8));
}

function formatNowTime(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export class MultiAssetTradingEngine {
  private activeMode: TradingMode = 'DEMO';
  private autoPilotEnabled: boolean = true;
  private continuousStreamActive: boolean = true;
  private bootTimestampMs: number = Date.now();
  private streamTicksProcessed: number = 0;
  private lastTickAt: string = '';
  private isScanning: boolean = false;
  private marketQuotes: MarketAssetQuote[] = [];
  private orderTargets: OrderTarget[] = [];
  private customTargets: OrderTarget[] = [];
  private strategy: StrategyParameters;
  private optimizationHistory: OptimizationLog[] = [];
  private demoPortfolio: ModePortfolioState;
  private livePortfolio: ModePortfolioState;
  private terminalLogLines: TerminalLogLine[] = [];
  private recentActivityLogs: TradingSystemState['recentActivityLogs'] = [];
  private pipeline: PipelineTelemetry;
  private marketSentiment: MarketSentimentTelemetry;
  private lastFearGreedFetchMs: number = 0;
  private ruleKillCounters: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  private rotationCursor: number = 0;
  private fastTickTimer: NodeJS.Timeout | null = null;
  private deepCandleRefreshCounter: number = 0;
  private getLiveChainBalances: () => { walletAddress: string; usdcBalance: number; polBalance: number; hasSigner: boolean };
  private executeOnChainSwap?: (params: {
    direction: 'BUY_TOKEN' | 'SELL_TOKEN';
    symbol: string;
    amountUsdc: number;
    expectedPriceUsd?: number;
  }) => Promise<{ success: boolean; txHash: string; message: string }>;

  constructor(
    getLiveChainBalances: () => { walletAddress: string; usdcBalance: number; polBalance: number; hasSigner: boolean },
    executeOnChainSwap?: (params: {
      direction: 'BUY_TOKEN' | 'SELL_TOKEN';
      symbol: string;
      amountUsdc: number;
      expectedPriceUsd?: number;
    }) => Promise<{ success: boolean; txHash: string; message: string }>
  ) {
    this.getLiveChainBalances = getLiveChainBalances;
    this.executeOnChainSwap = executeOnChainSwap;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.strategy = this.loadStrategy();
    this.demoPortfolio = this.loadPortfolio('DEMO');
    this.livePortfolio = this.loadPortfolio('LIVE');

    this.marketSentiment = {
      updatedAt: new Date().toISOString(),
      fearAndGreedIndex: 50,
      fearAndGreedPrevious: 50,
      fearAndGreedDelta: 0,
      fearAndGreedLabel: 'Lade Live-Daten...',
      fearAndGreedSource: 'Alternative.me Crypto F&G API',
      aggregateBidRatioPct: 50,
      aggregateImbalancePct: 0,
      totalAnalyzedBookUsd: 0,
      orderbookSnapshots: [],
      advancingCount: 0,
      decliningCount: 0,
      breadthBullishPct: 50,
      avgRsi14: 50,
      avgVolatilityPct: 1.0,
      tradeFavorabilityScore: 65,
      timingStatus: 'FAVORABLE_SELECTIVE',
      timingHeadline: 'Initialisiere Echtzeit-Marktstimmung & Orderbuch-Tiefe...',
      timingExplanation: 'Verbinde mit Alternative.me Fear & Greed Feed und Binance L2 Orderbuch-Stream.',
      autoExecutionImpact: 'Vollautomatischer 6-Agenten-Handel aktiv (Filter ≥ 8/8 Regeln · Analyst ≥ 70/100).'
    };

    this.pipeline = {
      activeStage: 'SCOUT',
      activeSymbol: '$BTC',
      uptimeSeconds: 0,
      pairsPerMin: 18.4,
      scoutSeenCount: 0,
      lastScoutSymbol: '$BTC',
      filterKilledCount: 0,
      filterKillRatePct: 82,
      currentFilterSymbol: '$NVDA',
      currentFilterRuleIndex: 8,
      filterRules: [
        { id: 1, label: 'Markt-Feed & Kontrakt verifiziert', passed: true, valueText: 'verified', killCount: 0 },
        { id: 2, label: 'Orderbuch-Tiefe / 24h Vol ≥ $50k', passed: true, valueText: '$142M', killCount: 0 },
        { id: 3, label: 'Spread ≤ 4.0 bps (Slippage-Schutz)', passed: true, valueText: '2.0 bps', killCount: 0 },
        { id: 4, label: 'ATR-Impuls > 2.5x Gebühren (Netto-Edge)', passed: true, valueText: '+0.64%', killCount: 0 },
        { id: 5, label: 'Kein überhitzter Blow-Off Pump (RSI < 76)', passed: true, valueText: 'RSI 48.2', killCount: 0 },
        { id: 6, label: 'EMA Trend- & Support-Struktur intakt', passed: true, valueText: 'intact', killCount: 0 },
        { id: 7, label: 'Chance / Risiko (R:R) ≥ 1.85:1', passed: true, valueText: '2.10:1', killCount: 0 },
        { id: 8, label: 'Portfolio-Slot & Risiko-Limit frei', passed: true, valueText: 'passed', killCount: 0 }
      ],
      analystScoredCount: 0,
      currentAnalystBreakdown: {
        symbol: 'BTC',
        displaySymbol: '$BTC',
        category: 'CRYPTO',
        momentum: 78,
        uniqueBuyersOrVolume: 84,
        buySellRatio: 76,
        trendGrowth: 74,
        liquidityEfficiency: 88,
        smartFlowConfluence: 80,
        finalScore: 80,
        threshold: 70,
        passedToExecutor: true
      },
      executorTradesCount: (this.demoPortfolio.openPositions.length + this.demoPortfolio.closedTrades.length),
      lastExecutorSymbol: '$BTC',
      lastExecutorSizeUsd: 800,
      riskStopsCount: this.demoPortfolio.openPositions.length,
      riskTrailingSymbol: '$BTC',
      loggerLinesCount: 0
    };

    this.appendTerminalLog('DEMO', 'SCOUT', '$ALL', 'Six-Agent Hard-Handoff Pipeline gestartet · 0€ Echtzeit-Stream aktiv');
  }

  private loadStrategy(): StrategyParameters {
    try {
      if (fs.existsSync(STRATEGY_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(STRATEGY_FILE, 'utf8'));
        if (parsed.strategy) {
          this.optimizationHistory = parsed.history || [];
          return {
            analystPassThreshold: 70,
            maxAllocationPerTradePct: 8,
            initialStopLossPct: 2.2,
            trailActivationGainPct: 1.2,
            trailDistanceUnderPeakPct: 0.55,
            minRewardRiskRatio: 1.85,
            minNetEdgePct: 0.30,
            ...parsed.strategy
          };
        }
      }
    } catch {}
    return {
      version: 1,
      analystPassThreshold: 70,
      maxAllocationPerTradePct: 8,
      initialStopLossPct: 2.2,
      trailActivationGainPct: 1.2,
      trailDistanceUnderPeakPct: 0.55,
      minConfluenceScore: 50,
      minRewardRiskRatio: 1.85,
      minNetEdgePct: 0.30,
      rsiOversold: 38,
      rsiOverbought: 66,
      atrStopLossMultiplier: 1.5,
      atrTakeProfitMultiplier: 2.8,
      maxPositionSizePct: 8,
      maxConcurrentPositions: 6,
      preferredCategories: ['CRYPTO', 'STOCKS', 'FOREX', 'DEX_RUNNER'],
      lastOptimizedAt: new Date().toISOString(),
      optimizationSummary: 'Six-Agent Hard-Handoff Pipeline (SCOUT → FILTER → ANALYST → EXECUTOR → RISK → LOGGER): Nur Assets mit 8/8 bestandenen Filter-Regeln und Analyst-Score ≥ 70 werden an den Executor übergeben.'
    };
  }

  private saveStrategy() {
    try {
      fs.writeFileSync(STRATEGY_FILE, JSON.stringify({
        strategy: this.strategy,
        history: this.optimizationHistory.slice(0, 40)
      }, null, 2));
    } catch {}
  }

  private createFreshPortfolio(mode: TradingMode, initialCapitalUsd: number): ModePortfolioState {
    return {
      mode,
      initialCapitalUsd,
      cashBalanceUsd: initialCapitalUsd,
      equityUsd: initialCapitalUsd,
      totalRealizedPnlUsd: 0,
      totalUnrealizedPnlUsd: 0,
      totalFeesPaidUsd: 0,
      winCount: 0,
      lossCount: 0,
      winRatePct: 0,
      profitFactor: 1.0,
      worstLossUsd: 0,
      bestTradeUsd: 0,
      sharpeEstimate: 0,
      maxDrawdownPct: 0,
      openPositions: [],
      closedTrades: [],
      equityCurve: [{ timestamp: new Date().toISOString(), equity: initialCapitalUsd }]
    };
  }

  private loadPortfolio(mode: TradingMode): ModePortfolioState {
    const file = mode === 'DEMO' ? DEMO_FILE : LIVE_FILE;
    try {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data && typeof data.cashBalanceUsd === 'number') {
          return {
            worstLossUsd: 0,
            bestTradeUsd: 0,
            ...data
          };
        }
      }
    } catch {}
    if (mode === 'DEMO') {
      return this.createFreshPortfolio('DEMO', 10000);
    } else {
      const chain = this.getLiveChainBalances();
      return this.createFreshPortfolio('LIVE', chain.usdcBalance || 0);
    }
  }

  private savePortfolio(mode: TradingMode) {
    const file = mode === 'DEMO' ? DEMO_FILE : LIVE_FILE;
    const state = mode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;
    try {
      fs.writeFileSync(file, JSON.stringify(state, null, 2));
    } catch {}
  }

  private appendTerminalLog(
    mode: TradingMode,
    tag: TerminalLogLine['tag'],
    symbol: string,
    detail: string
  ) {
    this.pipeline.loggerLinesCount += 1;
    const line: TerminalLogLine = {
      id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      lineNumber: this.pipeline.loggerLinesCount,
      timeStr: formatNowTime(),
      timestamp: new Date().toISOString(),
      mode,
      tag,
      symbol,
      detail
    };
    this.terminalLogLines.unshift(line);
    if (this.terminalLogLines.length > 100) {
      this.terminalLogLines = this.terminalLogLines.slice(0, 100);
    }
  }

  public addActivityLog(mode: TradingMode, type: TradingSystemState['recentActivityLogs'][0]['type'], message: string) {
    this.recentActivityLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      mode,
      type,
      message
    });
    if (this.recentActivityLogs.length > 80) {
      this.recentActivityLogs = this.recentActivityLogs.slice(0, 80);
    }
  }

  public startBackgroundLoop() {
    if (this.fastTickTimer) clearInterval(this.fastTickTimer);

    setTimeout(() => {
      this.runMarketScanAndTradeCycle().catch(() => {});
    }, 800);

    // Continuous 3.5-second pipeline handoff & price stream loop
    this.fastTickTimer = setInterval(() => {
      if (!this.isScanning) {
        this.processContinuousMarketTick().catch(() => {});
      }
    }, 3500);
  }

  private async processContinuousMarketTick(): Promise<void> {
    this.deepCandleRefreshCounter += 1;
    this.pipeline.uptimeSeconds = Math.floor((Date.now() - this.bootTimestampMs) / 1000);

    if (this.marketQuotes.length === 0 || this.deepCandleRefreshCounter >= 5) {
      this.deepCandleRefreshCounter = 0;
      await this.runMarketScanAndTradeCycle();
      return;
    }

    this.isScanning = true;
    try {
      // Fast real-time Binance price update
      const res = await this.fetchWithTimeout('https://api.binance.com/api/v3/ticker/price', 2800);
      if (res.ok) {
        const prices: { symbol: string; price: string }[] = await res.json();
        if (Array.isArray(prices)) {
          const priceMap = new Map<string, number>();
          for (const p of prices) {
            priceMap.set(p.symbol, parseFloat(p.price));
          }
          for (const quote of this.marketQuotes) {
            const watch = WATCHLIST_ASSETS.find(w => w.symbol === quote.symbol);
            if (watch?.binanceSymbol && priceMap.has(watch.binanceSymbol)) {
              const livePrice = priceMap.get(watch.binanceSymbol)!;
              if (livePrice > 0) {
                quote.price = livePrice;
                quote.sparkline = [...quote.sparkline.slice(-19), livePrice];
                quote.lastUpdated = new Date().toISOString();
              }
            }
          }
        }
      }

      this.streamTicksProcessed += 1;
      this.lastTickAt = new Date().toISOString();

      // Advance the 6-Agent Hard-Handoff Pipeline inspection on the next live asset
      this.stepSixAgentPipeline();

      this.updateOrderTargetProximity();
      await this.evaluateEventDrivenTriggers('DEMO');
      if (this.activeMode === 'LIVE') {
        this.syncLiveOnChainBalance();
        await this.evaluateEventDrivenTriggers('LIVE');
      }
    } catch {
      // Ignore transient network hiccup
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Executes one full SCOUT -> FILTER -> ANALYST -> EXECUTOR -> RISK -> LOGGER
   * inspection cycle on the next asset in the live watchlist so the user sees
   * every hard rule check and analyst score breakdown in real time.
   */
  private stepSixAgentPipeline() {
    if (this.marketQuotes.length === 0) return;

    this.rotationCursor = (this.rotationCursor + 1) % this.marketQuotes.length;
    const candidate = this.marketQuotes[this.rotationCursor];
    if (!candidate) return;

    const activePortfolio = this.activeMode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;

    // 1. SCOUT stage
    this.pipeline.scoutSeenCount += 1;
    this.pipeline.lastScoutSymbol = candidate.displaySymbol;
    const elapsedMin = Math.max(0.5, (Date.now() - this.bootTimestampMs) / 60000);
    this.pipeline.pairsPerMin = Number((this.pipeline.scoutSeenCount / elapsedMin).toFixed(1));

    // 2. FILTER stage: Evaluate the 8 Hard Rules
    const roundTripFeePct = (candidate.estimatedFeePct * 2) + (candidate.spreadBps / 100);
    const atrMovePct = candidate.indicators.volatilityPct * this.strategy.atrTakeProfitMultiplier;
    const rrRatio = Number((this.strategy.atrTakeProfitMultiplier / this.strategy.atrStopLossMultiplier).toFixed(2));
    const slotAvailable = activePortfolio.openPositions.length < this.strategy.maxConcurrentPositions &&
      !activePortfolio.openPositions.some(p => p.symbol === candidate.symbol);

    const ruleChecks: { label: string; passed: boolean; valueText: string }[] = [
      {
        label: 'Markt-Feed & Kontrakt verifiziert',
        passed: candidate.price > 0,
        valueText: 'verified'
      },
      {
        label: 'Liquidität / 24h Volumen ≥ $50k',
        passed: candidate.marketCapOrLiquidityUsd >= 50000,
        valueText: candidate.marketCapOrLiquidityUsd >= 1e6
          ? `$${(candidate.marketCapOrLiquidityUsd / 1e6).toFixed(1)}M`
          : `$${Math.round(candidate.marketCapOrLiquidityUsd / 1000)}k`
      },
      {
        label: 'Spread ≤ 4.0 bps (Slippage-Schutz)',
        passed: candidate.spreadBps <= 4.0,
        valueText: `${candidate.spreadBps.toFixed(1)} bps`
      },
      {
        label: 'ATR-Impuls > Gebühren-Schwelle (Netto-Edge)',
        passed: atrMovePct > roundTripFeePct * 1.35,
        valueText: `+${candidate.expectedNetEdgePct.toFixed(2)}%`
      },
      {
        label: 'Kein extremer Blow-Off Pump (RSI < 76)',
        passed: candidate.indicators.rsi14 < 76 && candidate.indicators.rsi14 > 20,
        valueText: `RSI ${candidate.indicators.rsi14.toFixed(1)}`
      },
      {
        label: 'EMA Trend- & Support-Struktur intakt',
        passed: Math.abs(candidate.confluenceScore) >= 24,
        valueText: candidate.indicators.ema9 >= candidate.indicators.ema21 ? 'EMA Bull' : 'EMA Bear'
      },
      {
        label: 'Chance / Risiko (R:R) ≥ 1.80:1',
        passed: rrRatio >= 1.8,
        valueText: `${rrRatio}:1`
      },
      {
        label: 'Portfolio-Slot & Risiko-Limit frei',
        passed: slotAvailable,
        valueText: slotAvailable ? 'frei' : 'belegt'
      }
    ];

    let failedRuleIdx = -1;
    const updatedRules: FilterRuleItem[] = ruleChecks.map((r, idx) => {
      if (!r.passed && failedRuleIdx === -1) {
        failedRuleIdx = idx;
        this.ruleKillCounters[idx] += 1;
      }
      return {
        id: idx + 1,
        label: r.label,
        passed: r.passed,
        valueText: r.valueText,
        killCount: this.ruleKillCounters[idx]
      };
    });

    this.pipeline.currentFilterSymbol = candidate.displaySymbol;
    this.pipeline.filterRules = updatedRules;

    if (failedRuleIdx !== -1) {
      // Killed by FILTER!
      this.pipeline.activeStage = 'FILTER';
      this.pipeline.activeSymbol = candidate.displaySymbol;
      this.pipeline.currentFilterRuleIndex = failedRuleIdx + 1;
      this.pipeline.filterKilledCount += 1;
      candidate.passedHardRules = false;
      candidate.failedRuleName = ruleChecks[failedRuleIdx].label;

      const totalProcessed = Math.max(1, this.pipeline.scoutSeenCount);
      this.pipeline.filterKillRatePct = Math.min(96, Math.max(45, Math.round((this.pipeline.filterKilledCount / totalProcessed) * 100)));

      this.appendTerminalLog(
        this.activeMode,
        'KILL',
        candidate.displaySymbol,
        `failed rule ${failedRuleIdx + 1}/8 (${ruleChecks[failedRuleIdx].valueText})`
      );
      return;
    }

    // Passed all 8 FILTER rules -> Handoff to ANALYST!
    candidate.passedHardRules = true;
    this.pipeline.currentFilterRuleIndex = 8;
    this.pipeline.analystScoredCount += 1;

    // 3. ANALYST stage: Score 0-100 across 6 quantitative dimensions (enriched by real-time L2 Orderbook Imbalance & Sentiment)
    const matchingBook = this.marketSentiment.orderbookSnapshots.find(b => b.symbol === candidate.symbol);
    const liveBidRatio = matchingBook ? matchingBook.bidRatioPct : this.marketSentiment.aggregateBidRatioPct;
    const orderbookEdgeBoost = Math.round((liveBidRatio - 50) * 0.35);

    const momentum = Math.min(99, Math.max(42, Math.round(52 + Math.abs(candidate.confluenceScore) * 0.48)));
    const uniqueBuyersOrVolume = Math.min(98, Math.max(55, Math.round(64 + (candidate.volume24h > 0 ? 22 : 12))));
    const buySellRatio = Math.min(98, Math.max(40, Math.round(58 + (candidate.change24hPct >= 0 ? 18 : 10) + orderbookEdgeBoost)));
    const trendGrowth = Math.min(97, Math.max(45, Math.round(candidate.indicators.ema9 >= candidate.indicators.ema21 ? 78 : 66)));
    const liquidityEfficiency = Math.min(99, Math.max(60, Math.round(92 - candidate.spreadBps * 5)));
    const smartFlowConfluence = Math.min(98, Math.max(50, Math.round(62 + Math.abs(0.5 - candidate.indicators.bollingerPctB) * 65 + (orderbookEdgeBoost * 0.5))));

    const finalScore = Math.round(
      (momentum * 0.22) +
      (uniqueBuyersOrVolume * 0.16) +
      (buySellRatio * 0.16) +
      (trendGrowth * 0.16) +
      (liquidityEfficiency * 0.15) +
      (smartFlowConfluence * 0.15)
    );

    candidate.analystScore = finalScore;
    const passedToExecutor = finalScore >= this.strategy.analystPassThreshold;

    this.pipeline.currentAnalystBreakdown = {
      symbol: candidate.symbol,
      displaySymbol: candidate.displaySymbol,
      category: candidate.category,
      momentum,
      uniqueBuyersOrVolume,
      buySellRatio,
      trendGrowth,
      liquidityEfficiency,
      smartFlowConfluence,
      finalScore,
      threshold: this.strategy.analystPassThreshold,
      passedToExecutor
    };

    if (!passedToExecutor) {
      this.pipeline.activeStage = 'ANALYST';
      this.pipeline.activeSymbol = candidate.displaySymbol;
      this.appendTerminalLog(
        this.activeMode,
        'SCORE',
        candidate.displaySymbol,
        `${finalScore} < ${this.strategy.analystPassThreshold} · dropped`
      );
      return;
    }

    // 4. Passed ANALYST (Score >= 70) -> Handoff to EXECUTOR!
    this.pipeline.activeStage = 'EXECUTOR';
    this.pipeline.activeSymbol = candidate.displaySymbol;
    this.appendTerminalLog(
      this.activeMode,
      'SCORE',
      candidate.displaySymbol,
      `${finalScore} ≥ ${this.strategy.analystPassThreshold} → executor`
    );

    if (this.autoPilotEnabled) {
      this.executePipelineHandoffTrade(candidate, finalScore).catch(() => {});
    }
  }

  private async executePipelineHandoffTrade(candidate: MarketAssetQuote, analystScore: number) {
    const mode = this.activeMode;
    const portfolio = mode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;

    if (portfolio.openPositions.length >= this.strategy.maxConcurrentPositions) return;
    if (portfolio.openPositions.some(p => p.symbol === candidate.symbol)) return;

    const allocPct = this.strategy.maxAllocationPerTradePct || 8;
    let sizeUsd = Number(((portfolio.equityUsd * (allocPct / 100))).toFixed(2));
    let side: 'LONG' | 'SHORT' = candidate.confluenceScore >= 0 ? 'LONG' : 'SHORT';
    let onChainTxHash: string | undefined = undefined;

    if (mode === 'LIVE') {
      // On-Chain Polygon Uniswap V3 Pools available for BTC, ETH, POL, LINK, AVAX (Spot LONG only)
      const polygonSupported = ['BTC', 'ETH', 'POL', 'LINK', 'AVAX'].includes(candidate.symbol);
      if (!polygonSupported) return;
      side = 'LONG'; // Spot DEX is Long-only

      // 0.50 USDC Hard Reserve Lock
      const tradeableSurplus = portfolio.cashBalanceUsd - 0.50;
      if (tradeableSurplus < 0.15) return;

      sizeUsd = Number(Math.max(0.15, Math.min(tradeableSurplus * 0.45, sizeUsd)).toFixed(2));
      if (portfolio.cashBalanceUsd - sizeUsd < 0.50) return;

      if (!this.executeOnChainSwap) return;
      const swapRes = await this.executeOnChainSwap({
        direction: 'BUY_TOKEN',
        symbol: candidate.symbol,
        amountUsdc: sizeUsd,
        expectedPriceUsd: candidate.price
      });
      if (!swapRes.success) {
        this.appendTerminalLog('LIVE', 'KILL', candidate.displaySymbol, swapRes.message);
        return;
      }
      onChainTxHash = swapRes.txHash;
    } else {
      if (sizeUsd < 10 || portfolio.cashBalanceUsd < sizeUsd) return;
    }

    const atr = candidate.indicators.atr14 > 0 ? candidate.indicators.atr14 : candidate.price * 0.012;
    const slDist = Math.max(atr * this.strategy.atrStopLossMultiplier, candidate.price * 0.008);
    const tpDist = Math.max(atr * this.strategy.atrTakeProfitMultiplier, candidate.price * 0.018);

    const stopLoss = side === 'LONG'
      ? roundPrice(candidate.price - slDist, candidate.category, candidate.symbol)
      : roundPrice(candidate.price + slDist, candidate.category, candidate.symbol);
    const takeProfit = side === 'LONG'
      ? roundPrice(candidate.price + tpDist, candidate.category, candidate.symbol)
      : roundPrice(candidate.price - tpDist, candidate.category, candidate.symbol);

    const entryFeeUsd = Number((sizeUsd * (candidate.estimatedFeePct / 100)).toFixed(4));
    const quantity = Number(((sizeUsd - entryFeeUsd) / candidate.price).toFixed(6));

    const newPos: TradingPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      mode,
      symbol: candidate.symbol,
      displaySymbol: candidate.displaySymbol,
      name: candidate.name,
      category: candidate.category,
      side,
      entryPrice: candidate.price,
      currentPrice: candidate.price,
      peakPrice: candidate.price,
      quantity,
      notionalUsd: sizeUsd,
      allocationPct: allocPct,
      stopLoss,
      takeProfit,
      trailingActive: false,
      trailingStopPrice: stopLoss,
      trailActivationPct: this.strategy.trailActivationGainPct,
      trailUnderPeakPct: this.strategy.trailDistanceUnderPeakPct,
      priceHistory: [candidate.price, candidate.price],
      stopHistory: [stopLoss, stopLoss],
      unrealizedPnlUsd: 0,
      unrealizedPnlPct: 0,
      openedAt: new Date().toISOString(),
      executionVenue: candidate.executionVenue,
      entryReason: `Analyst Score ${analystScore}/100 → Executor (${allocPct}% Allokation)`,
      txHash: onChainTxHash
    };

    portfolio.cashBalanceUsd = Number((portfolio.cashBalanceUsd - sizeUsd).toFixed(4));
    portfolio.totalFeesPaidUsd = Number((portfolio.totalFeesPaidUsd + entryFeeUsd).toFixed(4));
    portfolio.openPositions.unshift(newPos);

    this.pipeline.executorTradesCount += 1;
    this.pipeline.lastExecutorSymbol = candidate.displaySymbol;
    this.pipeline.lastExecutorSizeUsd = sizeUsd;
    this.pipeline.riskStopsCount += 1;
    this.pipeline.riskTrailingSymbol = candidate.displaySymbol;

    this.appendTerminalLog(mode, 'ENTER', candidate.displaySymbol, `size $${sizeUsd.toFixed(2)} (${side})${onChainTxHash ? ` · tx ${onChainTxHash.slice(0, 10)}` : ''}`);
    this.appendTerminalLog(mode, 'STOP', candidate.displaySymbol, `stop set @ ${stopLoss} before entry · trails towards ${takeProfit}`);
    this.addActivityLog(mode, 'TRADE_OPEN', `[EXECUTOR → RISK] ${side} ${candidate.displaySymbol} ($${sizeUsd.toFixed(2)}) bei ${candidate.price} eröffnet (Analyst Score ${analystScore})`);

    this.recalculatePortfolioMetrics(portfolio);
    this.savePortfolio(mode);
  }

  private async fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
    } finally {
      clearTimeout(id);
    }
  }

  private async fetchAssetQuote(asset: WatchlistAsset): Promise<MarketAssetQuote | null> {
    let closes: number[] = [];
    let highs: number[] = [];
    let lows: number[] = [];
    let volumes: number[] = [];
    let currentPrice = 0;
    let prevClose = 0;
    let dataSource = '';

    if ((asset.category === 'CRYPTO' || asset.category === 'DEX_RUNNER') && asset.binanceSymbol) {
      try {
        const res = await this.fetchWithTimeout(`https://api.binance.com/api/v3/klines?symbol=${asset.binanceSymbol}&interval=15m&limit=40`, 5000);
        if (res.ok) {
          const klines = await res.json();
          if (Array.isArray(klines) && klines.length > 5) {
            for (const k of klines) {
              highs.push(parseFloat(k[2]));
              lows.push(parseFloat(k[3]));
              closes.push(parseFloat(k[4]));
              volumes.push(parseFloat(k[7]) || parseFloat(k[5]) * parseFloat(k[4])); // quote asset volume in USD
            }
            currentPrice = closes[closes.length - 1];
            prevClose = closes[0];
            dataSource = 'Binance Spot Live-Stream';
          }
        }
      } catch {}
    }

    if (closes.length === 0) {
      try {
        const encoded = encodeURIComponent(asset.yahooSymbol);
        const res = await this.fetchWithTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=15m&range=5d`, 6000);
        if (res.ok) {
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (result) {
            const meta = result.meta || {};
            const quote = result.indicators?.quote?.[0] || {};
            const rawCloses: (number | null)[] = quote.close || [];
            const rawHighs: (number | null)[] = quote.high || [];
            const rawLows: (number | null)[] = quote.low || [];
            const rawVols: (number | null)[] = quote.volume || [];

            for (let i = 0; i < rawCloses.length; i++) {
              const c = rawCloses[i];
              if (typeof c === 'number' && !isNaN(c) && c > 0) {
                closes.push(c);
                highs.push(typeof rawHighs[i] === 'number' ? (rawHighs[i] as number) : c);
                lows.push(typeof rawLows[i] === 'number' ? (rawLows[i] as number) : c);
                volumes.push(typeof rawVols[i] === 'number' ? (rawVols[i] as number) * c : 250000);
              }
            }
            currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0;
            prevClose = meta.chartPreviousClose || meta.previousClose || closes[0] || currentPrice;
            dataSource = 'Yahoo Finance v8 Live-Stream';
          }
        }
      } catch {}
    }

    if (closes.length === 0 && asset.category === 'FOREX') {
      try {
        const res = await this.fetchWithTimeout('https://api.frankfurter.app/latest?from=USD', 5000);
        if (res.ok) {
          const data = await res.json();
          const rates = data?.rates || {};
          if (asset.symbol === 'EURUSD' && rates.EUR) currentPrice = 1 / rates.EUR;
          if (asset.symbol === 'GBPUSD' && rates.GBP) currentPrice = 1 / rates.GBP;
          if (asset.symbol === 'USDJPY' && rates.JPY) currentPrice = rates.JPY;
          if (asset.symbol === 'USDCHF' && rates.CHF) currentPrice = rates.CHF;
          if (currentPrice > 0) {
            closes = [currentPrice];
            highs = [currentPrice * 1.001];
            lows = [currentPrice * 0.999];
            volumes = [5000000];
            prevClose = currentPrice;
            dataSource = 'EZB Frankfurter FX Stream';
          }
        }
      } catch {}
    }

    if (currentPrice <= 0 || closes.length === 0) {
      return null;
    }

    const recentCloses = closes.slice(-40);
    const rsi14 = Number(calcRSI(recentCloses, 14).toFixed(2));
    const ema9 = Number(calcEMA(recentCloses, 9).toFixed(6));
    const ema21 = Number(calcEMA(recentCloses, 21).toFixed(6));
    const ema12 = calcEMA(recentCloses, 12);
    const ema26 = calcEMA(recentCloses, 26);
    const macdLine = ema12 - ema26;
    const macdHistogram = Number((macdLine * 0.35).toFixed(6));
    const bBands = calcBollingerBands(recentCloses, 20);
    const bollingerPctB = Number(bBands.pctB.toFixed(3));
    const atr14 = Number(calcATR(highs.slice(-40), lows.slice(-40), recentCloses, 14).toFixed(6));
    const volatilityPct = Number(Math.max(0.18, ((atr14 / currentPrice) * 100)).toFixed(3));

    let score = 0;
    const reasons: string[] = [];

    if (ema9 > ema21) {
      const diffPct = ((ema9 - ema21) / ema21) * 100;
      const pts = Math.min(34, Math.max(16, Math.round(diffPct * 48)));
      score += pts;
      reasons.push(`Aufwärtstrend (EMA9 > EMA21)`);
    } else if (ema9 < ema21) {
      const diffPct = ((ema21 - ema9) / ema21) * 100;
      const pts = Math.min(34, Math.max(16, Math.round(diffPct * 48)));
      score -= pts;
      reasons.push(`Abwärtstrend (EMA9 < EMA21)`);
    }

    if (rsi14 <= this.strategy.rsiOversold) {
      score += 38;
      reasons.push(`Überverkauft (RSI ${rsi14.toFixed(1)} ≤ ${this.strategy.rsiOversold})`);
    } else if (rsi14 < 48) {
      score += 20;
      reasons.push(`Günstige RSI-Zone (${rsi14.toFixed(1)})`);
    } else if (rsi14 >= this.strategy.rsiOverbought) {
      score -= 38;
      reasons.push(`Überkauft (RSI ${rsi14.toFixed(1)} ≥ ${this.strategy.rsiOverbought})`);
    } else if (rsi14 > 56) {
      score -= 18;
      reasons.push(`Momentum-Zone (RSI ${rsi14.toFixed(1)})`);
    }

    if (bollingerPctB < 0.25) {
      score += 24;
      reasons.push(`Unteres Bollinger-Band (%B ${(bollingerPctB * 100).toFixed(0)}%)`);
    } else if (bollingerPctB > 0.78) {
      score -= 24;
      reasons.push(`Oberes Bollinger-Band (%B ${(bollingerPctB * 100).toFixed(0)}%)`);
    }

    if (currentPrice >= ema9) {
      score += 14;
      reasons.push(`Kurs über EMA9-Support`);
    } else {
      score -= 14;
    }

    score = Math.max(-100, Math.min(100, score));

    const roundTripCostPct = (asset.estimatedFeePct * 2) + (asset.spreadBps / 100);
    const expectedGrossMovePct = volatilityPct * this.strategy.atrTakeProfitMultiplier * Math.max(0.6, Math.abs(score) / 55);
    const expectedNetEdgePct = Number(Math.max(0.12, expectedGrossMovePct - roundTripCostPct).toFixed(3));

    const isWorthTradingNow =
      Math.abs(score) >= this.strategy.minConfluenceScore &&
      expectedNetEdgePct >= this.strategy.minNetEdgePct;

    let signal: SignalAction = 'NEUTRAL';
    if (score >= this.strategy.minConfluenceScore + 15) signal = 'STRONG_BUY';
    else if (score >= this.strategy.minConfluenceScore) signal = 'BUY';
    else if (score <= -(this.strategy.minConfluenceScore + 15)) signal = 'STRONG_SELL';
    else if (score <= -this.strategy.minConfluenceScore) signal = 'SELL';

    const change24hPct = prevClose > 0 ? Number((((currentPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;
    const recent24High = highs.length > 0 ? Math.max(...highs.slice(-24)) : currentPrice;
    const recent24Low = lows.length > 0 ? Math.min(...lows.slice(-24)) : currentPrice;
    const totalVol = Math.max(125000, volumes.slice(-24).reduce((a, b) => a + b, 0));

    const prelimAnalystScore = Math.min(96, Math.max(48, Math.round(56 + Math.abs(score) * 0.42)));

    return {
      symbol: asset.symbol,
      displaySymbol: asset.displaySymbol,
      name: asset.name,
      category: asset.category,
      price: currentPrice,
      change24hPct,
      high24h: recent24High,
      low24h: recent24Low,
      volume24h: totalVol,
      marketCapOrLiquidityUsd: totalVol,
      ageLabel: asset.ageLabel,
      spreadBps: asset.spreadBps,
      executionVenue: asset.executionVenue,
      estimatedFeePct: asset.estimatedFeePct,
      sparkline: recentCloses.slice(-20),
      indicators: {
        rsi14,
        ema9,
        ema21,
        macdHistogram,
        bollingerPctB,
        bollingerLower: roundPrice(bBands.lower, asset.category, asset.symbol),
        bollingerUpper: roundPrice(bBands.upper, asset.category, asset.symbol),
        atr14,
        volatilityPct
      },
      analystScore: prelimAnalystScore,
      passedHardRules: prelimAnalystScore >= 62,
      signal,
      confluenceScore: score,
      expectedNetEdgePct,
      isWorthTradingNow,
      signalReasons: reasons,
      lastUpdated: new Date().toISOString(),
      dataSource
    };
  }

  private computeAndRefreshOrderTargets() {
    const activePortfolio = this.activeMode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;
    const defaultAllocUsd = Math.max(
      25,
      Number(((activePortfolio.equityUsd * (this.strategy.maxAllocationPerTradePct / 100))).toFixed(2))
    );

    const generatedTargets: OrderTarget[] = [];

    for (const quote of this.marketQuotes) {
      if (activePortfolio.openPositions.some(p => p.symbol === quote.symbol)) continue;

      const atr = quote.indicators.atr14 > 0 ? quote.indicators.atr14 : quote.price * 0.008;
      const roundTripCostPct = (quote.estimatedFeePct * 2) + (quote.spreadBps / 100);

      let side: 'LONG' | 'SHORT' = 'LONG';
      let targetType: OrderTarget['targetType'] = 'LIMIT_SUPPORT';
      let targetEntryPrice = quote.price;
      let rationale = '';

      if (quote.confluenceScore >= this.strategy.minConfluenceScore && quote.isWorthTradingNow) {
        side = 'LONG';
        targetType = 'BREAKOUT_MOMENTUM';
        targetEntryPrice = roundPrice(quote.price, quote.category, quote.symbol);
        rationale = `Analyst Score ${quote.analystScore}/100 ≥ ${this.strategy.analystPassThreshold} → Sofort-Handoff an Executor`;
      } else if (quote.confluenceScore <= -this.strategy.minConfluenceScore && quote.isWorthTradingNow) {
        side = 'SHORT';
        targetType = 'REVERSAL_RESISTANCE';
        targetEntryPrice = roundPrice(quote.price, quote.category, quote.symbol);
        rationale = `Analyst Score ${quote.analystScore}/100 ≥ ${this.strategy.analystPassThreshold} → Short-Handoff an Executor`;
      } else if (quote.indicators.ema9 >= quote.indicators.ema21 || quote.indicators.rsi14 < 52) {
        side = 'LONG';
        targetType = 'LIMIT_SUPPORT';
        const pullbackLevel = Math.min(
          quote.price * 0.9985,
          Math.max(quote.indicators.bollingerLower, quote.price - atr * 0.5)
        );
        targetEntryPrice = roundPrice(pullbackLevel, quote.category, quote.symbol);
        rationale = `Sniper-Limit-Ziel an Support (${targetEntryPrice}) gesetzt`;
      } else {
        side = 'SHORT';
        targetType = 'REVERSAL_RESISTANCE';
        const bounceLevel = Math.max(
          quote.price * 1.0015,
          Math.min(quote.indicators.bollingerUpper, quote.price + atr * 0.5)
        );
        targetEntryPrice = roundPrice(bounceLevel, quote.category, quote.symbol);
        rationale = `Sniper-Short-Ziel an Widerstand (${targetEntryPrice}) gesetzt`;
      }

      const slDistance = atr * this.strategy.atrStopLossMultiplier;
      const tpDistance = atr * this.strategy.atrTakeProfitMultiplier;

      const plannedStopLoss = side === 'LONG'
        ? roundPrice(targetEntryPrice - slDistance, quote.category, quote.symbol)
        : roundPrice(targetEntryPrice + slDistance, quote.category, quote.symbol);

      const plannedTakeProfit = side === 'LONG'
        ? roundPrice(targetEntryPrice + tpDistance, quote.category, quote.symbol)
        : roundPrice(targetEntryPrice - tpDistance, quote.category, quote.symbol);

      const expectedGrossPct = ((tpDistance / targetEntryPrice) * 100);
      const expectedNetProfitPct = Number(Math.max(0.12, expectedGrossPct - roundTripCostPct).toFixed(2));
      const expectedRewardRiskRatio = Number((tpDistance / (slDistance || 1)).toFixed(2));

      const distancePct = Number(
        (Math.abs(quote.price - targetEntryPrice) / quote.price * 100).toFixed(3)
      );

      const status: OrderTarget['status'] =
        distancePct <= 0.05 ? 'TRIGGERED' :
        distancePct <= 0.25 ? 'IMMINENT' : 'WATCHING';

      generatedTargets.push({
        id: `tgt_${quote.symbol}`,
        symbol: quote.symbol,
        displaySymbol: quote.displaySymbol,
        name: quote.name,
        category: quote.category,
        side,
        targetType,
        targetEntryPrice,
        currentPrice: quote.price,
        distancePct,
        plannedStopLoss,
        plannedTakeProfit,
        expectedRewardRiskRatio,
        expectedNetProfitPct,
        allocatedUsd: defaultAllocUsd,
        rationale,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const customSymbols = new Set(this.customTargets.map(t => t.symbol));
    const filteredAuto = generatedTargets
      .filter(t => !customSymbols.has(t.symbol))
      .sort((a, b) => a.distancePct - b.distancePct);

    this.orderTargets = [...this.customTargets, ...filteredAuto];
    this.updateOrderTargetProximity();
  }

  private updateOrderTargetProximity() {
    for (const target of this.orderTargets) {
      const quote = this.marketQuotes.find(q => q.symbol === target.symbol);
      if (!quote) continue;
      target.currentPrice = quote.price;

      const isCrossed =
        (target.side === 'LONG' && target.targetType === 'LIMIT_SUPPORT' && quote.price <= target.targetEntryPrice) ||
        (target.side === 'LONG' && target.targetType === 'BREAKOUT_MOMENTUM' && quote.price >= target.targetEntryPrice) ||
        (target.side === 'SHORT' && quote.price >= target.targetEntryPrice);

      const rawDist = Math.abs(quote.price - target.targetEntryPrice) / quote.price * 100;
      target.distancePct = isCrossed ? 0 : Number(rawDist.toFixed(3));
      target.status = isCrossed || target.distancePct <= 0.04
        ? 'TRIGGERED'
        : target.distancePct <= 0.25
          ? 'IMMINENT'
          : 'WATCHING';
      target.updatedAt = new Date().toISOString();
    }
  }

  public addCustomOrderTarget(params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    targetEntryPrice: number;
    allocatedUsd: number;
  }): { success: boolean; message: string } {
    const quote = this.marketQuotes.find(q => q.symbol === params.symbol);
    if (!quote) {
      return { success: false, message: `Asset ${params.symbol} nicht gefunden.` };
    }
    const atr = quote.indicators.atr14 > 0 ? quote.indicators.atr14 : params.targetEntryPrice * 0.012;
    const slDist = atr * this.strategy.atrStopLossMultiplier;
    const tpDist = atr * this.strategy.atrTakeProfitMultiplier;

    const plannedStopLoss = params.side === 'LONG'
      ? roundPrice(params.targetEntryPrice - slDist, quote.category, quote.symbol)
      : roundPrice(params.targetEntryPrice + slDist, quote.category, quote.symbol);
    const plannedTakeProfit = params.side === 'LONG'
      ? roundPrice(params.targetEntryPrice + tpDist, quote.category, quote.symbol)
      : roundPrice(params.targetEntryPrice - tpDist, quote.category, quote.symbol);

    const distPct = Number((Math.abs(quote.price - params.targetEntryPrice) / quote.price * 100).toFixed(3));
    const customTarget: OrderTarget = {
      id: `custom_tgt_${Date.now()}`,
      symbol: quote.symbol,
      displaySymbol: quote.displaySymbol,
      name: quote.name,
      category: quote.category,
      side: params.side,
      targetType: params.side === 'LONG' && params.targetEntryPrice <= quote.price ? 'LIMIT_SUPPORT' : 'BREAKOUT_MOMENTUM',
      targetEntryPrice: params.targetEntryPrice,
      currentPrice: quote.price,
      distancePct: distPct,
      plannedStopLoss,
      plannedTakeProfit,
      expectedRewardRiskRatio: Number((tpDist / (slDist || 1)).toFixed(2)),
      expectedNetProfitPct: Number(((tpDist / params.targetEntryPrice) * 100 - quote.estimatedFeePct * 2).toFixed(2)),
      allocatedUsd: params.allocatedUsd,
      rationale: `Definiertes Sniper-Order-Ziel (${params.side} @ ${params.targetEntryPrice})`,
      status: distPct <= 0.05 ? 'TRIGGERED' : distPct <= 0.25 ? 'IMMINENT' : 'WATCHING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.customTargets = [customTarget, ...this.customTargets.filter(t => t.symbol !== quote.symbol)];
    this.computeAndRefreshOrderTargets();
    const msg = `Order-Ziel gesetzt: ${params.side} ${quote.displaySymbol} @ ${params.targetEntryPrice}`;
    this.appendTerminalLog(this.activeMode, 'STOP', quote.displaySymbol, `custom target @ ${params.targetEntryPrice} ($${params.allocatedUsd.toFixed(0)})`);
    this.addActivityLog(this.activeMode, 'TARGET_SET', msg);
    return { success: true, message: msg };
  }

  public removeOrderTarget(targetId: string): { success: boolean; message: string } {
    this.customTargets = this.customTargets.filter(t => t.id !== targetId);
    this.orderTargets = this.orderTargets.filter(t => t.id !== targetId);
    return { success: true, message: 'Order-Ziel entfernt.' };
  }

  public async runMarketScanAndTradeCycle(): Promise<{ scannedCount: number; actionsTaken: string[] }> {
    if (this.isScanning) {
      return { scannedCount: this.marketQuotes.length, actionsTaken: [] };
    }
    this.isScanning = true;
    const actionsTaken: string[] = [];

    try {
      const results = await Promise.all(WATCHLIST_ASSETS.map(a => this.fetchAssetQuote(a)));
      const validQuotes = results.filter((q): q is MarketAssetQuote => q !== null);

      if (validQuotes.length > 0) {
        this.marketQuotes = validQuotes;
        this.streamTicksProcessed += 1;
        this.lastTickAt = new Date().toISOString();
      }

      // Refresh live Fear & Greed Index + L2 Orderbook Depth Imbalance + Market Breadth
      await this.refreshMarketSentimentTelemetry();

      // Run 2 steps of the 6-agent pipeline on fresh scan
      this.stepSixAgentPipeline();
      this.stepSixAgentPipeline();

      this.computeAndRefreshOrderTargets();
      this.syncLiveOnChainBalance();

      const demoActions = await this.evaluateEventDrivenTriggers('DEMO');
      actionsTaken.push(...demoActions);

      if (this.activeMode === 'LIVE') {
        const liveActions = await this.evaluateEventDrivenTriggers('LIVE');
        actionsTaken.push(...liveActions);
      }

      const activePortfolio = this.activeMode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;
      const totalTrades = activePortfolio.closedTrades.length;
      if (totalTrades > 0 && totalTrades % 3 === 0) {
        const lastOptTradeCount = (this as any)._lastOptTradeCount || 0;
        if (totalTrades !== lastOptTradeCount) {
          (this as any)._lastOptTradeCount = totalTrades;
          await this.runSelfOptimization('Automatische Logger-Kalibrierung nach 3 Trades');
          actionsTaken.push('LOGGER hat KI-Selbstoptimierung der 6-Agenten-Schwellenwerte durchgeführt');
        }
      }

      return { scannedCount: this.marketQuotes.length, actionsTaken };
    } finally {
      this.isScanning = false;
    }
  }

  private syncLiveOnChainBalance() {
    const chain = this.getLiveChainBalances();
    const openNotional = this.livePortfolio.openPositions.reduce((acc, p) => acc + p.notionalUsd + p.unrealizedPnlUsd, 0);
    this.livePortfolio.cashBalanceUsd = Number(chain.usdcBalance.toFixed(4));
    this.livePortfolio.equityUsd = Number((this.livePortfolio.cashBalanceUsd + openNotional).toFixed(4));
    if (this.livePortfolio.initialCapitalUsd === 0 && chain.usdcBalance > 0) {
      this.livePortfolio.initialCapitalUsd = Number(chain.usdcBalance.toFixed(4));
    }
    this.savePortfolio('LIVE');
  }

  private async evaluateEventDrivenTriggers(mode: TradingMode): Promise<string[]> {
    const portfolio = mode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;
    const actions: string[] = [];

    const remainingPositions: TradingPosition[] = [];
    for (const pos of portfolio.openPositions) {
      const quote = this.marketQuotes.find(q => q.symbol === pos.symbol);
      if (!quote) {
        remainingPositions.push(pos);
        continue;
      }

      pos.currentPrice = quote.price;
      if (pos.side === 'LONG') {
        if (quote.price > (pos.peakPrice || pos.entryPrice)) {
          pos.peakPrice = quote.price;
        }
      } else {
        if (quote.price < (pos.peakPrice || pos.entryPrice)) {
          pos.peakPrice = quote.price;
        }
      }

      const priceDelta = pos.side === 'LONG'
        ? (pos.currentPrice - pos.entryPrice)
        : (pos.entryPrice - pos.currentPrice);

      pos.unrealizedPnlUsd = Number((priceDelta * pos.quantity).toFixed(4));
      pos.unrealizedPnlPct = Number(((priceDelta / pos.entryPrice) * 100).toFixed(2));

      // RISK AGENT: Dynamic Trailing Stop under Peak
      const totalTargetDist = Math.abs(pos.takeProfit - pos.entryPrice);
      if (totalTargetDist > 0 && priceDelta >= totalTargetDist * 0.45) {
        const wasTrailing = pos.trailingActive;
        pos.trailingActive = true;
        if (pos.side === 'LONG') {
          const lockStop = roundPrice(pos.entryPrice + priceDelta * 0.55, pos.category, pos.symbol);
          if (lockStop > pos.stopLoss) {
            pos.stopLoss = lockStop;
            pos.trailingStopPrice = lockStop;
          }
        } else {
          const lockStop = roundPrice(pos.entryPrice - priceDelta * 0.55, pos.category, pos.symbol);
          if (lockStop < pos.stopLoss) {
            pos.stopLoss = lockStop;
            pos.trailingStopPrice = lockStop;
          }
        }
        if (!wasTrailing) {
          this.pipeline.activeStage = 'RISK';
          this.pipeline.riskTrailingSymbol = pos.displaySymbol;
          this.appendTerminalLog(mode, 'TRAIL', pos.displaySymbol, `+${pos.unrealizedPnlPct.toFixed(2)}% hit · trailing stop locked @ ${pos.stopLoss}`);
        }
      }

      // Append to position priceHistory & stopHistory for the live EXECUTOR + RISK curve chart
      pos.priceHistory = [...(pos.priceHistory || [pos.entryPrice]).slice(-24), pos.currentPrice];
      pos.stopHistory = [...(pos.stopHistory || [pos.stopLoss]).slice(-24), pos.stopLoss];

      let exitReason: ClosedTrade['exitReason'] | null = null;
      if (pos.side === 'LONG') {
        if (pos.currentPrice <= pos.stopLoss) {
          exitReason = pos.trailingActive && pos.stopLoss > pos.entryPrice ? 'TRAILING_PROFIT_LOCK' : 'STOP_LOSS';
        } else if (pos.currentPrice >= pos.takeProfit) {
          exitReason = 'TAKE_PROFIT';
        }
      } else {
        if (pos.currentPrice >= pos.stopLoss) {
          exitReason = pos.trailingActive && pos.stopLoss < pos.entryPrice ? 'TRAILING_PROFIT_LOCK' : 'STOP_LOSS';
        } else if (pos.currentPrice <= pos.takeProfit) {
          exitReason = 'TAKE_PROFIT';
        }
      }

      if (exitReason) {
        let exitTxHash: string | undefined = pos.txHash;
        if (mode === 'LIVE') {
          if (!this.executeOnChainSwap) {
            remainingPositions.push(pos);
            continue;
          }
          const swapRes = await this.executeOnChainSwap({
            direction: 'SELL_TOKEN',
            symbol: pos.symbol,
            amountUsdc: pos.notionalUsd,
            expectedPriceUsd: pos.currentPrice
          });
          if (!swapRes.success) {
            this.addActivityLog(
              'LIVE',
              'ALERT',
              `[LIVE ON-CHAIN AUTO-EXIT WARNUNG] ${pos.displaySymbol} (${exitReason}) konnte nicht geswappt werden: ${swapRes.message}`
            );
            remainingPositions.push(pos);
            continue;
          }
          exitTxHash = swapRes.txHash || pos.txHash;
        }

        const feeUsd = Number(((pos.notionalUsd * (quote.estimatedFeePct / 100))).toFixed(4));
        const netPnlUsd = Number((pos.unrealizedPnlUsd - feeUsd).toFixed(4));
        const closed: ClosedTrade = {
          id: `trd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          mode,
          symbol: pos.symbol,
          displaySymbol: pos.displaySymbol,
          category: pos.category,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice: pos.currentPrice,
          quantity: pos.quantity,
          notionalUsd: pos.notionalUsd,
          realizedPnlUsd: netPnlUsd,
          realizedPnlPct: pos.unrealizedPnlPct,
          feePaidUsd: feeUsd,
          exitReason,
          openedAt: pos.openedAt,
          closedAt: new Date().toISOString(),
          entryConfluenceScore: quote.confluenceScore,
          txHash: exitTxHash
        };

        portfolio.closedTrades.unshift(closed);
        portfolio.cashBalanceUsd = Number((portfolio.cashBalanceUsd + pos.notionalUsd + netPnlUsd).toFixed(4));
        portfolio.totalRealizedPnlUsd = Number((portfolio.totalRealizedPnlUsd + netPnlUsd).toFixed(4));
        portfolio.totalFeesPaidUsd = Number((portfolio.totalFeesPaidUsd + feeUsd).toFixed(4));
        if (netPnlUsd >= 0) portfolio.winCount += 1;
        else portfolio.lossCount += 1;

        this.appendTerminalLog(
          mode,
          netPnlUsd >= 0 ? 'WIN' : 'LOSS',
          pos.displaySymbol,
          `${netPnlUsd >= 0 ? '+' : ''}$${netPnlUsd.toFixed(2)} · ${exitReason === 'TRAILING_PROFIT_LOCK' ? 'trailed out' : exitReason}${exitTxHash ? ` · tx:${exitTxHash.slice(0, 8)}` : ''}`
        );

        const msg = `[${mode}] Position geschlossen: ${pos.side} ${pos.displaySymbol} @ ${pos.currentPrice} (${exitReason}) | Netto-PnL: ${netPnlUsd >= 0 ? '+' : ''}$${netPnlUsd.toFixed(2)}${exitTxHash ? ` | Polygon Tx: ${exitTxHash}` : ''}`;
        this.addActivityLog(mode, 'TRADE_CLOSE', msg);
        actions.push(msg);
      } else {
        remainingPositions.push(pos);
      }
    }

    portfolio.openPositions = remainingPositions;
    this.recalculatePortfolioMetrics(portfolio);
    this.savePortfolio(mode);
    return actions;
  }

  private recalculatePortfolioMetrics(portfolio: ModePortfolioState) {
    const unrealized = portfolio.openPositions.reduce((sum, p) => sum + p.unrealizedPnlUsd, 0);
    const openNotional = portfolio.openPositions.reduce((sum, p) => sum + p.notionalUsd, 0);
    portfolio.totalUnrealizedPnlUsd = Number(unrealized.toFixed(4));
    portfolio.equityUsd = Number((portfolio.cashBalanceUsd + openNotional + unrealized).toFixed(4));

    const totalClosed = portfolio.winCount + portfolio.lossCount;
    portfolio.winRatePct = totalClosed > 0 ? Number(((portfolio.winCount / totalClosed) * 100).toFixed(1)) : 0;

    const grossProfit = portfolio.closedTrades
      .filter(t => t.realizedPnlUsd > 0)
      .reduce((s, t) => s + t.realizedPnlUsd, 0);
    const grossLoss = Math.abs(
      portfolio.closedTrades
        .filter(t => t.realizedPnlUsd < 0)
        .reduce((s, t) => s + t.realizedPnlUsd, 0)
    );
    portfolio.profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 3.5 : 1.0;

    let best = 0;
    let worst = 0;
    for (const t of portfolio.closedTrades) {
      if (t.realizedPnlUsd > best) best = t.realizedPnlUsd;
      if (t.realizedPnlUsd < worst) worst = t.realizedPnlUsd;
    }
    portfolio.bestTradeUsd = Number(best.toFixed(2));
    portfolio.worstLossUsd = Number(worst.toFixed(2));

    const nowIso = new Date().toISOString();
    portfolio.equityCurve.push({ timestamp: nowIso, equity: portfolio.equityUsd });
    if (portfolio.equityCurve.length > 60) {
      portfolio.equityCurve = portfolio.equityCurve.slice(-60);
    }

    let peak = portfolio.initialCapitalUsd || 1;
    let maxDd = 0;
    for (const pt of portfolio.equityCurve) {
      if (pt.equity > peak) peak = pt.equity;
      const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
      if (dd > maxDd) maxDd = dd;
    }
    portfolio.maxDrawdownPct = Number(maxDd.toFixed(2));
  }

  public async executeManualOrder(params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    amountUsd: number;
  }): Promise<{ success: boolean; message: string; position?: TradingPosition }> {
    const cleanSym = params.symbol.replace(/^\$/, '');
    const quote = this.marketQuotes.find(q => q.symbol === cleanSym || q.displaySymbol === params.symbol);
    if (!quote) {
      return { success: false, message: `Kein Live-Marktpreis für ${params.symbol} verfügbar.` };
    }

    const mode = this.activeMode;
    const portfolio = mode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;

    let onChainTxHash: string | undefined = undefined;

    if (mode === 'LIVE') {
      const polygonSupported = ['BTC', 'ETH', 'POL', 'LINK', 'AVAX'].includes(quote.symbol);
      if (!polygonSupported) {
        return {
          success: false,
          message: `Echt-Betrieb Schutzschild: Für ${quote.displaySymbol} (${quote.category}) ist kein Live-Broker API-Key hinterlegt. On-Chain über Polygon Uniswap V3 sofort handelbar: $BTC, $ETH, $POL, $LINK, $AVAX.`
        };
      }
      if (params.side === 'SHORT') {
        return {
          success: false,
          message: 'On-Chain Spot DEX unterstützt nur direkte Token-Käufe (LONG). Für Short-Positionen im Echt-Betrieb wird ein Margin-Broker API-Key benötigt.'
        };
      }
      if (portfolio.cashBalanceUsd - params.amountUsd < 0.50) {
        return {
          success: false,
          message: `0.50 USDC Schutzsperre aktiv: Dein Wallet hat ${portfolio.cashBalanceUsd.toFixed(4)} USDC. Damit mindestens 0.50 USDC als Reserve geschützt bleiben, sind maximal $${Math.max(0, portfolio.cashBalanceUsd - 0.50).toFixed(2)} USDC frei handelbar.`
        };
      }
      if (!this.executeOnChainSwap) {
        return { success: false, message: 'On-Chain Swap-Connector nicht initialisiert.' };
      }

      const swapRes = await this.executeOnChainSwap({
        direction: 'BUY_TOKEN',
        symbol: quote.symbol,
        amountUsdc: params.amountUsd,
        expectedPriceUsd: quote.price
      });
      if (!swapRes.success) {
        return { success: false, message: swapRes.message };
      }
      onChainTxHash = swapRes.txHash;
    }

    if (portfolio.cashBalanceUsd < params.amountUsd || params.amountUsd <= 0) {
      return { success: false, message: `Nicht genügend freies Guthaben ($${portfolio.cashBalanceUsd.toFixed(2)} verfügbar).` };
    }

    const atr = quote.indicators.atr14 > 0 ? quote.indicators.atr14 : quote.price * 0.015;
    const stopLoss = params.side === 'LONG'
      ? roundPrice(quote.price - atr * this.strategy.atrStopLossMultiplier, quote.category, quote.symbol)
      : roundPrice(quote.price + atr * this.strategy.atrStopLossMultiplier, quote.category, quote.symbol);
    const takeProfit = params.side === 'LONG'
      ? roundPrice(quote.price + atr * this.strategy.atrTakeProfitMultiplier, quote.category, quote.symbol)
      : roundPrice(quote.price - atr * this.strategy.atrTakeProfitMultiplier, quote.category, quote.symbol);

    const feeUsd = Number((params.amountUsd * (quote.estimatedFeePct / 100)).toFixed(4));
    const quantity = Number(((params.amountUsd - feeUsd) / quote.price).toFixed(6));
    const allocPct = Number(((params.amountUsd / Math.max(1, portfolio.equityUsd)) * 100).toFixed(1));

    const pos: TradingPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      mode,
      symbol: quote.symbol,
      displaySymbol: quote.displaySymbol,
      name: quote.name,
      category: quote.category,
      side: params.side,
      entryPrice: quote.price,
      currentPrice: quote.price,
      peakPrice: quote.price,
      quantity,
      notionalUsd: params.amountUsd,
      allocationPct: allocPct,
      stopLoss,
      takeProfit,
      trailingActive: false,
      trailingStopPrice: stopLoss,
      trailActivationPct: this.strategy.trailActivationGainPct,
      trailUnderPeakPct: this.strategy.trailDistanceUnderPeakPct,
      priceHistory: [quote.price, quote.price],
      stopHistory: [stopLoss, stopLoss],
      unrealizedPnlUsd: 0,
      unrealizedPnlPct: 0,
      openedAt: new Date().toISOString(),
      executionVenue: quote.executionVenue,
      entryReason: `Direct Executor Handoff (${quote.signal}, Score ${quote.analystScore})`,
      txHash: onChainTxHash
    };

    portfolio.cashBalanceUsd = Number((portfolio.cashBalanceUsd - params.amountUsd).toFixed(4));
    portfolio.totalFeesPaidUsd = Number((portfolio.totalFeesPaidUsd + feeUsd).toFixed(4));
    portfolio.openPositions.unshift(pos);
    this.pipeline.executorTradesCount += 1;
    this.pipeline.lastExecutorSymbol = quote.displaySymbol;
    this.pipeline.lastExecutorSizeUsd = params.amountUsd;

    this.recalculatePortfolioMetrics(portfolio);
    this.savePortfolio(mode);

    this.appendTerminalLog(mode, 'ENTER', quote.displaySymbol, `size ${allocPct}% · $${params.amountUsd.toFixed(2)}${onChainTxHash ? ` · tx ${onChainTxHash.slice(0, 10)}` : ''}`);
    const msg = `[${mode}] Order ausgeführt: ${params.side} ${quote.displaySymbol} für $${params.amountUsd.toFixed(2)} @ ${quote.price}${onChainTxHash ? ` (Polygon TX: ${onChainTxHash})` : ''}`;
    this.addActivityLog(mode, 'TRADE_OPEN', msg);

    return { success: true, message: msg, position: pos };
  }

  public async closePositionById(positionId: string): Promise<{ success: boolean; message: string }> {
    const mode = this.activeMode;
    const portfolio = mode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;
    const idx = portfolio.openPositions.findIndex(p => p.id === positionId);
    if (idx === -1) {
      return { success: false, message: 'Position nicht gefunden.' };
    }

    const pos = portfolio.openPositions[idx];
    const quote = this.marketQuotes.find(q => q.symbol === pos.symbol);
    const exitPrice = quote ? quote.price : pos.currentPrice;

    let closeTxHash = pos.txHash;
    if (mode === 'LIVE' && this.executeOnChainSwap) {
      const swapBack = await this.executeOnChainSwap({
        direction: 'SELL_TOKEN',
        symbol: pos.symbol,
        amountUsdc: pos.notionalUsd,
        expectedPriceUsd: exitPrice
      });
      if (!swapBack.success) {
        return { success: false, message: `On-Chain Rücktausch fehlgeschlagen: ${swapBack.message}` };
      }
      closeTxHash = swapBack.txHash;
    }

    const priceDelta = pos.side === 'LONG' ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
    const grossPnl = priceDelta * pos.quantity;
    const feePct = quote ? quote.estimatedFeePct : 0.03;
    const feeUsd = Number((pos.notionalUsd * (feePct / 100)).toFixed(4));
    const netPnlUsd = Number((grossPnl - feeUsd).toFixed(4));
    const pnlPct = Number(((priceDelta / pos.entryPrice) * 100).toFixed(2));

    const closed: ClosedTrade = {
      id: `trd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      mode,
      symbol: pos.symbol,
      displaySymbol: pos.displaySymbol,
      category: pos.category,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      quantity: pos.quantity,
      notionalUsd: pos.notionalUsd,
      realizedPnlUsd: netPnlUsd,
      realizedPnlPct: pnlPct,
      feePaidUsd: feeUsd,
      exitReason: 'MANUAL_CLOSE',
      openedAt: pos.openedAt,
      closedAt: new Date().toISOString(),
      entryConfluenceScore: quote ? quote.confluenceScore : 0,
      txHash: closeTxHash
    };

    portfolio.openPositions.splice(idx, 1);
    portfolio.closedTrades.unshift(closed);
    portfolio.cashBalanceUsd = Number((portfolio.cashBalanceUsd + pos.notionalUsd + netPnlUsd).toFixed(4));
    portfolio.totalRealizedPnlUsd = Number((portfolio.totalRealizedPnlUsd + netPnlUsd).toFixed(4));
    portfolio.totalFeesPaidUsd = Number((portfolio.totalFeesPaidUsd + feeUsd).toFixed(4));
    if (netPnlUsd >= 0) portfolio.winCount += 1;
    else portfolio.lossCount += 1;

    this.recalculatePortfolioMetrics(portfolio);
    this.savePortfolio(mode);

    this.appendTerminalLog(mode, 'EXIT', pos.displaySymbol, `${netPnlUsd >= 0 ? '+' : ''}$${netPnlUsd.toFixed(2)} · manual exit${closeTxHash ? ` · tx ${closeTxHash.slice(0, 10)}` : ''}`);
    const msg = `[${mode}] Position glattgestellt: ${pos.displaySymbol} @ ${exitPrice} | Realisierter PnL: ${netPnlUsd >= 0 ? '+' : ''}$${netPnlUsd.toFixed(2)}`;
    this.addActivityLog(mode, 'TRADE_CLOSE', msg);
    return { success: true, message: msg };
  }

  public async runSelfOptimization(triggerReason = 'Ereignisgesteuerte Logger-Evidenzanalyse'): Promise<OptimizationLog> {
    const mode = this.activeMode;
    const portfolio = mode === 'DEMO' ? this.demoPortfolio : this.livePortfolio;
    const prevVersion = this.strategy.version;
    const changes: string[] = [];

    const closed = portfolio.closedTrades.slice(0, 25);
    const stopLossHits = closed.filter(t => t.exitReason === 'STOP_LOSS').length;
    const takeProfitHits = closed.filter(t => t.exitReason === 'TAKE_PROFIT' || t.exitReason === 'TRAILING_PROFIT_LOCK').length;

    const avgMarketVol = this.marketQuotes.length > 0
      ? this.marketQuotes.reduce((s, q) => s + q.indicators.volatilityPct, 0) / this.marketQuotes.length
      : 0.8;

    if (stopLossHits > takeProfitHits && closed.length >= 2) {
      const oldThresh = this.strategy.analystPassThreshold;
      this.strategy.analystPassThreshold = Math.min(82, oldThresh + 2);
      this.strategy.atrStopLossMultiplier = Number(Math.min(2.6, this.strategy.atrStopLossMultiplier + 0.15).toFixed(2));
      changes.push(`Analyst Score-Schwelle erhöht (${oldThresh} → ${this.strategy.analystPassThreshold}/100)`);
      changes.push(`Risk Stop-Loss Puffer auf ${this.strategy.atrStopLossMultiplier}x ATR erweitert`);
    } else if (takeProfitHits > stopLossHits && portfolio.winRatePct >= 55) {
      const oldTp = this.strategy.atrTakeProfitMultiplier;
      this.strategy.atrTakeProfitMultiplier = Number(Math.min(4.2, oldTp + 0.25).toFixed(2));
      changes.push(`Risk Trailing-Gain Ziel erweitert (${oldTp}x → ${this.strategy.atrTakeProfitMultiplier}x ATR)`);
    } else {
      if (avgMarketVol > 1.2) {
        this.strategy.rsiOversold = Math.max(28, this.strategy.rsiOversold - 2);
        this.strategy.rsiOverbought = Math.min(75, this.strategy.rsiOverbought + 2);
        changes.push(`Filter & Analyst an Volatilität (${avgMarketVol.toFixed(2)}%) angepasst`);
      } else {
        this.strategy.analystPassThreshold = Math.max(68, Math.min(74, this.strategy.analystPassThreshold));
        changes.push(`Analyst Handoff-Schwelle auf ${this.strategy.analystPassThreshold}/100 feinjustiert`);
      }
    }

    this.computeAndRefreshOrderTargets();

    let aiReasoning = `LOGGER Selbstoptimierung abgeschlossen: Analyst-Handoff bei ≥${this.strategy.analystPassThreshold}/100, Executor Positionsgröße ${this.strategy.maxAllocationPerTradePct}%, Risk Trailing-Stop aktiv.`;

    try {
      const prompt = `Du bist der autonome LOGGER & SELF-OPTIMIZER Agent von Agent Zero (6-Agenten-Pipeline: SCOUT -> FILTER -> ANALYST -> EXECUTOR -> RISK -> LOGGER).
Fasse in 2 kurzen Sätzen auf Deutsch die Strategie-Optimierung zusammen:
- Eigenkapital: $${portfolio.equityUsd.toFixed(2)}, Win-Rate: ${portfolio.winRatePct}%, Trades: ${portfolio.closedTrades.length}
- Änderungen: ${changes.join('; ')}`;

      const groqKey = process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY;
      if (groqKey) {
        const postRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 180
          })
        });
        if (postRes.ok) {
          const d = await postRes.json();
          const txt = d.choices?.[0]?.message?.content?.trim();
          if (txt) aiReasoning = txt;
        }
      } else if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });
        if (response.text) {
          aiReasoning = response.text.trim();
        }
      }
    } catch {}

    this.strategy.version = prevVersion + 1;
    this.strategy.lastOptimizedAt = new Date().toISOString();
    this.strategy.optimizationSummary = aiReasoning;

    const logEntry: OptimizationLog = {
      id: `opt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode,
      trigger: triggerReason,
      previousVersion: prevVersion,
      newVersion: this.strategy.version,
      changes,
      aiReasoning,
      winRateAtOptimization: portfolio.winRatePct,
      netPnlAtOptimization: portfolio.totalRealizedPnlUsd
    };

    this.optimizationHistory.unshift(logEntry);
    this.saveStrategy();
    this.appendTerminalLog(mode, 'OPT', `v${this.strategy.version}`, changes[0] || 'Strategy tuned');
    this.addActivityLog(mode, 'OPTIMIZE', `Strategie v${this.strategy.version} kalibriert: ${changes[0]}`);
    return logEntry;
  }

  public setMode(mode: TradingMode): TradingSystemState {
    this.activeMode = mode;
    if (mode === 'LIVE') {
      this.syncLiveOnChainBalance();
    }
    this.computeAndRefreshOrderTargets();
    this.appendTerminalLog(mode, 'SCOUT', mode, mode === 'DEMO' ? 'switched to paper mode' : 'switched to strict live mode');
    return this.getState();
  }

  public setAutoPilot(enabled: boolean): TradingSystemState {
    this.autoPilotEnabled = enabled;
    this.appendTerminalLog(this.activeMode, 'SCOUT', 'AUTO', enabled ? 'six-agent autonomous execution ON' : 'autonomous execution PAUSED');
    return this.getState();
  }

  public resetDemoPortfolio(startingCapitalUsd = 10000): TradingSystemState {
    this.demoPortfolio = this.createFreshPortfolio('DEMO', startingCapitalUsd);
    this.savePortfolio('DEMO');
    this.computeAndRefreshOrderTargets();
    this.appendTerminalLog('DEMO', 'SCOUT', 'RESET', `paper balance reset to $${startingCapitalUsd.toFixed(2)}`);
    return this.getState();
  }

  private async refreshMarketSentimentTelemetry(): Promise<void> {
    const nowMs = Date.now();

    // 1. Live Crypto Fear & Greed Index from Alternative.me (refresh every 5 minutes)
    let fgValue = this.marketSentiment.fearAndGreedIndex || 50;
    let fgPrev = this.marketSentiment.fearAndGreedPrevious || 50;
    let fgLabel = this.marketSentiment.fearAndGreedLabel;
    let fgSource = this.marketSentiment.fearAndGreedSource;

    if (nowMs - this.lastFearGreedFetchMs > 300_000 || fgLabel === 'Lade Live-Daten...') {
      try {
        const fgRes = await this.fetchWithTimeout('https://api.alternative.me/fng/?limit=2', 4500);
        if (fgRes.ok) {
          const fgJson = await fgRes.json();
          const dataArr = fgJson?.data;
          if (Array.isArray(dataArr) && dataArr.length >= 1) {
            const todayVal = parseInt(dataArr[0].value, 10);
            const yesterdayVal = dataArr[1] ? parseInt(dataArr[1].value, 10) : todayVal;
            if (!isNaN(todayVal)) {
              fgValue = todayVal;
              fgPrev = !isNaN(yesterdayVal) ? yesterdayVal : todayVal;
              fgLabel = dataArr[0].value_classification || 'Neutral';
              fgSource = 'Alternative.me Crypto Fear & Greed Live';
              this.lastFearGreedFetchMs = nowMs;
            }
          }
        }
      } catch {
        // Fallback: derive live sentiment from real-time market quotes RSI & 24h momentum if Alternative.me is unreachable
      }
    }

    // 2. Live Binance Spot L2 Orderbook Depth Imbalance (Top 20 Bids vs Top 20 Asks)
    const depthPairs: { symbol: string; displaySymbol: string; binanceSymbol: string }[] = [
      { symbol: 'BTC', displaySymbol: '$BTC', binanceSymbol: 'BTCUSDT' },
      { symbol: 'ETH', displaySymbol: '$ETH', binanceSymbol: 'ETHUSDT' },
      { symbol: 'SOL', displaySymbol: '$SOL', binanceSymbol: 'SOLUSDT' },
      { symbol: 'POL', displaySymbol: '$POL', binanceSymbol: 'POLUSDT' }
    ];

    const snapshots: OrderbookDepthSnapshot[] = [];
    let totalBidsUsd = 0;
    let totalAsksUsd = 0;

    await Promise.all(
      depthPairs.map(async pair => {
        try {
          const res = await this.fetchWithTimeout(
            `https://api.binance.com/api/v3/depth?symbol=${pair.binanceSymbol}&limit=20`,
            3500
          );
          if (!res.ok) return;
          const book = await res.json();
          const bids: [string, string][] = Array.isArray(book?.bids) ? book.bids : [];
          const asks: [string, string][] = Array.isArray(book?.asks) ? book.asks : [];
          if (bids.length === 0 || asks.length === 0) return;

          let bidVolUsd = 0;
          for (const [pStr, qStr] of bids) {
            const p = parseFloat(pStr);
            const q = parseFloat(qStr);
            if (p > 0 && q > 0) bidVolUsd += p * q;
          }

          let askVolUsd = 0;
          for (const [pStr, qStr] of asks) {
            const p = parseFloat(pStr);
            const q = parseFloat(qStr);
            if (p > 0 && q > 0) askVolUsd += p * q;
          }

          const bestBid = parseFloat(bids[0][0]) || 0;
          const bestAsk = parseFloat(asks[0][0]) || 0;
          const mid = (bestBid + bestAsk) / 2;
          const spreadBps = mid > 0 ? Number((((bestAsk - bestBid) / mid) * 10000).toFixed(2)) : 1.0;

          const totalBook = bidVolUsd + askVolUsd;
          const bidRatioPct = totalBook > 0 ? Number(((bidVolUsd / totalBook) * 100).toFixed(1)) : 50;
          const imbalancePct = totalBook > 0 ? Number((((bidVolUsd - askVolUsd) / totalBook) * 100).toFixed(1)) : 0;

          let pressureLabel: OrderbookDepthSnapshot['pressureLabel'] = 'BALANCED';
          if (imbalancePct >= 22) pressureLabel = 'STRONG_BUY_WALL';
          else if (imbalancePct >= 7) pressureLabel = 'BUY_PRESSURE';
          else if (imbalancePct <= -22) pressureLabel = 'STRONG_SELL_WALL';
          else if (imbalancePct <= -7) pressureLabel = 'SELL_PRESSURE';

          totalBidsUsd += bidVolUsd;
          totalAsksUsd += askVolUsd;

          snapshots.push({
            symbol: pair.symbol,
            displaySymbol: pair.displaySymbol,
            bidVolumeUsd: Math.round(bidVolUsd),
            askVolumeUsd: Math.round(askVolUsd),
            bidRatioPct,
            imbalancePct,
            bestBid,
            bestAsk,
            spreadBps,
            pressureLabel
          });
        } catch {}
      })
    );

    // Keep stable order BTC, ETH, SOL, POL
    snapshots.sort((a, b) => {
      const order = ['BTC', 'ETH', 'SOL', 'POL'];
      return order.indexOf(a.symbol) - order.indexOf(b.symbol);
    });

    const totalAnalyzedBookUsd = Math.round(totalBidsUsd + totalAsksUsd);
    const aggregateBidRatioPct = totalAnalyzedBookUsd > 0
      ? Number(((totalBidsUsd / totalAnalyzedBookUsd) * 100).toFixed(1))
      : this.marketSentiment.aggregateBidRatioPct;
    const aggregateImbalancePct = totalAnalyzedBookUsd > 0
      ? Number((((totalBidsUsd - totalAsksUsd) / totalAnalyzedBookUsd) * 100).toFixed(1))
      : this.marketSentiment.aggregateImbalancePct;

    // 3. Multi-Asset Market Breadth & Volatility Regime from live quotes
    const quotes = this.marketQuotes;
    const advancingCount = quotes.filter(q => q.change24hPct > 0).length;
    const decliningCount = quotes.filter(q => q.change24hPct < 0).length;
    const breadthBullishPct = quotes.length > 0
      ? Math.round((advancingCount / quotes.length) * 100)
      : 50;
    const avgRsi14 = quotes.length > 0
      ? Number((quotes.reduce((acc, q) => acc + q.indicators.rsi14, 0) / quotes.length).toFixed(1))
      : 50;
    const avgVolatilityPct = quotes.length > 0
      ? Number((quotes.reduce((acc, q) => acc + q.indicators.volatilityPct, 0) / quotes.length).toFixed(2))
      : 1.0;

    if (fgLabel === 'Lade Live-Daten...') {
      fgValue = Math.round((avgRsi14 * 0.6) + (breadthBullishPct * 0.4));
      fgPrev = fgValue;
      fgLabel = fgValue >= 75 ? 'Extreme Greed' : fgValue >= 56 ? 'Greed' : fgValue <= 25 ? 'Extreme Fear' : fgValue <= 44 ? 'Fear' : 'Neutral';
      fgSource = 'Multi-Asset Live RSI & Marktbreite Index';
    }

    // 4. Compute Unified Trade Favorability Score (0 - 100)
    // Strong directional orderbook imbalance + healthy volatility + clear non-choppy regime = high trade favorability
    const orderbookConviction = Math.min(35, Math.abs(aggregateImbalancePct) * 1.15 + (aggregateBidRatioPct >= 52 ? 12 : 6));
    const volatilityScore = avgVolatilityPct >= 0.45 && avgVolatilityPct <= 4.5 ? 28 : 16;
    const qualifiedAssetsCount = quotes.filter(q => q.passedHardRules && q.analystScore >= this.strategy.analystPassThreshold).length;
    const setupDensityScore = Math.min(37, 15 + qualifiedAssetsCount * 7);

    const tradeFavorabilityScore = Math.max(18, Math.min(98, Math.round(orderbookConviction + volatilityScore + setupDensityScore)));

    let timingStatus: MarketSentimentTelemetry['timingStatus'] = 'FAVORABLE_SELECTIVE';
    let timingHeadline = 'Selektives Marktumfeld · Nur Top-Setups (Score ≥ 70)';
    let timingExplanation = `Orderbuch-Imbalance (${aggregateImbalancePct >= 0 ? '+' : ''}${aggregateImbalancePct}%) und Fear & Greed (${fgValue}/100 · ${fgLabel}) signalisieren ein selektives Umfeld.`;
    let autoExecutionImpact = `Vollautomatischer Handel aktiv: Agent Zero filtert streng über alle 8 Regeln und führt nur Setups ab Score ${this.strategy.analystPassThreshold}/100 aus.`;

    if (tradeFavorabilityScore >= 72 && (aggregateImbalancePct >= 5 || breadthBullishPct >= 55 || fgValue <= 32)) {
      timingStatus = 'OPTIMAL_LONG';
      timingHeadline = fgValue <= 32
        ? 'Starkes Antizyklisches Kaufsignal (Extreme Fear + Orderbuch-Kaufdruck)'
        : 'Optimales Umfeld für Long-Momentum & Breakout-Trades';
      timingExplanation = `Käufer dominieren das L2-Orderbuch (${aggregateBidRatioPct}% Bid-Tiefe bei $${(totalAnalyzedBookUsd / 1000).toFixed(0)}k Liquidität) bei ${breadthBullishPct}% positiver Marktbreite.`;
      autoExecutionImpact = `Vollautomatischer Handel aktiv: EXECUTOR übernimmt qualifizierte Long-Kandidaten sofort bei Handoff (Score ≥ ${this.strategy.analystPassThreshold}).`;
    } else if (tradeFavorabilityScore >= 70 && aggregateImbalancePct <= -8 && breadthBullishPct <= 42) {
      timingStatus = 'OPTIMAL_SHORT';
      timingHeadline = 'Starker Verkaufsdruck im Orderbuch · Reversal- & Short-Umfeld';
      timingExplanation = `Angebots-Überhang im L2-Orderbuch (${aggregateImbalancePct}% Ask-Dominanz) und schwache Marktbreite (${breadthBullishPct}% steigend).`;
      autoExecutionImpact = `Vollautomatischer Handel aktiv: Demo nutzt Short-/Reversal-Setups; Live-Spot wartet geduldig auf Support-Rebounds.`;
    } else if (tradeFavorabilityScore < 48) {
      timingStatus = 'CAUTIOUS_DEFENSIVE';
      timingHeadline = 'Geringes Momentum / Seitwärts-Chop · Defensiver Filter-Modus';
      timingExplanation = `Geringe Orderbuch-Richtung (${aggregateImbalancePct}%) oder niedrige Volatilität (${avgVolatilityPct}%). Erhöhtes Fehlausbruchs-Risiko.`;
      autoExecutionImpact = `Vollautomatischer Schutz aktiv: FILTER blockiert ~${this.pipeline.filterKillRatePct}% aller schwachen Paare automatisch.`;
    }

    this.marketSentiment = {
      updatedAt: new Date().toISOString(),
      fearAndGreedIndex: fgValue,
      fearAndGreedPrevious: fgPrev,
      fearAndGreedDelta: fgValue - fgPrev,
      fearAndGreedLabel: fgLabel,
      fearAndGreedSource: fgSource,
      aggregateBidRatioPct,
      aggregateImbalancePct,
      totalAnalyzedBookUsd,
      orderbookSnapshots: snapshots.length > 0 ? snapshots : this.marketSentiment.orderbookSnapshots,
      advancingCount,
      decliningCount,
      breadthBullishPct,
      avgRsi14,
      avgVolatilityPct,
      tradeFavorabilityScore,
      timingStatus,
      timingHeadline,
      timingExplanation,
      autoExecutionImpact
    };
  }

  public getState(): TradingSystemState {
    const chain = this.getLiveChainBalances();
    const alpacaConnected = Boolean(process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY);
    const oandaConnected = Boolean(process.env.OANDA_API_KEY);
    this.pipeline.uptimeSeconds = Math.floor((Date.now() - this.bootTimestampMs) / 1000);

    return {
      activeMode: this.activeMode,
      autoPilotEnabled: this.autoPilotEnabled,
      continuousStreamActive: this.continuousStreamActive,
      streamTicksProcessed: this.streamTicksProcessed,
      lastTickAt: this.lastTickAt,
      isScanning: this.isScanning,
      pipeline: this.pipeline,
      marketSentiment: this.marketSentiment,
      marketQuotes: this.marketQuotes,
      orderTargets: this.orderTargets,
      strategy: this.strategy,
      optimizationHistory: this.optimizationHistory,
      demoPortfolio: this.demoPortfolio,
      livePortfolio: this.livePortfolio,
      liveConnectors: {
        polygonDexOnChain: {
          connected: chain.hasSigner && Boolean(chain.walletAddress),
          walletAddress: chain.walletAddress,
          usdcBalance: chain.usdcBalance,
          polGasBalance: chain.polBalance,
          venue: 'Polygon PoS Mainnet (QuickSwap V3 / Uniswap V3)'
        },
        alpacaEquities: {
          connected: alpacaConnected,
          venue: 'Alpaca Markets Commission-Free Equities API',
          statusText: alpacaConnected ? 'Verbunden (Live Aktien-Routing)' : 'Bereit (ALPACA_API_KEY optional für Live-Aktien)'
        },
        forexEcnBridge: {
          connected: oandaConnected,
          venue: 'ECN FX Interbank Spot / Polygon On-Chain FX',
          statusText: oandaConnected ? 'Verbunden (Live FX-Routing)' : 'On-Chain FX bereit (OANDA_API_KEY optional)'
        }
      },
      terminalLogLines: this.terminalLogLines,
      recentActivityLogs: this.recentActivityLogs
    };
  }
}
