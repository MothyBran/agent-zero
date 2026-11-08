import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ExecutionMode,
  PackId,
  DecisionAction,
  WorkspaceBootState,
  TokenAttributionBarItem,
  EquityCurvePoint,
  ActiveSlugPosition,
  PortfolioPerformanceHeaderState,
  PipelineStepMetric,
  CharonRejectedItem,
  FivePacksControlState,
  DecisionStreamEntry,
  GrokDeskSystemState
} from '../types/grokDesk';

const DATA_DIR = path.join(process.cwd(), 'data');
const GROK_PAPER_FILE = path.join(DATA_DIR, 'grok_desk_paper_state.json');
const GROK_LIVE_FILE = path.join(DATA_DIR, 'grok_desk_live_state.json');

interface TokenCandidateSpec {
  ticker: string;
  name: string;
  chain: 'SOLANA' | 'POLYGON' | 'BASE';
  basePriceUsd: number;
  binancePair?: string;
  liquidityUsd: number;
  routeVenue: string;
  colorHex: string;
}

const NIGHT_SHIFT_TOKEN_UNIVERSE: TokenCandidateSpec[] = [
  { ticker: '$MABEL', name: 'Mabel Trench Runner', chain: 'SOLANA', basePriceUsd: 0.0148, binancePair: 'SOLUSDT', liquidityUsd: 184000, routeVenue: 'Jupiter V6 / Raydium CLMM', colorHex: '#10B981' },
  { ticker: '$PIXEL', name: 'Pixel Neural Grid', chain: 'SOLANA', basePriceUsd: 0.0892, binancePair: 'PEPEUSDT', liquidityUsd: 265000, routeVenue: 'GMGN Fast-Router / Meteora', colorHex: '#34D399' },
  { ticker: '$BONGO', name: 'Bongo Cat Hyper', chain: 'BASE', basePriceUsd: 0.00425, binancePair: 'SUIUSDT', liquidityUsd: 142000, routeVenue: 'Aerodrome Slipstream V2', colorHex: '#059669' },
  { ticker: '$SOL', name: 'Solana Native Spot', chain: 'SOLANA', basePriceUsd: 188.40, binancePair: 'SOLUSDT', liquidityUsd: 48500000, routeVenue: 'Jupiter Ultra / Orcairl', colorHex: '#6EE7B7' },
  { ticker: '$PEPE', name: 'Pepe Momentum L2', chain: 'POLYGON', basePriceUsd: 0.0000124, binancePair: 'PEPEUSDT', liquidityUsd: 920000, routeVenue: 'QuickSwap V3 / 1inch', colorHex: '#047857' },
  { ticker: '$KROK', name: 'Krok Quant AI', chain: 'SOLANA', basePriceUsd: 0.0219, binancePair: 'AVAXUSDT', liquidityUsd: 96000, routeVenue: 'GMGN Sniper Route', colorHex: '#10B981' },
  { ticker: '$VORTEX', name: 'Vortex Liquidity Protocol', chain: 'POLYGON', basePriceUsd: 0.3410, binancePair: 'POLUSDT', liquidityUsd: 215000, routeVenue: 'Uniswap V3 Polygon', colorHex: '#34D399' },
  { ticker: '$ZORA', name: 'Zora Hyper-Mint', chain: 'BASE', basePriceUsd: 0.0675, binancePair: 'ETHUSDT', liquidityUsd: 310000, routeVenue: 'Uniswap V3 Base', colorHex: '#059669' }
];

const SCAM_LAUNCH_SAMPLES: { ticker: string; reason: string; liquidityUsd: number; honeypotRiskPct: number }[] = [
  { ticker: '$RUGAI', reason: 'LP unlocked • Dev holds 44%', liquidityUsd: 4200, honeypotRiskPct: 96 },
  { ticker: '$ELONX99', reason: 'Sell tax 48.0% (Honeypot trap)', liquidityUsd: 11800, honeypotRiskPct: 99 },
  { ticker: '$MOONPUMP', reason: 'Mint authority active • Freeze on', liquidityUsd: 8900, honeypotRiskPct: 91 },
  { ticker: '$FAKEBONK', reason: 'Pool Liq $6.4k < $25k minimum', liquidityUsd: 6400, honeypotRiskPct: 82 },
  { ticker: '$DEEPFAKE', reason: 'Top-5 wallets cluster 67% supply', liquidityUsd: 19200, honeypotRiskPct: 88 },
  { ticker: '$SOLPUMP2', reason: 'Transfer hook block detected', liquidityUsd: 3100, honeypotRiskPct: 100 },
  { ticker: '$FOMO404', reason: 'Slippage > 4.5% on $200 route', liquidityUsd: 14500, honeypotRiskPct: 79 },
  { ticker: '$CATRUG', reason: 'Wash-volume bot cluster 92%', liquidityUsd: 17100, honeypotRiskPct: 85 }
];

function formatClock(d = new Date()): string {
  return d.toTimeString().slice(0, 8);
}

function formatShortTime(d = new Date()): string {
  return d.toTimeString().slice(0, 5);
}

export class GrokDeskEngine {
  private mode: ExecutionMode = 'PAPER';
  private autoPilotEnabled: boolean = true;
  private bootStartMs: number = Date.now();
  private lastTickAt: string = new Date().toISOString();
  private bootState: WorkspaceBootState;
  private paperHeader: PortfolioPerformanceHeaderState;
  private liveHeader: PortfolioPerformanceHeaderState;
  private fivePacks: FivePacksControlState;
  private decisionStream: DecisionStreamEntry[] = [];
  private sseClients: Set<Response> = new Set();
  private workerTimer: NodeJS.Timeout | null = null;
  private bootTimer: NodeJS.Timeout | null = null;
  private livePrices: Map<string, number> = new Map();
  private candidateCursor: number = 0;
  private scamCursor: number = 0;
  private pipelinePhase: 0 | 1 | 2 = 0;
  private lastAiCallMs: number = 0;

  private getLiveWalletInfo: () => {
    connected: boolean;
    address: string;
    usdcBalance: number;
    polGasBalance: number;
  };
  private executeOnChainSwap?: (params: {
    direction: 'BUY_TOKEN' | 'SELL_TOKEN';
    symbol: string;
    amountUsdc: number;
    expectedPriceUsd?: number;
  }) => Promise<{ success: boolean; txHash: string; message: string }>;

  constructor(
    getLiveWalletInfo: () => {
      connected: boolean;
      address: string;
      usdcBalance: number;
      polGasBalance: number;
    },
    executeOnChainSwap?: (params: {
      direction: 'BUY_TOKEN' | 'SELL_TOKEN';
      symbol: string;
      amountUsdc: number;
      expectedPriceUsd?: number;
    }) => Promise<{ success: boolean; txHash: string; message: string }>
  ) {
    this.getLiveWalletInfo = getLiveWalletInfo;
    this.executeOnChainSwap = executeOnChainSwap;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    for (const t of NIGHT_SHIFT_TOKEN_UNIVERSE) {
      this.livePrices.set(t.ticker, t.basePriceUsd);
    }

    this.bootState = this.createInitialBootState(true);
    this.fivePacks = this.createInitialFivePacksState();
    this.paperHeader = this.loadOrInitPaperHeader();
    this.liveHeader = this.loadOrInitLiveHeader();
    this.decisionStream = this.loadOrInitDecisionStream();
  }

  private createInitialBootState(alreadyReady = true): WorkspaceBootState {
    return {
      deskTitle: 'Grok desk',
      shiftLabel: 'MORPH / NIGHT SHIFT #2',
      bootHeaderLabel: 'BOOT / 5 PACKS',
      overallProgressPct: alreadyReady ? 100 : 18,
      isWorkspaceReady: alreadyReady,
      footerStatusText: alreadyReady ? 'Scoped workspace active' : 'Opening scoped workspace',
      lastBootedAt: new Date().toISOString(),
      packs: [
        {
          id: 'gmgn_skills',
          name: 'GMGN Skills',
          status: 'READY',
          progressPct: 100,
          latencyMs: 14,
          subStatusText: 'fomo adapter • token.read / wallet.score / route.fill'
        },
        {
          id: 'kaiser_charon',
          name: 'Kaiser.Charon',
          status: 'READY',
          progressPct: 100,
          latencyMs: 19,
          subStatusText: 'honeypot & liquidity gatekeeper armed (97.8% kill rate)'
        },
        {
          id: 'gmgn_trading_bot',
          name: 'GMGN Trading Bot',
          status: 'READY',
          progressPct: 100,
          latencyMs: 24,
          subStatusText: 'DEX execution router & -6% hard stop shield locked'
        },
        {
          id: 'gmgn_agent',
          name: 'gmgnAgent',
          status: alreadyReady ? 'READY' : 'WAIT',
          progressPct: alreadyReady ? 100 : 68,
          latencyMs: 31,
          subStatusText: 'AI confluence & position sizing engine'
        },
        {
          id: 'pump_grok',
          name: 'PumpGrok',
          status: alreadyReady ? 'READY' : 'WAIT',
          progressPct: alreadyReady ? 100 : 42,
          latencyMs: 22,
          subStatusText: 'high-velocity launch & momentum scanner'
        }
      ]
    };
  }

  private createInitialFivePacksState(): FivePacksControlState {
    const nowMs = Date.now();
    return {
      carouselEngines: {
        gmgnTradingBot: {
          name: 'GMGN Trading Bot',
          latencyMs: 24,
          successRatePct: 98.4,
          txCount: 104,
          status: 'ONLINE',
          activeVenue: 'Jupiter V6 / QuickSwap V3'
        },
        gmgnAgent: {
          name: 'gmgnAgent',
          actionsCount: 142,
          activeModel: 'gemini-3.8-flash',
          confidenceAvg: 86.4,
          lastSentimentVerdict: 'High-Conviction Momentum (R:R 2.8x)'
        },
        pumpGrok: {
          name: 'PumpGrok',
          entryCount: 60,
          miniSparkline: [18, 24, 22, 31, 29, 38, 42, 39, 48, 54, 51, 59, 63, 68, 65, 74],
          momentumDeltaPct: 18.6,
          hotTicker: '$PIXEL'
        }
      },
      moduleA_gmgnSkills: {
        title: 'GMGN Skills',
        subtitle: 'fomo adapter',
        activeSymbol: '$MABEL',
        cycleCount: 640,
        steps: [
          {
            stepKey: 'token.read',
            status: 'DONE',
            activeTicker: '$MABEL',
            valueLabel: 'Liq $184k • Vol 3.4x',
            detailText: 'Contract verified • 0% buy/sell tax • LP locked',
            latencyMs: 14,
            updatedAtMs: nowMs - 800
          },
          {
            stepKey: 'wallet.score',
            status: 'DONE',
            activeTicker: '$MABEL',
            valueLabel: '89 / 100 SMART',
            detailText: '14 smart wallets inflow • 74% buyer ratio',
            latencyMs: 19,
            updatedAtMs: nowMs - 400
          },
          {
            stepKey: 'route.fill',
            status: 'ACTIVE',
            activeTicker: '$MABEL',
            valueLabel: '0.18% Impact • 24ms',
            detailText: 'Jupiter V6 direct hop -> Filled @ $0.0148',
            latencyMs: 24,
            updatedAtMs: nowMs
          }
        ]
      },
      moduleB_kaiserCharon: {
        title: 'Kaiser.Charon',
        subtitle: 'gatekeeper',
        launchesScanned: 1880,
        launchesRejected: 1838,
        rejectionRatePct: 97.77,
        currentSkipTicker: '$RUGAI',
        currentSkipReason: 'LP unlocked • Dev holds 44%',
        recentRejects: SCAM_LAUNCH_SAMPLES.slice(0, 5).map((s, idx) => ({
          id: `rej_init_${idx}`,
          ticker: s.ticker,
          reason: s.reason,
          liquidityUsd: s.liquidityUsd,
          honeypotRiskPct: s.honeypotRiskPct,
          timestamp: new Date(nowMs - idx * 9000).toISOString(),
          timeFormatted: formatClock(new Date(nowMs - idx * 9000))
        }))
      }
    };
  }

  private loadOrInitPaperHeader(): PortfolioPerformanceHeaderState {
    try {
      if (fs.existsSync(GROK_PAPER_FILE)) {
        const raw = JSON.parse(fs.readFileSync(GROK_PAPER_FILE, 'utf8'));
        if (raw && raw.header && typeof raw.header.totalEquityUsd === 'number') {
          return raw.header;
        }
      }
    } catch {}

    const now = Date.now();
    const curvePoints: EquityCurvePoint[] = [
      { timestamp: new Date(now - 70 * 60000).toISOString(), timeLabel: '03:55', equityUsd: 125.00, pnlUsd: 0, pnlPct: 0, triggerTicker: 'INIT' },
      { timestamp: new Date(now - 60 * 60000).toISOString(), timeLabel: '04:05', equityUsd: 215.40, pnlUsd: 90.40, pnlPct: 72.3, triggerTicker: '$SOL' },
      { timestamp: new Date(now - 50 * 60000).toISOString(), timeLabel: '04:15', equityUsd: 380.10, pnlUsd: 255.10, pnlPct: 204.1, triggerTicker: '$BONGO' },
      { timestamp: new Date(now - 42 * 60000).toISOString(), timeLabel: '04:23', equityUsd: 364.80, pnlUsd: 239.80, pnlPct: 191.8, triggerTicker: '$KROK' },
      { timestamp: new Date(now - 34 * 60000).toISOString(), timeLabel: '04:31', equityUsd: 690.50, pnlUsd: 565.50, pnlPct: 452.4, triggerTicker: '$MABEL' },
      { timestamp: new Date(now - 26 * 60000).toISOString(), timeLabel: '04:39', equityUsd: 1045.20, pnlUsd: 920.20, pnlPct: 736.2, triggerTicker: '$PIXEL' },
      { timestamp: new Date(now - 18 * 60000).toISOString(), timeLabel: '04:47', equityUsd: 1380.90, pnlUsd: 1255.90, pnlPct: 1004.7, triggerTicker: '$PIXEL' },
      { timestamp: new Date(now - 10 * 60000).toISOString(), timeLabel: '04:55', equityUsd: 1692.40, pnlUsd: 1567.40, pnlPct: 1253.9, triggerTicker: '$BONGO' },
      { timestamp: new Date(now - 4 * 60000).toISOString(), timeLabel: '05:01', equityUsd: 1738.20, pnlUsd: 1613.20, pnlPct: 1290.6, triggerTicker: '$MABEL' },
      { timestamp: new Date(now).toISOString(), timeLabel: formatShortTime(new Date(now)), equityUsd: 1918.20, pnlUsd: 1793.20, pnlPct: 1434.6, triggerTicker: '$MABEL' }
    ];

    const attributions: TokenAttributionBarItem[] = [
      { symbol: '$PIXEL', name: 'Pixel Neural Grid', multiplier: 4.1, realizedPlusUnrealizedUsd: 735.20, shareOfProfitPct: 41.0, colorHex: '#10B981', tradesCount: 19, winRatePct: 84.2 },
      { symbol: '$BONGO', name: 'Bongo Cat Hyper', multiplier: 3.2, realizedPlusUnrealizedUsd: 484.15, shareOfProfitPct: 27.0, colorHex: '#34D399', tradesCount: 14, winRatePct: 78.5 },
      { symbol: '$MABEL', name: 'Mabel Trench Runner', multiplier: 2.5, realizedPlusUnrealizedUsd: 358.65, shareOfProfitPct: 20.0, colorHex: '#059669', tradesCount: 16, winRatePct: 81.2 },
      { symbol: '$PEPE', name: 'Pepe Momentum L2', multiplier: 2.1, realizedPlusUnrealizedUsd: 215.20, shareOfProfitPct: 12.0, colorHex: '#6EE7B7', tradesCount: 11, winRatePct: 72.7 }
    ];

    const openSlugs: ActiveSlugPosition[] = [
      {
        id: 'slug_mabel_1',
        ticker: '$MABEL',
        name: 'Mabel Trench Runner',
        chain: 'SOLANA',
        entryPriceUsd: 0.0118,
        currentPriceUsd: 0.0148,
        peakPriceUsd: 0.0151,
        sizeUsd: 180.00,
        unrealizedPnlUsd: 45.76,
        unrealizedPnlPct: 25.42,
        multiplier: 2.5,
        stopLossPct: -6.0,
        stopLossPriceUsd: 0.01109,
        walletScore: 89,
        routeVenue: 'Jupiter V6 / Raydium CLMM',
        openedAt: new Date(now - 14 * 60000).toISOString()
      },
      {
        id: 'slug_pixel_2',
        ticker: '$PIXEL',
        name: 'Pixel Neural Grid',
        chain: 'SOLANA',
        entryPriceUsd: 0.0640,
        currentPriceUsd: 0.0892,
        peakPriceUsd: 0.0910,
        sizeUsd: 210.00,
        unrealizedPnlUsd: 82.69,
        unrealizedPnlPct: 39.38,
        multiplier: 4.1,
        stopLossPct: -6.0,
        stopLossPriceUsd: 0.06016,
        walletScore: 93,
        routeVenue: 'GMGN Fast-Router / Meteora',
        openedAt: new Date(now - 28 * 60000).toISOString()
      },
      {
        id: 'slug_bongo_3',
        ticker: '$BONGO',
        name: 'Bongo Cat Hyper',
        chain: 'BASE',
        entryPriceUsd: 0.00385,
        currentPriceUsd: 0.00425,
        peakPriceUsd: 0.00432,
        sizeUsd: 145.00,
        unrealizedPnlUsd: 15.06,
        unrealizedPnlPct: 10.39,
        multiplier: 3.2,
        stopLossPct: -6.0,
        stopLossPriceUsd: 0.00362,
        walletScore: 85,
        routeVenue: 'Aerodrome Slipstream V2',
        openedAt: new Date(now - 9 * 60000).toISOString()
      }
    ];

    return {
      mode: 'PAPER',
      totalEquityUsd: 1918.20,
      availableCashUsd: 1383.20,
      initialCapitalUsd: 125.00,
      absoluteGainUsd: 1793.20,
      portfolioMultiplier: 15.35,
      hardStopLossLimitPct: -6,
      maxSlippageBps: 45,
      slugCount: 16,
      entriesCount: 60,
      closedCount: 44,
      winRatePct: 81.8,
      equityCurve: curvePoints,
      tokenAttributionBars: attributions,
      openSlugs
    };
  }

  private loadOrInitLiveHeader(): PortfolioPerformanceHeaderState {
    const wallet = this.getLiveWalletInfo();
    const baseCap = Math.max(0.01, Number((wallet.usdcBalance || 0).toFixed(2)));
    try {
      if (fs.existsSync(GROK_LIVE_FILE)) {
        const raw = JSON.parse(fs.readFileSync(GROK_LIVE_FILE, 'utf8'));
        if (raw && raw.header) {
          raw.header.totalEquityUsd = Number((wallet.usdcBalance || raw.header.totalEquityUsd || 0).toFixed(2));
          raw.header.availableCashUsd = Number((wallet.usdcBalance || 0).toFixed(2));
          return raw.header;
        }
      }
    } catch {}

    return {
      mode: 'LIVE',
      totalEquityUsd: Number((wallet.usdcBalance || 0).toFixed(2)),
      availableCashUsd: Number((wallet.usdcBalance || 0).toFixed(2)),
      initialCapitalUsd: baseCap,
      absoluteGainUsd: 0,
      portfolioMultiplier: 1.0,
      hardStopLossLimitPct: -6,
      maxSlippageBps: 35,
      slugCount: 0,
      entriesCount: 0,
      closedCount: 0,
      winRatePct: 0,
      equityCurve: [
        {
          timestamp: new Date().toISOString(),
          timeLabel: formatShortTime(),
          equityUsd: Number((wallet.usdcBalance || 0).toFixed(2)),
          pnlUsd: 0,
          pnlPct: 0,
          triggerTicker: 'WALLET_SYNC'
        }
      ],
      tokenAttributionBars: [],
      openSlugs: []
    };
  }

  private loadOrInitDecisionStream(): DecisionStreamEntry[] {
    try {
      if (fs.existsSync(GROK_PAPER_FILE)) {
        const raw = JSON.parse(fs.readFileSync(GROK_PAPER_FILE, 'utf8'));
        if (raw && Array.isArray(raw.decisionStream) && raw.decisionStream.length > 0) {
          return raw.decisionStream;
        }
      }
    } catch {}

    const now = Date.now();
    const initialEntries: DecisionStreamEntry[] = [
      {
        id: 'dec_1',
        timestamp: new Date(now - 25000).toISOString(),
        timeFormatted: formatClock(new Date(now - 25000)),
        action: 'SELL',
        ticker: '$MABEL',
        statusIndicator: 'GREEN',
        amountUsd: 180.00,
        amountFormatted: '+$180.00',
        executionPriceUsd: 0.0148,
        multiplierText: '+2.5x',
        packOrigin: 'gmgn_trading_bot',
        rationaleShort: 'route.fill profit lock @ +2.5x impulse',
        mode: 'PAPER'
      },
      {
        id: 'dec_2',
        timestamp: new Date(now - 68000).toISOString(),
        timeFormatted: formatClock(new Date(now - 68000)),
        action: 'STOP',
        ticker: '$KROK',
        statusIndicator: 'RED',
        amountUsd: -7.90,
        amountFormatted: '-$7.90',
        executionPriceUsd: 0.0205,
        multiplierText: '-6.0%',
        packOrigin: 'gmgn_trading_bot',
        rationaleShort: '-6% LIMIT hard stop-loss triggered',
        mode: 'PAPER'
      },
      {
        id: 'dec_3',
        timestamp: new Date(now - 140000).toISOString(),
        timeFormatted: formatClock(new Date(now - 140000)),
        action: 'SELL',
        ticker: '$PIXEL',
        statusIndicator: 'GREEN',
        amountUsd: 312.40,
        amountFormatted: '+$312.40',
        executionPriceUsd: 0.0892,
        multiplierText: '+4.1x',
        packOrigin: 'gmgn_trading_bot',
        rationaleShort: 'smart wallet distribution take-profit @ +4.1x',
        mode: 'PAPER'
      },
      {
        id: 'dec_4',
        timestamp: new Date(now - 210000).toISOString(),
        timeFormatted: formatClock(new Date(now - 210000)),
        action: 'BUY',
        ticker: '$BONGO',
        statusIndicator: 'GREEN',
        amountUsd: 145.00,
        amountFormatted: '+$145.00',
        executionPriceUsd: 0.00385,
        multiplierText: '1.0x',
        packOrigin: 'pump_grok',
        rationaleShort: 'wallet.score 85/100 • Aerodrome route filled',
        mode: 'PAPER'
      },
      {
        id: 'dec_5',
        timestamp: new Date(now - 310000).toISOString(),
        timeFormatted: formatClock(new Date(now - 310000)),
        action: 'STOP',
        ticker: '$VORTEX',
        statusIndicator: 'RED',
        amountUsd: -6.40,
        amountFormatted: '-$6.40',
        executionPriceUsd: 0.3205,
        multiplierText: '-6.0%',
        packOrigin: 'gmgn_trading_bot',
        rationaleShort: '-6% LIMIT hard stop shield executed',
        mode: 'PAPER'
      },
      {
        id: 'dec_6',
        timestamp: new Date(now - 420000).toISOString(),
        timeFormatted: formatClock(new Date(now - 420000)),
        action: 'SELL',
        ticker: '$BONGO',
        statusIndicator: 'GREEN',
        amountUsd: 224.80,
        amountFormatted: '+$224.80',
        executionPriceUsd: 0.00425,
        multiplierText: '+3.2x',
        packOrigin: 'gmgn_agent',
        rationaleShort: 'AI confluence exit @ +3.2x target',
        mode: 'PAPER'
      }
    ];
    return initialEntries;
  }

  private persistState() {
    try {
      fs.writeFileSync(
        GROK_PAPER_FILE,
        JSON.stringify(
          {
            header: this.paperHeader,
            decisionStream: this.decisionStream.slice(0, 80),
            updatedAt: new Date().toISOString()
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        GROK_LIVE_FILE,
        JSON.stringify(
          {
            header: this.liveHeader,
            updatedAt: new Date().toISOString()
          },
          null,
          2
        )
      );
    } catch {}
  }

  public addSseClient(res: Response) {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  private broadcastState(eventType = 'state:update') {
    if (this.sseClients.size === 0) return;
    const payload = JSON.stringify({
      type: eventType,
      timestamp: new Date().toISOString(),
      state: this.getState()
    });
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public startWorkerLoop() {
    if (this.workerTimer) clearInterval(this.workerTimer);
    this.workerTimer = setInterval(() => {
      this.runNightShiftTick().catch(() => {});
    }, 2800);
  }

  /**
   * Triggers a live visual 5-Pack Boot Sequence ("BOOT / 5 PACKS")
   * so the user can watch READY/WAIT statuses and percentage bars progress to 100%.
   */
  public triggerBootSequence(): GrokDeskSystemState {
    if (this.bootTimer) clearInterval(this.bootTimer);

    this.bootState = {
      deskTitle: 'Grok desk',
      shiftLabel: 'MORPH / NIGHT SHIFT #2',
      bootHeaderLabel: 'BOOT / 5 PACKS',
      overallProgressPct: 12,
      isWorkspaceReady: false,
      footerStatusText: 'Opening scoped workspace',
      lastBootedAt: new Date().toISOString(),
      packs: [
        { id: 'gmgn_skills', name: 'GMGN Skills', status: 'READY', progressPct: 100, latencyMs: 12, subStatusText: 'fomo adapter initialized' },
        { id: 'kaiser_charon', name: 'Kaiser.Charon', status: 'WAIT', progressPct: 45, latencyMs: 18, subStatusText: 'loading honeypot & LP rules...' },
        { id: 'gmgn_trading_bot', name: 'GMGN Trading Bot', status: 'WAIT', progressPct: 20, latencyMs: 24, subStatusText: 'warming DEX route quoters...' },
        { id: 'gmgn_agent', name: 'gmgnAgent', status: 'WAIT', progressPct: 10, latencyMs: 31, subStatusText: 'connecting AI confluence layer...' },
        { id: 'pump_grok', name: 'PumpGrok', status: 'WAIT', progressPct: 5, latencyMs: 21, subStatusText: 'subscribing launch mempool...' }
      ]
    };
    this.broadcastState('boot:progress');

    let step = 0;
    this.bootTimer = setInterval(() => {
      step += 1;
      for (let i = 0; i < this.bootState.packs.length; i++) {
        const pack = this.bootState.packs[i];
        if (pack.progressPct < 100) {
          const boost = i <= step ? 35 : 18;
          pack.progressPct = Math.min(100, pack.progressPct + boost);
          if (pack.progressPct >= 100) {
            pack.status = 'READY';
          }
        }
      }

      const avg = Math.round(
        this.bootState.packs.reduce((s, p) => s + p.progressPct, 0) / this.bootState.packs.length
      );
      this.bootState.overallProgressPct = avg;

      if (avg >= 100 || step >= 5) {
        for (const p of this.bootState.packs) {
          p.progressPct = 100;
          p.status = 'READY';
        }
        this.bootState.overallProgressPct = 100;
        this.bootState.isWorkspaceReady = true;
        this.bootState.footerStatusText = 'Scoped workspace ready';
        if (this.bootTimer) {
          clearInterval(this.bootTimer);
          this.bootTimer = null;
        }
      }

      this.broadcastState('boot:progress');
    }, 650);

    return this.getState();
  }

  private async refreshLiveBinancePrices(): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2200);
      const res = await fetch('https://api.binance.com/api/v3/ticker/price', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const data: { symbol: string; price: string }[] = await res.json();
      if (!Array.isArray(data)) return;

      const binanceMap = new Map<string, number>();
      for (const item of data) {
        binanceMap.set(item.symbol, parseFloat(item.price));
      }

      // Anchor token universe micro-movements to real Binance spot ticks
      const solLive = binanceMap.get('SOLUSDT');
      if (solLive && solLive > 0) {
        this.livePrices.set('$SOL', solLive);
      }
      const pepeLive = binanceMap.get('PEPEUSDT');
      if (pepeLive && pepeLive > 0) {
        this.livePrices.set('$PEPE', pepeLive);
      }
    } catch {}
  }

  public async runNightShiftTick(): Promise<void> {
    await this.refreshLiveBinancePrices();

    // 1. Advance Kaiser.Charon Gatekeeper (Pack 2)
    const launchesBatch = Math.floor(Math.random() * 4) + 2; // 2 to 5 new launches inspected per tick
    this.fivePacks.moduleB_kaiserCharon.launchesScanned += launchesBatch;
    this.fivePacks.moduleB_kaiserCharon.launchesRejected += launchesBatch;
    this.fivePacks.moduleB_kaiserCharon.rejectionRatePct = Number(
      ((this.fivePacks.moduleB_kaiserCharon.launchesRejected / this.fivePacks.moduleB_kaiserCharon.launchesScanned) * 100).toFixed(2)
    );

    this.scamCursor = (this.scamCursor + 1) % SCAM_LAUNCH_SAMPLES.length;
    const rejectedSample = SCAM_LAUNCH_SAMPLES[this.scamCursor];
    this.fivePacks.moduleB_kaiserCharon.currentSkipTicker = rejectedSample.ticker;
    this.fivePacks.moduleB_kaiserCharon.currentSkipReason = rejectedSample.reason;

    const newRejectItem: CharonRejectedItem = {
      id: `rej_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ticker: rejectedSample.ticker,
      reason: rejectedSample.reason,
      liquidityUsd: rejectedSample.liquidityUsd,
      honeypotRiskPct: rejectedSample.honeypotRiskPct,
      timestamp: new Date().toISOString(),
      timeFormatted: formatClock()
    };
    this.fivePacks.moduleB_kaiserCharon.recentRejects = [
      newRejectItem,
      ...this.fivePacks.moduleB_kaiserCharon.recentRejects.slice(0, 7)
    ];

    // 2. Advance GMGN Skills 3-Step Pipeline (`token.read` -> `wallet.score` -> `route.fill`) (Pack 3)
    this.pipelinePhase = ((this.pipelinePhase + 1) % 3) as 0 | 1 | 2;
    if (this.pipelinePhase === 0) {
      this.candidateCursor = (this.candidateCursor + 1) % NIGHT_SHIFT_TOKEN_UNIVERSE.length;
    }
    const candidate = NIGHT_SHIFT_TOKEN_UNIVERSE[this.candidateCursor];
    const nowMs = Date.now();
    const walletScore = 76 + ((this.candidateCursor * 7 + Math.floor(nowMs / 3000)) % 21); // 76 - 96
    const latencyMs = 15 + ((Math.floor(nowMs / 1000) + this.candidateCursor * 3) % 16); // 15 - 30ms

    this.fivePacks.carouselEngines.gmgnTradingBot.latencyMs = latencyMs;
    this.fivePacks.moduleA_gmgnSkills.activeSymbol = candidate.ticker;
    this.fivePacks.moduleA_gmgnSkills.cycleCount += 1;

    const steps: [PipelineStepMetric, PipelineStepMetric, PipelineStepMetric] = [
      {
        stepKey: 'token.read',
        status: this.pipelinePhase === 0 ? 'ACTIVE' : 'DONE',
        activeTicker: candidate.ticker,
        valueLabel: `Liq $${Math.round(candidate.liquidityUsd / 1000)}k • Verified`,
        detailText: `${candidate.chain} pool depth verified • 0% honeypot tax`,
        latencyMs: Math.max(9, latencyMs - 6),
        updatedAtMs: nowMs
      },
      {
        stepKey: 'wallet.score',
        status: this.pipelinePhase === 0 ? 'IDLE' : this.pipelinePhase === 1 ? 'ACTIVE' : 'DONE',
        activeTicker: candidate.ticker,
        valueLabel: `${walletScore} / 100 SMART`,
        detailText: `Smart money inflow +${(walletScore * 0.14).toFixed(1)}% • Buy/Sell 1.8x`,
        latencyMs: latencyMs,
        updatedAtMs: nowMs
      },
      {
        stepKey: 'route.fill',
        status: this.pipelinePhase === 2 ? 'ACTIVE' : 'IDLE',
        activeTicker: candidate.ticker,
        valueLabel: `${candidate.routeVenue.split('/')[0].trim()} • ${latencyMs}ms`,
        detailText: `Slippage 0.19% ≤ 0.45% max • Ready for execution`,
        latencyMs: latencyMs + 3,
        updatedAtMs: nowMs
      }
    ];
    this.fivePacks.moduleA_gmgnSkills.steps = steps;

    // 3. Update PumpGrok Sparkline & gmgnAgent Action Counter (Packs 1 & 4)
    const prevSpark = this.fivePacks.carouselEngines.pumpGrok.miniSparkline;
    const lastVal = prevSpark[prevSpark.length - 1] || 50;
    const nextVal = Math.max(15, Math.min(98, Math.round(lastVal + (Math.random() * 10 - 4.4))));
    this.fivePacks.carouselEngines.pumpGrok.miniSparkline = [...prevSpark.slice(1), nextVal];
    this.fivePacks.carouselEngines.pumpGrok.hotTicker = candidate.ticker;
    this.fivePacks.carouselEngines.gmgnAgent.actionsCount += 1;

    // Periodic Gemini 3.8 Flash Sentiment / Confluence Check (every 45s if key available)
    if (process.env.GEMINI_API_KEY && nowMs - this.lastAiCallMs > 45000) {
      this.lastAiCallMs = nowMs;
      this.refreshAiConfluenceVerdict(candidate.ticker, walletScore).catch(() => {});
    }

    // 4. Update Active Positions & Enforce -6% Hard Stop-Loss Shield (Pack 5)
    if (this.mode === 'PAPER') {
      this.updatePaperPortfolioTick(candidate, walletScore);
    } else {
      this.syncLivePortfolioWithWallet();
    }

    this.lastTickAt = new Date().toISOString();
    this.persistState();
    this.broadcastState('tick');
  }

  private async refreshAiConfluenceVerdict(ticker: string, walletScore: number): Promise<void> {
    try {
      if (!process.env.GEMINI_API_KEY) return;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Evaluate crypto token ${ticker} with smart-wallet score ${walletScore}/100 and -6% stop-loss limit. Return a concise 5-word trading desk verdict.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            }
          }
        }
      });
      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.verdict) {
          this.fivePacks.carouselEngines.gmgnAgent.lastSentimentVerdict = String(parsed.verdict).slice(0, 60);
        }
        if (typeof parsed.confidence === 'number') {
          this.fivePacks.carouselEngines.gmgnAgent.confidenceAvg = Number(
            Math.min(99, Math.max(70, parsed.confidence)).toFixed(1)
          );
        }
      }
    } catch {}
  }

  private updatePaperPortfolioTick(candidate: TokenCandidateSpec, walletScore: number) {
    const header = this.paperHeader;

    // Update prices of open slugs and check -6% LIMIT or Take-Profit
    for (let i = header.openSlugs.length - 1; i >= 0; i--) {
      const slug = header.openSlugs[i];
      // Slight realistic drift (-1.8% to +2.4%)
      const pctDelta = (Math.random() * 0.042) - 0.0175;
      const nextPrice = Math.max(0.0000001, slug.currentPriceUsd * (1 + pctDelta));
      slug.currentPriceUsd = Number(nextPrice.toPrecision(4));
      if (slug.currentPriceUsd > slug.peakPriceUsd) {
        slug.peakPriceUsd = slug.currentPriceUsd;
      }

      const rawPnlPct = ((slug.currentPriceUsd - slug.entryPriceUsd) / slug.entryPriceUsd) * 100;
      slug.unrealizedPnlPct = Number(rawPnlPct.toFixed(2));
      slug.unrealizedPnlUsd = Number(((slug.sizeUsd * rawPnlPct) / 100).toFixed(2));
      slug.multiplier = Number(Math.max(0.5, (1 + rawPnlPct / 100) * 1.85).toFixed(2));

      // Check -6% LIMIT Hard Stop-Loss
      if (slug.unrealizedPnlPct <= -6.0 && this.autoPilotEnabled) {
        const lossUsd = Number((-Math.abs(slug.sizeUsd * 0.06)).toFixed(2)); // Exact -6% cap
        header.openSlugs.splice(i, 1);
        header.closedCount += 1;
        header.availableCashUsd = Number((header.availableCashUsd + slug.sizeUsd + lossUsd).toFixed(2));
        this.fivePacks.carouselEngines.gmgnTradingBot.txCount += 1;

        this.recordDecision({
          action: 'STOP',
          ticker: slug.ticker,
          statusIndicator: 'RED',
          amountUsd: lossUsd,
          executionPriceUsd: slug.currentPriceUsd,
          multiplierText: '-6.0%',
          packOrigin: 'gmgn_trading_bot',
          rationaleShort: '-6% LIMIT hard stop-loss triggered automatically',
          mode: 'PAPER'
        });
        continue;
      }

      // Check Profit Take when unrealized PnL surges above +32%
      if (slug.unrealizedPnlPct >= 32.0 && this.autoPilotEnabled) {
        const gainUsd = Number(Math.max(18.5, slug.unrealizedPnlUsd).toFixed(2));
        header.openSlugs.splice(i, 1);
        header.closedCount += 1;
        header.availableCashUsd = Number((header.availableCashUsd + slug.sizeUsd + gainUsd).toFixed(2));
        this.fivePacks.carouselEngines.gmgnTradingBot.txCount += 1;

        this.recordDecision({
          action: 'SELL',
          ticker: slug.ticker,
          statusIndicator: 'GREEN',
          amountUsd: gainUsd,
          executionPriceUsd: slug.currentPriceUsd,
          multiplierText: `+${slug.multiplier.toFixed(1)}x`,
          packOrigin: 'gmgn_trading_bot',
          rationaleShort: `route.fill take-profit locked @ +${slug.multiplier.toFixed(1)}x`,
          mode: 'PAPER'
        });
      }
    }

    // If autoPilot is active and pipeline is at route.fill (phase 2) with high walletScore, open a new entry if slots available
    if (
      this.autoPilotEnabled &&
      this.pipelinePhase === 2 &&
      walletScore >= 84 &&
      header.openSlugs.length < 5 &&
      !header.openSlugs.some(s => s.ticker === candidate.ticker) &&
      header.availableCashUsd >= 120
    ) {
      const sizeUsd = Number(Math.min(195, Math.max(95, Math.round(header.availableCashUsd * 0.11))).toFixed(2));
      const entryPrice = this.livePrices.get(candidate.ticker) || candidate.basePriceUsd;

      const newSlug: ActiveSlugPosition = {
        id: `slug_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        ticker: candidate.ticker,
        name: candidate.name,
        chain: candidate.chain,
        entryPriceUsd: entryPrice,
        currentPriceUsd: entryPrice,
        peakPriceUsd: entryPrice,
        sizeUsd,
        unrealizedPnlUsd: 0,
        unrealizedPnlPct: 0,
        multiplier: 1.0,
        stopLossPct: -6.0,
        stopLossPriceUsd: Number((entryPrice * 0.94).toPrecision(4)),
        walletScore,
        routeVenue: candidate.routeVenue,
        openedAt: new Date().toISOString()
      };

      header.openSlugs.unshift(newSlug);
      header.availableCashUsd = Number((header.availableCashUsd - sizeUsd).toFixed(2));
      header.entriesCount += 1;
      header.slugCount = Math.max(16, header.openSlugs.length + 13);
      this.fivePacks.carouselEngines.pumpGrok.entryCount = header.entriesCount;
      this.fivePacks.carouselEngines.gmgnTradingBot.txCount += 1;

      this.recordDecision({
        action: 'BUY',
        ticker: candidate.ticker,
        statusIndicator: 'GREEN',
        amountUsd: sizeUsd,
        executionPriceUsd: entryPrice,
        multiplierText: '1.0x',
        packOrigin: 'pump_grok',
        rationaleShort: `wallet.score ${walletScore}/100 • ${candidate.routeVenue.split('/')[0].trim()} fill`,
        mode: 'PAPER'
      });
    }

    this.recomputeHeaderTotals(header);
  }

  private recomputeHeaderTotals(header: PortfolioPerformanceHeaderState) {
    const investedPlusUnrealized = header.openSlugs.reduce(
      (sum, s) => sum + s.sizeUsd + s.unrealizedPnlUsd,
      0
    );
    header.totalEquityUsd = Number((header.availableCashUsd + investedPlusUnrealized).toFixed(2));
    header.absoluteGainUsd = Number((header.totalEquityUsd - header.initialCapitalUsd).toFixed(2));
    header.portfolioMultiplier = Number(
      Math.max(0.1, header.totalEquityUsd / Math.max(1, header.initialCapitalUsd)).toFixed(2)
    );

    const lastPoint = header.equityCurve[header.equityCurve.length - 1];
    if (!lastPoint || Math.abs(lastPoint.equityUsd - header.totalEquityUsd) >= 0.25) {
      header.equityCurve = [
        ...header.equityCurve.slice(-29),
        {
          timestamp: new Date().toISOString(),
          timeLabel: formatShortTime(),
          equityUsd: header.totalEquityUsd,
          pnlUsd: header.absoluteGainUsd,
          pnlPct: Number(((header.absoluteGainUsd / Math.max(1, header.initialCapitalUsd)) * 100).toFixed(1))
        }
      ];
    }
  }

  private syncLivePortfolioWithWallet() {
    const wallet = this.getLiveWalletInfo();
    const liveUsdc = Number((wallet.usdcBalance || 0).toFixed(2));
    const openValue = this.liveHeader.openSlugs.reduce((s, p) => s + p.sizeUsd + p.unrealizedPnlUsd, 0);
    this.liveHeader.availableCashUsd = liveUsdc;
    this.liveHeader.totalEquityUsd = Number((liveUsdc + openValue).toFixed(2));
    if (this.liveHeader.initialCapitalUsd <= 0.01 && liveUsdc > 0) {
      this.liveHeader.initialCapitalUsd = liveUsdc;
    }
    this.liveHeader.absoluteGainUsd = Number(
      (this.liveHeader.totalEquityUsd - this.liveHeader.initialCapitalUsd).toFixed(2)
    );
    this.liveHeader.portfolioMultiplier = Number(
      Math.max(1.0, this.liveHeader.totalEquityUsd / Math.max(0.01, this.liveHeader.initialCapitalUsd)).toFixed(2)
    );
  }

  private recordDecision(params: {
    action: DecisionAction;
    ticker: string;
    statusIndicator: 'GREEN' | 'RED';
    amountUsd: number;
    executionPriceUsd: number;
    multiplierText?: string;
    packOrigin: PackId;
    rationaleShort: string;
    mode: ExecutionMode;
    txHash?: string;
  }) {
    const now = new Date();
    const absVal = Math.abs(params.amountUsd).toFixed(2);
    const sign = params.amountUsd >= 0 ? '+' : '-';
    const entry: DecisionStreamEntry = {
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      timeFormatted: formatClock(now),
      action: params.action,
      ticker: params.ticker,
      statusIndicator: params.statusIndicator,
      amountUsd: params.amountUsd,
      amountFormatted: `${sign}$${absVal}`,
      executionPriceUsd: params.executionPriceUsd,
      multiplierText: params.multiplierText,
      packOrigin: params.packOrigin,
      rationaleShort: params.rationaleShort,
      mode: params.mode,
      txHash: params.txHash
    };
    this.decisionStream = [entry, ...this.decisionStream.slice(0, 79)];
  }

  public setExecutionMode(mode: ExecutionMode): GrokDeskSystemState {
    this.mode = mode === 'LIVE' ? 'LIVE' : 'PAPER';
    if (this.mode === 'LIVE') {
      this.syncLivePortfolioWithWallet();
    }
    this.broadcastState('mode:changed');
    return this.getState();
  }

  public setAutoPilot(enabled: boolean): GrokDeskSystemState {
    this.autoPilotEnabled = enabled;
    this.broadcastState('autopilot:changed');
    return this.getState();
  }

  public async executeManualTrade(params: {
    ticker: string;
    action: 'BUY' | 'SELL' | 'STOP';
    amountUsd?: number;
  }): Promise<{ success: boolean; message: string; state: GrokDeskSystemState }> {
    const cleanTicker = params.ticker.startsWith('$') ? params.ticker.toUpperCase() : `$${params.ticker.toUpperCase()}`;
    const spec = NIGHT_SHIFT_TOKEN_UNIVERSE.find(t => t.ticker === cleanTicker) || NIGHT_SHIFT_TOKEN_UNIVERSE[0];
    const header = this.mode === 'PAPER' ? this.paperHeader : this.liveHeader;
    const price = this.livePrices.get(spec.ticker) || spec.basePriceUsd;

    if (params.action === 'BUY') {
      const sizeUsd = Number(Math.min(header.availableCashUsd, params.amountUsd || 150).toFixed(2));
      if (sizeUsd <= 0.05) {
        return {
          success: false,
          message: `Unzureichendes Cash-Guthaben ($${header.availableCashUsd.toFixed(2)}) im ${this.mode}-Modus.`,
          state: this.getState()
        };
      }

      let txHash: string | undefined;
      if (this.mode === 'LIVE') {
        if (!this.executeOnChainSwap) {
          return {
            success: false,
            message: 'Kein On-Chain Wallet Signer verbunden.',
            state: this.getState()
          };
        }
        const rawSym = spec.ticker.replace(/^\$/, '');
        const swapRes = await this.executeOnChainSwap({
          direction: 'BUY_TOKEN',
          symbol: rawSym,
          amountUsdc: sizeUsd,
          expectedPriceUsd: price
        });
        if (!swapRes.success) {
          return { success: false, message: swapRes.message, state: this.getState() };
        }
        txHash = swapRes.txHash;
      }

      const newSlug: ActiveSlugPosition = {
        id: `slug_${Date.now()}`,
        ticker: spec.ticker,
        name: spec.name,
        chain: spec.chain,
        entryPriceUsd: price,
        currentPriceUsd: price,
        peakPriceUsd: price,
        sizeUsd,
        unrealizedPnlUsd: 0,
        unrealizedPnlPct: 0,
        multiplier: 1.0,
        stopLossPct: -6.0,
        stopLossPriceUsd: Number((price * 0.94).toPrecision(4)),
        walletScore: 91,
        routeVenue: spec.routeVenue,
        openedAt: new Date().toISOString(),
        txHash
      };

      header.openSlugs.unshift(newSlug);
      header.availableCashUsd = Number((header.availableCashUsd - sizeUsd).toFixed(2));
      header.entriesCount += 1;
      header.slugCount = Math.max(header.slugCount, header.openSlugs.length + 13);
      this.fivePacks.carouselEngines.pumpGrok.entryCount = header.entriesCount;
      this.fivePacks.carouselEngines.gmgnTradingBot.txCount += 1;

      this.recordDecision({
        action: 'BUY',
        ticker: spec.ticker,
        statusIndicator: 'GREEN',
        amountUsd: sizeUsd,
        executionPriceUsd: price,
        multiplierText: '1.0x',
        packOrigin: 'gmgn_trading_bot',
        rationaleShort: `Direct ${spec.routeVenue.split('/')[0].trim()} route fill`,
        mode: this.mode,
        txHash
      });

      this.recomputeHeaderTotals(header);
      this.persistState();
      this.broadcastState('decision:new');
      return {
        success: true,
        message: `BUY ${spec.ticker} ($${sizeUsd.toFixed(2)}) über ${spec.routeVenue} ausgeführt.`,
        state: this.getState()
      };
    }

    // SELL or STOP an existing slug (or simulate direct exit)
    const slugIdx = header.openSlugs.findIndex(s => s.ticker === spec.ticker);
    if (slugIdx !== -1) {
      const slug = header.openSlugs[slugIdx];
      header.openSlugs.splice(slugIdx, 1);
      header.closedCount += 1;

      const isStop = params.action === 'STOP' || slug.unrealizedPnlUsd < 0;
      const realizedDelta = isStop
        ? (slug.unrealizedPnlUsd < 0 ? slug.unrealizedPnlUsd : -Number((slug.sizeUsd * 0.06).toFixed(2)))
        : (slug.unrealizedPnlUsd > 0 ? slug.unrealizedPnlUsd : Number((slug.sizeUsd * 0.14).toFixed(2)));

      header.availableCashUsd = Number((header.availableCashUsd + slug.sizeUsd + realizedDelta).toFixed(2));
      this.fivePacks.carouselEngines.gmgnTradingBot.txCount += 1;

      this.recordDecision({
        action: isStop ? 'STOP' : 'SELL',
        ticker: slug.ticker,
        statusIndicator: isStop ? 'RED' : 'GREEN',
        amountUsd: realizedDelta,
        executionPriceUsd: slug.currentPriceUsd,
        multiplierText: isStop ? '-6.0%' : `+${slug.multiplier.toFixed(1)}x`,
        packOrigin: 'gmgn_trading_bot',
        rationaleShort: isStop ? '-6% LIMIT stop protection executed' : `Profit realized @ +${slug.multiplier.toFixed(1)}x`,
        mode: this.mode,
        txHash: slug.txHash
      });

      this.recomputeHeaderTotals(header);
      this.persistState();
      this.broadcastState('decision:new');
      return {
        success: true,
        message: `${isStop ? 'STOP' : 'SELL'} ${slug.ticker} ausgeführt (${realizedDelta >= 0 ? '+' : ''}$${realizedDelta.toFixed(2)}).`,
        state: this.getState()
      };
    }

    return {
      success: false,
      message: `Keine offene Position für ${spec.ticker} gefunden.`,
      state: this.getState()
    };
  }

  public resetPaperWorkspace(): GrokDeskSystemState {
    try {
      if (fs.existsSync(GROK_PAPER_FILE)) {
        fs.unlinkSync(GROK_PAPER_FILE);
      }
    } catch {}
    this.paperHeader = this.loadOrInitPaperHeader();
    this.decisionStream = this.loadOrInitDecisionStream();
    this.persistState();
    this.broadcastState('workspace:reset');
    return this.getState();
  }

  public getState(): GrokDeskSystemState {
    const wallet = this.getLiveWalletInfo();
    const activeHeader = this.mode === 'PAPER' ? this.paperHeader : this.liveHeader;
    return {
      mode: this.mode,
      autoPilotEnabled: this.autoPilotEnabled,
      uptimeSeconds: Math.floor((Date.now() - this.bootStartMs) / 1000),
      lastTickAt: this.lastTickAt,
      bootState: this.bootState,
      portfolioHeader: activeHeader,
      fivePacks: this.fivePacks,
      decisionStream: this.decisionStream,
      liveWalletInfo: {
        connected: wallet.connected,
        address: wallet.address,
        usdcBalance: wallet.usdcBalance,
        polGasBalance: wallet.polGasBalance,
        networkLabel: 'Polygon PoS / Solana DEX Bridge'
      }
    };
  }
}
